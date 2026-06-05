import { requireAuth } from "@/lib/auth/get-user"
import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import { MessageCircle, ArrowRight, Users } from "lucide-react"

export const dynamic = "force-dynamic"
export const metadata = { title: "Conversaciones" }

type Client = { id: string; full_name: string; avatar_url: string | null; company: string | null }
type Msg = { client_id: string; body: string; direction: "outbound" | "inbound"; read_at: string | null; created_at: string }

function initials(name: string): string {
  return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()
}
function relative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60_000), h = Math.floor(diff / 3_600_000), d = Math.floor(diff / 86_400_000)
  if (m < 1) return "ahora"
  if (m < 60) return `${m}m`
  if (h < 24) return `${h}h`
  if (d < 7) return `${d}d`
  return new Date(iso).toLocaleDateString("es-AR", { day: "numeric", month: "short" })
}

export default async function ConversationsPage() {
  await requireAuth()
  const supabase = await createClient()
  const sb = supabase as any

  const [{ data: clientsData }, { data: msgsData }] = await Promise.all([
    sb.from("clients").select("id, full_name, avatar_url, company").order("full_name"),
    sb.from("client_messages")
      .select("client_id, body, direction, read_at, created_at")
      .order("created_at", { ascending: false })
      .limit(1000),
  ])

  const clients = (clientsData as Client[]) ?? []
  const msgs = (msgsData as Msg[]) ?? []
  const clientMap: Record<string, Client> = {}
  for (const c of clients) clientMap[c.id] = c

  // Agregar por cliente: último mensaje + no leídos (inbound sin read_at)
  const agg: Record<string, { last: Msg; unread: number }> = {}
  for (const m of msgs) {
    if (!clientMap[m.client_id]) continue
    if (!agg[m.client_id]) agg[m.client_id] = { last: m, unread: 0 } // primero en desc = más reciente
    if (m.direction === "inbound" && !m.read_at) agg[m.client_id].unread += 1
  }

  const threads = Object.entries(agg)
    .map(([clientId, v]) => ({ client: clientMap[clientId], ...v }))
    .sort((a, b) => +new Date(b.last.created_at) - +new Date(a.last.created_at))

  const withoutThread = clients.filter((c) => !agg[c.id])

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand">
          <MessageCircle className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Conversaciones</h1>
          <p className="text-sm text-muted-foreground">Tus hilos con cada cliente, en un solo lugar.</p>
        </div>
      </div>

      {threads.length === 0 ? (
        <div className="rounded-xl border border-border bg-card px-6 py-12 text-center">
          <MessageCircle className="mx-auto h-8 w-8 text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">Todavía no hay conversaciones.</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Entrá a un cliente y empezá el hilo desde su ficha.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden divide-y divide-border">
          {threads.map(({ client, last, unread }) => (
            <Link
              key={client.id}
              href={`/clients/${client.id}`}
              className="flex items-center gap-3 px-5 py-3.5 hover:bg-muted/30 transition-colors group"
            >
              <div className="relative flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand text-xs font-bold overflow-hidden">
                {client.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={client.avatar_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  initials(client.full_name)
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-foreground truncate group-hover:text-brand transition-colors">
                    {client.full_name}
                  </p>
                  <span className="ml-auto text-[11px] text-muted-foreground flex-shrink-0">{relative(last.created_at)}</span>
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {last.direction === "outbound" && <span className="text-muted-foreground/60">Vos: </span>}
                  {last.body}
                </p>
              </div>
              {unread > 0 && (
                <span className="flex-shrink-0 rounded-full bg-brand px-1.5 py-0.5 text-[10px] font-bold text-brand-foreground">
                  {unread}
                </span>
              )}
            </Link>
          ))}
        </div>
      )}

      {withoutThread.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/50 mb-3 flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" /> Sin conversación
          </p>
          <div className="flex flex-wrap gap-2">
            {withoutThread.map((c) => (
              <Link
                key={c.id}
                href={`/clients/${c.id}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground hover:border-brand/40 hover:text-brand transition-colors"
              >
                {c.full_name}
                <ArrowRight className="h-3 w-3" />
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
