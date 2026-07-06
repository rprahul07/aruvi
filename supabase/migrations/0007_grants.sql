-- ════════════════════════════════════════════════════════════════════════
-- Postgres checks table-level GRANTs before RLS policies ever run — RLS
-- alone does not expose a table to PostgREST or to service_role. RLS
-- bypass for service_role only skips row-level policies; the base table
-- privilege is still required. Grant broad table access to all three
-- API roles and let RLS (every table has it enabled, see 0002_rls.sql)
-- do the actual row/operation-level restriction for anon/authenticated.
-- ════════════════════════════════════════════════════════════════════════

grant usage on schema public to anon, authenticated, service_role;

grant select, insert, update, delete on all tables in schema public to anon, authenticated, service_role;
grant usage, select on all sequences in schema public to anon, authenticated, service_role;
grant execute on all functions in schema public to anon, authenticated, service_role;

alter default privileges in schema public
  grant select, insert, update, delete on tables to anon, authenticated, service_role;
alter default privileges in schema public
  grant usage, select on sequences to anon, authenticated, service_role;
alter default privileges in schema public
  grant execute on functions to anon, authenticated, service_role;
