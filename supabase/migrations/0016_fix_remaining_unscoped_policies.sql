-- ============================================================================
-- 0016 — Fix crítico (parte 2): dos policies más con el mismo bug de 0011
-- ============================================================================
-- 0011_fix_internal_all_isolation.sql arregló las 9 policies literalmente
-- llamadas "internal_all". Estas dos tienen nombres distintos pero el
-- mismo bug exacto: is_internal_staff() sin comparar client_id, así que
-- CUALQUIER owner/admin/team de CUALQUIER cliente podía leer filas de
-- TODOS los demás clientes.
--
-- clients.internal_read_all_clients exponía name/business_name/mentor_name
-- de todos los tenants. profiles.profiles_select_internal exponía
-- id/client_id/role/full_name de todos los usuarios de todos los tenants.
--
-- Mismo fix que 0011: is_platform_admin() en vez de is_internal_staff() —
-- la intención original era darle acceso cross-tenant al staff de LA
-- PLATAFORMA, no al de cada tenant.

drop policy if exists "internal_read_all_clients" on public.clients;
create policy "internal_read_all_clients" on public.clients
  for select to authenticated using (public.is_platform_admin());

drop policy if exists "profiles_select_internal" on public.profiles;
create policy "profiles_select_internal" on public.profiles
  for select to authenticated using (public.is_platform_admin());

notify pgrst, 'reload schema';
