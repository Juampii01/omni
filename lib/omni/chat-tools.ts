// Herramientas de solo lectura para el chat con el mentor — el "Sistema
// Operativo" conversacional: le permiten a Claude cruzar datos en vivo en
// vez de razonar solo con contexto fijo. 6 herramientas nombradas y
// angostas, no una genérica de "consultar cualquier tabla" — mismo criterio
// que ya usa el resto del código (crud-route.ts toma un string de tabla
// fijo al deploy, nunca del request; automation-actions.ts es un enum fijo
// de ramas). Ninguna incluye client_id en su input_schema — runChatTool
// siempre usa el clientId cerrado sobre ctx.clientId de la ruta, nunca uno
// que el modelo podría proveer.
import type Anthropic from "@anthropic-ai/sdk"
import {
  getLeadsSummary,
  getContentCalendarSummary,
  getKanbanTasksSummary,
  getCalendarEventsSummary,
  getDailyBriefingsSummary,
  getPulseCheckinsSummary,
} from "@/lib/omni/data-queries"

export const CHAT_TOOLS: Anthropic.Tool[] = [
  {
    name: "get_leads_summary",
    description:
      "Trae un resumen agregado de leads: totales, cerrados, tasa de conversión, rating promedio, desglose por fuente/estado, y volumen por semana. Usalo para cualquier pregunta sobre leads, ventas o conversión.",
    input_schema: {
      type: "object",
      properties: { sinceDays: { type: "number", description: "Ventana de días hacia atrás. Default 90." } },
    },
  },
  {
    name: "get_content_calendar_summary",
    description:
      "Trae un resumen del calendario de contenido: cuánto está planeado/grabado/publicado, por canal, y volumen por semana. Usalo para preguntas sobre cuánto contenido se publicó o se viene.",
    input_schema: {
      type: "object",
      properties: { sinceDays: { type: "number", description: "Ventana de días hacia atrás. Default 90." } },
    },
  },
  {
    name: "get_kanban_tasks_summary",
    description: "Trae un resumen de las tareas del Kanban: totales, por columna, por prioridad, bloqueadas y vencidas.",
    input_schema: {
      type: "object",
      properties: { columnId: { type: "string", description: "Filtrar por una columna puntual (opcional)." } },
    },
  },
  {
    name: "get_calendar_events_summary",
    description: "Trae eventos del calendario recientes y próximos, con su tipo y los próximos 10 en orden.",
    input_schema: {
      type: "object",
      properties: {
        pastDays: { type: "number", description: "Días hacia atrás a incluir. Default 30." },
        upcomingDays: { type: "number", description: "Días hacia adelante a incluir. Default 30." },
      },
    },
  },
  {
    name: "get_daily_briefings_summary",
    description: "Trae un resumen de los briefings diarios: cuántos, de qué tipo, cuántos hallazgos y su severidad.",
    input_schema: {
      type: "object",
      properties: {
        sinceDays: { type: "number", description: "Ventana de días hacia atrás. Default 30." },
        briefingType: { type: "string", enum: ["community", "leads", "prospecting", "unanswered"], description: "Filtrar por tipo (opcional)." },
      },
    },
  },
  {
    name: "get_pulse_checkins_summary",
    description:
      "Trae los check-ins de pulso del equipo: wins y luchas recientes en sus propias palabras, y el ánimo general. Usalo para preguntas sobre cómo viene el equipo, no solo los números.",
    input_schema: {
      type: "object",
      properties: { sinceDays: { type: "number", description: "Ventana de días hacia atrás. Default 30." } },
    },
  },
]

export async function runChatTool(clientId: string, name: string, input: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case "get_leads_summary":
      return getLeadsSummary(clientId, { sinceDays: input.sinceDays as number | undefined })
    case "get_content_calendar_summary":
      return getContentCalendarSummary(clientId, { sinceDays: input.sinceDays as number | undefined })
    case "get_kanban_tasks_summary":
      return getKanbanTasksSummary(clientId, { columnId: input.columnId as string | undefined })
    case "get_calendar_events_summary":
      return getCalendarEventsSummary(clientId, {
        pastDays: input.pastDays as number | undefined,
        upcomingDays: input.upcomingDays as number | undefined,
      })
    case "get_daily_briefings_summary":
      return getDailyBriefingsSummary(clientId, {
        sinceDays: input.sinceDays as number | undefined,
        briefingType: input.briefingType as string | undefined,
      })
    case "get_pulse_checkins_summary":
      return getPulseCheckinsSummary(clientId, { sinceDays: input.sinceDays as number | undefined })
    default:
      throw new Error(`Herramienta desconocida: ${name}`)
  }
}
