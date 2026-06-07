import { Injectable, inject, signal } from '@angular/core';

import { AuthService } from '../auth/auth.service';
import type { Comment, Script, ScriptComment, YoutubeVideo } from '../shared/models/entities';
import type { Tables, TablesInsert } from '../shared/models/database.types';
import type {
  CommentListItem,
  ScriptCommentItem,
  ScriptDetailViewModel,
} from '../shared/models/view-models';
import { SupabaseService } from '../shared/services/supabase.service';

type CommentRow = Tables<'comments'>;
type YoutubeVideoRow = Tables<'youtube_videos'>;
type ScriptRow = Tables<'scripts'>;
type ScriptCommentRow = Tables<'script_comments'>;
type ScriptCommentInsert = TablesInsert<'script_comments'>;

@Injectable({
  providedIn: 'root',
})
export class ScriptsService {
  private readonly authService = inject(AuthService);
  private readonly supabaseService = inject(SupabaseService);
  private readonly savingState = signal(false);
  private readonly loadingState = signal(false);
  private readonly errorState = signal<string | null>(null);

  readonly saving = this.savingState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly error = this.errorState.asReadonly();

  async loadScript(scriptId: string): Promise<ScriptDetailViewModel | null> {
    this.loadingState.set(true);
    this.errorState.set(null);

    try {
      const { data: scriptRow, error: scriptError } = await this.supabaseService.client
        .from('scripts')
        .select('id, user_id, title, created_at, updated_at')
        .eq('id', scriptId)
        .maybeSingle<ScriptRow>();

      if (scriptError) {
        throw new Error(scriptError.message);
      }

      if (!scriptRow) {
        return null;
      }

      const { data: scriptCommentRows, error: commentsError } =
        await this.supabaseService.client
          .from('script_comments')
          .select(
            [
              'id',
              'script_id',
              'comment_id',
              'position',
              'comment_text_snapshot',
              'video_title_snapshot',
              'video_url_snapshot',
              'created_at',
            ].join(','),
          )
          .eq('script_id', scriptRow.id)
          .order('position', {
            ascending: true,
          })
          .returns<ScriptCommentRow[]>();

      if (commentsError) {
        throw new Error(commentsError.message);
      }

      return {
        script: this.mapScript(scriptRow),
        comments: (scriptCommentRows ?? []).map((comment) =>
          this.mapScriptCommentItem(comment),
        ),
      };
    } catch (error) {
      this.errorState.set(this.toScriptsErrorMessage(error));
      throw error;
    } finally {
      this.loadingState.set(false);
    }
  }

  async loadSelectedComments(commentIds: string[]): Promise<CommentListItem[]> {
    const uniqueCommentIds = [...new Set(commentIds)];

    if (uniqueCommentIds.length === 0) {
      return [];
    }

    this.loadingState.set(true);
    this.errorState.set(null);

    try {
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
          .in('id', uniqueCommentIds)
          .returns<CommentRow[]>();

      if (commentsError) {
        throw new Error(commentsError.message);
      }

      const comments = commentRows ?? [];
      const videoIds = [...new Set(comments.map((comment) => comment.youtube_video_id))];
      const videosById = await this.fetchVideosById(videoIds);
      const commentOrder = new Map(uniqueCommentIds.map((id, index) => [id, index]));

      const items = comments
        .map((comment): CommentListItem | null => {
          const video = videosById.get(comment.youtube_video_id);

          if (!video) {
            return null;
          }

          return {
            comment: this.mapComment(comment),
            video: this.mapVideo(video),
            isFavorite: comment.is_favorite,
            isSelected: true,
            usedInScripts: [],
          };
        })
        .filter((item): item is CommentListItem => item !== null);

      return items.sort(
        (first, second) =>
          (commentOrder.get(first.comment.id) ?? Number.MAX_SAFE_INTEGER) -
          (commentOrder.get(second.comment.id) ?? Number.MAX_SAFE_INTEGER),
      );
    } catch (error) {
      this.errorState.set(this.toScriptsErrorMessage(error));
      throw error;
    } finally {
      this.loadingState.set(false);
    }
  }

  async createScript(title: string, comments: CommentListItem[]): Promise<Script> {
    const normalizedTitle = title.trim();

    if (normalizedTitle.length === 0) {
      throw new Error('Informe um titulo para salvar o roteiro.');
    }

    this.savingState.set(true);
    this.errorState.set(null);

    let createdScriptId: string | null = null;

    try {
      const user = await this.authService.getCurrentUser();

      if (!user) {
        throw new Error('Sessao expirada. Entre novamente para salvar o roteiro.');
      }

      const { data: scriptRow, error: scriptError } = await this.supabaseService.client
        .from('scripts')
        .insert({
          user_id: user.id,
          title: normalizedTitle,
        })
        .select('id, user_id, title, created_at, updated_at')
        .single<ScriptRow>();

      if (scriptError) {
        throw new Error(scriptError.message);
      }

      createdScriptId = scriptRow.id;

      if (comments.length > 0) {
        const scriptComments: ScriptCommentInsert[] = comments.map((item, index) => ({
          script_id: scriptRow.id,
          comment_id: item.comment.id,
          position: index,
          comment_text_snapshot: item.comment.text,
          video_title_snapshot: item.video.title,
          video_url_snapshot: item.video.url,
        }));

        const { error: scriptCommentsError } = await this.supabaseService.client
          .from('script_comments')
          .insert(scriptComments);

        if (scriptCommentsError) {
          throw new Error(scriptCommentsError.message);
        }
      }

      return this.mapScript(scriptRow);
    } catch (error) {
      if (createdScriptId) {
        await this.rollbackCreatedScript(createdScriptId);
      }

      this.errorState.set(this.toScriptsErrorMessage(error));
      throw error;
    } finally {
      this.savingState.set(false);
    }
  }

  async updateScriptComments(
    scriptId: string,
    comments: ScriptCommentItem[],
  ): Promise<ScriptCommentItem[]> {
    this.savingState.set(true);
    this.errorState.set(null);

    try {
      const { error: deleteError } = await this.supabaseService.client
        .from('script_comments')
        .delete()
        .eq('script_id', scriptId);

      if (deleteError) {
        throw new Error(deleteError.message);
      }

      if (comments.length === 0) {
        return [];
      }

      const scriptComments: ScriptCommentInsert[] = comments.map((item, index) => ({
        script_id: scriptId,
        comment_id: item.commentId,
        position: index,
        comment_text_snapshot: item.text,
        video_title_snapshot: item.videoTitle,
        video_url_snapshot: item.videoUrl,
      }));

      const { data, error: insertError } = await this.supabaseService.client
        .from('script_comments')
        .insert(scriptComments)
        .select(
          [
            'id',
            'script_id',
            'comment_id',
            'position',
            'comment_text_snapshot',
            'video_title_snapshot',
            'video_url_snapshot',
            'created_at',
          ].join(','),
        )
        .order('position', {
          ascending: true,
        })
        .returns<ScriptCommentRow[]>();

      if (insertError) {
        throw new Error(insertError.message);
      }

      return (data ?? []).map((comment) => this.mapScriptCommentItem(comment));
    } catch (error) {
      this.errorState.set(this.toScriptsErrorMessage(error));
      throw error;
    } finally {
      this.savingState.set(false);
    }
  }

  clearError(): void {
    this.errorState.set(null);
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

  private async rollbackCreatedScript(scriptId: string): Promise<void> {
    const { error } = await this.supabaseService.client
      .from('scripts')
      .delete()
      .eq('id', scriptId);

    if (error) {
      this.errorState.set(
        `Nao foi possivel salvar o roteiro e a limpeza automatica falhou: ${error.message}`,
      );
    }
  }

  private mapScript(row: ScriptRow): Script {
    return {
      id: row.id,
      userId: row.user_id,
      title: row.title,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapScriptComment(row: ScriptCommentRow): ScriptComment {
    return {
      id: row.id,
      scriptId: row.script_id,
      commentId: row.comment_id,
      position: row.position,
      commentTextSnapshot: row.comment_text_snapshot,
      videoTitleSnapshot: row.video_title_snapshot,
      videoUrlSnapshot: row.video_url_snapshot,
      createdAt: row.created_at,
    };
  }

  private mapScriptCommentItem(row: ScriptCommentRow): ScriptCommentItem {
    const scriptComment = this.mapScriptComment(row);

    return {
      id: scriptComment.id,
      commentId: scriptComment.commentId,
      text: scriptComment.commentTextSnapshot,
      videoTitle: scriptComment.videoTitleSnapshot,
      videoUrl: scriptComment.videoUrlSnapshot,
      position: scriptComment.position,
    };
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

  private toScriptsErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message.trim().length > 0) {
      return error.message;
    }

    return 'Nao foi possivel processar o roteiro.';
  }
}
