import { itemHandlers } from "@/lib/omni/crud-route"

export const { PATCH, DELETE } = itemHandlers("calendar_events", ["title", "description", "event_date", "event_type"])
