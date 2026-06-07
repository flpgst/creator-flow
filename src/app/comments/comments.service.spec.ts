import { TestBed } from '@angular/core/testing';

import { CommentsService } from './comments.service';
import { SupabaseService } from '../shared/services/supabase.service';

type MockQuery = Record<string, jasmine.Spy>;

function createQuery(methods: MockQuery): MockQuery {
  return methods;
}

describe('CommentsService', () => {
  let service: CommentsService;
  let fromSpy: jasmine.Spy;
  let updateSpy: jasmine.Spy;

  const commentRows = [
    {
      id: 'comment-1',
      user_id: 'user-1',
      youtube_comment_id: 'youtube-comment-1',
      youtube_video_id: 'video-1',
      author_name: 'Ana',
      author_channel_url: null,
      text: 'First comment',
      like_count: 3,
      is_favorite: false,
      published_at: '2026-01-02T00:00:00.000Z',
      updated_at: '2026-01-02T00:00:00.000Z',
      created_at: '2026-01-02T00:00:00.000Z',
    },
    {
      id: 'comment-2',
      user_id: 'user-1',
      youtube_comment_id: 'youtube-comment-2',
      youtube_video_id: 'video-2',
      author_name: 'Bruno',
      author_channel_url: 'https://youtube.test/bruno',
      text: 'Second comment',
      like_count: 8,
      is_favorite: true,
      published_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
      created_at: '2026-01-01T00:00:00.000Z',
    },
  ];

  beforeEach(() => {
    updateSpy = jasmine.createSpy('update');
    fromSpy = jasmine.createSpy('from').and.callFake((table: string) => {
      if (table === 'comments') {
        return createQuery({
          select: jasmine.createSpy('select').and.returnValue(
            createQuery({
              order: jasmine.createSpy('order').and.returnValue(
                createQuery({
                  returns: jasmine
                    .createSpy('returns')
                    .and.resolveTo({ data: commentRows, error: null }),
                }),
              ),
            }),
          ),
          update: updateSpy.and.returnValue(
            createQuery({
              eq: jasmine.createSpy('eq').and.resolveTo({ data: null, error: null }),
            }),
          ),
        });
      }

      if (table === 'youtube_videos') {
        return createQuery({
          select: jasmine.createSpy('select').and.returnValue(
            createQuery({
              in: jasmine.createSpy('in').and.returnValue(
                createQuery({
                  returns: jasmine.createSpy('returns').and.resolveTo({
                    data: [
                      {
                        id: 'video-1',
                        user_id: 'user-1',
                        youtube_video_id: 'yt-video-1',
                        title: 'Video A',
                        url: 'https://youtube.test/video-a',
                        published_at: null,
                        thumbnail_url: null,
                        created_at: '2026-01-01T00:00:00.000Z',
                        updated_at: '2026-01-01T00:00:00.000Z',
                      },
                      {
                        id: 'video-2',
                        user_id: 'user-1',
                        youtube_video_id: 'yt-video-2',
                        title: 'Video B',
                        url: 'https://youtube.test/video-b',
                        published_at: null,
                        thumbnail_url: null,
                        created_at: '2026-01-01T00:00:00.000Z',
                        updated_at: '2026-01-01T00:00:00.000Z',
                      },
                    ],
                    error: null,
                  }),
                }),
              ),
            }),
          ),
        });
      }

      if (table === 'script_comments') {
        return createQuery({
          select: jasmine.createSpy('select').and.returnValue(
            createQuery({
              in: jasmine.createSpy('in').and.returnValue(
                createQuery({
                  returns: jasmine.createSpy('returns').and.resolveTo({
                    data: [
                      { comment_id: 'comment-1', script_id: 'script-1' },
                      { comment_id: 'comment-1', script_id: 'script-2' },
                    ],
                    error: null,
                  }),
                }),
              ),
            }),
          ),
        });
      }

      if (table === 'scripts') {
        return createQuery({
          select: jasmine.createSpy('select').and.returnValue(
            createQuery({
              in: jasmine.createSpy('in').and.returnValue(
                createQuery({
                  returns: jasmine.createSpy('returns').and.resolveTo({
                    data: [
                      { id: 'script-1', title: 'Video 1' },
                      { id: 'script-2', title: 'Video 2' },
                    ],
                    error: null,
                  }),
                }),
              ),
            }),
          ),
        });
      }

      if (table === 'youtube_sync_jobs') {
        return createQuery({
          select: jasmine.createSpy('select').and.returnValue(
            createQuery({
              order: jasmine.createSpy('order').and.returnValue(
                createQuery({
                  limit: jasmine.createSpy('limit').and.returnValue(
                    createQuery({
                      maybeSingle: jasmine
                        .createSpy('maybeSingle')
                        .and.resolveTo({ data: null, error: null }),
                    }),
                  ),
                }),
              ),
            }),
          ),
        });
      }

      throw new Error(`Unexpected table ${table}`);
    });

    TestBed.configureTestingModule({
      providers: [
        CommentsService,
        {
          provide: SupabaseService,
          useValue: {
            client: {
              from: fromSpy,
              functions: {
                invoke: jasmine.createSpy('invoke'),
              },
            },
          },
        },
      ],
    });

    service = TestBed.inject(CommentsService);
  });

  it('builds comment list items with video data and used script badges', async () => {
    await service.loadComments();

    expect(service.comments().map((item) => item.comment.id)).toEqual([
      'comment-1',
      'comment-2',
    ]);
    expect(service.comments()[0].video.title).toBe('Video A');
    expect(service.comments()[0].usedInScripts).toEqual([
      { id: 'script-1', title: 'Video 1' },
      { id: 'script-2', title: 'Video 2' },
    ]);
    expect(service.comments()[1].usedInScripts).toEqual([]);
  });

  it('persists favorite changes and updates local state optimistically', async () => {
    await service.loadComments();

    await service.setFavorite('comment-1', true);

    expect(updateSpy).toHaveBeenCalledOnceWith({ is_favorite: true });
    expect(service.comments()[0].isFavorite).toBeTrue();
    expect(service.comments()[0].comment.isFavorite).toBeTrue();
  });
});
