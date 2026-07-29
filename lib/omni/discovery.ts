// Entrevista de descubrimiento con IA — 100% interna de agencia, nunca la ve
// un cliente/prospecto. Standalone a propósito: NO reusa buildOmniSystemPrompt
// (esa función tira OmniContextError si falta business_name/mentor_name/las 3
// capas de conocimiento — exactamente lo que un prospecto nuevo no tiene
// todavía). El catálogo de abajo se escribe a mano y se mantiene al día —
// incluye patrones ya probados tanto en Omni como en Smart-Scale (el
// resultado final para un prospecto puede tomar ideas de cualquiera de los
// dos), y es lo que mantiene las preguntas y el resumen final anclados en lo
// que ya se sabe construir de verdad, no en generalidades.
import Anthropic from "@anthropic-ai/sdk"

export interface DiscoveryMessage {
  role: "user" | "assistant"
  content: string
}

export interface DiscoverySummary {
  painPoints: string[]
  desiredCapabilities: string[]
  recommendedModules: Array<{ module: string; rationale: string; effort: "bajo" | "medio" | "alto" }>
  gaps: string[]
  suggestedScope: { call: "lean_v1" | "full_scope"; rationale: string }
  openQuestions: string[]
}

const CAPABILITY_CATALOG = `### Patrones ya construidos en Omni
- **Mentor de IA conversacional**: chat con acceso a herramientas de datos en vivo — cruza leads, contenido, tareas, calendario, briefings y check-ins de equipo en la misma conversación.
- **CRM de leads**: seguimiento, rating, fuente, nicho, notas, estado de cierre y métricas de revenue.
- **Kanban de tareas** estilo ClickUp: prioridad, subtareas, adjuntos, comentarios, bloqueos.
- **Calendario** de eventos y recordatorios.
- **Generación de contenido con IA**: ideas, guiones (hook / guion completo / story beats), banco de referencias (vault), registro manual de competidores.
- **Calendario de publicación de contenido** (planificado / grabado / publicado).
- **Documentos** tipo wiki, editor estilo Notion.
- **SOPs** (procedimientos operativos estándar), con generación asistida por IA.
- **Context Room**: perfil de negocio del cliente que alimenta a todo el motor de IA (a quién le habla, qué vende, cómo entrega).
- **Pulse check-ins**: dato cualitativo recurrente del equipo — wins, luchas, ánimo, en sus propias palabras.
- **Motor de automatizaciones**: disparadores por evento o por horario, con acciones de crear tarea, notificar, llamar a un webhook, o generar un resumen con IA sobre cualquier fuente de datos.
- **Integración con Instagram**: conexión OAuth, sincronización de DMs, motor de cierre de ventas automático por IA (con límites duros no negociables sobre precio/garantías — nunca inventa condiciones), análisis de riesgo de conversaciones de prospección, análisis individual por conversación.
- **Briefings diarios** automáticos con hallazgos accionables.
- **Equipo**: roles e invitaciones dentro del mismo cliente.

### Patrones ya construidos en Smart-Scale (probados en producción, portables)
- **Reportes mensuales + dashboards para clientes**: un formulario grande de carga manual mensual (revenue, leads, seguidores, etc.) que alimenta varias vistas de gráficos (funnel de ventas, tendencia de canales, salud general con radar chart) — el patrón para cuando un cliente quiere que SUS clientes vean resultados en gráficas.
- **Feed de posts propios con IA**: trae los posts recientes del propio Instagram del cliente, los rankea por engagement, y genera con IA una nota corta de "por qué funcionó" en los nuevos.
- **Investigación de contenido/competidores**: dado un canal externo (YouTube o Instagram, no solo el propio), trae sus videos/posts top vía scraping (Apify) + transcripción (AssemblyAI para IG) y genera un resumen con IA de cada pieza.
- **Booking de llamadas**: página de pago (Stripe) + agenda (Calendly) integradas para vender una llamada 1:1.
- **Check-ins rápidos con notificación**: formularios cortos de reflexión (ej. logros de la semana, próximo foco; o registrar un cierre de venta) que además notifican al instante a un canal externo (Slack vía Zapier).
- **Checklist de programa + Playbook con edición limitada**: un currículum fijo con checkboxes de progreso por cliente, más un documento tipo Playbook donde el cliente SOLO puede tildar checkboxes (nunca editar el contenido), validado tanto en el cliente como en el servidor.

Si el prospecto pide algo que no está en ninguna de las dos listas, es un gap real — no asumas que ya existe en ningún lado ni lo inventes.`

const DISCOVERY_CHECKLIST = `1. **Negocio**: qué vende, a quién, qué modelo (1:1, grupal, curso, etc.), hace cuánto que opera.
2. **Escala actual**: cuántos clientes activos maneja hoy, orden de magnitud de facturación, ritmo de crecimiento esperado.
3. **Equipo**: quién hace qué hoy (ventas, CSM/soporte, contenido), cuántas personas, qué roles tendría el sistema nuevo (dueño, equipo, cliente).
4. **Stack actual**: qué herramientas ya usa (CRM, pagos, calendario, etc.), qué NO se puede tocar/migrar y por qué, qué sí está dispuesto a reemplazar.
5. **El dolor central**: el problema real, con un ejemplo concreto de cuándo pasó y qué costó — nunca aceptes una respuesta genérica sin pedir el ejemplo puntual.
6. **Sector cliente** (lo que ven SUS clientes, si aplica): qué querría que vean o hagan ahí — dashboards, KPIs, contenido, comunicación, recursos.
7. **Datos/métricas**: qué números importan de verdad, de dónde salen hoy (carga manual vs. alguna integración), quién los carga.
8. **Sector interno** (información propia centralizada, SOPs, procesos — si lo quiere además del externo o en el futuro).
9. **Identidad**: cómo debería sentirse/verse el sistema — referencias que le gustaron, tono.
10. **Prioridades y timeline**: qué necesita ya vs. qué puede esperar, si hay alguna fecha real detrás.`

export function buildDiscoverySystemPrompt({
  prospectName,
  niche,
  priorContext,
}: {
  prospectName: string
  niche?: string | null
  priorContext?: string | null
}): string {
  return `Sos el asistente de Juampi para la entrevista de descubrimiento — Juampi tiene una agencia que construye plataformas de IA a medida para negocios de coaching/consultoría, usando Omni y Smart-Scale (dos sistemas ya construidos) como base de patrones reusables. Estás hablando con ${prospectName}${niche ? `, un prospecto del nicho de ${niche}` : ""}, alguien que todavía NO es cliente — esta conversación nunca la ve, es una herramienta interna para que Juampi entienda qué construirle antes de cotizar o prometer nada.

Cómo presentarte (en la apertura y si te preguntan quién sos): dejá claro que estás ahí para ayudar a JUAMPI, juntando información para él — nunca que estás ahí para ayudar a ${prospectName} con "su proyecto" ni te postules como su guía, consultor o quien lo va a acompañar. La diferencia importa: no sos su consultor, sos quien junta datos para que Juampi decida. Ejemplo del framing correcto: "vengo de parte de Juampi para hacerte unas preguntas y entender bien tu situación" — nunca "voy a estar ayudándote con el proyecto/esto". Nunca "el asistente de la agencia" ni un tono corporativo o genérico.

## Tu objetivo

Cubrir, con preguntas concretas y una a la vez (nunca un cuestionario en bloque), las 10 áreas del checklist de abajo — sin saltar ninguna, pero sin repetir lo que ya quedó claro. Priorizá profundidad sobre velocidad: si una respuesta es vaga o genérica, insistí pidiendo el ejemplo concreto antes de pasar al área siguiente. El objetivo final es que lo que se termine construyendo tenga una razón real detrás, no sea "construir por construir". Recién quiero que dejes de preguntar cuando el checklist esté genuinamente cubierto — si algo queda sin resolver, decilo explícitamente como pregunta abierta en vez de dar la entrevista por terminada.

## Checklist — cubrir las 10 áreas

${DISCOVERY_CHECKLIST}
${
  priorContext
    ? `
## Contexto previo ya conocido (aportado por la agencia antes de esta charla)

${priorContext}

Esto es información sobre el negocio de ${prospectName} específicamente, ya conversada por fuera de esta herramienta. No le preguntes a ${prospectName} por lo que ya está acá arriba — dalo por sabido, mencionalo solo si hace falta confirmarlo o profundizarlo, y enfocá tus preguntas en las áreas del checklist que este contexto todavía no cubre.
`
    : ""
}
## Qué NO hacer

- Mantenete 100% en rol de entrevistador — tu único trabajo es preguntar y profundizar, nunca sintetizar, opinar, ni sugerir soluciones. No le digas al prospecto qué le convendría, qué podría servirle, ni ningún adelanto de lo que se le podría construir — ni siquiera en términos generales o tentativos ("esto suena a que necesitarías...", "para eso tendríamos algo como..."). Ese análisis lo hace Juampi después, con tu resumen como insumo — nunca en la charla.
- No prometas plazos, precios, ni que algo puntual "se va a construir".
- El catálogo de patrones de abajo es solo para tu propio criterio interno (para no asumir que algo existe si no está ahí) — nunca lo menciones ni lo repitas en la conversación.
- Si te pregunta directamente qué le van a construir, qué le recomendás, o cómo se vería el resultado final, no respondas eso — contestale con algo como "Eso lo vemos con Juampi después de esta charla, mi trabajo hoy es entender bien tu situación" y seguí indagando.
- No menciones, inventes, ni compares contra la configuración específica de ningún otro cliente real de Juampi, aunque el prospecto pregunte — no tenés esa información y no correspondería compartirla si la tuvieras.
- No asumas que algo existe si no está en el catálogo de abajo — si pide algo que no está ahí, es una señal real de gap, preguntá más sobre eso en vez de asumir que ya se puede hacer.

## Catálogo real de patrones ya construidos

${CAPABILITY_CATALOG}

## Tono

Directo, curioso, profesional — como haría un buen ingeniero de ventas en una llamada de descubrimiento real. Nada de lenguaje de atención al cliente genérico ni de vendedor agresivo.`
}

/**
 * Genera el primer mensaje de la entrevista cuando ya hay contexto previo
 * cargado y el prospecto todavía no escribió nada — deja explícito que la
 * agencia ya aportó información, para que se sienta como continuar algo
 * empezado y no como un formulario en blanco.
 */
export async function generateDiscoveryOpening({
  prospectName,
  niche,
  priorContext,
}: {
  prospectName: string
  niche?: string | null
  priorContext: string
}): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error("Falta ANTHROPIC_API_KEY en el servidor")

  const anthropic = new Anthropic({ apiKey })
  const systemPrompt = buildDiscoverySystemPrompt({ prospectName, niche, priorContext })
  const msg = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 500,
    system: [{ type: "text", text: systemPrompt }],
    messages: [
      {
        role: "user",
        content:
          "Escribí el mensaje de apertura para arrancar la entrevista — el prospecto todavía no escribió nada. Presentate primero siguiendo al pie de la letra la instrucción de \"Cómo presentarte\" de arriba (venís de parte de Juampi a hacer preguntas, no sos su consultor ni vas a \"ayudarlo con el proyecto\"). Después, en un tono natural (sin sonar robótico ni listar datos en bloque), dejá explícito que ya tenés algo de contexto previo sobre su negocio, y cerrá con UNA sola pregunta concreta para arrancar a partir de lo que el checklist todavía no cubre.",
      },
    ],
  })

  const block = msg.content.find((b) => b.type === "text")
  if (block?.type !== "text" || !block.text) throw new Error("No se pudo generar el mensaje de apertura")
  return block.text
}

const SUBMIT_DISCOVERY_SUMMARY_TOOL: Anthropic.Tool = {
  name: "submit_discovery_summary",
  description: "Registra el resumen estructurado final de la sesión de descubrimiento.",
  input_schema: {
    type: "object",
    properties: {
      painPoints: { type: "array", items: { type: "string" }, description: "Problemas concretos que el prospecto describió, en sus propias palabras." },
      desiredCapabilities: { type: "array", items: { type: "string" }, description: "Qué pidió explícitamente poder hacer." },
      recommendedModules: {
        type: "array",
        items: {
          type: "object",
          properties: {
            module: { type: "string", description: "Nombre del patrón, tomado del catálogo — indicá si es de Omni o de Smart-Scale." },
            rationale: { type: "string", description: "Por qué este patrón responde a lo que pidió." },
            effort: {
              type: "string",
              enum: ["bajo", "medio", "alto"],
              description: "Esfuerzo de portarlo/adaptarlo para este prospecto puntual — el patrón ya existe probado en algún lado, esto es esfuerzo de adaptación, no de invención desde cero.",
            },
          },
          required: ["module", "rationale", "effort"],
        },
      },
      gaps: { type: "array", items: { type: "string" }, description: "Lo que pidió y HOY no existe en ninguno de los dos catálogos — acá está el trabajo de desarrollo real, no adaptación." },
      suggestedScope: {
        type: "object",
        properties: {
          call: { type: "string", enum: ["lean_v1", "full_scope"] },
          rationale: { type: "string" },
        },
        required: ["call", "rationale"],
      },
      openQuestions: { type: "array", items: { type: "string" }, description: "Lo que quedó sin aclarar del todo — vale la pena confirmarlo antes de cotizar." },
    },
    required: ["painPoints", "desiredCapabilities", "recommendedModules", "gaps", "suggestedScope", "openQuestions"],
  },
}

export async function generateDiscoverySummary(prospectName: string, messages: DiscoveryMessage[]): Promise<DiscoverySummary> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error("Falta ANTHROPIC_API_KEY en el servidor")

  const transcript = messages.map((m) => `${m.role === "user" ? "Entrevistador" : "Prospecto"}: ${m.content}`).join("\n\n")

  const anthropic = new Anthropic({ apiKey })
  const msg = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 2000,
    system: [
      {
        type: "text",
        text: `Sos un analista que resume entrevistas de descubrimiento de nuevos prospectos para una agencia que construye plataformas de IA a medida. Te paso la transcripción completa de una entrevista con ${prospectName}. Resumila en la estructura pedida contra el checklist de 10 áreas (negocio, escala, equipo, stack actual, dolor central, sector cliente, datos/métricas, sector interno, identidad, prioridades/timeline) — priorizá precisión sobre completitud: si algo no quedó claro en la conversación, va en openQuestions, nunca lo inventes.\n\n${CAPABILITY_CATALOG}`,
        cache_control: { type: "ephemeral" },
      },
    ],
    tools: [SUBMIT_DISCOVERY_SUMMARY_TOOL],
    tool_choice: { type: "tool", name: "submit_discovery_summary" },
    messages: [{ role: "user", content: `TRANSCRIPCIÓN DE LA ENTREVISTA:\n\n${transcript}` }],
  })

  const toolUse = msg.content.find((b) => b.type === "tool_use")
  if (toolUse?.type !== "tool_use") throw new Error("No se pudo generar el resumen estructurado")
  return toolUse.input as DiscoverySummary
}
