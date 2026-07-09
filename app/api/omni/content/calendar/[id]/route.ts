import { itemHandlers } from "@/lib/omni/crud-route"

export const { PATCH, DELETE } = itemHandlers("content_calendar", ["idea_id", "scheduled_date", "status"])
