import { listCreateHandlers } from "@/lib/omni/crud-route"

export const { GET, POST } = listCreateHandlers("content_calendar", ["idea_id", "scheduled_date", "status"])
