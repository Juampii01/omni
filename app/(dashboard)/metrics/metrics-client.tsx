"use client"

import { useState, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, LineChart, Line, Legend,
} from "recharts"
import { toast } from "sonner"
import { BarChart2, Plus, TrendingUp, TrendingDown, DollarSign, ArrowDownRight } from "lucide-react"
import { cn } from "@/lib/utils"

// ── Types ─────────────────────────────────────────────────────────────────────

type RevenueRecord = {
  period_month: string
  category: string
  amount: number
  currency: string
  description?: string
}

type ExpenseRecord = {
  period_month: string
  category: string
  amount: number
  currency: string
  description?: string
}

type KPI = {
  period_month: string
  metric_name: string
  metric_value: number
  metric_target?: number
  unit?: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtMonth(monthStr: string) {
  const d = new Date(monthStr + "-02")
  return d.toLocaleDateString("es-AR", { month: "short", year: "2-digit" })
}

function fmtUSD(n: number) {
  if (n >= 1000) return `$${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k`
  return `$${n.toLocaleString("en-US")}`
}

function getLast12Months(): string[] {
  const months: string[] = []
  const now = new Date()
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`)
  }
  return months
}

const TOOLTIP_STYLE = {
  backgroundColor: "#111111",
  border: "1px solid #2a2a2a",
  borderRadius: "8px",
  fontSize: "12px",
}

const REVENUE_CATS = ["retainer", "one_time", "upsell", "referral", "other"]
const EXPENSE_CATS = ["tools", "ads", "payroll", "contractors", "office", "other"]
const REVENUE_CAT_LABELS: Record<string, string> = {
  retainer: "Retainer", one_time: "Pago único", upsell: "Upsell",
  referral: "Referido", other: "Otro",
}
const EXPENSE_CAT_LABELS: Record<string, string> = {
  tools: "Herramientas", ads: "Ads", payroll: "Nómina",
  contractors: "Freelancers", office: "Oficina", other: "Otro",
}

// ── Stat cards ────────────────────────────────────────────────────────────────

function StatCard({
  label, value, sub, icon: Icon, trend, color,
}: {
  label: string; value: string; sub?: string
  icon: React.ElementType; trend?: number; color: string
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", color)}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="text-2xl font-bold tabular-nums font-mono">{value}</p>
      {trend !== undefined && (
        <p className={cn(
          "flex items-center gap-1 mt-1.5 text-xs font-medium",
          trend > 0 ? "text-emerald-500" : trend < 0 ? "text-red-500" : "text-muted-foreground"
        )}>
          {trend > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {trend > 0 ? "+" : ""}{trend}% vs mes ant.
        </p>
      )}
      {sub && !trend && <p className="text-xs text-muted-foreground mt-1.5">{sub}</p>}
    </div>
  )
}

// ── Add Revenue Dialog ────────────────────────────────────────────────────────

function AddRevenueDialog({
  open, onClose, onAdded, type,
}: {
  open: boolean; onClose: () => void
  onAdded: (r: RevenueRecord | ExpenseRecord) => void
  type: "revenue" | "expense"
}) {
  const [form, setForm] = useState({
    period_month: new Date().toISOString().slice(0, 7),
    category: type === "revenue" ? "retainer" : "tools",
    amount: "",
    currency: "USD",
    description: "",
  })
  const [saving, setSaving] = useState(false)

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))
  const cats = type === "revenue" ? REVENUE_CATS : EXPENSE_CATS
  const catLabels = type === "revenue" ? REVENUE_CAT_LABELS : EXPENSE_CAT_LABELS
  const table = type === "revenue" ? "revenue_records" : "expense_records"

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.amount || isNaN(parseFloat(form.amount))) { toast.error("Monto inválido"); return }
    setSaving(true)
    const sb = createClient() as any
    const payload = {
      period_month: form.period_month + "-01",
      category: form.category,
      amount: parseFloat(form.amount),
      currency: form.currency,
      description: form.description.trim() || null,
    }
    const { data, error } = await sb.from(table).insert(payload).select().single()
    setSaving(false)
    if (error) { toast.error(error.message); return }
    toast.success(type === "revenue" ? "Ingreso registrado" : "Gasto registrado")
    onAdded(data)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{type === "revenue" ? "Registrar ingreso" : "Registrar gasto"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Mes</Label>
              <Input type="month" value={form.period_month} onChange={e => set("period_month", e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>Categoría</Label>
              <Select value={form.category} onValueChange={v => set("category", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {cats.map(c => <SelectItem key={c} value={c}>{catLabels[c]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Monto</Label>
              <Input type="number" min="0" step="0.01" value={form.amount} onChange={e => set("amount", e.target.value)} placeholder="2500" required autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label>Moneda</Label>
              <Select value={form.currency} onValueChange={v => set("currency", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="ARS">ARS</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Descripción</Label>
            <Input value={form.description} onChange={e => set("description", e.target.value)} placeholder="Detalle opcional..." />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={saving} className="bg-brand hover:bg-brand/90">
              {saving ? "Guardando…" : "Registrar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function MetricsClient({
  revenue: initialRevenue,
  expenses: initialExpenses,
  kpis,
}: {
  revenue: RevenueRecord[]
  expenses: ExpenseRecord[]
  kpis: KPI[]
}) {
  const [revenue, setRevenue] = useState(initialRevenue)
  const [expenses, setExpenses] = useState(initialExpenses)
  const [dialog, setDialog] = useState<null | "revenue" | "expense">(null)

  const months = getLast12Months()

  // Aggregate by month
  const chartData = useMemo(() => {
    return months.map(month => {
      const label = fmtMonth(month)
      const rev = revenue.filter(r => r.period_month.startsWith(month.slice(0, 7)))
        .reduce((s, r) => s + r.amount, 0)
      const exp = expenses.filter(e => e.period_month.startsWith(month.slice(0, 7)))
        .reduce((s, e) => s + e.amount, 0)
      return { label, revenue: rev, expenses: exp, profit: rev - exp }
    })
  }, [revenue, expenses, months])

  // Current month
  const currMonth = months[months.length - 1].slice(0, 7)
  const prevMonth = months[months.length - 2].slice(0, 7)

  const currRevenue = revenue.filter(r => r.period_month.startsWith(currMonth)).reduce((s, r) => s + r.amount, 0)
  const prevRevenue = revenue.filter(r => r.period_month.startsWith(prevMonth)).reduce((s, r) => s + r.amount, 0)
  const currExpenses = expenses.filter(e => e.period_month.startsWith(currMonth)).reduce((s, e) => s + e.amount, 0)
  const currProfit = currRevenue - currExpenses

  const revTrend = prevRevenue > 0 ? Math.round(((currRevenue - prevRevenue) / prevRevenue) * 100) : undefined

  // YTD
  const currYear = new Date().getFullYear().toString()
  const ytdRevenue = revenue.filter(r => r.period_month.startsWith(currYear)).reduce((s, r) => s + r.amount, 0)
  const ytdExpenses = expenses.filter(e => e.period_month.startsWith(currYear)).reduce((s, e) => s + e.amount, 0)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Métricas y Finanzas"
        description="Revenue, gastos y P&L de los últimos 12 meses."
        icon={BarChart2}
      >
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setDialog("expense")}>
            <ArrowDownRight className="h-4 w-4 mr-2 text-red-400" />
            Registrar gasto
          </Button>
          <Button size="sm" className="bg-brand hover:bg-brand/90" onClick={() => setDialog("revenue")}>
            <Plus className="h-4 w-4 mr-2" />
            Registrar ingreso
          </Button>
        </div>
      </PageHeader>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Revenue (mes)"
          value={fmtUSD(currRevenue)}
          icon={DollarSign}
          trend={revTrend}
          color="bg-emerald-500/10 text-emerald-500"
        />
        <StatCard
          label="Gastos (mes)"
          value={fmtUSD(currExpenses)}
          icon={ArrowDownRight}
          sub="mes actual"
          color="bg-red-500/10 text-red-400"
        />
        <StatCard
          label="Net profit (mes)"
          value={fmtUSD(currProfit)}
          icon={TrendingUp}
          sub={currProfit >= 0 ? "positivo" : "negativo"}
          color={currProfit >= 0 ? "bg-brand/10 text-brand" : "bg-red-500/10 text-red-400"}
        />
        <StatCard
          label="Revenue YTD"
          value={fmtUSD(ytdRevenue)}
          icon={BarChart2}
          sub={`Gastos YTD: ${fmtUSD(ytdExpenses)}`}
          color="bg-blue-500/10 text-blue-400"
        />
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
          <TabsTrigger value="revenue" className="text-xs">Ingresos</TabsTrigger>
          <TabsTrigger value="expenses" className="text-xs">Gastos</TabsTrigger>
        </TabsList>

        {/* Overview tab: bar chart */}
        <TabsContent value="overview" className="mt-4">
          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Revenue vs Gastos — últimos 12 meses</CardTitle>
            </CardHeader>
            <CardContent>
              {chartData.every(d => d.revenue === 0 && d.expenses === 0) ? (
                <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
                  Sin datos. Registrá tu primer ingreso o gasto.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={chartData} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#71717a" }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "#71717a" }} tickLine={false} axisLine={false}
                      tickFormatter={v => v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={{ color: "#e5e5e5" }}
                      formatter={(val: number) => fmtUSD(val)} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="revenue" name="Ingresos" fill="#22c55e" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expenses" name="Gastos" fill="#ef4444" radius={[4, 4, 0, 0]} opacity={0.8} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Profit line */}
          <Card className="border-border mt-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Profit neto mensual</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={chartData} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#71717a" }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#71717a" }} tickLine={false} axisLine={false}
                    tickFormatter={v => v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={{ color: "#e5e5e5" }}
                    formatter={(val: number) => fmtUSD(val)} />
                  <Line type="monotone" dataKey="profit" name="Profit" stroke="#22c55e" strokeWidth={2} dot={{ r: 3, fill: "#22c55e" }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Revenue detail tab */}
        <TabsContent value="revenue" className="mt-4">
          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Ingresos registrados</CardTitle>
            </CardHeader>
            <CardContent>
              {revenue.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
                  <p className="text-sm text-muted-foreground">Sin ingresos registrados.</p>
                  <Button size="sm" className="bg-brand hover:bg-brand/90" onClick={() => setDialog("revenue")}>
                    <Plus className="h-4 w-4 mr-2" />Registrar ingreso
                  </Button>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {revenue.slice(0, 30).map((r, i) => (
                    <div key={i} className="flex items-center justify-between py-2.5">
                      <div>
                        <p className="text-sm font-medium">{REVENUE_CAT_LABELS[r.category] ?? r.category}</p>
                        {r.description && <p className="text-xs text-muted-foreground">{r.description}</p>}
                        <p className="text-xs text-muted-foreground">{fmtMonth(r.period_month)}</p>
                      </div>
                      <span className="text-sm font-semibold tabular-nums text-emerald-500">
                        +{fmtUSD(r.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Expenses detail tab */}
        <TabsContent value="expenses" className="mt-4">
          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Gastos registrados</CardTitle>
            </CardHeader>
            <CardContent>
              {expenses.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
                  <p className="text-sm text-muted-foreground">Sin gastos registrados.</p>
                  <Button size="sm" variant="outline" onClick={() => setDialog("expense")}>
                    <Plus className="h-4 w-4 mr-2" />Registrar gasto
                  </Button>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {expenses.slice(0, 30).map((e, i) => (
                    <div key={i} className="flex items-center justify-between py-2.5">
                      <div>
                        <p className="text-sm font-medium">{EXPENSE_CAT_LABELS[e.category] ?? e.category}</p>
                        {e.description && <p className="text-xs text-muted-foreground">{e.description}</p>}
                        <p className="text-xs text-muted-foreground">{fmtMonth(e.period_month)}</p>
                      </div>
                      <span className="text-sm font-semibold tabular-nums text-red-400">
                        -{fmtUSD(e.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {dialog && (
        <AddRevenueDialog
          open={!!dialog}
          type={dialog}
          onClose={() => setDialog(null)}
          onAdded={record => {
            if (dialog === "revenue") setRevenue(prev => [record as RevenueRecord, ...prev])
            else setExpenses(prev => [record as ExpenseRecord, ...prev])
          }}
        />
      )}
    </div>
  )
}
