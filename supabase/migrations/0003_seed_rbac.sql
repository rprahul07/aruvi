-- ════════════════════════════════════════════════════════════════════════
-- RBAC seed data — roles, permissions, and the default role/permission grid.
-- This is real application data (not dev-only fixtures), so it lives in a
-- migration rather than supabase/seed.sql.
-- ════════════════════════════════════════════════════════════════════════

insert into public.roles (code, name, description) values
  ('SUPER_ADMIN', 'Super Admin', 'Full access, including managing other admins'' roles'),
  ('ADMIN', 'Admin', 'Full store access excluding role/permission management'),
  ('PRODUCT_MANAGER', 'Product Manager', 'Manages catalogue and inventory'),
  ('ORDER_MANAGER', 'Order Manager', 'Manages orders, shipments, and refunds'),
  ('SUPPORT_AGENT', 'Support Agent', 'Read-only order and customer access for support'),
  ('MARKETING_MANAGER', 'Marketing Manager', 'Manages coupons, promotions, and homepage merchandising'),
  ('ANALYST', 'Analyst', 'Read-only analytics access')
on conflict (code) do nothing;

insert into public.permissions (code) values
  ('product:manage'),
  ('product:create'),
  ('product:update'),
  ('product:delete'),
  ('product:read'),
  ('inventory:read'),
  ('inventory:adjust'),
  ('order:read'),
  ('order:update_status'),
  ('refund:create'),
  ('customer:read'),
  ('analytics:read'),
  ('coupon:manage'),
  ('marketing:manage'),
  ('review:moderate'),
  ('admin:manage')
on conflict (code) do nothing;

-- SUPER_ADMIN: every permission
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id from public.roles r cross join public.permissions p
where r.code = 'SUPER_ADMIN'
on conflict do nothing;

-- ADMIN: every permission except admin:manage
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id from public.roles r cross join public.permissions p
where r.code = 'ADMIN' and p.code <> 'admin:manage'
on conflict do nothing;

-- PRODUCT_MANAGER
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id from public.roles r cross join public.permissions p
where r.code = 'PRODUCT_MANAGER'
  and p.code in ('product:manage', 'product:create', 'product:update', 'product:delete', 'product:read', 'inventory:read', 'inventory:adjust')
on conflict do nothing;

-- ORDER_MANAGER
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id from public.roles r cross join public.permissions p
where r.code = 'ORDER_MANAGER'
  and p.code in ('order:read', 'order:update_status', 'refund:create', 'customer:read', 'inventory:read')
on conflict do nothing;

-- SUPPORT_AGENT
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id from public.roles r cross join public.permissions p
where r.code = 'SUPPORT_AGENT'
  and p.code in ('order:read', 'customer:read')
on conflict do nothing;

-- MARKETING_MANAGER
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id from public.roles r cross join public.permissions p
where r.code = 'MARKETING_MANAGER'
  and p.code in ('marketing:manage', 'coupon:manage', 'analytics:read', 'product:read')
on conflict do nothing;

-- ANALYST
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id from public.roles r cross join public.permissions p
where r.code = 'ANALYST'
  and p.code in ('analytics:read', 'order:read', 'customer:read', 'product:read')
on conflict do nothing;
