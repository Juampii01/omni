/**
 * Verifica runLeadOutcomeAnalysis() de punta a punta contra la base real y
 * la API real de Anthropic: siembra un cliente con contexto de mentor +
 * leads (algunos comprados con términos de cierre), corre el análisis, y
 * confirma que devuelve findings bien formados. Limpia todo al final.
 *
 * Uso: pnpm tsx --env-file=.env.local scripts/verify-lead-outcome.ts
 */
import { createServiceClient } from "../lib/supabase-service"
import { runLeadOutcomeAnalysis } from "../lib/omni/lead-outcome-analysis"

const supabase = createServiceClient()

async function main() {
  const { data: client, error } = await supabase
    .from("clients")
    .insert({ name: "Test Lead Outcome", business_name: "Negocio Test", mentor_name: "Mentor Test" })
    .select("id")
    .single()
  if (error || !client) throw error ?? new Error("no client")
  const clientId = client.id as string

  const failures: string[] = []

  try {
    await supabase.from("client_mentor_knowledge").insert([
      { client_id: clientId, layer: "framework", title: "Calificar antes de vender", content: "Nunca dar precio sin 3 preguntas de diagnóstico." },
      { client_id: clientId, layer: "vocabulario", title: "Tono directo", content: "Hablar en datos concretos, sin adornos." },
      { client_id: clientId, layer: "casos", title: "Caso ejemplo", content: "Un lead con rating bajo cerró en cuotas y abandonó a la segunda." },
    ])

    const now = new Date()
    const daysAgo = (n: number) => new Date(now.getTime() - n * 86_400_000).toISOString()

    await supabase.from("leads").insert([
      {
        client_id: clientId, name: "Lead Alto Rating", rating: 5, source: "instagram",
        lead_type: "orgánico", niche: "fitness", notes: "Muy comprometido",
        purchased: true, deal_type: "pago_unico", deal_amount: 2000,
        created_at: daysAgo(20),
      },
      {
        client_id: clientId, name: "Lead Bajo Rating A", rating: 1, source: "ads",
        lead_type: "pago", niche: "fitness", notes: "Dudaba mucho",
        purchased: true, deal_type: "cuotas", deal_installments: 6, deal_installments_paid: 1, deal_amount: 3000,
        created_at: daysAgo(15),
      },
      {
        client_id: clientId, name: "Lead Bajo Rating B", rating: 1, source: "ads",
        lead_type: "pago", niche: "fitness", notes: "Mismo patrón",
        purchased: true, deal_type: "cuotas", deal_installments: 6, deal_installments_paid: 1, deal_amount: 3000,
        created_at: daysAgo(10),
      },
      {
        client_id: clientId, name: "Lead Sin Cerrar", rating: 3, source: "organico",
        lead_type: "organico", niche: "fitness", notes: "Sigue en conversación",
        purchased: false,
        created_at: daysAgo(5),
      },
    ])

    const result = await runLeadOutcomeAnalysis(clientId)

    console.log(`leadsAnalyzed: ${result.leadsAnalyzed}`)
    console.log(`findings: ${result.findings.length}`)
    console.log(JSON.stringify(result.findings, null, 2))

    if (result.leadsAnalyzed !== 4) failures.push(`Esperaba 4 leads analizados, vino ${result.leadsAnalyzed}`)
    for (const f of result.findings) {
      if (!f.titulo || !f.descripcion || !f.evidencia || !f.severidad) {
        failures.push(`Finding mal formado: ${JSON.stringify(f)}`)
      }
    }
  } finally {
    await supabase.from("clients").delete().eq("id", clientId)
  }

  if (failures.length > 0) {
    console.error("\n❌ FALLÓ:")
    for (const f of failures) console.error(" -", f)
    process.exit(1)
  }
  console.log("\n✅ runLeadOutcomeAnalysis funciona de punta a punta contra Claude real.")
}

main()
