-- =============================================================================
-- Polymath — content platform schema
--
--   categories      public catalogue of subjects (Math, Music, Programming, …)
--   contents        article / tip / tutorial / ebook metadata (public when published)
--   content_bodies  the actual text — gated by row level security
--   admins          who may use the admin app (add rows from the SQL editor)
--   subscriptions   premium entitlement mirrored from RevenueCat (edge functions)
--   credit_ledger   pay-on-demand credits: purchases (+), spending (−), refunds, gifts
--   unlocks         items a reader owns (bought with credits or gifted by an admin)
--   app_config      remote settings (ads, paywall copy, credit packs)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------
create type public.content_kind as enum ('article', 'tip', 'tutorial', 'ebook');
create type public.content_access as enum ('free', 'premium');
create type public.content_status as enum ('draft', 'published', 'archived');

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Admins
-- ---------------------------------------------------------------------------
create table public.admins (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

comment on table public.admins is
  'Users allowed to manage content. Grant with: insert into public.admins (user_id) select id from auth.users where email = ''you@example.com'';';

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins a where a.user_id = auth.uid());
$$;

-- ---------------------------------------------------------------------------
-- Categories
-- ---------------------------------------------------------------------------
create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name        text not null check (char_length(name) between 1 and 60),
  description text not null default '',
  icon        text not null default '📚',
  color       text not null default '#4F46E5' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger categories_touch before update on public.categories
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Contents (catalogue metadata — safe to show to everyone once published)
-- ---------------------------------------------------------------------------
create table public.contents (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title           text not null check (char_length(title) between 1 and 200),
  summary         text not null default '',
  kind            public.content_kind not null default 'article',
  category_id     uuid references public.categories (id) on delete set null,
  cover_url       text,
  author          text not null default '',
  tags            text[] not null default '{}',
  access          public.content_access not null default 'free',
  -- Pay on demand: price in credits to own this single item.
  -- NULL means the item is only available with a subscription.
  price_credits   integer check (price_credits is null or price_credits > 0),
  reading_minutes integer not null default 1 check (reading_minutes > 0),
  is_featured     boolean not null default false,
  status          public.content_status not null default 'draft',
  published_at    timestamptz,
  -- Teaser rendered above the paywall / ad gate (first section of the body).
  preview_html    text not null default '',
  -- Table of contents: [{ "id": "intro", "text": "Introduction", "level": 2 }]
  headings        jsonb not null default '[]'::jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint contents_price_requires_premium check (access = 'premium' or price_credits is null)
);

create index contents_listing_idx on public.contents (status, published_at desc);
create index contents_category_idx on public.contents (category_id);
create index contents_featured_idx on public.contents (is_featured) where is_featured;
create index contents_search_idx on public.contents
  using gin (to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(summary, '')));

create trigger contents_touch before update on public.contents
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Bodies (the gated part)
-- ---------------------------------------------------------------------------
create table public.content_bodies (
  content_id uuid primary key references public.contents (id) on delete cascade,
  body_md    text not null default '',
  body_html  text not null default '',
  updated_at timestamptz not null default now()
);

create trigger content_bodies_touch before update on public.content_bodies
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Subscriptions — written only by edge functions (service role)
-- ---------------------------------------------------------------------------
create table public.subscriptions (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  entitlement text not null default 'premium',
  is_active   boolean not null default false,
  product_id  text,
  store       text,
  period_type text,
  will_renew  boolean not null default false,
  -- NULL with is_active = true means a lifetime purchase.
  expires_at  timestamptz,
  updated_at  timestamptz not null default now()
);

create trigger subscriptions_touch before update on public.subscriptions
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Credits (pay on demand). Balance = sum(delta). Purchases are written by the
-- sync-purchases edge function after verifying them with RevenueCat; every
-- store transaction can be credited only once (unique transaction_id).
-- ---------------------------------------------------------------------------
create table public.credit_ledger (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  delta          integer not null check (delta <> 0),
  kind           text not null check (kind in ('purchase', 'spend', 'refund', 'grant')),
  product_id     text,
  transaction_id text unique,
  content_id     uuid references public.contents (id) on delete set null,
  note           text,
  created_at     timestamptz not null default now()
);

create index credit_ledger_user_idx on public.credit_ledger (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Unlocks — items a reader owns individually
-- ---------------------------------------------------------------------------
create table public.unlocks (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  content_id    uuid not null references public.contents (id) on delete cascade,
  credits_spent integer not null default 0 check (credits_spent >= 0),
  created_at    timestamptz not null default now(),
  unique (user_id, content_id)
);

create index unlocks_created_idx on public.unlocks (created_at desc);

-- ---------------------------------------------------------------------------
-- Remote app configuration
-- ---------------------------------------------------------------------------
create table public.app_config (
  key        text primary key check (key ~ '^[a-z0-9_]+$'),
  value      jsonb not null,
  updated_at timestamptz not null default now()
);

create trigger app_config_touch before update on public.app_config
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Access rules
-- ---------------------------------------------------------------------------
create or replace function public.has_premium()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.subscriptions s
    where s.user_id = auth.uid()
      and s.is_active
      and (s.expires_at is null or s.expires_at > now())
  );
$$;

create or replace function public.can_read_content(cid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_admin() or exists (
    select 1
    from public.contents c
    where c.id = cid
      and c.status = 'published'
      and (c.published_at is null or c.published_at <= now())
      and (
        c.access = 'free'
        or public.has_premium()
        or exists (
          select 1 from public.unlocks u
          where u.user_id = auth.uid() and u.content_id = c.id
        )
      )
  );
$$;

create or replace function public.credit_balance()
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(sum(l.delta), 0)::integer from public.credit_ledger l where l.user_id = auth.uid();
$$;

-- Spend credits to own a premium item. Atomic per user (advisory lock) so a
-- balance can never be spent twice.
create or replace function public.unlock_with_credits(cid uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid     uuid := auth.uid();
  price   integer;
  balance integer;
begin
  if uid is null then
    return jsonb_build_object('ok', false, 'reason', 'not_signed_in');
  end if;

  select c.price_credits into price
  from public.contents c
  where c.id = cid
    and c.status = 'published'
    and (c.published_at is null or c.published_at <= now())
    and c.access = 'premium';
  if price is null then
    return jsonb_build_object('ok', false, 'reason', 'not_purchasable');
  end if;

  perform pg_advisory_xact_lock(hashtextextended(uid::text, 0));

  select coalesce(sum(l.delta), 0)::integer into balance from public.credit_ledger l where l.user_id = uid;

  if exists (select 1 from public.unlocks u where u.user_id = uid and u.content_id = cid) then
    return jsonb_build_object('ok', true, 'already_owned', true, 'balance', balance);
  end if;

  if balance < price then
    return jsonb_build_object('ok', false, 'reason', 'insufficient_credits', 'balance', balance, 'price', price);
  end if;

  insert into public.credit_ledger (user_id, delta, kind, content_id)
  values (uid, -price, 'spend', cid);
  insert into public.unlocks (user_id, content_id, credits_spent)
  values (uid, cid, price);

  return jsonb_build_object('ok', true, 'balance', balance - price);
end;
$$;

-- Dashboard numbers for the admin app.
create or replace function public.admin_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'users',              (select count(*) from auth.users),
    'anonymous_users',    (select count(*) from auth.users where is_anonymous),
    'active_subscribers', (select count(*) from public.subscriptions s
                             where s.is_active and (s.expires_at is null or s.expires_at > now())),
    'unlocks',            (select count(*) from public.unlocks),
    'unlocks_30d',        (select count(*) from public.unlocks where created_at > now() - interval '30 days'),
    'credits_sold',       (select coalesce(sum(delta), 0) from public.credit_ledger where kind = 'purchase'),
    'credits_spent',      (select coalesce(-sum(delta), 0) from public.credit_ledger where kind = 'spend'),
    'published',          (select count(*) from public.contents where status = 'published'),
    'drafts',             (select count(*) from public.contents where status = 'draft'),
    'premium',            (select count(*) from public.contents where access = 'premium'),
    'categories',         (select count(*) from public.categories)
  );
end;
$$;
-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------
alter table public.admins         enable row level security;
alter table public.categories     enable row level security;
alter table public.contents       enable row level security;
alter table public.content_bodies enable row level security;
alter table public.subscriptions  enable row level security;
alter table public.credit_ledger  enable row level security;
alter table public.unlocks        enable row level security;
alter table public.app_config     enable row level security;

create policy "admins can see their own row" on public.admins
  for select to authenticated using (user_id = auth.uid());

create policy "categories are public" on public.categories
  for select to anon, authenticated using (true);
create policy "admins manage categories" on public.categories
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "published contents are public" on public.contents
  for select to anon, authenticated
  using (status = 'published' and (published_at is null or published_at <= now()));
create policy "admins manage contents" on public.contents
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "readers with access can read bodies" on public.content_bodies
  for select to anon, authenticated using (public.can_read_content(content_id));
create policy "admins manage bodies" on public.content_bodies
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "users see their subscription" on public.subscriptions
  for select to authenticated using (user_id = auth.uid() or public.is_admin());

create policy "users see their credit history" on public.credit_ledger
  for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy "admins can grant credits" on public.credit_ledger
  for insert to authenticated with check (public.is_admin() and kind = 'grant');

create policy "users see their unlocks" on public.unlocks
  for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy "admins can gift unlocks" on public.unlocks
  for insert to authenticated with check (public.is_admin());
create policy "admins can revoke unlocks" on public.unlocks
  for delete to authenticated using (public.is_admin());

create policy "config is public" on public.app_config
  for select to anon, authenticated using (true);
create policy "admins manage config" on public.app_config
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- Grants (explicit, so the Data API works even where defaults are locked down)
-- ---------------------------------------------------------------------------
grant usage on schema public to anon, authenticated;

grant select on public.categories, public.contents, public.content_bodies, public.app_config
  to anon, authenticated;
grant insert, update, delete on public.categories, public.contents, public.content_bodies, public.app_config
  to authenticated;
grant select on public.admins, public.subscriptions, public.unlocks, public.credit_ledger to authenticated;
grant insert, delete on public.unlocks to authenticated;
grant insert on public.credit_ledger to authenticated;

grant all on all tables in schema public to service_role;

revoke execute on function public.admin_stats(), public.unlock_with_credits(uuid), public.credit_balance()
  from public, anon;
grant execute on function public.is_admin(), public.has_premium(), public.can_read_content(uuid)
  to anon, authenticated;
grant execute on function public.admin_stats(), public.unlock_with_credits(uuid), public.credit_balance()
  to authenticated;

-- ---------------------------------------------------------------------------
-- Storage: public "media" bucket for covers and inline images
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 10485760,
        array['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml'])
on conflict (id) do nothing;

create policy "media is public" on storage.objects
  for select to anon, authenticated using (bucket_id = 'media');
create policy "admins upload media" on storage.objects
  for insert to authenticated with check (bucket_id = 'media' and public.is_admin());
create policy "admins update media" on storage.objects
  for update to authenticated using (bucket_id = 'media' and public.is_admin());
create policy "admins delete media" on storage.objects
  for delete to authenticated using (bucket_id = 'media' and public.is_admin());
