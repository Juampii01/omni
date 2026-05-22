"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import {
  Sparkles, Building2, Palette, Users, CheckCircle2,
  ArrowRight, ArrowLeft, Loader2, Plus, X,
} from "lucide-react"

// ── Types ─────────────────────────────────────────────────────────────────────

interface WizardData {
  businessName: string
  industry:     string
  teamSize:     string
  currency:     string
  brandColor:   string
  teamEmails:   string[]
}

interface Props {
  initialBusinessName: string
  initialBrandColor:   string
  initialCurrency:     string
}

// ── Constants ─────────────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: "Bienvenida",  icon: Sparkles   },
  { id: 2, label: "Negocio",    icon: Building2  },
  { id: 3, label: "Marca",      icon: Palette    },
  { id: 4, label: "Equipo",     icon: Users      },
  { id: 5, label: "Listo",      icon: CheckCircle2 },
] as const

const INDUSTRIES = [
  "Consultoría",
  "Educación / Mentoring",
  "Marketing / Agencia",
  "Tecnología / SaaS",
  "E-commerce",
  "Salud / Bienestar",
  "Finanzas",
  "Inmobiliaria",
  "Otro",
]

const TEAM_SIZES = [
  { label: "Solo yo",   value: "1"    },
  { label: "2–5",       value: "2-5"  },
  { label: "6–15",      value: "6-15" },
  { label: "16+",       value: "16+"  },
]

const CURRENCIES = [
  { label: "USD ($)",  value: "USD" },
  { label: "ARS ($)",  value: "ARS" },
  { label: "EUR (€)",  value: "EUR" },
  { label: "BRL (R$)", value: "BRL" },
]

const BRAND_PRESETS = [
  "#236461", // Omni default (teal)
  "#6366f1", // Indigo
  "#0ea5e9", // Sky
  "#10b981", // Emerald
  "#f59e0b", // Amber
  "#ef4444", // Red
  "#8b5cf6", // Violet
  "#ec4899", // Pink
]

// ── Progress bar ──────────────────────────────────────────────────────────────

function ProgressBar({ current, total }: { current: number; total: number }) {
  const pct = Math.round(((current - 1) / (total - 1)) * 100)
  return (
    <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
      <div
        className="h-full bg-brand rounded-full transition-all duration-500 ease-out"
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

// ── Step wrapper ──────────────────────────────────────────────────────────────

function StepShell({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: React.ElementType
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-6 animate-in fade-in-0 slide-in-from-right-4 duration-300">
      <div className="flex flex-col items-center text-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-brand-soft flex items-center justify-center">
          <Icon className="h-6 w-6 text-brand" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{description}</p>
        </div>
      </div>
      {children}
    </div>
  )
}

// ── Step 1 — Welcome ──────────────────────────────────────────────────────────

function StepWelcome({ onNext }: { onNext: () => void }) {
  return (
    <StepShell
      icon={Sparkles}
      title="Bienvenido a Omni"
      description="Tu sistema operativo del negocio. En menos de 2 minutos vamos a configurar todo para que empieces a usar Omni al 100%."
    >
      <div className="grid grid-cols-3 gap-3 text-center">
        {[
          { emoji: "📊", label: "KPIs en tiempo real" },
          { emoji: "🎯", label: "Pipeline de ventas" },
          { emoji: "🤖", label: "IA integrada" },
        ].map(item => (
          <div key={item.label} className="p-3 rounded-xl border border-border bg-muted/30">
            <div className="text-2xl mb-1">{item.emoji}</div>
            <p className="text-xs text-muted-foreground leading-tight">{item.label}</p>
          </div>
        ))}
      </div>
      <Button onClick={onNext} className="w-full bg-brand hover:bg-brand-hover" size="lg">
        Empezar configuracion <ArrowRight className="h-4 w-4 ml-2" />
      </Button>
    </StepShell>
  )
}

// ── Step 2 — Business ─────────────────────────────────────────────────────────

function StepBusiness({
  data,
  onChange,
  onNext,
  onBack,
}: {
  data: WizardData
  onChange: (patch: Partial<WizardData>) => void
  onNext: () => void
  onBack: () => void
}) {
  const canProceed = data.businessName.trim().length >= 2

  return (
    <StepShell
      icon={Building2}
      title="Tu negocio"
      description="Contanos un poco sobre tu empresa para personalizar la experiencia."
    >
      <div className="space-y-4">
        {/* Business name */}
        <div className="space-y-1.5">
          <Label htmlFor="biz-name">Nombre del negocio *</Label>
          <Input
            id="biz-name"
            value={data.businessName}
            onChange={e => onChange({ businessName: e.target.value })}
            placeholder="Ej: Mi Empresa SRL"
            autoFocus
          />
        </div>

        {/* Industry */}
        <div className="space-y-1.5">
          <Label>Industria</Label>
          <div className="grid grid-cols-3 gap-2">
            {INDUSTRIES.map(ind => (
              <button
                key={ind}
                type="button"
                onClick={() => onChange({ industry: ind })}
                className={cn(
                  "text-xs px-2 py-2 rounded-lg border transition-all",
                  data.industry === ind
                    ? "border-brand bg-brand-soft text-brand font-medium"
                    : "border-border hover:border-brand/40 text-muted-foreground hover:text-foreground",
                )}
              >
                {ind}
              </button>
            ))}
          </div>
        </div>

        {/* Team size */}
        <div className="space-y-1.5">
          <Label>Tamano del equipo</Label>
          <div className="grid grid-cols-4 gap-2">
            {TEAM_SIZES.map(size => (
              <button
                key={size.value}
                type="button"
                onClick={() => onChange({ teamSize: size.value })}
                className={cn(
                  "text-xs py-2 rounded-lg border transition-all font-medium",
                  data.teamSize === size.value
                    ? "border-brand bg-brand-soft text-brand"
                    : "border-border hover:border-brand/40 text-muted-foreground",
                )}
              >
                {size.label}
              </button>
            ))}
          </div>
        </div>

        {/* Currency */}
        <div className="space-y-1.5">
          <Label>Moneda principal</Label>
          <div className="grid grid-cols-4 gap-2">
            {CURRENCIES.map(cur => (
              <button
                key={cur.value}
                type="button"
                onClick={() => onChange({ currency: cur.value })}
                className={cn(
                  "text-xs py-2 rounded-lg border transition-all font-medium",
                  data.currency === cur.value
                    ? "border-brand bg-brand-soft text-brand"
                    : "border-border hover:border-brand/40 text-muted-foreground",
                )}
              >
                {cur.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1">
          <ArrowLeft className="h-4 w-4 mr-2" /> Atras
        </Button>
        <Button
          onClick={onNext}
          disabled={!canProceed}
          className="flex-1 bg-brand hover:bg-brand-hover"
        >
          Siguiente <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </StepShell>
  )
}

// ── Step 3 — Brand ────────────────────────────────────────────────────────────

function StepBrand({
  data,
  onChange,
  onNext,
  onBack,
}: {
  data: WizardData
  onChange: (patch: Partial<WizardData>) => void
  onNext: () => void
  onBack: () => void
}) {
  return (
    <StepShell
      icon={Palette}
      title="Color de marca"
      description="Elegí el color principal de tu empresa. Va a aparecer en toda la interfaz."
    >
      <div className="space-y-4">
        {/* Color preview */}
        <div
          className="w-full h-16 rounded-xl transition-colors duration-300 flex items-center justify-center"
          style={{ backgroundColor: data.brandColor }}
        >
          <span className="text-white text-sm font-medium drop-shadow">
            {data.businessName || "Tu empresa"}
          </span>
        </div>

        {/* Presets */}
        <div className="space-y-1.5">
          <Label>Presets</Label>
          <div className="flex gap-2 flex-wrap">
            {BRAND_PRESETS.map(color => (
              <button
                key={color}
                type="button"
                onClick={() => onChange({ brandColor: color })}
                className={cn(
                  "w-9 h-9 rounded-lg border-2 transition-all",
                  data.brandColor === color
                    ? "border-foreground scale-110 shadow-md"
                    : "border-transparent hover:scale-105",
                )}
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>
        </div>

        {/* Custom hex */}
        <div className="space-y-1.5">
          <Label htmlFor="brand-hex">Color personalizado (hex)</Label>
          <div className="flex gap-2">
            <input
              type="color"
              value={data.brandColor}
              onChange={e => onChange({ brandColor: e.target.value })}
              className="w-10 h-10 rounded-lg border border-border cursor-pointer p-0.5 bg-background"
            />
            <Input
              id="brand-hex"
              value={data.brandColor}
              onChange={e => {
                const val = e.target.value
                if (/^#[0-9A-Fa-f]{0,6}$/.test(val)) onChange({ brandColor: val })
              }}
              placeholder="#236461"
              className="flex-1 font-mono"
            />
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1">
          <ArrowLeft className="h-4 w-4 mr-2" /> Atras
        </Button>
        <Button onClick={onNext} className="flex-1 bg-brand hover:bg-brand-hover">
          Siguiente <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </StepShell>
  )
}

// ── Step 4 — Team ─────────────────────────────────────────────────────────────

function StepTeam({
  data,
  onChange,
  onNext,
  onBack,
}: {
  data: WizardData
  onChange: (patch: Partial<WizardData>) => void
  onNext: () => void
  onBack: () => void
}) {
  const [emailInput, setEmailInput] = useState("")

  function addEmail() {
    const email = emailInput.trim().toLowerCase()
    if (!email || !email.includes("@")) return
    if (data.teamEmails.includes(email)) return
    onChange({ teamEmails: [...data.teamEmails, email] })
    setEmailInput("")
  }

  function removeEmail(email: string) {
    onChange({ teamEmails: data.teamEmails.filter(e => e !== email) })
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") { e.preventDefault(); addEmail() }
  }

  return (
    <StepShell
      icon={Users}
      title="Invita a tu equipo"
      description="Agrega los emails de tus colaboradores. Podes hacerlo ahora o despues desde Ajustes."
    >
      <div className="space-y-3">
        <div className="flex gap-2">
          <Input
            type="email"
            value={emailInput}
            onChange={e => setEmailInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="email@empresa.com"
            className="flex-1"
          />
          <Button
            type="button"
            variant="outline"
            onClick={addEmail}
            disabled={!emailInput.trim().includes("@")}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {data.teamEmails.length > 0 && (
          <div className="space-y-1.5 max-h-32 overflow-y-auto">
            {data.teamEmails.map(email => (
              <div
                key={email}
                className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/50 border border-border"
              >
                <span className="text-sm text-foreground/80">{email}</span>
                <button
                  onClick={() => removeEmail(email)}
                  className="text-muted-foreground hover:text-destructive transition-colors ml-2"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {data.teamEmails.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-2">
            No hay emails agregados todavia
          </p>
        )}
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1">
          <ArrowLeft className="h-4 w-4 mr-2" /> Atras
        </Button>
        <Button
          variant="outline"
          onClick={onNext}
          className="flex-1"
        >
          Saltear
        </Button>
        {data.teamEmails.length > 0 && (
          <Button onClick={onNext} className="flex-1 bg-brand hover:bg-brand-hover">
            Continuar <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        )}
      </div>
    </StepShell>
  )
}

// ── Step 5 — Done ─────────────────────────────────────────────────────────────

function StepDone({
  data,
  onFinish,
  loading,
}: {
  data: WizardData
  onFinish: () => void
  loading: boolean
}) {
  return (
    <StepShell
      icon={CheckCircle2}
      title="Todo listo!"
      description={`${data.businessName || "Tu empresa"} ya esta configurada. Entremos a Omni.`}
    >
      <div className="space-y-2.5">
        {[
          { label: "Negocio",  value: data.businessName || "—" },
          { label: "Industria", value: data.industry || "—" },
          { label: "Moneda",   value: data.currency },
          { label: "Equipo",   value: data.teamEmails.length > 0 ? `${data.teamEmails.length} integrante${data.teamEmails.length > 1 ? "s" : ""}` : "Solo yo" },
        ].map(item => (
          <div key={item.label} className="flex items-center justify-between py-2 border-b border-border last:border-0">
            <span className="text-sm text-muted-foreground">{item.label}</span>
            <span className="text-sm font-medium">{item.value}</span>
          </div>
        ))}
        <div className="flex items-center justify-between py-2">
          <span className="text-sm text-muted-foreground">Color de marca</span>
          <div className="flex items-center gap-2">
            <div
              className="w-5 h-5 rounded-full border border-border"
              style={{ backgroundColor: data.brandColor }}
            />
            <span className="text-sm font-mono font-medium">{data.brandColor}</span>
          </div>
        </div>
      </div>

      <Button
        onClick={onFinish}
        disabled={loading}
        className="w-full bg-brand hover:bg-brand-hover"
        size="lg"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Guardando...
          </>
        ) : (
          <>
            Ir al dashboard <ArrowRight className="h-4 w-4 ml-2" />
          </>
        )}
      </Button>
    </StepShell>
  )
}

// ── Wizard root ───────────────────────────────────────────────────────────────

export function OnboardingWizard({
  initialBusinessName,
  initialBrandColor,
  initialCurrency,
}: Props) {
  const router = useRouter()
  const [step, setStep]       = useState(1)
  const [loading, setLoading] = useState(false)
  const [data, setData]       = useState<WizardData>({
    businessName: initialBusinessName,
    industry:     "",
    teamSize:     "1",
    currency:     initialCurrency,
    brandColor:   initialBrandColor,
    teamEmails:   [],
  })

  function patch(updates: Partial<WizardData>) {
    setData(prev => ({ ...prev, ...updates }))
  }

  function next() { setStep(s => Math.min(s + 1, STEPS.length)) }
  function back() { setStep(s => Math.max(s - 1, 1)) }

  async function finish() {
    setLoading(true)
    try {
      const res = await fetch("/api/onboarding/complete", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(data),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        toast.error(body.error ?? "No se pudo guardar la configuracion")
        return
      }

      // Small delay so user sees the success state
      await new Promise(r => setTimeout(r, 400))
      router.push("/")
      router.refresh()
    } catch {
      toast.error("Error de red. Intenta de nuevo.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md">
      {/* Logo */}
      <div className="flex items-center gap-2 mb-8 justify-center">
        <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center">
          <span className="text-sm font-bold text-white">O</span>
        </div>
        <span className="text-lg font-semibold">Omni</span>
      </div>

      {/* Step indicators */}
      <div className="mb-6 space-y-3">
        <ProgressBar current={step} total={STEPS.length} />
        <div className="flex justify-between">
          {STEPS.map(s => (
            <div
              key={s.id}
              className={cn(
                "flex flex-col items-center gap-1 transition-all",
                s.id < step  && "opacity-40",
                s.id === step && "opacity-100",
                s.id > step  && "opacity-30",
              )}
            >
              <div className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold border transition-all",
                s.id < step  && "bg-brand border-brand text-white",
                s.id === step && "bg-brand border-brand text-white scale-110",
                s.id > step  && "border-border text-muted-foreground bg-background",
              )}>
                {s.id < step ? "✓" : s.id}
              </div>
              <span className="text-[9px] text-muted-foreground hidden sm:block">{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Card */}
      <div className="bg-background border border-border rounded-2xl p-8 shadow-sm">
        {step === 1 && <StepWelcome  onNext={next} />}
        {step === 2 && <StepBusiness data={data} onChange={patch} onNext={next} onBack={back} />}
        {step === 3 && <StepBrand    data={data} onChange={patch} onNext={next} onBack={back} />}
        {step === 4 && <StepTeam     data={data} onChange={patch} onNext={next} onBack={back} />}
        {step === 5 && <StepDone     data={data} onFinish={finish} loading={loading} />}
      </div>

      <p className="text-center text-xs text-muted-foreground mt-6">
        Podes cambiar todo esto despues en{" "}
        <span className="font-medium">Ajustes</span>
      </p>
    </div>
  )
}
