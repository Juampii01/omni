import { listCreateHandlers } from "@/lib/omni/crud-route"

export const { GET, POST } = listCreateHandlers("content_vault", ["channel", "url", "title", "thumbnail", "notes", "favorite"])
