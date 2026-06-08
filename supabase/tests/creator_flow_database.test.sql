begin;

select plan(13);

insert into auth.users (id, email)
values
  ('00000000-0000-4000-8000-000000000001', 'user-a@example.com'),
  ('00000000-0000-4000-8000-000000000002', 'user-b@example.com')
on conflict (id) do nothing;

insert into public.youtube_videos (
  id,
  user_id,
  youtube_video_id,
  title,
  url,
  published_at
)
values
  (
    '10000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000001',
    'yt-video-a',
    'Video A',
    'https://www.youtube.com/watch?v=yt-video-a',
    '2026-01-01T00:00:00Z'
  ),
  (
    '10000000-0000-4000-8000-000000000002',
    '00000000-0000-4000-8000-000000000002',
    'yt-video-b',
    'Video B',
    'https://www.youtube.com/watch?v=yt-video-b',
    '2026-01-01T00:00:00Z'
  )
on conflict (user_id, youtube_video_id) do update
set title = excluded.title;

insert into public.comments (
  id,
  user_id,
  youtube_comment_id,
  youtube_video_id,
  author_name,
  text,
  like_count,
  published_at
)
values
  (
    '20000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000001',
    'yt-comment-a',
    '10000000-0000-4000-8000-000000000001',
    'Viewer A',
    'Comment A',
    1,
    '2026-01-01T00:00:00Z'
  ),
  (
    '20000000-0000-4000-8000-000000000002',
    '00000000-0000-4000-8000-000000000002',
    'yt-comment-b',
    '10000000-0000-4000-8000-000000000002',
    'Viewer B',
    'Comment B',
    2,
    '2026-01-01T00:00:00Z'
  )
on conflict (user_id, youtube_comment_id) do update
set text = excluded.text;

insert into public.scripts (id, user_id, title)
values
  (
    '30000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000001',
    'Script A'
  ),
  (
    '30000000-0000-4000-8000-000000000002',
    '00000000-0000-4000-8000-000000000002',
    'Script B'
  )
on conflict (id) do update
set title = excluded.title;

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);

select is(
  (select count(*)::integer from public.comments),
  1,
  'RLS lets user A read only their own comments'
);

select is(
  (select count(*)::integer from public.scripts),
  1,
  'RLS lets user A read only their own scripts'
);

select is_empty(
  $$select 1 from public.comments where user_id = '00000000-0000-4000-8000-000000000002'$$,
  'RLS prevents user A from reading user B comments'
);

select lives_ok(
  $$update public.comments set is_favorite = true where id = '20000000-0000-4000-8000-000000000002'$$,
  'RLS update against user B comment does not expose a writable row to user A'
);

reset role;

select is(
  (
    select is_favorite
    from public.comments
    where id = '20000000-0000-4000-8000-000000000002'
  ),
  false,
  'RLS prevents user A update from changing user B comment'
);

insert into public.comments (
  user_id,
  youtube_comment_id,
  youtube_video_id,
  author_name,
  text,
  like_count,
  published_at
)
values (
  '00000000-0000-4000-8000-000000000001',
  'yt-comment-a',
  '10000000-0000-4000-8000-000000000001',
  'Viewer A Updated',
  'Comment A Updated',
  10,
  '2026-01-02T00:00:00Z'
)
on conflict (user_id, youtube_comment_id) do update
set
  author_name = excluded.author_name,
  text = excluded.text,
  like_count = excluded.like_count,
  published_at = excluded.published_at;

select is(
  (
    select count(*)::integer
    from public.comments
    where user_id = '00000000-0000-4000-8000-000000000001'
      and youtube_comment_id = 'yt-comment-a'
  ),
  1,
  'comment upsert does not duplicate youtube_comment_id per user'
);

select is(
  (
    select text
    from public.comments
    where user_id = '00000000-0000-4000-8000-000000000001'
      and youtube_comment_id = 'yt-comment-a'
  ),
  'Comment A Updated',
  'comment upsert updates the existing comment'
);

insert into public.comments (
  id,
  user_id,
  youtube_comment_id,
  youtube_video_id,
  author_name,
  text,
  like_count,
  published_at
)
values (
  '20000000-0000-4000-8000-000000000003',
  '00000000-0000-4000-8000-000000000001',
  'yt-comment-a-2',
  '10000000-0000-4000-8000-000000000001',
  'Viewer A',
  'Comment A 2',
  0,
  '2026-01-03T00:00:00Z'
)
on conflict (id) do nothing;

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);

insert into public.script_comments (
  script_id,
  comment_id,
  position,
  comment_text_snapshot,
  video_title_snapshot,
  video_url_snapshot
)
values (
  '30000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000003',
  0,
  'Comment A 2',
  'Video A',
  'https://www.youtube.com/watch?v=yt-video-a'
);

select is(
  (
    select is_answered
    from public.script_comments
    where script_id = '30000000-0000-4000-8000-000000000001'
      and comment_id = '20000000-0000-4000-8000-000000000003'
  ),
  false,
  'script_comments.is_answered defaults to false'
);

select lives_ok(
  $$
    select *
    from public.replace_script_comments(
      '30000000-0000-4000-8000-000000000001',
      '[
        {
          "comment_id": "20000000-0000-4000-8000-000000000003",
          "position": 0,
          "comment_text_snapshot": "Comment A 2",
          "video_title_snapshot": "Video A",
          "video_url_snapshot": "https://www.youtube.com/watch?v=yt-video-a",
          "is_answered": true
        },
        {
          "comment_id": "20000000-0000-4000-8000-000000000001",
          "position": 1,
          "comment_text_snapshot": "Comment A Updated",
          "video_title_snapshot": "Video A",
          "video_url_snapshot": "https://www.youtube.com/watch?v=yt-video-a"
        }
      ]'::jsonb
    )
  $$,
  'replace_script_comments allows owner to persist ordered script comments'
);

select is(
  (
    select string_agg(is_answered::text, '|' order by position)
    from public.script_comments
    where script_id = '30000000-0000-4000-8000-000000000001'
  ),
  'true|false',
  'replace_script_comments saves is_answered values'
);

select is(
  (
    select string_agg(comment_text_snapshot, '|' order by position)
    from public.script_comments
    where script_id = '30000000-0000-4000-8000-000000000001'
  ),
  'Comment A 2|Comment A Updated',
  'script_comments.position preserves script order'
);

select is(
  (
    select string_agg(comment_text_snapshot || ':' || is_answered::text, '|' order by position)
    from public.replace_script_comments(
      '30000000-0000-4000-8000-000000000001',
      '[
        {
          "comment_id": "20000000-0000-4000-8000-000000000001",
          "position": 0,
          "comment_text_snapshot": "Comment A Updated",
          "video_title_snapshot": "Video A",
          "video_url_snapshot": "https://www.youtube.com/watch?v=yt-video-a",
          "is_answered": false
        },
        {
          "comment_id": "20000000-0000-4000-8000-000000000003",
          "position": 1,
          "comment_text_snapshot": "Comment A 2",
          "video_title_snapshot": "Video A",
          "video_url_snapshot": "https://www.youtube.com/watch?v=yt-video-a",
          "is_answered": true
        }
      ]'::jsonb
    )
  ),
  'Comment A Updated:false|Comment A 2:true',
  'replace_script_comments returns is_answered and preserves status sent during reorder'
);

select throws_ok(
  $$
    select *
    from public.replace_script_comments(
      '30000000-0000-4000-8000-000000000002',
      '[]'::jsonb
    )
  $$,
  'P0001',
  'Script not found',
  'replace_script_comments rejects scripts from another user'
);

select * from finish();

rollback;
