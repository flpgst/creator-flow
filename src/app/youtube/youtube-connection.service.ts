import { computed, Injectable, inject, signal } from '@angular/core';

import type { YoutubeConnection } from '../shared/models/entities';
import type { Tables } from '../shared/models/database.types';
import { SupabaseService } from '../shared/services/supabase.service';

type YoutubeConnectionRow = Pick<
  Tables<'youtube_connections'>,
  | 'id'
  | 'user_id'
  | 'channel_id'
  | 'channel_title'
  | 'scopes'
  | 'status'
  | 'access_token_expires_at'
  | 'connected_at'
  | 'updated_at'
  | 'revoked_at'
>;

type YoutubeOAuthStartResponse = {
  authorizationUrl?: string;
  error?: string;
};

@Injectable({
  providedIn: 'root',
})
export class YoutubeConnectionService {
  private readonly supabaseService = inject(SupabaseService);
  private readonly connectionState = signal<YoutubeConnection | null>(null);
  private readonly loadingState = signal(false);
  private readonly connectingState = signal(false);
  private readonly errorState = signal<string | null>(null);

  readonly connection = this.connectionState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly connecting = this.connectingState.asReadonly();
  readonly error = this.errorState.asReadonly();
  readonly hasActiveConnection = computed(
    () => this.connectionState()?.status === 'active',
  );

  async loadCurrentConnection(): Promise<void> {
    this.loadingState.set(true);
    this.errorState.set(null);

    try {
      const { data, error } = await this.supabaseService.client
        .from('youtube_connections')
        .select(
          [
            'id',
            'user_id',
            'channel_id',
            'channel_title',
            'scopes',
            'status',
            'access_token_expires_at',
            'connected_at',
            'updated_at',
            'revoked_at',
          ].join(','),
        )
        .maybeSingle();

      if (error) {
        throw new Error(error.message);
      }

      const connection = data as YoutubeConnectionRow | null;
      this.connectionState.set(connection ? this.mapConnection(connection) : null);
    } catch (error) {
      this.errorState.set(this.toConnectionErrorMessage(error));
      throw error;
    } finally {
      this.loadingState.set(false);
    }
  }

  async getAuthorizationUrl(): Promise<string> {
    this.connectingState.set(true);
    this.errorState.set(null);

    try {
      const { data, error } =
        await this.supabaseService.client.functions.invoke<YoutubeOAuthStartResponse>(
          'youtube-oauth-start',
          {
            method: 'POST',
          },
        );

      if (error) {
        throw new Error(error.message);
      }

      if (!data?.authorizationUrl) {
        throw new Error(data?.error ?? 'YouTube OAuth did not return a URL.');
      }

      return data.authorizationUrl;
    } catch (error) {
      this.errorState.set(this.toConnectionErrorMessage(error));
      throw error;
    } finally {
      this.connectingState.set(false);
    }
  }

  clearError(): void {
    this.errorState.set(null);
  }

  private mapConnection(row: YoutubeConnectionRow): YoutubeConnection {
    return {
      id: row.id,
      userId: row.user_id,
      channelId: row.channel_id,
      channelTitle: row.channel_title,
      scopes: row.scopes,
      status: row.status,
      accessTokenExpiresAt: row.access_token_expires_at,
      connectedAt: row.connected_at,
      updatedAt: row.updated_at,
      revokedAt: row.revoked_at,
    };
  }

  private toConnectionErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message.trim().length > 0) {
      return error.message;
    }

    return 'Nao foi possivel carregar a conexao com o YouTube.';
  }
}
