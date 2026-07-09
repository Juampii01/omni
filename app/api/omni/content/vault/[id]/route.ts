import { itemHandlers } from "@/lib/omni/crud-route"

export const { PATCH, DELETE } = itemHandlers("content_vault", ["channel", "url", "title", "thumbnail", "notes", "favorite"])
