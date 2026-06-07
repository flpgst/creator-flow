import { Injectable, inject, signal } from '@angular/core';

import type { Comment, YoutubeSyncJob, YoutubeVideo } from '../shared/models/entities';
import type { Tables } from '../shared/models/database.types';
import type { CommentListItem, UsedInScriptBadge } from '../shared/models/view-models';
import { SupabaseService } from '../shared/services/supabase.service';

type CommentRow = Tables<'comments'>;
type YoutubeVideoRow = Tables<'youtube_videos'>;
type ScriptRow = Pick<Tables<'scripts'>, 'id' | 'title'>;
type ScriptCommentRow = Pick<Tables<'script_comments'>, 'comment_id' | 'script_id'>;
type YoutubeSyncJobRow = Tables<'youtube_sync_jobs'>;

type YoutubeSyncCommentsResponse = {
  error?: string;
  job?: {
    id: string;
    status: YoutubeSyncJob['status'];
    importedCount: number;
    updatedCount: number;
    processedCount: number;
    pageToken: string | null;
    errorMessage: string | null;
  };
};

@Injectable({
  providedIn: 'root',
})
export class CommentsService {
  private readonly supabaseService = inject(SupabaseService);
  private readonly commentsState = signal<CommentListItem[]>([]);
  private readonly lastSyncJobState = signal<YoutubeSyncJob | null>(null);
  private readonly loadingState = signal(false);
  private readonly syncingState = signal(false);
  private readonly errorState = signal<string | null>(null);

  readonly comments = this.commentsState.asReadonly();
  readonly lastSyncJob = this.lastSyncJobState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly syncing = this.syncingState.asReadonly();
  readonly error = this.errorState.asReadonly();

  async loadComments(): Promise<void> {
    this.loadingState.set(true);
    this.errorState.set(null);

    try {
      const [comments, lastSyncJob] = await Promise.all([
        this.fetchCommentListItems(),
        this.fetchLastSyncJob(),
      ]);

      this.commentsState.set(comments);
      this.lastSyncJobState.set(lastSyncJob);
    } catch (error) {
      try {
        this.lastSyncJobState.set(await this.fetchLastSyncJob());
      } catch {
        // Keep the original sync error as the user-facing failure.
      }

      this.errorState.set(this.toCommentsErrorMessage(error));
      throw error;
    } finally {
      this.loadingState.set(false);
    }
  }

  async syncComments(): Promise<void> {
    this.syncingState.set(true);
    this.errorState.set(null);

    try {
      const { data, error } =
        await this.supabaseService.client.functions.invoke<YoutubeSyncCommentsResponse>(
          'youtube-sync-comments',
          {
            method: 'POST',
          },
        );

      if (error) {
        throw new Error(error.message);
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      if (data?.job) {
        this.lastSyncJobState.set(this.mapSyncJobResponse(data.job));
      }

      this.commentsState.set(await this.fetchCommentListItems());
      this.lastSyncJobState.set(await this.fetchLastSyncJob());
    } catch (error) {
      this.errorState.set(this.toCommentsErrorMessage(error));
      throw error;
    } finally {
      this.syncingState.set(false);
    }
  }

  async setFavorite(commentId: string, isFavorite: boolean): Promise<void> {
    const previousComments = this.commentsState();
    this.commentsState.set(
      previousComments.map((item) =>
        item.comment.id === commentId
          ? {
              ...item,
              isFavorite,
              comment: {
                ...item.comment,
                isFavorite,
              },
            }
          : item,
      ),
    );
    this.errorState.set(null);

    try {
      const { error } = await this.supabaseService.client
        .from('comments')
        .update({
          is_favorite: isFavorite,
        })
        .eq('id', commentId);

      if (error) {
        throw new Error(error.message);
      }
    } catch (error) {
      this.commentsState.set(previousComments);
      this.errorState.set(this.toCommentsErrorMessage(error));
      throw error;
    }
  }

  clearError(): void {
    this.errorState.set(null);
  }

  private async fetchCommentListItems(): Promise<CommentListItem[]> {
    const { data: commentRows, error: commentsError } =
      await this.supabaseService.client
        .from('comments')
        .select(
          [
            'id',
            'user_id',
            'youtube_comment_id',
            'youtube_video_id',
            'author_name',
            'author_channel_url',
            'text',
            'like_count',
            'is_favorite',
            'published_at',
            'updated_at',
            'created_at',
          ].join(','),
        )
        .order('published_at', {
          ascending: false,
        })
        .returns<CommentRow[]>();

    if (commentsError) {
      throw new Error(commentsError.message);
    }

    const comments = commentRows ?? [];
    const videoIds = [...new Set(comments.map((comment) => comment.youtube_video_id))];
    const commentIds = comments.map((comment) => comment.id);
    const [videosById, usedScriptsByCommentId] = await Promise.all([
      this.fetchVideosById(videoIds),
      this.fetchUsedScriptsByCommentId(commentIds),
    ]);

    return comments
      .map((comment) => {
        const video = videosById.get(comment.youtube_video_id);

        if (!video) {
          return null;
        }

        return {
          comment: this.mapComment(comment),
          video: this.mapVideo(video),
          isFavorite: comment.is_favorite,
          isSelected: false,
          usedInScripts: usedScriptsByCommentId.get(comment.id) ?? [],
        };
      })
      .filter((item): item is CommentListItem => item !== null);
  }

  private async fetchVideosById(videoIds: string[]): Promise<Map<string, YoutubeVideoRow>> {
    if (videoIds.length === 0) {
      return new Map();
    }

    const { data, error } = await this.supabaseService.client
      .from('youtube_videos')
      .select(
        [
          'id',
          'user_id',
          'youtube_video_id',
          'title',
          'url',
          'published_at',
          'thumbnail_url',
          'created_at',
          'updated_at',
        ].join(','),
      )
      .in('id', videoIds)
      .returns<YoutubeVideoRow[]>();

    if (error) {
      throw new Error(error.message);
    }

    return new Map((data ?? []).map((video) => [video.id, video]));
  }

  private async fetchUsedScriptsByCommentId(
    commentIds: string[],
  ): Promise<Map<string, UsedInScriptBadge[]>> {
    if (commentIds.length === 0) {
      return new Map();
    }

    const { data: scriptCommentRows, error: scriptCommentsError } =
      await this.supabaseService.client
        .from('script_comments')
        .select('comment_id, script_id')
        .in('comment_id', commentIds)
        .returns<ScriptCommentRow[]>();

    if (scriptCommentsError) {
      throw new Error(scriptCommentsError.message);
    }

    const scriptComments = scriptCommentRows ?? [];
    const scriptIds = [...new Set(scriptComments.map((item) => item.script_id))];

    if (scriptIds.length === 0) {
      return new Map();
    }

    const { data: scriptRows, error: scriptsError } =
      await this.supabaseService.client
        .from('scripts')
        .select('id, title')
        .in('id', scriptIds)
        .returns<ScriptRow[]>();

    if (scriptsError) {
      throw new Error(scriptsError.message);
    }

    const scriptsById = new Map((scriptRows ?? []).map((script) => [script.id, script]));
    const usedScriptsByCommentId = new Map<string, UsedInScriptBadge[]>();

    for (const scriptComment of scriptComments) {
      const script = scriptsById.get(scriptComment.script_id);

      if (!script) {
        continue;
      }

      const usedScripts = usedScriptsByCommentId.get(scriptComment.comment_id) ?? [];
      usedScripts.push({
        id: script.id,
        title: script.title,
      });
      usedScriptsByCommentId.set(scriptComment.comment_id, usedScripts);
    }

    return usedScriptsByCommentId;
  }

  private async fetchLastSyncJob(): Promise<YoutubeSyncJob | null> {
    const { data, error } = await this.supabaseService.client
      .from('youtube_sync_jobs')
      .select(
        [
          'id',
          'user_id',
          'youtube_connection_id',
          'status',
          'imported_count',
          'updated_count',
          'processed_count',
          'page_token',
          'error_message',
          'started_at',
          'finished_at',
          'created_at',
        ].join(','),
      )
      .order('started_at', {
        ascending: false,
      })
      .limit(1)
      .maybeSingle<YoutubeSyncJobRow>();

    if (error) {
      throw new Error(error.message);
    }

    return data ? this.mapSyncJob(data) : null;
  }

  private mapComment(row: CommentRow): Comment {
    return {
      id: row.id,
      userId: row.user_id,
      youtubeCommentId: row.youtube_comment_id,
      youtubeVideoId: row.youtube_video_id,
      authorName: row.author_name,
      authorChannelUrl: row.author_channel_url,
      text: row.text,
      likeCount: row.like_count,
      isFavorite: row.is_favorite,
      publishedAt: row.published_at,
      updatedAt: row.updated_at,
      createdAt: row.created_at,
    };
  }

  private mapVideo(row: YoutubeVideoRow): YoutubeVideo {
    return {
      id: row.id,
      userId: row.user_id,
      youtubeVideoId: row.youtube_video_id,
      title: row.title,
      url: row.url,
      publishedAt: row.published_at,
      thumbnailUrl: row.thumbnail_url,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapSyncJob(row: YoutubeSyncJobRow): YoutubeSyncJob {
    return {
      id: row.id,
      userId: row.user_id,
      status: row.status,
      importedCount: row.imported_count,
      updatedCount: row.updated_count,
      processedCount: row.processed_count,
      pageToken: row.page_token,
      errorMessage: row.error_message,
      startedAt: row.started_at,
      finishedAt: row.finished_at,
      createdAt: row.created_at,
    };
  }

  private mapSyncJobResponse(job: NonNullable<YoutubeSyncCommentsResponse['job']>): YoutubeSyncJob {
    const now = new Date().toISOString();

    return {
      id: job.id,
      userId: '',
      status: job.status,
      importedCount: job.importedCount,
      updatedCount: job.updatedCount,
      processedCount: job.processedCount,
      pageToken: job.pageToken,
      errorMessage: job.errorMessage,
      startedAt: now,
      finishedAt: now,
      createdAt: now,
    };
  }

  private toCommentsErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message.trim().length > 0) {
      return error.message;
    }

    return 'Nao foi possivel carregar os comentarios.';
  }
}
