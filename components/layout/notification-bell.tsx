"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Bell } from "lucide-react"
import { fetchWithAuth } from "@/lib/api-client"
import { createClient } from "@/lib/supabase"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

type Notification = { id: string; title: string; body: string; link: string | null; read_at: string | null; created_at: string }

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diffMs / 60_000)
  if (mins < 1) return "ahora"
  if (mins < 60) return `hace ${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `hace ${hours}h`
  return `hace ${Math.floor(hours / 24)}d`
}

export function NotificationBell({ clientId }: { clientId: string }) {
  const router = useRouter()
  const [items, setItems] = useState<Notification[]>([])
  const [open, setOpen] = useState(false)
  const unread = items.filter((n) => !n.read_at).length

  async function load() {
    const res = await fetchWithAuth("/api/omni/notifications")
    const data = await res.json()
    setItems(data.items ?? [])
  }

  useEffect(() => {
    load()
    const supabase = createClient()
    const channel = supabase
      .channel(`notifications_${clientId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `client_id=eq.${clientId}` },
        (payload) => setItems((prev) => [payload.new as Notification, ...prev])
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId])

  async function handleOpenChange(next: boolean) {
    setOpen(next)
    if (next && unread > 0) {
      await fetchWithAuth("/api/omni/notifications/read-all", { method: "POST" })
      setItems((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })))
    }
  }

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger className="relative flex h-9 w-9 items-center justify-center rounded-full border border-border/60 text-foreground/70 transition-colors hover:bg-accent">
        <Bell className="h-4 w-4" strokeWidth={1.75} />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-primary-foreground">
            {unread}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        {items.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-muted-foreground">Sin notificaciones todavía.</p>
        ) : (
          items.slice(0, 10).map((n) => (
            <DropdownMenuItem
              key={n.id}
              className="flex-col items-start gap-0.5 whitespace-normal"
              onClick={() => n.link && router.push(n.link)}
            >
              <div className="flex w-full items-center justify-between gap-2">
                <p className="text-sm font-medium">{n.title}</p>
                {!n.read_at && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />}
              </div>
              {n.body && <p className="text-xs text-muted-foreground">{n.body}</p>}
              <p className="text-[10px] text-muted-foreground/70">{timeAgo(n.created_at)}</p>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
