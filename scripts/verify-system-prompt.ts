/**
 * Verifica buildOmniSystemPrompt(): siembra un cliente temporal con
 * business_name/mentor_name + las 3 capas de mentor_knowledge, corre la
 * función real, chequea que el prompt final tenga los placeholders
 * reemplazados y las 3 capas presentes, y limpia todo al final.
 *
 * Uso: pnpm tsx --env-file=.env.local scripts/verify-system-prompt.ts
 */
import { createServiceClient } from "../lib/supabase-service"
import { buildOmniSystemPrompt, OmniContextError } from "../lib/omni/system-prompt"

const supabase = createServiceClient()

async function main() {
  const { data: client, error } = await supabase
    .from("clients")
    .insert({ name: "Test Prompt", business_name: "Negocio de Prueba", mentor_name: "Mentora Test" })
    .select("id")
    .single()
  if (error || !client) throw error ?? new Error("no client")
  const clientId = client.id as string

  const failures: string[] = []

  try {
    // Sin knowledge todavía: debe fallar explícito, no generar prompt parcial.
    try {
      await buildOmniSystemPrompt(clientId)
      failures.push("Debería haber fallado con contexto incompleto (sin mentor_knowledge) y no falló")
    } catch (err) {
      if (!(err instanceof OmniContextError)) {
        failures.push(`Falló pero no con OmniContextError: ${err}`)
      }
    }

    await supabase.from("client_mentor_knowledge").insert([
      { client_id: clientId, layer: "framework", title: "Calificar antes de ofrecer llamada", content: "3 preguntas de diagnóstico antes de agendar." },
      { client_id: clientId, layer: "vocabulario", title: "Ecosistema Circular", content: "Framework propio para hablar de crecimiento sostenido." },
      { client_id: clientId, layer: "casos", title: "Caso Gastón", content: "Cerró rápido porque calificó bien desde el DM inicial." },
    ])

    const prompt = await buildOmniSystemPrompt(clientId)

    if (!prompt.includes("Negocio de Prueba")) failures.push("No reemplazó {NOMBRE_DEL_NEGOCIO}")
    if (!prompt.includes("Mentora Test")) failures.push("No reemplazó {NOMBRE_DEL_MENTOR}")
    if (!prompt.includes("Calificar antes de ofrecer llamada")) failures.push("Falta capa 1 (framework)")
    if (!prompt.includes("Ecosistema Circular")) failures.push("Falta capa 2 (vocabulario)")
    if (!prompt.includes("Caso Gastón")) failures.push("Falta capa 3 (casos)")
    if (prompt.includes("{NOMBRE_DEL_NEGOCIO}") || prompt.includes("{NOMBRE_DEL_MENTOR}")) {
      failures.push("Quedó algún placeholder sin reemplazar")
    }
  } finally {
    await supabase.from("clients").delete().eq("id", clientId)
  }

  if (failures.length > 0) {
    console.error("❌ FALLÓ:")
    for (const f of failures) console.error(" -", f)
    process.exit(1)
  }
  console.log("✅ buildOmniSystemPrompt funciona: placeholders reemplazados, 3 capas presentes, falla explícito con contexto incompleto.")
}

main()
