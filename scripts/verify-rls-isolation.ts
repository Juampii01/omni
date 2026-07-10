/**
 * Test de aislamiento RLS real: usa el anon key + un JWT de usuario real
 * (login real, no service_role) para simular exactamente lo que un
 * navegador puede hacer — a diferencia de scripts/verify-isolation.ts, que
 * arma el contexto de IA vía service_role y por lo tanto nunca ejercita RLS.
 *
 * Crea 2 clientes con un owner cada uno, siembra una fila marcada por
 * cliente en cada tabla client_id-scoped del schema, loguea como el owner
 * del cliente A y confirma que NO puede leer ni escribir filas del
 * cliente B, y que SÍ puede leer las suyas propias. También cubre
 * `clients` y `profiles` como casos especiales (no se siembran aparte —
 * la fila a testear es el propio cliente/usuario B creado en seedClient).
 *
 * Uso: pnpm tsx --env-file=.env.local scripts/verify-rls-isolation.ts
 */
import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js"
import { createServiceClient } from "../lib/supabase-service"

const service = createServiceClient()
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

interface TableConfig {
  table: string
  idColumn: string
  seed: (clientId: string, marker: string) => Record<string, unknown>
  updateField: string
  updateValue: unknown
}

// Toda tabla client_id-scoped del schema con RLS destinada a acceso de
// cliente (se excluyen las service_role-only: client_config,
// client_mentor_knowledge, slack_*, instagram_*, oauth_states,
// audit_logs, *_analyses — esas nunca se leen desde el browser).
const TABLES: TableConfig[] = [
  { table: "leads", idColumn: "id", seed: (c, m) => ({ client_id: c, name: `Lead ${m}`, notes: m }), updateField: "notes", updateValue: "hackeado" },
  { table: "client_business_context", idColumn: "client_id", seed: (c, m) => ({ client_id: c, context: { marker: m } }), updateField: "context", updateValue: { hacked: true } },
  { table: "client_docs_pages", idColumn: "id", seed: (c, m) => ({ client_id: c, title: m }), updateField: "title", updateValue: "hackeado" },
  { table: "client_sops", idColumn: "id", seed: (c, m) => ({ client_id: c, title: m }), updateField: "title", updateValue: "hackeado" },
  { table: "content_ideas", idColumn: "id", seed: (c, m) => ({ client_id: c, channel: "instagram", title: m }), updateField: "title", updateValue: "hackeado" },
  { table: "content_competitors", idColumn: "id", seed: (c, m) => ({ client_id: c, channel: "instagram", name: m }), updateField: "name", updateValue: "hackeado" },
  { table: "content_vault", idColumn: "id", seed: (c, m) => ({ client_id: c, channel: "instagram", url: `https://example.com/${m}`, title: m }), updateField: "title", updateValue: "hackeado" },
  { table: "content_calendar", idColumn: "id", seed: (c) => ({ client_id: c, scheduled_date: new Date().toISOString().slice(0, 10) }), updateField: "status", updateValue: "recorded" },
  { table: "content_scripts", idColumn: "id", seed: (c, m) => ({ client_id: c, idea_id: null, script_type: "hook", script: { marker: m } }), updateField: "script", updateValue: { hacked: true } },
  { table: "kanban_tasks", idColumn: "id", seed: (c, m) => ({ client_id: c, title: m }), updateField: "title", updateValue: "hackeado" },
  { table: "calendar_events", idColumn: "id", seed: (c, m) => ({ client_id: c, title: m, event_date: new Date().toISOString().slice(0, 10) }), updateField: "title", updateValue: "hackeado" },
  { table: "notifications", idColumn: "id", seed: (c, m) => ({ client_id: c, title: m }), updateField: "title", updateValue: "hackeado" },
  { table: "daily_briefings", idColumn: "id", seed: (c, m) => ({ client_id: c, date: new Date().toISOString().slice(0, 10), type: "leads", findings: [{ marker: m }] }), updateField: "messages_analyzed", updateValue: 999 },
]

async function seedClient(label: "A" | "B") {
  const marker = `RLS_${label}_${Math.random().toString(36).slice(2, 8)}`
  const email = `rls-test-${label.toLowerCase()}-${Date.now()}@omni-test.local`
  const password = `Test${Math.random().toString(36).slice(2, 10)}!`

  const { data: client, error: clientError } = await service
    .from("clients")
    .insert({ name: `RLS Test ${label} (${marker})` })
    .select("id")
    .single()
  if (clientError || !client) throw clientError ?? new Error("no client")
  const clientId = client.id as string

  const { data: userRes, error: userError } = await service.auth.admin.createUser({ email, password, email_confirm: true })
  if (userError || !userRes.user) throw userError ?? new Error("no user")

  const { error: profileError } = await service
    .from("profiles")
    .insert({ id: userRes.user.id, client_id: clientId, role: "owner", full_name: `Owner ${label}` })
  if (profileError) throw profileError

  for (const cfg of TABLES) {
    const { error } = await service.from(cfg.table).insert(cfg.seed(clientId, marker))
    if (error) throw new Error(`seed falló para ${cfg.table}: ${error.message}`)
  }

  const anon = createSupabaseClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data: signIn, error: signInError } = await anon.auth.signInWithPassword({ email, password })
  if (signInError || !signIn.session) throw signInError ?? new Error("no session")

  return { clientId, marker, userId: userRes.user.id, session: anon }
}

async function cleanup(clientId: string, userId: string) {
  await service.from("clients").delete().eq("id", clientId)
  await service.auth.admin.deleteUser(userId)
}

async function checkTable(cfg: TableConfig, a: { session: SupabaseClient; clientId: string; marker: string }, b: { clientId: string; marker: string }, failures: string[]) {
  const { data: rows, error } = await a.session.from(cfg.table).select("*")
  if (error) {
    failures.push(`${cfg.table}: la query de A falló inesperadamente: ${error.message}`)
    return
  }
  // Comparación directa por client_id — más confiable que buscar el marker
  // como substring (algunas tablas, como content_calendar, no tienen
  // ninguna columna de texto libre donde el marker pueda aparecer).
  const rowClientIds = (rows ?? []).map((r) => (r as Record<string, unknown>).client_id)
  const leaked = rowClientIds.includes(b.clientId)
  if (leaked) failures.push(`${cfg.table}: A pudo leer datos de B (client_id=${b.clientId}) — LEAK CONFIRMADO`)

  const ownRow = rowClientIds.includes(a.clientId)
  if (!ownRow) failures.push(`${cfg.table}: A no pudo leer su propia data (client_id=${a.clientId}) — el fix rompió el acceso legítimo`)

  const { data: bRows } = await service.from(cfg.table).select(cfg.idColumn).eq("client_id", b.clientId).limit(1)
  if (bRows && bRows[0]) {
    const bId = (bRows[0] as unknown as Record<string, unknown>)[cfg.idColumn]
    const { data: writeResult, error: writeError } = await a.session
      .from(cfg.table)
      .update({ [cfg.updateField]: cfg.updateValue } as never)
      .eq(cfg.idColumn, bId as string)
      .select(cfg.idColumn)
    const wrote = !writeError && (writeResult?.length ?? 0) > 0
    if (wrote) failures.push(`${cfg.table}: A pudo ESCRIBIR sobre una fila de B — LEAK DE ESCRITURA CONFIRMADO`)
  }
}

async function checkClientsAndProfiles(a: { session: SupabaseClient; marker: string }, b: { clientId: string; userId: string; marker: string }, failures: string[]) {
  const { data: clientRows, error: clientErr } = await a.session.from("clients").select("*")
  if (clientErr) failures.push(`clients: la query de A falló inesperadamente: ${clientErr.message}`)
  else if (JSON.stringify(clientRows).includes(b.marker)) failures.push(`clients: A pudo leer el cliente B (marker=${b.marker}) — LEAK CONFIRMADO`)

  const { data: clientWrite, error: clientWriteErr } = await a.session
    .from("clients")
    .update({ name: "hackeado" })
    .eq("id", b.clientId)
    .select("id")
  if (!clientWriteErr && (clientWrite?.length ?? 0) > 0) failures.push(`clients: A pudo ESCRIBIR sobre el cliente B — LEAK DE ESCRITURA CONFIRMADO`)

  const { data: profileRows, error: profileErr } = await a.session.from("profiles").select("*")
  if (profileErr) failures.push(`profiles: la query de A falló inesperadamente: ${profileErr.message}`)
  else if ((profileRows ?? []).some((r) => (r as Record<string, unknown>).id === b.userId)) {
    failures.push(`profiles: A pudo leer el profile del owner de B — LEAK CONFIRMADO`)
  }
}

async function main() {
  console.log("Sembrando cliente A y cliente B (cada uno con su propio owner logueado y una fila marcada en cada tabla)...")
  const a = await seedClient("A")
  const b = await seedClient("B")

  const failures: string[] = []

  try {
    for (const cfg of TABLES) {
      console.log(`Probando ${cfg.table}...`)
      await checkTable(cfg, a, b, failures)
    }
    console.log("Probando clients y profiles...")
    await checkClientsAndProfiles(a, b, failures)
  } catch (err) {
    failures.push(`Excepción durante el test: ${err instanceof Error ? err.message : String(err)}`)
  } finally {
    console.log("\nLimpiando data temporal...")
    await cleanup(a.clientId, a.userId)
    await cleanup(b.clientId, b.userId)
  }

  if (failures.length > 0) {
    console.error(`\n❌ FALLÓ el test de aislamiento RLS (${failures.length} problema(s)):`)
    for (const f of failures) console.error(" -", f)
    process.exit(1)
  }

  console.log(`\n✅ RLS verificado con JWT real en ${TABLES.length + 2} tablas: ningún internal staff puede leer ni escribir datos de otro cliente.`)
}

main()
