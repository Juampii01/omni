import { itemHandlers } from "@/lib/omni/crud-route"

export const { PATCH, DELETE } = itemHandlers("content_ideas", ["channel", "title", "format", "hook", "notes", "status"])
