export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type PublicTable<Row, Insert, Update = Partial<Insert>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: never[];
};

export type YoutubeConnectionStatus = 'active' | 'expired' | 'revoked';
export type YoutubeSyncJobStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface Database {
  public: {
    Tables: {
      profiles: PublicTable<
        {
          id: string;
          email: string;
          display_name: string | null;
          created_at: string;
          updated_at: string;
        },
        {
          id: string;
          email: string;
          display_name?: string | null;
          created_at?: string;
          updated_at?: string;
        }
      >;
      youtube_connections: PublicTable<
        {
          id: string;
          user_id: string;
          channel_id: string;
          channel_title: string;
          scopes: string[];
          status: YoutubeConnectionStatus;
          encrypted_refresh_token: string;
          encrypted_access_token: string | null;
          access_token_expires_at: string | null;
          connected_at: string;
          updated_at: string;
          revoked_at: string | null;
        },
        {
          id?: string;
          user_id: string;
          channel_id: string;
          channel_title: string;
          scopes?: string[];
          status?: YoutubeConnectionStatus;
          encrypted_refresh_token: string;
          encrypted_access_token?: string | null;
          access_token_expires_at?: string | null;
          connected_at?: string;
          updated_at?: string;
          revoked_at?: string | null;
        }
      >;
      youtube_sync_jobs: PublicTable<
        {
          id: string;
          user_id: string;
          youtube_connection_id: string | null;
          status: YoutubeSyncJobStatus;
          imported_count: number;
          updated_count: number;
          processed_count: number;
          page_token: string | null;
          error_message: string | null;
          started_at: string;
          finished_at: string | null;
          created_at: string;
        },
        {
          id?: string;
          user_id: string;
          youtube_connection_id?: string | null;
          status?: YoutubeSyncJobStatus;
          imported_count?: number;
          updated_count?: number;
          processed_count?: number;
          page_token?: string | null;
          error_message?: string | null;
          started_at?: string;
          finished_at?: string | null;
          created_at?: string;
        }
      >;
      youtube_oauth_states: PublicTable<
        {
          id: string;
          user_id: string;
          state_hash: string;
          expires_at: string;
          consumed_at: string | null;
          created_at: string;
        },
        {
          id?: string;
          user_id: string;
          state_hash: string;
          expires_at: string;
          consumed_at?: string | null;
          created_at?: string;
        }
      >;
      youtube_videos: PublicTable<
        {
          id: string;
          user_id: string;
          youtube_video_id: string;
          title: string;
          url: string;
          published_at: string | null;
          thumbnail_url: string | null;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          user_id: string;
          youtube_video_id: string;
          title: string;
          url: string;
          published_at?: string | null;
          thumbnail_url?: string | null;
          created_at?: string;
          updated_at?: string;
        }
      >;
      comments: PublicTable<
        {
          id: string;
          user_id: string;
          youtube_comment_id: string;
          youtube_video_id: string;
          author_name: string;
          author_channel_url: string | null;
          text: string;
          like_count: number;
          is_favorite: boolean;
          published_at: string;
          updated_at: string;
          created_at: string;
        },
        {
          id?: string;
          user_id: string;
          youtube_comment_id: string;
          youtube_video_id: string;
          author_name: string;
          author_channel_url?: string | null;
          text: string;
          like_count?: number;
          is_favorite?: boolean;
          published_at: string;
          updated_at?: string;
          created_at?: string;
        }
      >;
      scripts: PublicTable<
        {
          id: string;
          user_id: string;
          title: string;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          user_id: string;
          title: string;
          created_at?: string;
          updated_at?: string;
        }
      >;
      script_comments: PublicTable<
        {
          id: string;
          script_id: string;
          comment_id: string;
          position: number;
          comment_text_snapshot: string;
          video_title_snapshot: string;
          video_url_snapshot: string;
          is_answered: boolean;
          created_at: string;
        },
        {
          id?: string;
          script_id: string;
          comment_id: string;
          position: number;
          comment_text_snapshot: string;
          video_title_snapshot: string;
          video_url_snapshot: string;
          is_answered?: boolean;
          created_at?: string;
        }
      >;
    };
    Views: Record<string, never>;
    Functions: {
      replace_script_comments: {
        Args: {
          p_script_id: string;
          p_comments?: Json;
        };
        Returns: {
          id: string;
          script_id: string;
          comment_id: string;
          position: number;
          comment_text_snapshot: string;
          video_title_snapshot: string;
          video_url_snapshot: string;
          is_answered: boolean;
          created_at: string;
        }[];
      };
    };
    Enums: {
      youtube_connection_status: YoutubeConnectionStatus;
      youtube_sync_job_status: YoutubeSyncJobStatus;
    };
    CompositeTypes: Record<string, never>;
  };
}

export type Tables<TableName extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][TableName]['Row'];

export type TablesInsert<TableName extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][TableName]['Insert'];

export type TablesUpdate<TableName extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][TableName]['Update'];
