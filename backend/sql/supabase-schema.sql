-- Run in Supabase SQL editor.
create extension if not exists pgcrypto;

create table if not exists user_watchlist (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  token_id text not null,
  chain text not null,
  token_address text,
  symbol text,
  name text,
  main_pair text,
  main_pair_tvl numeric,
  execution_mode text not null default 'trade' check (execution_mode in ('trade', 'delegate_exit')),
  assets_id text,
  buy_amount_atomic text,
  sell_amount_atomic text,
  created_at timestamptz not null default now()
);
create unique index if not exists uq_user_watchlist_user_token on user_watchlist (user_id, token_id);

create table if not exists monitoring_signals (
  id uuid primary key default gen_random_uuid(),
  source_id text not null unique,
  token_id text not null,
  chain text not null,
  symbol text not null,
  module text not null,
  score numeric not null,
  severity text not null,
  summary text not null,
  metrics jsonb not null default '[]'::jsonb,
  created_at timestamptz not null,
  ingested_at timestamptz not null default now()
);

create table if not exists monitoring_alerts (
  id uuid primary key default gen_random_uuid(),
  source_id text not null unique,
  token_id text not null,
  chain text not null,
  severity text not null,
  title text not null,
  message text not null,
  created_at timestamptz not null,
  ingested_at timestamptz not null default now()
);

create table if not exists trade_actions (
  id uuid primary key,
  user_id text not null,
  token_id text not null,
  chain text not null,
  symbol text not null,
  action_type text not null check (action_type in ('buy', 'exit')),
  status text not null check (status in ('pending', 'executed', 'dismissed', 'failed')),
  reason text not null,
  execution_mode text not null check (execution_mode in ('trade', 'delegate_exit')),
  in_token_address text not null,
  out_token_address text not null,
  in_amount text not null,
  assets_id text,
  priority integer not null default 0,
  metadata jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_trade_actions_user_created on trade_actions (user_id, created_at desc);

create table if not exists trades (
  id uuid primary key,
  user_id text not null,
  action_id uuid references trade_actions(id) on delete set null,
  token_id text not null,
  chain text not null,
  symbol text not null,
  order_id text not null unique,
  status text not null,
  swap_type text not null,
  in_token_address text not null,
  out_token_address text not null,
  in_amount text not null,
  out_amount text,
  tx_hash text,
  tx_price_usd text,
  error_message text,
  quote_payload jsonb,
  request_payload jsonb,
  status_payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_trades_user_created on trades (user_id, created_at desc);

-- Keep only the most recent N rows. For user tables, retention is per user_id.
create or replace function public.prune_recent_rows()
returns trigger
language plpgsql
as $$
declare
  row_limit integer := 30;
begin
  if tg_argv[0] is not null then
    row_limit := tg_argv[0]::integer;
  end if;

  if tg_argv[1] is null then
    execute format(
      'delete from %I.%I
       where ctid in (
         select ctid
         from %I.%I
         order by created_at desc, id desc
         offset %s
       )',
      tg_table_schema,
      tg_table_name,
      tg_table_schema,
      tg_table_name,
      row_limit
    );
    return new;
  end if;

  execute format(
    'delete from %I.%I
     where ctid in (
       select ctid
       from %I.%I
       where %I = $1
       order by created_at desc, id desc
       offset %s
     )',
    tg_table_schema,
    tg_table_name,
    tg_table_schema,
    tg_table_name,
    tg_argv[1],
    row_limit
  )
  using to_jsonb(new)->>tg_argv[1];

  return new;
end;
$$;

drop trigger if exists trg_prune_user_watchlist on public.user_watchlist;
create trigger trg_prune_user_watchlist
after insert on public.user_watchlist
for each row execute function public.prune_recent_rows('30', 'user_id');

drop trigger if exists trg_prune_monitoring_signals on public.monitoring_signals;
create trigger trg_prune_monitoring_signals
after insert on public.monitoring_signals
for each row execute function public.prune_recent_rows('30');

drop trigger if exists trg_prune_monitoring_alerts on public.monitoring_alerts;
create trigger trg_prune_monitoring_alerts
after insert on public.monitoring_alerts
for each row execute function public.prune_recent_rows('30');

drop trigger if exists trg_prune_trade_actions on public.trade_actions;
create trigger trg_prune_trade_actions
after insert on public.trade_actions
for each row execute function public.prune_recent_rows('30', 'user_id');

drop trigger if exists trg_prune_trades on public.trades;
create trigger trg_prune_trades
after insert on public.trades
for each row execute function public.prune_recent_rows('30', 'user_id');

-- One-time cleanup for existing rows (safe to run repeatedly).
delete from public.monitoring_signals
where id in (
  select id
  from public.monitoring_signals
  order by created_at desc, id desc
  offset 30
);

delete from public.monitoring_alerts
where id in (
  select id
  from public.monitoring_alerts
  order by created_at desc, id desc
  offset 30
);

with ranked as (
  select id, row_number() over (partition by user_id order by created_at desc, id desc) as rn
  from public.user_watchlist
)
delete from public.user_watchlist
where id in (select id from ranked where rn > 30);

with ranked as (
  select id, row_number() over (partition by user_id order by created_at desc, id desc) as rn
  from public.trade_actions
)
delete from public.trade_actions
where id in (select id from ranked where rn > 30);

with ranked as (
  select id, row_number() over (partition by user_id order by created_at desc, id desc) as rn
  from public.trades
)
delete from public.trades
where id in (select id from ranked where rn > 30);
