import { itemHandlers } from "@/lib/omni/crud-route"

export const { PATCH, DELETE } = itemHandlers("pulse_checkins", ["period_label", "wins", "struggles", "mood"])
