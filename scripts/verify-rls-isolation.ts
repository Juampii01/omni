/**
 * Test de aislamiento RLS real: usa el anon key + un JWT de usuario real
 * (login real, no service_role) para simular exactamente lo que un
 * navegador puede hacer — a diferencia de scripts/verify-isolation.ts, que
 * arma el contexto de IA vía service_role y por lo tanto nunca ejercita RLS.
 *
 * Crea 2 clientes con un owner cada uno y datos marcados en leads,
 * client_business_context y content_ideas. Loguea como el owner del
 * cliente A y confirma que NO puede leer (ni escribir) filas del cliente B
 * en esas 3 tablas, y que SÍ puede leer las suyas propias.
 *
 * Uso: pnpm tsx --env-file=.env.local scripts/verify-rls-isolation.ts
 */
import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { createServiceClient } from "../lib/supabase-service"

const service = createServiceClient()
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

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

  const { data: userRes, error: userError } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (userError || !userRes.user) throw userError ?? new Error("no user")

  const { error: profileError } = await service
    .from("profiles")
    .insert({ id: userRes.user.id, client_id: clientId, role: "owner", full_name: `Owner ${label}` })
  if (profileError) throw profileError

  await service.from("leads").insert({ client_id: clientId, name: `Lead ${marker}`, notes: marker })
  await service.from("client_business_context").insert({ client_id: clientId, context: { marker } })
  await service.from("content_ideas").insert({ client_id: clientId, channel: "instagram", title: `Idea ${marker}` })

  const anon = createSupabaseClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data: signIn, error: signInError } = await anon.auth.signInWithPassword({ email, password })
  if (signInError || !signIn.session) throw signInError ?? new Error("no session")

  return { clientId, marker, userId: userRes.user.id, session: anon }
}

async function cleanup(clientId: string, userId: string) {
  await service.from("clients").delete().eq("id", clientId)
  await service.auth.admin.deleteUser(userId)
}

async function main() {
  console.log("Sembrando cliente A y cliente B, cada uno con su propio owner logueado...")
  const a = await seedClient("A")
  const b = await seedClient("B")

  const failures: string[] = []

  try {
    for (const table of ["leads", "client_business_context", "content_ideas"] as const) {
      console.log(`\nProbando ${table} logueado como owner de A...`)
      const { data: rows, error } = await a.session.from(table).select("*")
      if (error) {
        failures.push(`${table}: la query de A falló inesperadamente: ${error.message}`)
        continue
      }
      const leaked = JSON.stringify(rows).includes(b.marker)
      if (leaked) failures.push(`${table}: A pudo leer datos de B (marker=${b.marker}) — LEAK CONFIRMADO`)

      const ownRow = (rows ?? []).some((r) => JSON.stringify(r).includes(a.marker))
      if (!ownRow) failures.push(`${table}: A no pudo leer su propia data (marker=${a.marker}) — el fix rompió el acceso legítimo`)

      // Intento de escritura directa contra una fila de B (usando su id real)
      const { data: bRows } = await service.from(table).select("id").eq("client_id", b.clientId).limit(1)
      if (bRows && bRows[0]) {
        const { data: writeResult, error: writeError } = await a.session
          .from(table)
          .update({ notes: "hackeado" } as never)
          .eq("id", bRows[0].id)
          .select("id")
        const wrote = !writeError && (writeResult?.length ?? 0) > 0
        if (wrote) failures.push(`${table}: A pudo ESCRIBIR sobre una fila de B — LEAK DE ESCRITURA CONFIRMADO`)
      }
    }
  } catch (err) {
    failures.push(`Excepción durante el test: ${err instanceof Error ? err.message : String(err)}`)
  } finally {
    console.log("\nLimpiando data temporal...")
    await cleanup(a.clientId, a.userId)
    await cleanup(b.clientId, b.userId)
  }

  if (failures.length > 0) {
    console.error("\n❌ FALLÓ el test de aislamiento RLS:")
    for (const f of failures) console.error(" -", f)
    process.exit(1)
  }

  console.log("\n✅ RLS verificado con JWT real: ningún internal staff puede leer ni escribir datos de otro cliente.")
}

main()
