"use client"

import { useEffect, useMemo, useState } from "react"
import { Check, Star, Download, DollarSign, TrendingUp, Receipt } from "lucide-react"
import { createClient } from "@/lib/supabase"
import { useSession } from "@/lib/auth/use-session"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

type Lead = {
  id: string
  name: string | null
  source: string | null
  rating: number | null
  status: string
  purchased: boolean
  deal_amount: number | null
  created_at: string
}

function csvEscape(value: unknown) {
  const s = value == null ? "" : String(value)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

function downloadLeadsCsv(leads: Lead[]) {
  const header = ["Nombre", "Fuente", "Rating", "Estado", "Cerrado", "Monto", "Fecha"]
  const rows = leads.map((l) => [
    l.name ?? "",
    l.source ?? "",
    l.rating ?? "",
    l.status,
    l.purchased ? "Sí" : "No",
    l.deal_amount ?? "",
    new Date(l.created_at).toLocaleDateString("es-AR"),
  ])
  const csv = [header, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n")
  const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `leads_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function money(n: number) {
  return n.toLocaleString("es-AR", { style: "currency", currency: "USD", maximumFractionDigits: 0 })
}

function RatingDots({ rating }: { rating: number | null }) {
  if (rating == null) return <span className="text-muted-foreground">—</span>
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${i < rating ? "fill-primary text-primary" : "text-border"}`}
        />
      ))}
    </div>
  )
}

function StatusPill({ status }: { status: string }) {
  const styles: Record<string, string> = {
    nuevo: "bg-accent text-accent-foreground",
    cerrado: "bg-primary text-primary-foreground",
    perdido: "bg-muted text-muted-foreground",
  }
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${styles[status] ?? "bg-accent text-accent-foreground"}`}>
      {status}
    </span>
  )
}

export default function LeadsPage() {
  const { session } = useSession()
  const supabase = useMemo(() => createClient(), [])
  const [leads, setLeads] = useState<Lead[] | null>(null)

  useEffect(() => {
    if (!session) return
    supabase
      .from("leads")
      .select("id, name, source, rating, status, purchased, deal_amount, created_at")
      .eq("client_id", session.clientId)
      .order("created_at", { ascending: false })
      .then(({ data }) => setLeads((data ?? []) as Lead[]))
  }, [session, supabase])

  const closedLeads = (leads ?? []).filter((l) => l.purchased)
  const totalRevenue = closedLeads.reduce((sum, l) => sum + (l.deal_amount ?? 0), 0)
  const avgDeal = closedLeads.length > 0 ? totalRevenue / closedLeads.length : 0

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-heading text-2xl">Leads</h1>
          <p className="mt-1 text-sm text-muted-foreground">{leads?.length ?? 0} leads en total</p>
        </div>
        <Button variant="secondary" size="sm" disabled={!leads?.length} onClick={() => downloadLeadsCsv(leads ?? [])}>
          <Download className="h-3.5 w-3.5" /> Exportar CSV
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="gap-2 py-4">
          <CardHeader className="flex-row items-center gap-3 px-5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent">
              <DollarSign className="h-4 w-4 text-accent-foreground" strokeWidth={1.75} />
            </div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Revenue total</p>
          </CardHeader>
          <CardContent className="px-5">
            <p className="font-heading text-2xl">{money(totalRevenue)}</p>
          </CardContent>
        </Card>
        <Card className="gap-2 py-4">
          <CardHeader className="flex-row items-center gap-3 px-5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent">
              <Receipt className="h-4 w-4 text-accent-foreground" strokeWidth={1.75} />
            </div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Ticket promedio</p>
          </CardHeader>
          <CardContent className="px-5">
            <p className="font-heading text-2xl">{money(avgDeal)}</p>
          </CardContent>
        </Card>
        <Card className="gap-2 py-4">
          <CardHeader className="flex-row items-center gap-3 px-5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent">
              <TrendingUp className="h-4 w-4 text-accent-foreground" strokeWidth={1.75} />
            </div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Cerrados</p>
          </CardHeader>
          <CardContent className="px-5">
            <p className="font-heading text-2xl">{closedLeads.length}</p>
          </CardContent>
        </Card>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border/60 bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-5 py-3 font-medium">Nombre</th>
              <th className="px-5 py-3 font-medium">Fuente</th>
              <th className="px-5 py-3 font-medium">Rating</th>
              <th className="px-5 py-3 font-medium">Estado</th>
              <th className="px-5 py-3 font-medium">Cerrado</th>
              <th className="px-5 py-3 font-medium">Fecha</th>
            </tr>
          </thead>
          <tbody>
            {(leads ?? []).map((lead) => (
              <tr key={lead.id} className="border-b border-border/40 last:border-0">
                <td className="px-5 py-3 font-medium">{lead.name ?? "(sin nombre)"}</td>
                <td className="px-5 py-3 text-muted-foreground capitalize">{lead.source ?? "—"}</td>
                <td className="px-5 py-3"><RatingDots rating={lead.rating} /></td>
                <td className="px-5 py-3"><StatusPill status={lead.status} /></td>
                <td className="px-5 py-3">
                  {lead.purchased ? (
                    <span className="flex items-center gap-1 text-primary">
                      <Check className="h-4 w-4" /> {lead.deal_amount ? `$${lead.deal_amount}` : "Sí"}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-5 py-3 text-muted-foreground">
                  {new Date(lead.created_at).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" })}
                </td>
              </tr>
            ))}
            {leads?.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-muted-foreground">
                  Todavía no hay leads cargados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
