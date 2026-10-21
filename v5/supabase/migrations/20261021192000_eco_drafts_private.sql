-- Unverified eco cards are drafts: only admins can read them.
alter policy "anyone can read" on public.product_eco using (verified or (select public.is_admin()));
alter policy "anyone can read" on public.product_eco rename to "anyone can read verified";
