import { itemHandlers } from "@/lib/omni/crud-route"

export const { PATCH, DELETE } = itemHandlers("content_competitors", ["channel", "handle", "url", "name", "avatar_url", "notes"])
