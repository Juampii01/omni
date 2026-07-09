/**
 * Test de aislamiento entre clientes para buildClientContext().
 *
 * Simula 2 clientes con data cargada en las 4 fuentes (mentor knowledge,
 * leads, Slack, Instagram) y verifica que pedir el contexto del cliente A
 * no traiga ningún string/ID/fragmento de mensaje del cliente B — ni al
 * revés. Corre contra la base real (crea data temporal y la borra al final).
 *
 * Uso: pnpm tsx --env-file=.env.local scripts/verify-isolation.ts
 */
import { createServiceClient } from "../lib/supabase-service"
import { buildClientContext, renderSystemPrompt } from "../lib/omni/context"

const supabase = createServiceClient()

async function seedClient(label: "A" | "B") {
  const marker = `MARKER_${label}_${Math.random().toString(36).slice(2, 8)}`

  const { data: client, error: clientError } = await supabase
    .from("clients")
    .insert({ name: `Test Isolation ${label} (${marker})` })
    .select("id")
    .single()
  if (clientError || !client) throw clientError ?? new Error("no client")
  const clientId = client.id as string

  await supabase.from("client_mentor_knowledge").insert({
    client_id: clientId,
    layer: "framework",
    title: `Framework ${marker}`,
    content: `Contenido secreto de framework ${marker}`,
  })

  await supabase.from("leads").insert({
    client_id: clientId,
    name: `Lead ${marker}`,
    instagram: `@lead_${marker}`,
    notes: `Nota confidencial ${marker}`,
  })

  const { data: channel } = await supabase
    .from("slack_channels")
    .insert({ client_id: clientId, slack_channel_id: `C_${marker}`, name: `canal-${marker}` })
    .select("id")
    .single()
  if (channel) {
    await supabase.from("slack_messages").insert({
      channel_id: channel.id,
      slack_ts: `${Date.now()}.${Math.random()}`,
      user_name: `user_${marker}`,
      body: `mensaje slack secreto ${marker}`,
    })
  }

  const { data: conversation } = await supabase
    .from("instagram_conversations")
    .insert({ client_id: clientId, ig_conversation_id: `IG_${marker}`, participant_username: `ig_${marker}` })
    .select("id")
    .single()
  if (conversation) {
    await supabase.from("instagram_messages").insert({
      conversation_id: conversation.id,
      ig_message_id: `MSG_${marker}`,
      sender: "lead",
      body: `DM secreto de instagram ${marker}`,
    })
  }

  return { clientId, marker }
}

async function cleanup(clientId: string) {
  // cascade se encarga de mentor_knowledge / leads / slack_channels+messages /
  // instagram_conversations+messages
  await supabase.from("clients").delete().eq("id", clientId)
}

async function main() {
  console.log("Sembrando cliente A y cliente B con data marcada...")
  const a = await seedClient("A")
  const b = await seedClient("B")

  let failures: string[] = []

  try {
    console.log("\nPidiendo contexto del cliente A...")
    const contextA = await buildClientContext(a.clientId)
    const promptA = renderSystemPrompt(contextA)

    if (promptA.includes(b.marker) || promptA.includes(b.clientId)) {
      failures.push(`El contexto de A contiene datos de B (marker=${b.marker})`)
    }
    if (!promptA.includes(a.marker)) {
      failures.push(`El contexto de A NO contiene su propia data (marker=${a.marker}) — el test no es válido`)
    }

    console.log("Pidiendo contexto del cliente B...")
    const contextB = await buildClientContext(b.clientId)
    const promptB = renderSystemPrompt(contextB)

    if (promptB.includes(a.marker) || promptB.includes(a.clientId)) {
      failures.push(`El contexto de B contiene datos de A (marker=${a.marker})`)
    }
    if (!promptB.includes(b.marker)) {
      failures.push(`El contexto de B NO contiene su propia data (marker=${b.marker}) — el test no es válido`)
    }
  } catch (err) {
    failures.push(`Excepción durante el test: ${err instanceof Error ? err.message : String(err)}`)
  } finally {
    console.log("\nLimpiando data temporal...")
    await cleanup(a.clientId)
    await cleanup(b.clientId)
  }

  if (failures.length > 0) {
    console.error("\n❌ FALLÓ el test de aislamiento:")
    for (const f of failures) console.error(" -", f)
    process.exit(1)
  }

  console.log("\n✅ Aislamiento verificado: el contexto de cada cliente solo contiene su propia data.")
}

main()
