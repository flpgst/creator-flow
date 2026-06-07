create table public.youtube_oauth_states (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  state_hash text not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint youtube_oauth_states_state_hash_key unique (state_hash),
  constraint youtube_oauth_states_not_expired_on_create check (expires_at > created_at)
);

create index youtube_oauth_states_user_id_idx on public.youtube_oauth_states(user_id);
create index youtube_oauth_states_expires_at_idx on public.youtube_oauth_states(expires_at);

alter table public.youtube_oauth_states enable row level security;
