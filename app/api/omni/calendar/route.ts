import { listCreateHandlers } from "@/lib/omni/crud-route"

export const { GET, POST } = listCreateHandlers("calendar_events", ["title", "description", "event_date", "event_type"])
