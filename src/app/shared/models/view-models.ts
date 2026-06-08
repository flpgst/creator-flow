import { Comment, EntityId, Script, YoutubeVideo } from './entities';

export interface UsedInScriptBadge {
  id: EntityId;
  title: Script['title'];
}

export interface CommentListItem {
  comment: Comment;
  video: YoutubeVideo;
  isFavorite: boolean;
  isSelected: boolean;
  usedInScripts: UsedInScriptBadge[];
}

export interface ScriptCommentItem {
  id: EntityId;
  commentId: EntityId;
  text: string;
  videoTitle: string;
  videoUrl: string;
  position: number;
  isAnswered: boolean;
}

export interface ScriptDetailViewModel {
  script: Script;
  comments: ScriptCommentItem[];
}

export interface ScriptListItem {
  script: Script;
  commentCount: number;
}
