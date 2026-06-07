-- Run this in your Supabase SQL editor (Dashboard → SQL Editor → New query)
-- https://supabase.com/dashboard/project/elzszaxdgztnueegddzf/sql

create table if not exists battles (
  id              uuid primary key default gen_random_uuid(),
  code            text unique not null,
  topic           text not null,
  questions       jsonb not null default '[]',
  status          text not null default 'waiting',
  created_at      timestamptz default now(),
  expires_at      timestamptz default (now() + interval '30 minutes'),

  p1_id           text,
  p1_name         text,
  p1_score        integer default 0,
  p1_idx          integer default 0,
  p1_done         boolean default false,
  p1_finished_at  bigint,

  p2_id           text,
  p2_name         text,
  p2_score        integer default 0,
  p2_idx          integer default 0,
  p2_done         boolean default false,
  p2_finished_at  bigint
);

-- Open RLS (anon key is safe for this social feature)
alter table battles enable row level security;

drop policy if exists "battles_allow_all" on battles;
create policy "battles_allow_all" on battles
  for all using (true) with check (true);

-- Enable realtime on this table
alter publication supabase_realtime add table battles;
