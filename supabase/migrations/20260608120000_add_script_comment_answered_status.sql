alter table public.script_comments
add column if not exists is_answered boolean not null default false;

drop function if exists public.replace_script_comments(uuid, jsonb);

create or replace function public.replace_script_comments(
  p_script_id uuid,
  p_comments jsonb default '[]'::jsonb
)
returns table (
  id uuid,
  script_id uuid,
  comment_id uuid,
  "position" integer,
  comment_text_snapshot text,
  video_title_snapshot text,
  video_url_snapshot text,
  is_answered boolean,
  created_at timestamptz
)
language plpgsql
as $$
begin
  p_comments := coalesce(p_comments, '[]'::jsonb);

  if jsonb_typeof(p_comments) <> 'array' then
    raise exception 'p_comments must be a JSON array';
  end if;

  if not exists (
    select 1
    from public.scripts
    where scripts.id = p_script_id
      and scripts.user_id = auth.uid()
  ) then
    raise exception 'Script not found';
  end if;

  delete from public.script_comments
  where script_comments.script_id = p_script_id;

  return query
  insert into public.script_comments (
    script_id,
    comment_id,
    "position",
    comment_text_snapshot,
    video_title_snapshot,
    video_url_snapshot,
    is_answered
  )
  select
    p_script_id,
    input.comment_id,
    input."position",
    input.comment_text_snapshot,
    input.video_title_snapshot,
    input.video_url_snapshot,
    coalesce(input.is_answered, false)
  from jsonb_to_recordset(p_comments) as input(
    comment_id uuid,
    "position" integer,
    comment_text_snapshot text,
    video_title_snapshot text,
    video_url_snapshot text,
    is_answered boolean
  )
  order by input."position"
  returning
    script_comments.id,
    script_comments.script_id,
    script_comments.comment_id,
    script_comments.position,
    script_comments.comment_text_snapshot,
    script_comments.video_title_snapshot,
    script_comments.video_url_snapshot,
    script_comments.is_answered,
    script_comments.created_at;
end;
$$;

grant execute on function public.replace_script_comments(uuid, jsonb) to authenticated;
