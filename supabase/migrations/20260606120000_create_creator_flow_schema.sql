create extension if not exists pgcrypto with schema public;

create type public.youtube_connection_status as enum ('active', 'expired', 'revoked');
create type public.youtube_sync_job_status as enum ('pending', 'running', 'completed', 'failed');

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.youtube_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  channel_id text not null,
  channel_title text not null,
  scopes text[] not null default '{}',
  status public.youtube_connection_status not null default 'active',
  encrypted_refresh_token text not null,
  encrypted_access_token text,
  access_token_expires_at timestamptz,
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revoked_at timestamptz,
  constraint youtube_connections_user_id_key unique (user_id),
  constraint youtube_connections_user_channel_key unique (user_id, channel_id),
  constraint youtube_connections_scopes_not_null check (array_position(scopes, null) is null)
);

create table public.youtube_sync_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  youtube_connection_id uuid references public.youtube_connections(id) on delete set null,
  status public.youtube_sync_job_status not null default 'pending',
  imported_count integer not null default 0,
  updated_count integer not null default 0,
  processed_count integer not null default 0,
  page_token text,
  error_message text,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  constraint youtube_sync_jobs_counts_non_negative check (
    imported_count >= 0 and updated_count >= 0 and processed_count >= 0
  )
);

create table public.youtube_videos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  youtube_video_id text not null,
  title text not null,
  url text not null,
  published_at timestamptz,
  thumbnail_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint youtube_videos_user_id_id_key unique (user_id, id),
  constraint youtube_videos_user_youtube_video_key unique (user_id, youtube_video_id)
);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  youtube_comment_id text not null,
  youtube_video_id uuid not null,
  author_name text not null,
  author_channel_url text,
  text text not null,
  like_count integer not null default 0,
  is_favorite boolean not null default false,
  published_at timestamptz not null,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint comments_like_count_non_negative check (like_count >= 0),
  constraint comments_user_id_id_key unique (user_id, id),
  constraint comments_user_youtube_comment_key unique (user_id, youtube_comment_id),
  constraint comments_user_video_fk foreign key (user_id, youtube_video_id)
    references public.youtube_videos(user_id, id) on delete cascade
);

create table public.scripts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint scripts_title_not_blank check (length(trim(title)) > 0),
  constraint scripts_user_id_id_key unique (user_id, id)
);

create table public.script_comments (
  id uuid primary key default gen_random_uuid(),
  script_id uuid not null references public.scripts(id) on delete cascade,
  comment_id uuid not null references public.comments(id) on delete restrict,
  position integer not null,
  comment_text_snapshot text not null,
  video_title_snapshot text not null,
  video_url_snapshot text not null,
  created_at timestamptz not null default now(),
  constraint script_comments_position_non_negative check (position >= 0),
  constraint script_comments_script_position_key unique (script_id, position),
  constraint script_comments_script_comment_key unique (script_id, comment_id)
);

create index youtube_connections_user_id_idx on public.youtube_connections(user_id);
create index youtube_sync_jobs_user_id_idx on public.youtube_sync_jobs(user_id);
create index youtube_sync_jobs_status_started_at_idx on public.youtube_sync_jobs(user_id, status, started_at desc);
create index youtube_videos_user_id_idx on public.youtube_videos(user_id);
create index youtube_videos_youtube_video_id_idx on public.youtube_videos(youtube_video_id);
create index comments_user_id_idx on public.comments(user_id);
create index comments_youtube_comment_id_idx on public.comments(youtube_comment_id);
create index comments_youtube_video_id_idx on public.comments(youtube_video_id);
create index comments_published_at_idx on public.comments(user_id, published_at desc);
create index comments_is_favorite_idx on public.comments(user_id, is_favorite);
create index scripts_user_id_idx on public.scripts(user_id);
create index script_comments_script_id_idx on public.script_comments(script_id);
create index script_comments_comment_id_idx on public.script_comments(comment_id);
create index script_comments_position_idx on public.script_comments(script_id, position);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger youtube_connections_set_updated_at
before update on public.youtube_connections
for each row execute function public.set_updated_at();

create trigger youtube_videos_set_updated_at
before update on public.youtube_videos
for each row execute function public.set_updated_at();

create trigger comments_set_updated_at
before update on public.comments
for each row execute function public.set_updated_at();

create trigger scripts_set_updated_at
before update on public.scripts
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    coalesce(new.email, ''),
    nullif(coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'name', ''), '')
  )
  on conflict (id) do update
    set email = excluded.email,
        display_name = coalesce(public.profiles.display_name, excluded.display_name);

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user_profile();

alter table public.profiles enable row level security;
alter table public.youtube_connections enable row level security;
alter table public.youtube_sync_jobs enable row level security;
alter table public.youtube_videos enable row level security;
alter table public.comments enable row level security;
alter table public.scripts enable row level security;
alter table public.script_comments enable row level security;

create policy "Profiles are readable by owner"
on public.profiles for select
to authenticated
using (auth.uid() = id);

create policy "Profiles are insertable by owner"
on public.profiles for insert
to authenticated
with check (auth.uid() = id);

create policy "Profiles are updatable by owner"
on public.profiles for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "YouTube connections are readable by owner"
on public.youtube_connections for select
to authenticated
using (auth.uid() = user_id);

create policy "YouTube connections are insertable by owner"
on public.youtube_connections for insert
to authenticated
with check (auth.uid() = user_id);

create policy "YouTube connections are updatable by owner"
on public.youtube_connections for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "YouTube connections are deletable by owner"
on public.youtube_connections for delete
to authenticated
using (auth.uid() = user_id);

create policy "YouTube sync jobs are readable by owner"
on public.youtube_sync_jobs for select
to authenticated
using (auth.uid() = user_id);

create policy "YouTube sync jobs are insertable by owner"
on public.youtube_sync_jobs for insert
to authenticated
with check (auth.uid() = user_id);

create policy "YouTube sync jobs are updatable by owner"
on public.youtube_sync_jobs for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "YouTube videos are readable by owner"
on public.youtube_videos for select
to authenticated
using (auth.uid() = user_id);

create policy "YouTube videos are insertable by owner"
on public.youtube_videos for insert
to authenticated
with check (auth.uid() = user_id);

create policy "YouTube videos are updatable by owner"
on public.youtube_videos for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "YouTube videos are deletable by owner"
on public.youtube_videos for delete
to authenticated
using (auth.uid() = user_id);

create policy "Comments are readable by owner"
on public.comments for select
to authenticated
using (auth.uid() = user_id);

create policy "Comments are insertable by owner"
on public.comments for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Comments are updatable by owner"
on public.comments for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Comments are deletable by owner"
on public.comments for delete
to authenticated
using (auth.uid() = user_id);

create policy "Scripts are readable by owner"
on public.scripts for select
to authenticated
using (auth.uid() = user_id);

create policy "Scripts are insertable by owner"
on public.scripts for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Scripts are updatable by owner"
on public.scripts for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Scripts are deletable by owner"
on public.scripts for delete
to authenticated
using (auth.uid() = user_id);

create policy "Script comments are readable by script owner"
on public.script_comments for select
to authenticated
using (
  exists (
    select 1
    from public.scripts
    where scripts.id = script_comments.script_id
      and scripts.user_id = auth.uid()
  )
);

create policy "Script comments are insertable by script and comment owner"
on public.script_comments for insert
to authenticated
with check (
  exists (
    select 1
    from public.scripts
    where scripts.id = script_comments.script_id
      and scripts.user_id = auth.uid()
  )
  and exists (
    select 1
    from public.comments
    where comments.id = script_comments.comment_id
      and comments.user_id = auth.uid()
  )
);

create policy "Script comments are updatable by script and comment owner"
on public.script_comments for update
to authenticated
using (
  exists (
    select 1
    from public.scripts
    where scripts.id = script_comments.script_id
      and scripts.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.scripts
    where scripts.id = script_comments.script_id
      and scripts.user_id = auth.uid()
  )
  and exists (
    select 1
    from public.comments
    where comments.id = script_comments.comment_id
      and comments.user_id = auth.uid()
  )
);

create policy "Script comments are deletable by script owner"
on public.script_comments for delete
to authenticated
using (
  exists (
    select 1
    from public.scripts
    where scripts.id = script_comments.script_id
      and scripts.user_id = auth.uid()
  )
);

grant usage on schema public to authenticated;
grant usage on type public.youtube_connection_status to authenticated;
grant usage on type public.youtube_sync_job_status to authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select on public.youtube_sync_jobs to authenticated;
grant select on public.youtube_videos to authenticated;
grant select on public.comments to authenticated;
grant update (is_favorite) on public.comments to authenticated;
grant select, insert, update, delete on public.scripts to authenticated;
grant select, insert, update, delete on public.script_comments to authenticated;

grant select (
  id,
  user_id,
  channel_id,
  channel_title,
  scopes,
  status,
  access_token_expires_at,
  connected_at,
  updated_at,
  revoked_at
) on public.youtube_connections to authenticated;
