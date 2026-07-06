-- ════════════════════════════════════════════════════════════════════════
-- Cart coupon reference + store settings (shipping/tax config, admin-editable)
-- ════════════════════════════════════════════════════════════════════════

alter table public.carts
  add column coupon_id uuid references public.coupons (id) on delete set null;

create table public.store_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create trigger trg_store_settings_updated_at
  before update on public.store_settings
  for each row execute function app.set_updated_at();

insert into public.store_settings (key, value) values
  ('shipping', '{"flatFee": 99, "freeAboveAmount": 2000}'),
  ('tax', '{"defaultPercent": 3}')
on conflict (key) do nothing;

insert into public.permissions (code) values ('settings:manage')
on conflict (code) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id from public.roles r cross join public.permissions p
where r.code in ('SUPER_ADMIN', 'ADMIN') and p.code = 'settings:manage'
on conflict do nothing;

alter table public.store_settings enable row level security;
create policy store_settings_public_read on public.store_settings for select
  to anon, authenticated using (true);
create policy store_settings_admin_write on public.store_settings for all
  to authenticated using (public.has_permission('settings:manage')) with check (public.has_permission('settings:manage'));
