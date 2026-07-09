import { listCreateHandlers } from "@/lib/omni/crud-route"

export const { GET, POST } = listCreateHandlers("content_ideas", ["channel", "title", "format", "hook", "notes", "status"])
