import { listCreateHandlers } from "@/lib/omni/crud-route"

export const { GET, POST } = listCreateHandlers("content_competitors", ["channel", "handle", "url", "name", "avatar_url", "notes"])
