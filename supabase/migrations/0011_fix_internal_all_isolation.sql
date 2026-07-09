-- ============================================================================
-- 0011 — Fix crítico: internal_all sin scope de client_id (leak cross-tenant)
-- ============================================================================
-- Las políticas "internal_all" de leads, client_business_context,
-- client_docs_pages, client_sops y las 5 tablas content_* usaban
-- is_internal_staff() a secas: esa función es true para CUALQUIER
-- owner/admin/team de CUALQUIER cliente (no solo del propio), y estas
-- políticas no comparaban client_id contra el profile del usuario. Resultado:
-- el staff interno de un cliente podía leer y escribir leads/contexto/docs/
-- SOPs/contenido de OTROS clientes vía llamada directa a la REST API de
-- Supabase, sin pasar por los filtros .eq("client_id", ...) que solo aplica
-- el código del portal (RLS es lo único que realmente aísla, y acá no
-- aislaba). Esto viola directamente la regla no-negociable del proyecto.
--
-- La intención original (migración 0005: is_internal_staff() se extendió
-- para incluir is_platform_admin) era dar acceso cross-tenant a los admins
-- de LA PLATAFORMA (el dueño del SaaS), no al staff de cada tenant. El fix
-- es usar is_platform_admin() — que sí es exclusivo de plataforma — en vez
-- de is_internal_staff() en estas políticas. client_own ya cubre el acceso
-- legítimo del staff de cada cliente a su propio client_id, EXCEPTO en
-- leads, que nunca tuvo client_own (solo tenía internal_all de forma
-- incidental) — sin agregarla, owner/admin/team perderían acceso a sus
-- propios leads.
create policy "client_own" on public.leads for all to authenticated
  using (client_id in (select p.client_id from public.profiles p where p.id = auth.uid()))
  with check (client_id in (select p.client_id from public.profiles p where p.id = auth.uid()));

do $$
declare
  t text;
begin
  foreach t in array array[
    'leads',
    'client_business_context',
    'client_docs_pages',
    'client_sops',
    'content_ideas',
    'content_competitors',
    'content_vault',
    'content_calendar',
    'content_scripts'
  ]
  loop
    execute format('drop policy if exists "internal_all" on public.%I', t);
    execute format(
      'create policy "internal_all" on public.%I for all to authenticated using (public.is_platform_admin()) with check (public.is_platform_admin())',
      t
    );
  end loop;
end $$;

notify pgrst, 'reload schema';
