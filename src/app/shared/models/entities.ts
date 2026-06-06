export type EntityId = string;
export type IsoDateString = string;

export interface Profile {
  id: EntityId;
  email: string;
  displayName: string | null;
  createdAt: IsoDateString;
}

export interface YoutubeConnection {
  id: EntityId;
  userId: EntityId;
  channelId: string;
  channelTitle: string;
  scopes: string[];
  status: 'active' | 'expired' | 'revoked';
  connectedAt: IsoDateString;
  updatedAt: IsoDateString;
}

export interface YoutubeSyncJob {
  id: EntityId;
  userId: EntityId;
  status: 'pending' | 'running' | 'completed' | 'failed';
  importedCount: number;
  updatedCount: number;
  errorMessage: string | null;
  startedAt: IsoDateString;
  finishedAt: IsoDateString | null;
}

export interface YoutubeVideo {
  id: EntityId;
  userId: EntityId;
  youtubeVideoId: string;
  title: string;
  url: string;
  publishedAt: IsoDateString | null;
  thumbnailUrl: string | null;
}

export interface Comment {
  id: EntityId;
  userId: EntityId;
  youtubeCommentId: string;
  youtubeVideoId: EntityId;
  authorName: string;
  authorChannelUrl: string | null;
  text: string;
  likeCount: number;
  isFavorite: boolean;
  publishedAt: IsoDateString;
  updatedAt: IsoDateString;
}

export interface Script {
  id: EntityId;
  userId: EntityId;
  title: string;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
}

export interface ScriptComment {
  id: EntityId;
  scriptId: EntityId;
  commentId: EntityId;
  position: number;
  commentTextSnapshot: string;
  videoTitleSnapshot: string;
  videoUrlSnapshot: string;
}
