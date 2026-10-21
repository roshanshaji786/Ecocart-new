-- Products that disappear from WooCommerce are hidden, not deleted, so their eco cards survive.
alter table public.products add column listed boolean not null default true;
create index products_listed_order_idx on public.products (listed, menu_order);

-- Public bucket for mirrored product photos (ecocart.co.in blocks hotlinking).
-- Writes come only from the sync function (service role); no storage policies are needed for reads.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('catalog', 'catalog', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do nothing;

-- Nightly re-sync at 03:30 IST (22:00 UTC), plus image top-up.
create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;
select cron.schedule('sync-catalog-nightly', '0 22 * * *', $$
  select net.http_post(url := 'https://fckeyyrdzlrreidttimo.supabase.co/functions/v1/sync-catalog?images=80',
                       headers := '{"Content-Type": "application/json"}'::jsonb, timeout_milliseconds := 120000);
$$);
