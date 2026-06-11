import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.107.0';

const GOOGLE_OAUTH_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const YOUTUBE_COMMENT_THREADS_URL = 'https://www.googleapis.com/youtube/v3/commentThreads';
const YOUTUBE_VIDEOS_URL = 'https://www.googleapis.com/youtube/v3/videos';
const ACCESS_TOKEN_REFRESH_SKEW_MS = 5 * 60 * 1000;
const MAX_RESULTS_PER_PAGE = 100;
const VIDEO_BATCH_SIZE = 50;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type JsonBody = {
  error?: string;
  job?: {
    id: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    importedCount: number;
    updatedCount: number;
    processedCount: number;
    pageToken: string | null;
    errorMessage: string | null;
  };
};

type YoutubeConnectionRow = {
  id: string;
  user_id: string;
  channel_id: string;
  status: 'active' | 'expired' | 'revoked';
  encrypted_refresh_token: string;
  encrypted_access_token: string | null;
  access_token_expires_at: string | null;
};

type YoutubeSyncJobRow = {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  imported_count: number;
  updated_count: number;
  processed_count: number;
  page_token: string | null;
  error_message: string | null;
};

type GoogleTokenResponse = {
  access_token?: string;
  expires_in?: number;
  token_type?: string;
  error?: string;
  error_description?: string;
};

type GoogleApiError = {
  message?: string;
  errors?: Array<{
    reason?: string;
    message?: string;
  }>;
};

type YoutubeCommentThreadsResponse = {
  nextPageToken?: string;
  items?: YoutubeCommentThread[];
  error?: GoogleApiError;
};

type YoutubeCommentThread = {
  id?: string;
  snippet?: {
    videoId?: string;
    topLevelComment?: {
      id?: string;
      snippet?: {
        videoId?: string;
        authorDisplayName?: string;
        authorChannelUrl?: string;
        textDisplay?: string;
        textOriginal?: string;
        likeCount?: number;
        publishedAt?: string;
        updatedAt?: string;
      };
    };
  };
};

type YoutubeVideosResponse = {
  items?: YoutubeVideoItem[];
  error?: GoogleApiError;
};

type YoutubeVideoItem = {
  id?: string;
  snippet?: {
    title?: string;
    publishedAt?: string;
    thumbnails?: Record<string, { url?: string }>;
  };
};

type VideoUpsertRow = {
  user_id: string;
  youtube_video_id: string;
  title: string;
  url: string;
  published_at: string | null;
  thumbnail_url: string | null;
};

type VideoRow = {
  id: string;
  youtube_video_id: string;
};

type CommentImport = {
  youtubeCommentId: string;
  youtubeVideoId: string;
  authorName: string;
  authorChannelUrl: string | null;
  text: string;
  likeCount: number;
  publishedAt: string;
};

function jsonResponse(body: JsonBody, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

function requiredEnv(name: string): string {
  const value = Deno.env.get(name);

  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }

  return value;
}

function getSupabaseServiceRoleKey(): string {
  return Deno.env.get('CREATOR_FLOW_SUPABASE_SERVICE_ROLE_KEY') ?? requiredEnv('SUPABASE_SERVICE_ROLE_KEY');
}

function getBearerToken(request: Request): string | null {
  const authorization = request.headers.get('Authorization');

  if (!authorization?.startsWith('Bearer ')) {
    return null;
  }

  const token = authorization.slice('Bearer '.length).trim();
  return token.length > 0 ? token : null;
}

function base64UrlEncode(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');
}

function base64UrlDecode(value: string): Uint8Array {
  const base64 = value.replaceAll('-', '+').replaceAll('_', '/');
  const paddedBase64 = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
  const binary = atob(paddedBase64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

async function sha256Bytes(value: string): Promise<ArrayBuffer> {
  return crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
}

async function importAesGcmKey(encryptionSecret: string, keyUsages: KeyUsage[]): Promise<CryptoKey> {
  if (encryptionSecret.length < 32) {
    throw new Error('YOUTUBE_TOKEN_ENCRYPTION_KEY must be at least 32 characters.');
  }

  const keyMaterial = await sha256Bytes(encryptionSecret);
  return crypto.subtle.importKey('raw', keyMaterial, 'AES-GCM', false, keyUsages);
}

async function encryptToken(token: string, encryptionSecret: string): Promise<string> {
  const key = await importAesGcmKey(encryptionSecret, ['encrypt']);
  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);

  const ciphertext = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
    },
    key,
    new TextEncoder().encode(token),
  );

  return [
    'aes-gcm-v1',
    base64UrlEncode(iv),
    base64UrlEncode(new Uint8Array(ciphertext)),
  ].join(':');
}

async function decryptToken(encryptedToken: string, encryptionSecret: string): Promise<string> {
  const [version, encodedIv, encodedCiphertext] = encryptedToken.split(':');

  if (version !== 'aes-gcm-v1' || !encodedIv || !encodedCiphertext) {
    throw new Error('Unsupported encrypted token format.');
  }

  const key = await importAesGcmKey(encryptionSecret, ['decrypt']);
  const plaintext = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: toArrayBuffer(base64UrlDecode(encodedIv)),
    },
    key,
    toArrayBuffer(base64UrlDecode(encodedCiphertext)),
  );

  return new TextDecoder().decode(plaintext);
}

async function refreshAccessToken(params: {
  refreshToken: string;
  clientId: string;
  clientSecret: string;
}): Promise<GoogleTokenResponse> {
  const body = new URLSearchParams();
  body.set('refresh_token', params.refreshToken);
  body.set('client_id', params.clientId);
  body.set('client_secret', params.clientSecret);
  body.set('grant_type', 'refresh_token');

  const response = await fetch(GOOGLE_OAUTH_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });
  const tokenResponse = (await response.json()) as GoogleTokenResponse;

  if (!response.ok) {
    throw new Error(tokenResponse.error_description ?? tokenResponse.error ?? 'Google OAuth token refresh failed.');
  }

  return tokenResponse;
}

function shouldRefreshAccessToken(connection: YoutubeConnectionRow): boolean {
  if (!connection.encrypted_access_token || !connection.access_token_expires_at) {
    return true;
  }

  return new Date(connection.access_token_expires_at).getTime() <= Date.now() + ACCESS_TOKEN_REFRESH_SKEW_MS;
}

function googleErrorMessage(error: GoogleApiError | undefined, fallback: string): string {
  const firstError = error?.errors?.[0];
  const reason = firstError?.reason;
  const message = firstError?.message ?? error?.message;

  if (reason && message) {
    return `${reason}: ${message}`;
  }

  return message ?? reason ?? fallback;
}

async function fetchYoutubeJson<T>(url: URL, accessToken: string, fallbackError: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  const body = (await response.json()) as T & { error?: GoogleApiError };

  if (!response.ok) {
    throw new Error(googleErrorMessage(body.error, fallbackError));
  }

  return body;
}

async function fetchCommentThreads(params: {
  accessToken: string;
  channelId: string;
  pageToken: string | null;
}): Promise<YoutubeCommentThreadsResponse> {
  const url = new URL(YOUTUBE_COMMENT_THREADS_URL);
  url.searchParams.set('part', 'snippet');
  url.searchParams.set('allThreadsRelatedToChannelId', params.channelId);
  url.searchParams.set('textFormat', 'plainText');
  url.searchParams.set('maxResults', String(MAX_RESULTS_PER_PAGE));

  if (params.pageToken) {
    url.searchParams.set('pageToken', params.pageToken);
  }

  return fetchYoutubeJson<YoutubeCommentThreadsResponse>(url, params.accessToken, 'Unable to fetch YouTube comments.');
}

async function fetchVideos(accessToken: string, videoIds: string[]): Promise<Map<string, YoutubeVideoItem>> {
  const videosById = new Map<string, YoutubeVideoItem>();

  for (let index = 0; index < videoIds.length; index += VIDEO_BATCH_SIZE) {
    const batch = videoIds.slice(index, index + VIDEO_BATCH_SIZE);
    const url = new URL(YOUTUBE_VIDEOS_URL);
    url.searchParams.set('part', 'snippet');
    url.searchParams.set('id', batch.join(','));

    const response = await fetchYoutubeJson<YoutubeVideosResponse>(url, accessToken, 'Unable to fetch YouTube videos.');

    for (const video of response.items ?? []) {
      if (video.id) {
        videosById.set(video.id, video);
      }
    }
  }

  return videosById;
}

function bestThumbnailUrl(video: YoutubeVideoItem | undefined): string | null {
  const thumbnails = video?.snippet?.thumbnails;

  return thumbnails?.['maxres']?.url
    ?? thumbnails?.['standard']?.url
    ?? thumbnails?.['high']?.url
    ?? thumbnails?.['medium']?.url
    ?? thumbnails?.['default']?.url
    ?? null;
}

function parseCommentThread(thread: YoutubeCommentThread): CommentImport | null {
  const topLevelComment = thread.snippet?.topLevelComment;
  const commentSnippet = topLevelComment?.snippet;
  const youtubeCommentId = topLevelComment?.id ?? thread.id;
  const youtubeVideoId = commentSnippet?.videoId ?? thread.snippet?.videoId;
  const text = commentSnippet?.textOriginal ?? commentSnippet?.textDisplay;
  const publishedAt = commentSnippet?.publishedAt;

  if (!youtubeCommentId || !youtubeVideoId || !text || !publishedAt) {
    return null;
  }

  return {
    youtubeCommentId,
    youtubeVideoId,
    authorName: commentSnippet?.authorDisplayName ?? 'Autor desconhecido',
    authorChannelUrl: commentSnippet?.authorChannelUrl ?? null,
    text,
    likeCount: Math.max(0, commentSnippet?.likeCount ?? 0),
    publishedAt,
  };
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed.' }, 405);
  }

  const supabaseUrl = requiredEnv('SUPABASE_URL');
  const supabaseAnonKey = requiredEnv('SUPABASE_ANON_KEY');
  const supabaseServiceRoleKey = getSupabaseServiceRoleKey();
  const googleClientId = requiredEnv('GOOGLE_CLIENT_ID');
  const googleClientSecret = requiredEnv('GOOGLE_CLIENT_SECRET');
  const encryptionSecret = requiredEnv('YOUTUBE_TOKEN_ENCRYPTION_KEY');
  const accessToken = getBearerToken(request);

  if (!accessToken) {
    return jsonResponse({ error: 'Authentication required.' }, 401);
  }

  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
  const {
    data: { user },
    error: userError,
  } = await authClient.auth.getUser(accessToken);

  if (userError || !user) {
    return jsonResponse({ error: 'Invalid authentication token.' }, 401);
  }

  const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  let jobId: string | null = null;

  try {
    const { data: connection, error: connectionError } = await adminClient
      .from('youtube_connections')
      .select('id, user_id, channel_id, status, encrypted_refresh_token, encrypted_access_token, access_token_expires_at')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle<YoutubeConnectionRow>();

    if (connectionError) {
      console.error('Failed to fetch YouTube connection.', connectionError);
      return jsonResponse({ error: 'Unable to fetch YouTube connection.' }, 500);
    }

    if (!connection) {
      return jsonResponse({ error: 'No active YouTube connection found.' }, 404);
    }

    const { data: createdJob, error: createJobError } = await adminClient
      .from('youtube_sync_jobs')
      .insert({
        user_id: user.id,
        youtube_connection_id: connection.id,
        status: 'running',
        started_at: new Date().toISOString(),
      })
      .select('id, status, imported_count, updated_count, processed_count, page_token, error_message')
      .single<YoutubeSyncJobRow>();

    if (createJobError || !createdJob) {
      console.error('Failed to create YouTube sync job.', createJobError);
      return jsonResponse({ error: 'Unable to start YouTube sync.' }, 500);
    }

    jobId = createdJob.id;

    let youtubeAccessToken: string;

    if (shouldRefreshAccessToken(connection)) {
      const refreshToken = await decryptToken(connection.encrypted_refresh_token, encryptionSecret);
      const tokenResponse = await refreshAccessToken({
        refreshToken,
        clientId: googleClientId,
        clientSecret: googleClientSecret,
      });

      if (!tokenResponse.access_token) {
        throw new Error('Google OAuth did not return a refreshed access token.');
      }

      youtubeAccessToken = tokenResponse.access_token;

      const expiresInSeconds = typeof tokenResponse.expires_in === 'number' && Number.isFinite(tokenResponse.expires_in)
        ? tokenResponse.expires_in
        : 3600;
      const { error: updateConnectionError } = await adminClient
        .from('youtube_connections')
        .update({
          encrypted_access_token: await encryptToken(youtubeAccessToken, encryptionSecret),
          access_token_expires_at: new Date(Date.now() + expiresInSeconds * 1000).toISOString(),
          status: 'active',
          revoked_at: null,
        })
        .eq('id', connection.id)
        .eq('user_id', user.id);

      if (updateConnectionError) {
        console.error('Failed to persist refreshed YouTube access token.', updateConnectionError);
        throw new Error('Unable to update YouTube connection.');
      }
    } else {
      if (!connection.encrypted_access_token) {
        throw new Error('No YouTube access token is available.');
      }

      youtubeAccessToken = await decryptToken(connection.encrypted_access_token, encryptionSecret);
    }

    let pageToken: string | null = null;
    let importedCount = 0;
    let updatedCount = 0;
    let processedCount = 0;

    do {
      const commentsResponse = await fetchCommentThreads({
        accessToken: youtubeAccessToken,
        channelId: connection.channel_id,
        pageToken,
      });
      const comments = (commentsResponse.items ?? [])
        .map(parseCommentThread)
        .filter((comment): comment is CommentImport => comment !== null);
      const youtubeVideoIds = [...new Set(comments.map((comment) => comment.youtubeVideoId))];
      const videosByYoutubeId = await fetchVideos(youtubeAccessToken, youtubeVideoIds);

      if (youtubeVideoIds.length > 0) {
        const videoRows: VideoUpsertRow[] = youtubeVideoIds.map((youtubeVideoId) => {
          const video = videosByYoutubeId.get(youtubeVideoId);
          const title = video?.snippet?.title ?? `Video ${youtubeVideoId}`;

          return {
            user_id: user.id,
            youtube_video_id: youtubeVideoId,
            title,
            url: `https://www.youtube.com/watch?v=${youtubeVideoId}`,
            published_at: video?.snippet?.publishedAt ?? null,
            thumbnail_url: bestThumbnailUrl(video),
          };
        });

        const { error: videosUpsertError } = await adminClient
          .from('youtube_videos')
          .upsert(videoRows, {
            onConflict: 'user_id,youtube_video_id',
          });

        if (videosUpsertError) {
          console.error('Failed to upsert YouTube videos.', videosUpsertError);
          throw new Error('Unable to import YouTube videos.');
        }
      }

      let videoRows: VideoRow[] = [];

      if (youtubeVideoIds.length > 0) {
        const { data: selectedVideoRows, error: videosSelectError } = await adminClient
          .from('youtube_videos')
          .select('id, youtube_video_id')
          .eq('user_id', user.id)
          .in('youtube_video_id', youtubeVideoIds)
          .returns<VideoRow[]>();

        if (videosSelectError) {
          console.error('Failed to fetch upserted YouTube videos.', videosSelectError);
          throw new Error('Unable to map imported YouTube videos.');
        }

        videoRows = selectedVideoRows ?? [];
      }

      const videoIdByYoutubeId = new Map((videoRows ?? []).map((video) => [video.youtube_video_id, video.id]));
      const youtubeCommentIds = comments.map((comment) => comment.youtubeCommentId);
      const { data: existingComments, error: existingCommentsError } = youtubeCommentIds.length > 0
        ? await adminClient
          .from('comments')
          .select('youtube_comment_id')
          .eq('user_id', user.id)
          .in('youtube_comment_id', youtubeCommentIds)
          .returns<Array<{ youtube_comment_id: string }>>()
        : { data: [], error: null };

      if (existingCommentsError) {
        console.error('Failed to fetch existing comments.', existingCommentsError);
        throw new Error('Unable to compare imported YouTube comments.');
      }

      const existingCommentIds = new Set((existingComments ?? []).map((comment) => comment.youtube_comment_id));
      const commentRows = comments
        .map((comment) => {
          const internalVideoId = videoIdByYoutubeId.get(comment.youtubeVideoId);

          if (!internalVideoId) {
            return null;
          }

          return {
            user_id: user.id,
            youtube_comment_id: comment.youtubeCommentId,
            youtube_video_id: internalVideoId,
            author_name: comment.authorName,
            author_channel_url: comment.authorChannelUrl,
            text: comment.text,
            like_count: comment.likeCount,
            published_at: comment.publishedAt,
          };
        })
        .filter((comment): comment is NonNullable<typeof comment> => comment !== null);

      if (commentRows.length > 0) {
        const { error: commentsUpsertError } = await adminClient
          .from('comments')
          .upsert(commentRows, {
            onConflict: 'user_id,youtube_comment_id',
          });

        if (commentsUpsertError) {
          console.error('Failed to upsert YouTube comments.', commentsUpsertError);
          throw new Error('Unable to import YouTube comments.');
        }
      }

      processedCount += comments.length;
      importedCount += commentRows.filter((comment) => !existingCommentIds.has(comment.youtube_comment_id)).length;
      updatedCount += commentRows.filter((comment) => existingCommentIds.has(comment.youtube_comment_id)).length;
      pageToken = commentsResponse.nextPageToken ?? null;

      const { data: updatedJob, error: updateJobError } = await adminClient
        .from('youtube_sync_jobs')
        .update({
          imported_count: importedCount,
          updated_count: updatedCount,
          processed_count: processedCount,
          page_token: pageToken,
        })
        .eq('id', jobId)
        .eq('user_id', user.id)
        .select('id, status, imported_count, updated_count, processed_count, page_token, error_message')
        .single<YoutubeSyncJobRow>();

      if (updateJobError || !updatedJob) {
        console.error('Failed to update YouTube sync job.', updateJobError);
        throw new Error('Unable to update YouTube sync job.');
      }
    } while (pageToken);

    const { data: completedJob, error: completeJobError } = await adminClient
      .from('youtube_sync_jobs')
      .update({
        status: 'completed',
        finished_at: new Date().toISOString(),
        page_token: null,
      })
      .eq('id', jobId)
      .eq('user_id', user.id)
      .select('id, status, imported_count, updated_count, processed_count, page_token, error_message')
      .single<YoutubeSyncJobRow>();

    if (completeJobError || !completedJob) {
      console.error('Failed to complete YouTube sync job.', completeJobError);
      return jsonResponse({ error: 'Unable to complete YouTube sync.' }, 500);
    }

    return jsonResponse({
      job: {
        id: completedJob.id,
        status: completedJob.status,
        importedCount: completedJob.imported_count,
        updatedCount: completedJob.updated_count,
        processedCount: completedJob.processed_count,
        pageToken: completedJob.page_token,
        errorMessage: completedJob.error_message,
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unable to sync YouTube comments.';

    console.error('youtube-sync-comments failed.', error);

    if (errorMessage.includes('invalid_grant')) {
      await adminClient
        .from('youtube_connections')
        .update({
          status: 'expired',
          revoked_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);
    }

    if (jobId) {
      const { data: failedJob } = await adminClient
        .from('youtube_sync_jobs')
        .update({
          status: 'failed',
          error_message: errorMessage,
          finished_at: new Date().toISOString(),
        })
        .eq('id', jobId)
        .eq('user_id', user.id)
        .select('id, status, imported_count, updated_count, processed_count, page_token, error_message')
        .single<YoutubeSyncJobRow>();

      if (failedJob) {
        return jsonResponse(
          {
            error: errorMessage,
            job: {
              id: failedJob.id,
              status: failedJob.status,
              importedCount: failedJob.imported_count,
              updatedCount: failedJob.updated_count,
              processedCount: failedJob.processed_count,
              pageToken: failedJob.page_token,
              errorMessage: failedJob.error_message,
            },
          },
          500,
        );
      }
    }

    return jsonResponse({ error: errorMessage }, 500);
  }
});
