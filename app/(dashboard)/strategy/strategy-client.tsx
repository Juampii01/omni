"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import {
  Compass, Package, Target, Rocket, LineChart, Flag,
  Plus, X, Save, Loader2, Check,
} from "lucide-react"

// ── Tipos ───────────────────────────────────────────────────────────────────
type Tier = { name: string; price: string; value_prop: string; features: string[] }
type OKR = { objective: string; metric: string; target: string; current: string; period: string; status: string }
type Growth = { channel: string; focus: string; status: string }
type Initiative = { title: string; description: string; priority: "P1" | "P2" | "P3"; status: string }
type Forecast = { target_mrr: string; target_clients: string; horizon_months: number; notes: string }

type Strategy = {
  mission: string
  vision: string
  core_values: string[]
  positioning: string
  tiers: Tier[]
  okrs: OKR[]
  growth: Growth[]
  forecast: Forecast
  initiatives: Initiative[]
}

const EMPTY: Strategy = {
  mission: "", vision: "", core_values: [], positioning: "",
  tiers: [], okrs: [], growth: [], initiatives: [],
  forecast: { target_mrr: "", target_clients: "", horizon_months: 12, notes: "" },
}

const BLANK_TIER: Tier = { name: "", price: "", value_prop: "", features: [] }
const BLANK_OKR: OKR = { objective: "", metric: "", target: "", current: "", period: "", status: "en curso" }
const BLANK_GROWTH: Growth = { channel: "", focus: "", status: "activo" }
const BLANK_INIT: Initiative = { title: "", description: "", priority: "P2", status: "propuesta" }

const GROWTH_STATUS = ["activo", "planificado", "pausado"]
const OKR_STATUS = ["en curso", "cumplido", "en riesgo"]
const INIT_STATUS = ["propuesta", "en curso", "hecha", "pausada"]

// ── Primitivos de input (theme-agnostic) ─────────────────────────────────────
const inputCls =
  "w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-brand/50 transition-colors font-sans"

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-1.5 font-sans">{label}</span>
      {children}
    </label>
  )
}

function Section({ icon: Icon, title, desc, children, action }: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  desc?: string
  children: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <section className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="flex items-center gap-3 border-b border-border px-5 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand/10 text-brand flex-shrink-0">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          {desc && <p className="text-xs text-muted-foreground truncate">{desc}</p>}
        </div>
        {action}
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </section>
  )
}

function Pill({ active, onClick, children, disabled }: { active: boolean; onClick: () => void; children: React.ReactNode; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "rounded-md px-2.5 py-1 text-xs font-medium transition-colors font-sans capitalize disabled:opacity-50",
        active ? "bg-brand/15 text-brand" : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
      )}
    >
      {children}
    </button>
  )
}

function AddBtn({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-brand hover:border-brand/40 transition-colors font-sans"
    >
      <Plus className="h-3.5 w-3.5" /> {label}
    </button>
  )
}

function RemoveBtn({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="text-muted-foreground/50 hover:text-destructive transition-colors flex-shrink-0" title="Quitar">
      <X className="h-4 w-4" />
    </button>
  )
}

// ── Componente principal ─────────────────────────────────────────────────────
export function StrategyClient({ initial, canEdit }: { initial: Partial<Strategy> | null; canEdit: boolean }) {
  const [data, setData] = useState<Strategy>(() => ({
    ...EMPTY,
    ...(initial ?? {}),
    forecast: { ...EMPTY.forecast, ...(initial?.forecast ?? {}) },
    core_values: initial?.core_values ?? [],
    tiers: initial?.tiers ?? [],
    okrs: initial?.okrs ?? [],
    growth: initial?.growth ?? [],
    initiatives: initial?.initiatives ?? [],
  }))
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const ro = !canEdit
  function patch(p: Partial<Strategy>) { setData((d) => ({ ...d, ...p })); setDirty(true); setSaved(false) }
  function patchForecast(p: Partial<Forecast>) { patch({ forecast: { ...data.forecast, ...p } }) }

  async function save() {
    if (saving) return
    setSaving(true)
    const sb = createClient() as any
    const { error } = await sb
      .from("business_strategy")
      .update({
        mission: data.mission, vision: data.vision, core_values: data.core_values, positioning: data.positioning,
        tiers: data.tiers, okrs: data.okrs, growth: data.growth, forecast: data.forecast, initiatives: data.initiatives,
        updated_at: new Date().toISOString(),
      })
      .eq("singleton", true)
    setSaving(false)
    if (error) { toast.error("No se pudo guardar: " + error.message); return }
    setDirty(false); setSaved(true)
    toast.success("Estrategia guardada")
  }

  return (
    <div className="space-y-6 max-w-4xl pb-24">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Estrategia de KAVAR</h1>
          <p className="text-sm text-muted-foreground">El norte del negocio: oferta, objetivos, crecimiento y forecast.</p>
        </div>
      </div>

      {/* 1 · Norte */}
      <Section icon={Compass} title="Norte" desc="Propósito y posicionamiento">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Misión">
            <textarea className={cn(inputCls, "resize-none")} rows={3} disabled={ro} value={data.mission} onChange={(e) => patch({ mission: e.target.value })} placeholder="¿Para qué existe KAVAR?" />
          </Field>
          <Field label="Visión">
            <textarea className={cn(inputCls, "resize-none")} rows={3} disabled={ro} value={data.vision} onChange={(e) => patch({ vision: e.target.value })} placeholder="¿A dónde vamos?" />
          </Field>
        </div>
        <Field label="Posicionamiento">
          <textarea className={cn(inputCls, "resize-none")} rows={2} disabled={ro} value={data.positioning} onChange={(e) => patch({ positioning: e.target.value })} placeholder="Una frase que define cómo te ve el mercado" />
        </Field>
        <div>
          <span className="block text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-2 font-sans">Valores</span>
          <div className="space-y-2">
            {data.core_values.map((v, i) => (
              <div key={i} className="flex items-center gap-2">
                <input className={inputCls} disabled={ro} value={v} onChange={(e) => { const a = [...data.core_values]; a[i] = e.target.value; patch({ core_values: a }) }} placeholder={`Valor ${i + 1}`} />
                {!ro && <RemoveBtn onClick={() => patch({ core_values: data.core_values.filter((_, j) => j !== i) })} />}
              </div>
            ))}
            {!ro && <AddBtn label="Agregar valor" onClick={() => patch({ core_values: [...data.core_values, ""] })} />}
          </div>
        </div>
      </Section>

      {/* 2 · Oferta & Pricing */}
      <Section icon={Package} title="Oferta & Pricing" desc="Los tiers del producto"
        action={!ro && <AddBtn label="Tier" onClick={() => patch({ tiers: [...data.tiers, { ...BLANK_TIER }] })} />}>
        <div className="grid sm:grid-cols-2 gap-3">
          {data.tiers.map((t, i) => {
            const upd = (p: Partial<Tier>) => { const a = [...data.tiers]; a[i] = { ...a[i], ...p }; patch({ tiers: a }) }
            return (
              <div key={i} className="rounded-xl border border-border p-4 space-y-2.5">
                <div className="flex items-center gap-2">
                  <input className={cn(inputCls, "font-semibold")} disabled={ro} value={t.name} onChange={(e) => upd({ name: e.target.value })} placeholder="Nombre del tier" />
                  {!ro && <RemoveBtn onClick={() => patch({ tiers: data.tiers.filter((_, j) => j !== i) })} />}
                </div>
                <input className={cn(inputCls, "text-brand font-medium")} disabled={ro} value={t.price} onChange={(e) => upd({ price: e.target.value })} placeholder="Precio" />
                <textarea className={cn(inputCls, "resize-none")} rows={2} disabled={ro} value={t.value_prop} onChange={(e) => upd({ value_prop: e.target.value })} placeholder="Propuesta de valor" />
                <div className="space-y-1.5">
                  {t.features.map((f, fi) => (
                    <div key={fi} className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-brand flex-shrink-0" />
                      <input className={cn(inputCls, "py-1 text-xs")} disabled={ro} value={f} onChange={(e) => { const fs = [...t.features]; fs[fi] = e.target.value; upd({ features: fs }) }} placeholder="Feature" />
                      {!ro && <RemoveBtn onClick={() => upd({ features: t.features.filter((_, j) => j !== fi) })} />}
                    </div>
                  ))}
                  {!ro && <AddBtn label="Feature" onClick={() => upd({ features: [...t.features, ""] })} />}
                </div>
              </div>
            )
          })}
        </div>
      </Section>

      {/* 3 · Objetivos & OKRs */}
      <Section icon={Target} title="Objetivos & OKRs" desc="Metas del período con métrica y target"
        action={!ro && <AddBtn label="OKR" onClick={() => patch({ okrs: [...data.okrs, { ...BLANK_OKR }] })} />}>
        {data.okrs.length === 0 && <p className="text-sm text-muted-foreground">Sin objetivos cargados.</p>}
        <div className="space-y-3">
          {data.okrs.map((o, i) => {
            const upd = (p: Partial<OKR>) => { const a = [...data.okrs]; a[i] = { ...a[i], ...p }; patch({ okrs: a }) }
            const cur = parseFloat(o.current), tgt = parseFloat(o.target)
            const pct = isFinite(cur) && isFinite(tgt) && tgt > 0 ? Math.min(100, Math.round((cur / tgt) * 100)) : null
            return (
              <div key={i} className="rounded-xl border border-border p-4 space-y-2.5">
                <div className="flex items-start gap-2">
                  <input className={cn(inputCls, "font-medium")} disabled={ro} value={o.objective} onChange={(e) => upd({ objective: e.target.value })} placeholder="Objetivo" />
                  {!ro && <RemoveBtn onClick={() => patch({ okrs: data.okrs.filter((_, j) => j !== i) })} />}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <input className={cn(inputCls, "py-1.5 text-xs")} disabled={ro} value={o.metric} onChange={(e) => upd({ metric: e.target.value })} placeholder="Métrica" />
                  <input className={cn(inputCls, "py-1.5 text-xs")} disabled={ro} value={o.current} onChange={(e) => upd({ current: e.target.value })} placeholder="Actual" />
                  <input className={cn(inputCls, "py-1.5 text-xs")} disabled={ro} value={o.target} onChange={(e) => upd({ target: e.target.value })} placeholder="Target" />
                  <input className={cn(inputCls, "py-1.5 text-xs")} disabled={ro} value={o.period} onChange={(e) => upd({ period: e.target.value })} placeholder="Período (Q3 2026)" />
                </div>
                {pct !== null && (
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden"><div className="h-full bg-brand rounded-full" style={{ width: `${pct}%` }} /></div>
                    <span className="text-xs text-muted-foreground tabular-nums">{pct}%</span>
                  </div>
                )}
                <div className="flex gap-1">{OKR_STATUS.map((s) => <Pill key={s} active={o.status === s} disabled={ro} onClick={() => upd({ status: s })}>{s}</Pill>)}</div>
              </div>
            )
          })}
        </div>
      </Section>

      {/* 4 · Crecimiento */}
      <Section icon={Rocket} title="Motor de crecimiento" desc="Canales y palancas"
        action={!ro && <AddBtn label="Canal" onClick={() => patch({ growth: [...data.growth, { ...BLANK_GROWTH }] })} />}>
        {data.growth.length === 0 && <p className="text-sm text-muted-foreground">Sin canales cargados.</p>}
        <div className="space-y-2.5">
          {data.growth.map((g, i) => {
            const upd = (p: Partial<Growth>) => { const a = [...data.growth]; a[i] = { ...a[i], ...p }; patch({ growth: a }) }
            return (
              <div key={i} className="flex flex-col sm:flex-row sm:items-center gap-2 rounded-xl border border-border p-3">
                <input className={cn(inputCls, "sm:w-52 font-medium")} disabled={ro} value={g.channel} onChange={(e) => upd({ channel: e.target.value })} placeholder="Canal" />
                <input className={inputCls} disabled={ro} value={g.focus} onChange={(e) => upd({ focus: e.target.value })} placeholder="Foco / palanca" />
                <div className="flex gap-1 flex-shrink-0">{GROWTH_STATUS.map((s) => <Pill key={s} active={g.status === s} disabled={ro} onClick={() => upd({ status: s })}>{s}</Pill>)}</div>
                {!ro && <RemoveBtn onClick={() => patch({ growth: data.growth.filter((_, j) => j !== i) })} />}
              </div>
            )
          })}
        </div>
      </Section>

      {/* 5 · Forecast */}
      <Section icon={LineChart} title="Forecast" desc="Proyección del negocio">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Field label="Target MRR"><input className={inputCls} disabled={ro} value={data.forecast.target_mrr} onChange={(e) => patchForecast({ target_mrr: e.target.value })} placeholder="$10.000" /></Field>
          <Field label="Target clientes"><input className={inputCls} disabled={ro} value={data.forecast.target_clients} onChange={(e) => patchForecast({ target_clients: e.target.value })} placeholder="15" /></Field>
          <Field label="Horizonte (meses)"><input type="number" className={inputCls} disabled={ro} value={data.forecast.horizon_months} onChange={(e) => patchForecast({ horizon_months: Number(e.target.value) })} /></Field>
        </div>
        <Field label="Notas"><textarea className={cn(inputCls, "resize-none")} rows={2} disabled={ro} value={data.forecast.notes} onChange={(e) => patchForecast({ notes: e.target.value })} placeholder="Supuestos, escenarios, cash flow…" /></Field>
      </Section>

      {/* 6 · Iniciativas */}
      <Section icon={Flag} title="Iniciativas estratégicas" desc="Proyectos clave priorizados"
        action={!ro && <AddBtn label="Iniciativa" onClick={() => patch({ initiatives: [...data.initiatives, { ...BLANK_INIT }] })} />}>
        {data.initiatives.length === 0 && <p className="text-sm text-muted-foreground">Sin iniciativas cargadas.</p>}
        <div className="space-y-2.5">
          {data.initiatives.map((it, i) => {
            const upd = (p: Partial<Initiative>) => { const a = [...data.initiatives]; a[i] = { ...a[i], ...p }; patch({ initiatives: a }) }
            return (
              <div key={i} className="rounded-xl border border-border p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1 flex-shrink-0">{(["P1", "P2", "P3"] as const).map((p) => <Pill key={p} active={it.priority === p} disabled={ro} onClick={() => upd({ priority: p })}>{p}</Pill>)}</div>
                  <input className={cn(inputCls, "font-medium")} disabled={ro} value={it.title} onChange={(e) => upd({ title: e.target.value })} placeholder="Iniciativa" />
                  {!ro && <RemoveBtn onClick={() => patch({ initiatives: data.initiatives.filter((_, j) => j !== i) })} />}
                </div>
                <input className={cn(inputCls, "py-1.5 text-xs")} disabled={ro} value={it.description} onChange={(e) => upd({ description: e.target.value })} placeholder="Descripción / resultado esperado" />
                <div className="flex gap-1">{INIT_STATUS.map((s) => <Pill key={s} active={it.status === s} disabled={ro} onClick={() => upd({ status: s })}>{s}</Pill>)}</div>
              </div>
            )
          })}
        </div>
      </Section>

      {/* Barra de guardado */}
      {canEdit && dirty && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 rounded-full border border-border bg-card/95 backdrop-blur px-4 py-2.5 shadow-lg">
          <span className="text-sm text-muted-foreground font-sans">Cambios sin guardar</span>
          <button onClick={save} disabled={saving} className="inline-flex items-center gap-1.5 rounded-full bg-brand px-4 py-1.5 text-sm font-semibold text-brand-foreground hover:bg-brand-hover disabled:opacity-60 transition-colors font-sans">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Guardar
          </button>
        </div>
      )}
      {canEdit && saved && !dirty && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 rounded-full border border-brand/30 bg-brand/10 px-4 py-2 text-sm text-brand font-sans">
          <Check className="h-4 w-4" /> Guardado
        </div>
      )}
    </div>
  )
}
