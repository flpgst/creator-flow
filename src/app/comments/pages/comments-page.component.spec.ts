import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';

import { CommentsService } from '../comments.service';
import { CommentsPageComponent } from './comments-page.component';
import type { CommentListItem } from '../../shared/models/view-models';

function makeCommentItem(
  id: string,
  overrides: Partial<CommentListItem> & {
    publishedAt?: string;
    likeCount?: number;
    videoTitle?: string;
  } = {},
): CommentListItem {
  return {
    comment: {
      id,
      userId: 'user-1',
      youtubeCommentId: `youtube-${id}`,
      youtubeVideoId: `video-${id}`,
      authorName: 'Author',
      authorChannelUrl: null,
      text: `Comment ${id}`,
      likeCount: overrides.likeCount ?? 0,
      isFavorite: overrides.isFavorite ?? false,
      publishedAt: overrides.publishedAt ?? '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      createdAt: '2026-01-01T00:00:00.000Z',
    },
    video: {
      id: `video-${id}`,
      userId: 'user-1',
      youtubeVideoId: `yt-video-${id}`,
      title: overrides.videoTitle ?? `Video ${id}`,
      url: `https://youtube.test/${id}`,
      publishedAt: null,
      thumbnailUrl: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    isFavorite: overrides.isFavorite ?? false,
    isSelected: overrides.isSelected ?? false,
    usedInScripts: overrides.usedInScripts ?? [],
  };
}

describe('CommentsPageComponent', () => {
  let fixture: ComponentFixture<CommentsPageComponent>;
  let component: CommentsPageComponent;
  let commentsState: ReturnType<typeof signal<CommentListItem[]>>;
  let commentsService: Pick<
    CommentsService,
    | 'comments'
    | 'loading'
    | 'syncing'
    | 'error'
    | 'lastSyncJob'
    | 'loadComments'
    | 'syncComments'
    | 'setFavorite'
  > & {
    loadComments: jasmine.Spy;
    syncComments: jasmine.Spy;
    setFavorite: jasmine.Spy;
  };

  beforeEach(async () => {
    commentsState = signal<CommentListItem[]>([
      makeCommentItem('old-used', {
        publishedAt: '2026-01-01T00:00:00.000Z',
        likeCount: 5,
        videoTitle: 'Beta',
        usedInScripts: [{ id: 'script-1', title: 'Used script' }],
      }),
      makeCommentItem('new-favorite', {
        publishedAt: '2026-01-03T00:00:00.000Z',
        likeCount: 1,
        videoTitle: 'Alpha',
        isFavorite: true,
      }),
      makeCommentItem('liked', {
        publishedAt: '2026-01-02T00:00:00.000Z',
        likeCount: 10,
        videoTitle: 'Alpha',
      }),
    ]);

    commentsService = {
      comments: commentsState.asReadonly(),
      loading: signal(false).asReadonly(),
      syncing: signal(false).asReadonly(),
      error: signal<string | null>(null).asReadonly(),
      lastSyncJob: signal(null).asReadonly(),
      loadComments: jasmine.createSpy('loadComments').and.resolveTo(),
      syncComments: jasmine.createSpy('syncComments').and.resolveTo(),
      setFavorite: jasmine.createSpy('setFavorite').and.resolveTo(),
    };

    await TestBed.configureTestingModule({
      imports: [CommentsPageComponent],
      providers: [
        { provide: CommentsService, useValue: commentsService },
        {
          provide: Router,
          useValue: jasmine.createSpyObj<Router>('Router', ['navigate']),
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CommentsPageComponent);
    component = fixture.componentInstance;
  });

  it('orders comments by the essential sort modes', () => {
    expect(component.sortedComments().map((item) => item.comment.id)).toEqual([
      'new-favorite',
      'liked',
      'old-used',
    ]);

    component.updateSortMode('oldest');
    expect(component.sortedComments().map((item) => item.comment.id)).toEqual([
      'old-used',
      'liked',
      'new-favorite',
    ]);

    component.updateSortMode('mostLiked');
    expect(component.sortedComments().map((item) => item.comment.id)).toEqual([
      'liked',
      'old-used',
      'new-favorite',
    ]);

    component.updateSortMode('unusedFirst');
    expect(component.sortedComments().map((item) => item.comment.id)).toEqual([
      'new-favorite',
      'liked',
      'old-used',
    ]);

    component.updateSortMode('favoritesFirst');
    expect(component.sortedComments().map((item) => item.comment.id)).toEqual([
      'new-favorite',
      'liked',
      'old-used',
    ]);

    component.updateSortMode('video');
    expect(component.sortedComments().map((item) => item.comment.id)).toEqual([
      'new-favorite',
      'liked',
      'old-used',
    ]);
  });

  it('delegates favorite toggling with the inverted current state', async () => {
    await component.toggleFavorite(commentsState()[0]);

    expect(commentsService.setFavorite).toHaveBeenCalledOnceWith('old-used', true);
  });
});
