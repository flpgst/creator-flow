import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.107.0';

const GOOGLE_OAUTH_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const YOUTUBE_CHANNELS_URL = 'https://www.googleapis.com/youtube/v3/channels';
const DEFAULT_APP_URL = 'http://localhost:4200';

type OAuthStateRow = {
  id: string;
  user_id: string;
};

type GoogleTokenResponse = {
  access_token?: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
  error?: string;
  error_description?: string;
};

type YoutubeChannelsResponse = {
  items?: Array<{
    id?: string;
    snippet?: {
      title?: string;
    };
  }>;
  error?: {
    message?: string;
  };
};

function requiredEnv(name: string): string {
  const value = Deno.env.get(name);

  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }

  return value;
}

function getAppUrl(): string {
  return Deno.env.get('APP_URL') ?? Deno.env.get('SITE_URL') ?? DEFAULT_APP_URL;
}

function buildAppUrl(path: string): URL {
  const appUrl = new URL(getAppUrl());
  const basePath = appUrl.pathname.endsWith('/') ? appUrl.pathname : `${appUrl.pathname}/`;
  const targetPath = path.replace(/^\/+/, '');

  appUrl.pathname = `${basePath}${targetPath}`.replaceAll(/\/{2,}/g, '/');
  appUrl.search = '';
  appUrl.hash = '';

  return appUrl;
}

function redirectToConnectYoutube(params: {
  status: 'success' | 'error';
  error?: string;
}): Response {
  const redirectUrl = buildAppUrl('/connect-youtube');
  redirectUrl.searchParams.set('youtubeConnection', params.status);

  if (params.error) {
    redirectUrl.searchParams.set('error', params.error);
  }

  return Response.redirect(redirectUrl.toString(), 303);
}

function base64UrlEncode(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');
}

async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

async function sha256Bytes(value: string): Promise<ArrayBuffer> {
  return crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
}

async function encryptToken(token: string, encryptionSecret: string): Promise<string> {
  if (encryptionSecret.length < 32) {
    throw new Error('YOUTUBE_TOKEN_ENCRYPTION_KEY must be at least 32 characters.');
  }

  const keyMaterial = await sha256Bytes(encryptionSecret);
  const key = await crypto.subtle.importKey('raw', keyMaterial, 'AES-GCM', false, ['encrypt']);
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

async function exchangeCodeForTokens(params: {
  code: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}): Promise<GoogleTokenResponse> {
  const body = new URLSearchParams();
  body.set('code', params.code);
  body.set('client_id', params.clientId);
  body.set('client_secret', params.clientSecret);
  body.set('redirect_uri', params.redirectUri);
  body.set('grant_type', 'authorization_code');

  const response = await fetch(GOOGLE_OAUTH_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });
  const tokenResponse = (await response.json()) as GoogleTokenResponse;

  if (!response.ok) {
    throw new Error(
      tokenResponse.error_description ?? tokenResponse.error ?? 'Google OAuth token exchange failed.',
    );
  }

  return tokenResponse;
}

async function fetchConnectedChannel(accessToken: string): Promise<{
  channelId: string;
  channelTitle: string;
}> {
  const url = new URL(YOUTUBE_CHANNELS_URL);
  url.searchParams.set('part', 'snippet');
  url.searchParams.set('mine', 'true');

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  const channelsResponse = (await response.json()) as YoutubeChannelsResponse;

  if (!response.ok) {
    throw new Error(channelsResponse.error?.message ?? 'Unable to fetch connected YouTube channel.');
  }

  const channel = channelsResponse.items?.[0];

  if (!channel?.id || !channel.snippet?.title) {
    throw new Error('No YouTube channel was found for the authorized account.');
  }

  return {
    channelId: channel.id,
    channelTitle: channel.snippet.title,
  };
}

Deno.serve(async (request) => {
  if (request.method !== 'GET') {
    return redirectToConnectYoutube({
      status: 'error',
      error: 'method_not_allowed',
    });
  }

  try {
    const requestUrl = new URL(request.url);
    const googleError = requestUrl.searchParams.get('error');
    const code = requestUrl.searchParams.get('code');
    const state = requestUrl.searchParams.get('state');

    if (googleError) {
      return redirectToConnectYoutube({
        status: 'error',
        error: googleError,
      });
    }

    if (!code || !state) {
      return redirectToConnectYoutube({
        status: 'error',
        error: 'missing_oauth_params',
      });
    }

    const supabaseUrl = requiredEnv('SUPABASE_URL');
    const supabaseServiceRoleKey = requiredEnv('SUPABASE_SERVICE_ROLE_KEY');
    const googleClientId = requiredEnv('GOOGLE_CLIENT_ID');
    const googleClientSecret = requiredEnv('GOOGLE_CLIENT_SECRET');
    const googleRedirectUri = requiredEnv('GOOGLE_OAUTH_REDIRECT_URI');
    const encryptionSecret = requiredEnv('YOUTUBE_TOKEN_ENCRYPTION_KEY');
    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
    const stateHash = await sha256Hex(state);
    const now = new Date().toISOString();
    const {
      data: oauthState,
      error: stateError,
    } = await adminClient
      .from('youtube_oauth_states')
      .update({ consumed_at: now })
      .eq('state_hash', stateHash)
      .is('consumed_at', null)
      .gt('expires_at', now)
      .select('id, user_id')
      .maybeSingle<OAuthStateRow>();

    if (stateError || !oauthState) {
      if (stateError) {
        console.error('Failed to validate YouTube OAuth state.', stateError);
      }

      return redirectToConnectYoutube({
        status: 'error',
        error: 'invalid_or_expired_state',
      });
    }

    const tokenResponse = await exchangeCodeForTokens({
      code,
      clientId: googleClientId,
      clientSecret: googleClientSecret,
      redirectUri: googleRedirectUri,
    });

    if (!tokenResponse.access_token) {
      throw new Error('Google OAuth did not return an access token.');
    }

    const { channelId, channelTitle } = await fetchConnectedChannel(tokenResponse.access_token);
    const { data: existingConnection, error: existingConnectionError } = await adminClient
      .from('youtube_connections')
      .select('encrypted_refresh_token')
      .eq('user_id', oauthState.user_id)
      .maybeSingle<{ encrypted_refresh_token: string }>();

    if (existingConnectionError) {
      console.error('Failed to fetch existing YouTube connection.', existingConnectionError);
      throw new Error('Unable to persist YouTube connection.');
    }

    if (!tokenResponse.refresh_token && !existingConnection?.encrypted_refresh_token) {
      throw new Error('Google OAuth did not return a refresh token.');
    }

    const existingEncryptedRefreshToken = existingConnection?.encrypted_refresh_token;
    const encryptedRefreshToken = tokenResponse.refresh_token
      ? await encryptToken(tokenResponse.refresh_token, encryptionSecret)
      : existingEncryptedRefreshToken;

    if (!encryptedRefreshToken) {
      throw new Error('No refresh token is available to persist.');
    }

    const encryptedAccessToken = await encryptToken(tokenResponse.access_token, encryptionSecret);
    const expiresInSeconds = typeof tokenResponse.expires_in === 'number' && Number.isFinite(tokenResponse.expires_in)
      ? tokenResponse.expires_in
      : 3600;
    const accessTokenExpiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString();
    const scopes = tokenResponse.scope?.split(/\s+/).filter(Boolean) ?? [];

    const { error: upsertError } = await adminClient.from('youtube_connections').upsert(
      {
        user_id: oauthState.user_id,
        channel_id: channelId,
        channel_title: channelTitle,
        scopes,
        status: 'active',
        encrypted_refresh_token: encryptedRefreshToken,
        encrypted_access_token: encryptedAccessToken,
        access_token_expires_at: accessTokenExpiresAt,
        connected_at: now,
        revoked_at: null,
      },
      {
        onConflict: 'user_id',
      },
    );

    if (upsertError) {
      console.error('Failed to upsert YouTube connection.', upsertError);
      throw new Error('Unable to persist YouTube connection.');
    }

    return redirectToConnectYoutube({
      status: 'success',
    });
  } catch (error) {
    console.error('youtube-oauth-callback failed.', error);

    return redirectToConnectYoutube({
      status: 'error',
      error: 'oauth_callback_failed',
    });
  }
});
