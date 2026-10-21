-- EcoCart v5: catalogue (synced read-only from WooCommerce), sustainability facts, shopper data.

create or replace function public.is_admin() returns boolean
language sql stable set search_path = '' as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'admin')::boolean, false)
$$;

-- Catalogue -----------------------------------------------------------------

create table public.categories (
  id integer primary key,                 -- WooCommerce term id
  name text not null,
  slug text not null unique,
  parent integer not null default 0,
  count integer not null default 0,
  updated_at timestamptz not null default now()
);

create table public.products (
  id integer primary key,                 -- WooCommerce product id
  slug text not null unique,
  name text not null,
  type text not null default 'simple',    -- simple | variable
  summary text not null default '',       -- plain text, cleaned
  description text not null default '',   -- plain paragraphs separated by blank lines, cleaned
  price integer,                          -- paise
  regular_price integer,                  -- paise
  price_max integer,                      -- paise, set when variations differ in price
  on_sale boolean not null default false,
  in_stock boolean not null default true,
  images jsonb not null default '[]',     -- [{src, thumb, alt}]
  category_ids integer[] not null default '{}',
  attributes jsonb not null default '[]', -- [{name, terms: [..]}]
  variations jsonb not null default '[]', -- [{id, attrs: {name: value}, price}]
  permalink text not null,
  menu_order integer not null default 0,
  synced_at timestamptz not null default now()
);
create index products_category_ids_idx on public.products using gin (category_ids);

-- Sustainability facts, edited by EcoCart admins. Only verified facts are shown as claims.
create table public.product_eco (
  product_id integer primary key references public.products (id) on delete cascade,
  material text,                          -- e.g. "Coconut shell"
  origin text,                            -- e.g. "Kerala, India"
  maker text,                             -- e.g. "Women-led co-op, Thrissur"
  packaging text,                         -- e.g. "Glass jar, paper label"
  plastic_free boolean,
  handmade boolean,
  plant_based boolean,
  biodegradable boolean,
  certifications text[] not null default '{}',
  notes text,
  verified boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);
create index product_eco_updated_by_idx on public.product_eco (updated_by);

create table public.impact_stats (
  key text primary key,
  label text not null,
  value numeric not null,
  unit text not null default '',
  note text not null default '',
  sort smallint not null default 0,
  updated_at timestamptz not null default now()
);

create table public.sync_runs (
  id bigint generated always as identity primary key,
  ran_at timestamptz not null default now(),
  ok boolean not null,
  products integer not null default 0,
  images integer not null default 0,
  message text not null default ''
);

-- Shopper data --------------------------------------------------------------

create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  phone text,
  address jsonb,                          -- {line1, line2, city, state, pin}
  updated_at timestamptz not null default now()
);

create table public.wishlists (
  user_id uuid not null references auth.users (id) on delete cascade,
  product_id integer not null references public.products (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);
create index wishlists_product_id_idx on public.wishlists (product_id);

-- Row-level security ----------------------------------------------------------

alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_eco enable row level security;
alter table public.impact_stats enable row level security;
alter table public.sync_runs enable row level security;
alter table public.profiles enable row level security;
alter table public.wishlists enable row level security;

-- Catalogue is public to read; it is written only by the sync function (service role).
create policy "anyone can read" on public.categories for select using (true);
create policy "anyone can read" on public.products for select using (true);

create policy "anyone can read" on public.product_eco for select using (true);
create policy "admins can insert" on public.product_eco for insert to authenticated with check ((select public.is_admin()));
create policy "admins can update" on public.product_eco for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admins can delete" on public.product_eco for delete to authenticated using ((select public.is_admin()));

create policy "anyone can read" on public.impact_stats for select using (true);
create policy "admins can insert" on public.impact_stats for insert to authenticated with check ((select public.is_admin()));
create policy "admins can update" on public.impact_stats for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admins can delete" on public.impact_stats for delete to authenticated using ((select public.is_admin()));

create policy "admins can read" on public.sync_runs for select to authenticated using ((select public.is_admin()));

create policy "own profile read" on public.profiles for select to authenticated using (user_id = (select auth.uid()));
create policy "own profile insert" on public.profiles for insert to authenticated with check (user_id = (select auth.uid()));
create policy "own profile update" on public.profiles for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "own wishlist read" on public.wishlists for select to authenticated using (user_id = (select auth.uid()));
create policy "own wishlist insert" on public.wishlists for insert to authenticated with check (user_id = (select auth.uid()));
create policy "own wishlist delete" on public.wishlists for delete to authenticated using (user_id = (select auth.uid()));

-- Who changed an eco card, and when.
create or replace function public.touch_product_eco() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end $$;
create trigger product_eco_touch before insert or update on public.product_eco
for each row execute function public.touch_product_eco();

-- Explicit API grants (RLS above still decides which rows).
grant select on public.categories, public.products, public.product_eco, public.impact_stats to anon, authenticated;
grant insert, update, delete on public.product_eco, public.impact_stats to authenticated;
grant select on public.sync_runs to authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select, insert, delete on public.wishlists to authenticated;
