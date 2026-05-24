/**
 * seed-real.ts — Seed con data real de Juampi / KAVAR LLC
 *
 * Limpia data demo ficticia y carga la operación real al 24 de mayo 2026.
 *
 * Uso: npx tsx scripts/seed-real.ts
 *
 * Requiere: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY en .env.local
 */

import { createClient } from "@supabase/supabase-js"
import * as fs from "fs"
import * as path from "path"

// ── Cargar .env.local manualmente (sin dotenv para no agregar dependencia) ──
function loadEnv() {
  const envPath = path.join(process.cwd(), ".env.local")
  if (!fs.existsSync(envPath)) {
    console.error("❌ .env.local no encontrado")
    process.exit(1)
  }
  const lines = fs.readFileSync(envPath, "utf-8").split("\n")
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const eqIdx = trimmed.indexOf("=")
    if (eqIdx === -1) continue
    const key = trimmed.slice(0, eqIdx).trim()
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "")
    process.env[key] = val
  }
}

loadEnv()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !serviceRoleKey) {
  console.error("❌ Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY")
  process.exit(1)
}

const sb = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// ── Helper ──────────────────────────────────────────────────────────────────
function monthsAgo(n: number): string {
  const d = new Date()
  d.setDate(1)
  d.setMonth(d.getMonth() - n)
  return d.toISOString().split("T")[0]
}

async function run() {
  console.log("🚀 Iniciando seed real — KAVAR LLC (24 mayo 2026)\n")

  // ── 0. Obtener profile del owner ─────────────────────────────────────────
  const { data: ownerProfile } = await sb
    .from("profiles")
    .select("id, full_name, email")
    .limit(1)
    .single()

  if (!ownerProfile) {
    console.error("❌ No hay ningún profile en la DB. Creá una cuenta primero en /signup")
    process.exit(1)
  }
  const ownerId = ownerProfile.id
  console.log(`✅ Owner: ${ownerProfile.full_name ?? ownerProfile.email} (${ownerId})`)

  // ── 1. Limpiar data demo ─────────────────────────────────────────────────
  console.log("\n🧹 Limpiando data demo...")

  // Lanzamientos demo
  const { data: demoLaunches } = await sb
    .from("launches")
    .select("id")
    .in("name", ["Lanzamiento Abril 2026", "Lanzamiento Mayo 2026"])
  if (demoLaunches?.length) {
    await sb.from("launch_participants").delete().in("launch_id", demoLaunches.map((l: any) => l.id))
    await sb.from("launches").delete().in("id", demoLaunches.map((l: any) => l.id))
  }

  // Clientes demo (los 5 ficticios del seed anterior)
  const demoClientNames = [
    "Martina Rodríguez", "Santiago Méndez", "Valentina Lagos",
    "Rodrigo Castillo", "Camila Soto",
  ]
  const { data: demoClients } = await sb
    .from("clients")
    .select("id")
    .in("full_name", demoClientNames)
  if (demoClients?.length) {
    await sb.from("clients").delete().in("id", demoClients.map((c: any) => c.id))
  }

  // Revenue demo
  await sb.from("revenue_records").delete().eq("description", "seed_demo")

  // Expenses demo
  await sb.from("expense_records").delete().eq("description", "seed_demo")

  // KPIs demo
  await sb.from("kpis").delete().eq("notes", "seed_demo")

  // Announcements demo
  await sb
    .from("announcements")
    .delete()
    .in("title", ["¡Récord de MRR! 🚀", "Onboarding Camila completado"])

  // Tareas demo
  const demoTaskTitles = [
    "Preparar secuencia de emails lanzamiento mayo",
    "Grabar video de ventas programa mentoria",
    "Subir contenido semanal Instagram",
    "Renovar contrato Rodrigo Castillo",
    "Informe mensual clientes VIP",
    "Configurar webhook Instagram en Meta",
  ]
  await sb.from("tasks").delete().in("title", demoTaskTitles)

  console.log("   ✅ Demo data limpiada")

  // ── 2. Actualizar client_settings ────────────────────────────────────────
  console.log("\n⚙️  Configurando KAVAR LLC...")
  await sb.from("client_settings").update({
    business_name: "KAVAR LLC",
    currency: "USD",
    timezone: "America/Argentina/Buenos_Aires",
    onboarding_completed: true,
    demo_mode: false,
  } as any).eq("id", (await sb.from("client_settings").select("id").single()).data?.id)
  console.log("   ✅ client_settings actualizado")

  // ── 3. Clientes reales ───────────────────────────────────────────────────
  console.log("\n👥 Creando clientes reales...")

  // ─ Ann Sahakyan ─
  const { data: ann } = await sb
    .from("clients")
    .upsert({
      full_name: "Ann Sahakyan",
      company: "Smart Scale",
      industry: "Coaching / SaaS",
      email: "ann@smartscale.com",
      status: "active",
      tier: "premium",
      monthly_fee: 1500,
      currency: "USD",
      health_score: 65,
      slack_channel: "#ann-smart-scale",
      contract_start: "2025-09-01",
      notes: `PRODUCTO: Smart Scale Dashboard
- 5 tablas en producción: profiles, research_requests, competitor_snapshots, ai_diagnosis_*
- Stack: Next.js + Supabase
- Funcionalidades: Research competitivo, AI Diagnosis, Métricas ventas (export Airtable), Pipeline ManyChat

⚠️ URGENTE PHASE B+C:
- RLS desactivado en producción
- Anon key con TODOS los privilegios
- SIN BACKUPS
- ORDEN: Backup primero, después REVOKE + RLS

PRÓX ACCIÓN: Subir a $2,000/mes post Phase C completada`,
      tags: ["coaching", "saas", "phase-b-pendiente"],
    } as any, { onConflict: "full_name", ignoreDuplicates: false })
    .select()
    .single()

  // ─ GovBidder ─
  const { data: govbidder } = await sb
    .from("clients")
    .upsert({
      full_name: "GovBidder",
      company: "GovBidder",
      industry: "GovTech / Licitaciones públicas",
      status: "active",
      tier: "standard",
      monthly_fee: 500,
      currency: "USD",
      health_score: 80,
      slack_channel: "#govbidder",
      contract_start: "2026-01-01",
      notes: `3 PRODUCTOS DESARROLLADOS:
1. GovBidder Sales Dashboard — gestión de licitaciones
2. Content Dashboard — investigación, estudio, tareas, bases del negocio
3. Portal de Lanzamiento — login + desbloqueo diario + cupones automáticos + YouTube Live (4 días)

CONTACTOS:
- Cristián: cliente principal, decisor
- Santo: socio de Cristián (se está alejando internamente — problema de ellos)

⚠️ RENEGOCIACIÓN PROGRAMADA: 1/6/2026
Target: subir de $500/mes a $1,000-$1,500/mes
Justificación: desarrollé 3 dashboards en lugar de mantenimiento simple

BUGS LOOM PENDIENTES (Cristián):
- Pop-up sesión
- Selector de cliente
- Conectar IG
- Botón TikTok

PENDIENTES TÉCNICOS:
- Verificar OAUTH_TOKEN_ENCRYPTION_KEY en Vercel (Content Dashboard)
- Verificar GitHub Secrets DATABASE_URL + DIRECT_URL`,
      tags: ["govtech", "licitaciones", "renegociacion"],
    } as any, { onConflict: "full_name", ignoreDuplicates: false })
    .select()
    .single()

  // ─ Vendly (interno pausado) ─
  const { data: vendly } = await sb
    .from("clients")
    .upsert({
      full_name: "Vendly",
      company: "KAVAR (interno)",
      industry: "Web design / E-commerce",
      status: "internal_paused",
      tier: "standard",
      monthly_fee: 0,
      currency: "USD",
      health_score: 50,
      notes: `MI PRODUCTO INTERNO PAUSADO.
Servicio de páginas web ready-to-sell para e-commerce.
Modelo: setup ~$500 + maintenance mensual.
PAUSADO hasta validar Omni como flagship.
1 cliente real activo: Spriovanni Indumentaria`,
      tags: ["interno", "pausado", "ecommerce"],
    } as any, { onConflict: "full_name", ignoreDuplicates: false })
    .select()
    .single()

  // ─ Spriovanni (sub-cliente de Vendly) ─
  const { data: spriovanni } = await sb
    .from("clients")
    .upsert({
      full_name: "Spriovanni Indumentaria",
      company: "Spriovanni",
      industry: "E-commerce / Indumentaria",
      status: "active",
      tier: "standard",
      monthly_fee: 0,
      setup_paid: 500,
      currency: "USD",
      health_score: 75,
      parent_client_id: vendly?.id ?? null,
      notes: "Cliente de Vendly. Sitio web de ropa. Setup pagado $500.",
      tags: ["ecommerce", "indumentaria", "vendly"],
    } as any, { onConflict: "full_name", ignoreDuplicates: false })
    .select()
    .single()

  console.log(`   ✅ Ann Sahakyan (${ann?.id?.slice(0, 8)}...)`)
  console.log(`   ✅ GovBidder (${govbidder?.id?.slice(0, 8)}...)`)
  console.log(`   ✅ Vendly — interno pausado (${vendly?.id?.slice(0, 8)}...)`)
  console.log(`   ✅ Spriovanni — sub-cliente de Vendly (${spriovanni?.id?.slice(0, 8)}...)`)

  // ── 4. Contactos por cliente ──────────────────────────────────────────────
  console.log("\n📇 Creando contactos...")

  if (ann?.id) {
    await sb.from("contacts" as any).upsert([
      {
        client_id: ann.id,
        name: "Ann Sahakyan",
        email: "ann@smartscale.com",
        role: "Founder",
        is_primary: true,
      },
    ], { onConflict: "client_id,name" })
  }

  if (govbidder?.id) {
    await sb.from("contacts" as any).upsert([
      {
        client_id: govbidder.id,
        name: "Cristián",
        email: "cristian@govbidder.com",
        role: "Founder / Decisor",
        is_primary: true,
        notes: "Cliente principal. Me contrató y trabaja con Santo.",
      },
      {
        client_id: govbidder.id,
        name: "Santo",
        email: "santo@govbidder.com",
        role: "Socio",
        is_primary: false,
        notes: "Socio de Cristián. Cristián se está alejando de él — problema de ellos.",
      },
    ], { onConflict: "client_id,name" })
  }

  console.log("   ✅ Contactos creados")

  // ── 5. Revenue records (6 meses reales) ──────────────────────────────────
  console.log("\n💰 Cargando revenue records...")

  const revenueRows: any[] = []

  // Ann: $1,500/mes desde sep 2025 (9 meses)
  for (let i = 8; i >= 0; i--) {
    revenueRows.push({
      period_month: monthsAgo(i),
      client_id: ann?.id ?? null,
      category: "retainer",
      amount: 1500,
      currency: "USD",
      description: `Smart Scale retainer — ${monthsAgo(i).slice(0, 7)}`,
    })
  }

  // GovBidder: $500/mes desde ene 2026 (5 meses)
  for (let i = 4; i >= 0; i--) {
    revenueRows.push({
      period_month: monthsAgo(i),
      client_id: govbidder?.id ?? null,
      category: "retainer",
      amount: 500,
      currency: "USD",
      description: `GovBidder retainer — ${monthsAgo(i).slice(0, 7)}`,
    })
  }

  // Spriovanni: setup $500 en abril 2026
  revenueRows.push({
    period_month: monthsAgo(1),
    client_id: spriovanni?.id ?? null,
    category: "one_time",
    amount: 500,
    currency: "USD",
    description: "Spriovanni — setup fee web",
  })

  const { error: revErr } = await sb.from("revenue_records").insert(revenueRows)
  if (revErr) console.error("   ⚠️ Revenue error:", revErr.message)
  else console.log(`   ✅ ${revenueRows.length} revenue records`)

  // ── 6. Expenses (~$196/mes, últimos 3 meses) ──────────────────────────────
  console.log("\n🧾 Cargando expenses...")

  const expenseRows: any[] = []
  const expenseTemplate = [
    { category: "tools",     amount: 25,  description: "Notion + Calendly" },
    { category: "tools",     amount: 20,  description: "Claude Pro" },
    { category: "tools",     amount: 20,  description: "Cursor" },
    { category: "tools",     amount: 7,   description: "Google Workspace" },
    { category: "ads",       amount: 99,  description: "LinkedIn Sales Navigator" },
    { category: "other",     amount: 25,  description: "Doola LLC compliance (amortizado)" },
  ]

  for (let i = 2; i >= 0; i--) {
    for (const exp of expenseTemplate) {
      expenseRows.push({
        period_month: monthsAgo(i),
        ...exp,
        currency: "USD",
      })
    }
  }

  const { error: expErr } = await sb.from("expense_records").insert(expenseRows)
  if (expErr) console.error("   ⚠️ Expenses error:", expErr.message)
  else console.log(`   ✅ ${expenseRows.length} expense records (~$196/mes)`)

  // ── 7. KPIs MRR ──────────────────────────────────────────────────────────
  console.log("\n📊 Cargando KPIs...")

  await sb.from("kpis").insert([
    {
      period_month: monthsAgo(2),
      category: "finance",
      metric_name: "MRR",
      metric_value: 1500,
      metric_target: 2000,
      unit: "USD",
      notes: "Solo Ann activa",
    },
    {
      period_month: monthsAgo(1),
      category: "finance",
      metric_name: "MRR",
      metric_value: 2000,
      metric_target: 3000,
      unit: "USD",
      notes: "Ann $1500 + GovBidder $500",
    },
    {
      period_month: monthsAgo(0),
      category: "finance",
      metric_name: "MRR",
      metric_value: 2000,
      metric_target: 5000,
      unit: "USD",
      notes: "Ann $1500 + GovBidder $500. Meta: $20k en 12-18 meses.",
    },
  ])
  console.log("   ✅ KPIs MRR cargados")

  // ── 8. Tareas reales (~20) ────────────────────────────────────────────────
  console.log("\n✅ Cargando tareas reales...")

  const today = new Date()
  const inDays = (n: number) => {
    const d = new Date(today)
    d.setDate(d.getDate() + n)
    return d.toISOString().split("T")[0]
  }

  const tasks: any[] = [
    // URGENTES — Smart Scale
    {
      title: "Smart Scale Phase B: Backup pg_dump completo",
      description: "pg_dump de 5 tablas de Ann → R2 o local. VALIDAR restore en proyecto test ANTES de Phase C.",
      status: "todo",
      priority: "urgent",
      created_by: ownerId,
      due_date: inDays(2),
      tags: ["ann", "seguridad"],
    },
    {
      title: "Smart Scale Phase C: REVOKE anon + activar RLS",
      description: "Solo DESPUÉS de backup validado. REVOKE privileges anon + activar RLS en 5 tablas + crear policies + tests.",
      status: "todo",
      priority: "urgent",
      created_by: ownerId,
      due_date: inDays(4),
      tags: ["ann", "seguridad"],
    },
    {
      title: "Subir a Ann a $2,000/mes",
      description: "Post Phase C completada. Justificación: trabajo extra de seguridad + nuevo scope.",
      status: "todo",
      priority: "high",
      created_by: ownerId,
      due_date: inDays(8),
      tags: ["ann", "revenue"],
    },

    // GovBidder
    {
      title: "Renegociación GovBidder a $1,000-1,500/mes",
      description: "Mostrar valor entregado: 3 dashboards completos. Cobrar lo justo. Call programada para 1/6.",
      status: "todo",
      priority: "high",
      created_by: ownerId,
      due_date: inDays(8),
      tags: ["govbidder", "revenue"],
    },
    {
      title: "Trackeo diario de horas en GovBidder durante mayo",
      description: "Justificar renegociación con data real de horas trabajadas.",
      status: "in_progress",
      priority: "high",
      created_by: ownerId,
      tags: ["govbidder"],
    },
    {
      title: "Responder Loom de Cristián con audio Wispr Flow",
      description: "Pendiente de respuesta.",
      status: "todo",
      priority: "high",
      created_by: ownerId,
      due_date: inDays(1),
      tags: ["govbidder", "comunicacion"],
    },
    {
      title: "Fix: Pop-up de sesión (Cristián Loom)",
      description: "Bug reportado en Loom. Content Dashboard.",
      status: "todo",
      priority: "high",
      created_by: ownerId,
      tags: ["govbidder", "bug"],
    },
    {
      title: "Fix: Selector de cliente (Cristián Loom)",
      description: "Bug reportado en Loom. Content Dashboard.",
      status: "todo",
      priority: "high",
      created_by: ownerId,
      tags: ["govbidder", "bug"],
    },
    {
      title: "Fix: Conectar IG (Cristián Loom)",
      description: "OAuth flow de Instagram no está funcionando para ellos.",
      status: "todo",
      priority: "high",
      created_by: ownerId,
      tags: ["govbidder", "bug"],
    },
    {
      title: "Fix: Botón TikTok (Cristián Loom)",
      description: "Bug reportado en Loom.",
      status: "todo",
      priority: "normal",
      created_by: ownerId,
      tags: ["govbidder", "bug"],
    },
    {
      title: "Verificar OAUTH_TOKEN_ENCRYPTION_KEY en Vercel (Content Dashboard)",
      description: "Confirmar que está bien configurada en el proyecto de Cristián.",
      status: "todo",
      priority: "normal",
      created_by: ownerId,
      tags: ["govbidder", "infra"],
    },
    {
      title: "GitHub Secrets: DATABASE_URL + DIRECT_URL (Content Dashboard)",
      description: "Configurar para deploy automatizado.",
      status: "todo",
      priority: "normal",
      created_by: ownerId,
      tags: ["govbidder", "infra"],
    },

    // KAVAR / OMNI
    {
      title: "Verificar disponibilidad 'KAVAR' (USPTO, INPI AR, Google, LinkedIn)",
      description: "Antes de pagar el dominio kavar.io y registrar en Doola.",
      status: "todo",
      priority: "urgent",
      created_by: ownerId,
      due_date: inDays(1),
      tags: ["kavar", "legal"],
    },
    {
      title: "Pagar $343: Doola + dominio kavar.io + Google Workspace",
      description: "Estrategia híbrida C — cuando cierre primer cliente nuevo.",
      status: "todo",
      priority: "high",
      created_by: ownerId,
      tags: ["kavar", "legal"],
    },
    {
      title: "Primer post LinkedIn 'Nace KAVAR'",
      description: "Arrancar generación de contenido público. Semana 26 mayo.",
      status: "todo",
      priority: "high",
      created_by: ownerId,
      due_date: inDays(2),
      tags: ["kavar", "marketing"],
    },
    {
      title: "Activar Calendly público + email juampi@kavar.io",
      description: "Una vez tenga el dominio configurado.",
      status: "todo",
      priority: "high",
      created_by: ownerId,
      tags: ["kavar", "setup"],
    },
    {
      title: "Crear LinkedIn Company Page KAVAR",
      description: "Para outbound + branding.",
      status: "todo",
      priority: "normal",
      created_by: ownerId,
      tags: ["kavar", "marketing"],
    },
    {
      title: "Diseñar logo final KAVAR (Figma/Canva)",
      description: "Combo 5: mint+green+forest + wordmark Inter Bold.",
      status: "todo",
      priority: "normal",
      created_by: ownerId,
      tags: ["kavar", "branding"],
    },
    {
      title: "Plan de producto Vendly + Nexo (10 preguntas pendientes)",
      description: "Definir si seguir o pivotear. 5 preguntas por producto.",
      status: "todo",
      priority: "normal",
      created_by: ownerId,
      tags: ["vendly", "estrategia"],
    },
    {
      title: "Conectar Instagram a Omni",
      description: "OAuth flow con mi cuenta de IG personal/business.",
      status: "todo",
      priority: "high",
      created_by: ownerId,
      tags: ["omni", "setup"],
    },
  ]

  const { error: tasksErr } = await sb.from("tasks").insert(tasks)
  if (tasksErr) console.error("   ⚠️ Tasks error:", tasksErr.message)
  else console.log(`   ✅ ${tasks.length} tareas reales`)

  // ── 9. Bases del negocio ──────────────────────────────────────────────────
  console.log("\n📚 Cargando bases del negocio...")

  const businessDocs = [
    {
      title: "Misión KAVAR",
      category: "base",
      content: "Liberar a founders del caos operativo para que se enfoquen en crecer.",
    },
    {
      title: "Visión KAVAR",
      category: "base",
      content: "Ser el sistema operativo predeterminado para empresas digitales de habla hispana en LATAM y USA.",
    },
    {
      title: "ICP de Omni",
      category: "base",
      content: `Founders y dueños de:
- Coaches / infoproductores
- Founders SaaS / startups digitales
- Dueños de agencia (marketing, diseño, dev)
- Dueños de e-commerce
- Consultores / freelancers premium
- Dueños de servicios profesionales (estudios, clínicas)

Características comunes:
- Tienen 25+ softwares conectados con cinta
- Data dispersa, comunicación caótica
- Pierden noches sin dormir por desorden operativo
- Pueden invertir $4K setup + $500/mes`,
    },
    {
      title: "Oferta Omni",
      category: "base",
      content: `SETUP: $4,000 USD (one-time)
- Instalación completa del dashboard
- Configuración de 11 módulos
- Integración con sus APIs (IG, Meta Ads, ManyChat, etc)
- Carga de su data inicial
- Capacitación + handoff

MANTENIMIENTO: $500 USD/mes
- Mantenimiento continuo del sistema
- Slack channel privado
- Mejoras y actualizaciones
- Soporte continuo`,
    },
    {
      title: "Stack KAVAR (mayo 2026)",
      category: "base",
      content: `~$196/mes total:
- Notion + Calendly: $25
- Claude Pro: $20
- Cursor: $20
- Google Workspace: $7
- LinkedIn Sales Navigator: $99
- Doola LLC compliance: $25 (amortizado)

Infraestructura (free tiers):
- Vercel Hobby
- Supabase Free`,
    },
  ]

  for (const doc of businessDocs) {
    // Upsert por título para idempotencia
    const { data: existing } = await sb
      .from("business_docs" as any)
      .select("id")
      .eq("title", doc.title)
      .single()

    if (existing) {
      await sb.from("business_docs" as any).update({ content: doc.content }).eq("id", existing.id)
    } else {
      await sb.from("business_docs" as any).insert({ ...doc, file_url: "inline", file_type: "text" })
    }
  }
  console.log(`   ✅ ${businessDocs.length} bases del negocio`)

  // ── 10. Announcements ─────────────────────────────────────────────────────
  console.log("\n📢 Creando anuncios...")

  const { data: existingAnn } = await sb
    .from("announcements")
    .select("id")
    .eq("title", "⚠️ URGENTE: Smart Scale sin RLS")
    .single()

  if (!existingAnn) {
    await sb.from("announcements").insert([
      {
        title: "⚠️ URGENTE: Smart Scale sin RLS",
        body: "Ann tiene RLS desactivado en producción y anon key con todos los privilegios. Phase B (backup) antes del 26/5, Phase C (RLS) antes del 28/5.",
        is_pinned: true,
      },
      {
        title: "🚀 KAVAR entra en modo lanzamiento",
        body: "Omni v1.0 listo para mostrar. Meta: primer cliente nuevo antes del 7/6. Primer post LinkedIn semana del 26/5.",
        is_pinned: true,
      },
      {
        title: "💰 MRR actual: $2,000/mes",
        body: "Ann $1,500 + GovBidder $500. Renegociación GovBidder el 1/6 → target $1,000-1,500. Post Phase C: Ann sube a $2,000.",
        is_pinned: false,
      },
    ])
  }
  console.log("   ✅ Anuncios creados")

  // ── 11. Launch histórico (GovBidder) ─────────────────────────────────────
  console.log("\n🚀 Cargando launch histórico GovBidder...")

  const { data: existingLaunch } = await sb
    .from("launches")
    .select("id")
    .eq("name", "GovBidder — Portal 4 días")
    .single()

  if (!existingLaunch) {
    const { data: launch } = await sb
      .from("launches")
      .insert({
        name: "GovBidder — Portal 4 días",
        description: "Cohorte sincrónica de 4 días con clases en vivo + tareas diarias + cupones automáticos. Lanzamiento del producto de licitaciones.",
        status: "closed",
        start_date: "2026-04-15",
        end_date: "2026-04-18",
        target_revenue: 10000,
        actual_revenue: 0,
        participant_count: 0,
        coupon_code: "EARLY30",
        coupon_discount_pct: 30,
      } as any)
      .select()
      .single()
    console.log(`   ✅ Launch GovBidder (${launch?.id?.slice(0, 8)}...)`)
  } else {
    console.log("   ℹ️  Launch GovBidder ya existe")
  }

  // ── 12. Automations activas ───────────────────────────────────────────────
  console.log("\n🤖 Cargando automaciones activas...")

  const automations: any[] = [
    {
      name: "Refresh Instagram Token",
      description: "Refresca el long-lived token de IG antes de que expire (cada día a las 3am UTC).",
      type: "cron",
      status: "active",
      trigger_config: { schedule: "0 3 * * *", description: "Diario 3am UTC" },
      action_config: { type: "refresh_ig_token", endpoint: "/api/cron/instagram-sync" },
      cron_expression: "0 3 * * *",
    },
    {
      name: "Publicar posts programados IG",
      description: "Revisa la cola de publicación y publica los posts cuyo scheduled_for ya pasó.",
      type: "cron",
      status: "active",
      trigger_config: { schedule: "*/5 * * * *", description: "Cada 5 minutos" },
      action_config: { type: "publish_scheduled_ig", endpoint: "/api/cron/ig-publish" },
      cron_expression: "*/5 * * * *",
    },
    {
      name: "Procesar webhooks IG",
      description: "Procesa eventos pendientes de Instagram Webhooks (comments, DMs, mentions).",
      type: "cron",
      status: "active",
      trigger_config: { schedule: "* * * * *", description: "Cada 1 minuto" },
      action_config: { type: "process_ig_webhooks", endpoint: "/api/cron/ig-webhooks" },
      cron_expression: "* * * * *",
    },
    {
      name: "Backup diario Supabase",
      description: "Snapshot diario de la DB. Actualmente en free tier — habilitar pg_dump cuando se pague pro.",
      type: "cron",
      status: "active",
      trigger_config: { schedule: "0 4 * * *", description: "Diario 4am UTC" },
      action_config: { type: "backup_db", note: "Manual hasta tier pro" },
      cron_expression: "0 4 * * *",
    },
  ]

  for (const auto of automations) {
    const { data: existing } = await sb
      .from("automations" as any)
      .select("id")
      .eq("name", auto.name)
      .single()
    if (!existing) {
      await sb.from("automations" as any).insert(auto)
    }
  }
  console.log("   ✅ 4 automaciones activas")

  // ── Resumen final ────────────────────────────────────────────────────────
  console.log("\n" + "─".repeat(50))
  console.log("✅ SEED REAL COMPLETADO — KAVAR LLC")
  console.log("─".repeat(50))
  console.log(`   Clientes:   4 (Ann, GovBidder, Vendly, Spriovanni)`)
  console.log(`   Contactos:  3 (Ann, Cristián, Santo)`)
  console.log(`   Revenue:    ${revenueRows.length} records (~14 meses)`)
  console.log(`   Expenses:   ${expenseRows.length} records (3 meses × 6 items)`)
  console.log(`   Tareas:     ${tasks.length} reales urgentes`)
  console.log(`   Docs:       ${businessDocs.length} bases del negocio`)
  console.log(`   Launches:   1 (GovBidder histórico)`)
  console.log(`   Automations: 4 activas`)
  console.log("\n🎯 Tu dashboard ahora muestra TU operación real.")
}

run().catch((err) => {
  console.error("❌ Error en seed:", err)
  process.exit(1)
})
