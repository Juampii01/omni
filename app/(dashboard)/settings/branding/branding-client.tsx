"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { Loader2, ArrowLeft, Camera, Upload, X } from "lucide-react"
import Link from "next/link"
import { buildThemeCssVars } from "@/lib/theme/load-theme"
import { BRAND_COLOR_HEX } from "@/lib/constants"

// ── Constants ──────────────────────────────────────────────────────────────────

const PRESET_COLORS = [
  { label: "NOVA Verde", value: "#236461" },
  { label: "Azul",       value: "#2563eb" },
  { label: "Índigo",     value: "#4f46e5" },
  { label: "Púrpura",    value: "#7c3aed" },
  { label: "Rosa",       value: "#db2777" },
  { label: "Naranja",    value: "#ea580c" },
  { label: "Slate",      value: "#475569" },
  { label: "Negro",      value: "#0a0a0a" },
]

const TIMEZONES = [
  { value: "America/Argentina/Buenos_Aires", label: "Buenos Aires (GMT-3)" },
  { value: "America/Bogota",                 label: "Bogotá (GMT-5)" },
  { value: "America/Lima",                   label: "Lima (GMT-5)" },
  { value: "America/Mexico_City",            label: "Ciudad de México (GMT-6)" },
  { value: "America/Santiago",               label: "Santiago (GMT-3/-4)" },
  { value: "America/Caracas",                label: "Caracas (GMT-4)" },
  { value: "America/New_York",               label: "Nueva York (GMT-5/-4)" },
  { value: "America/Chicago",                label: "Chicago (GMT-6/-5)" },
  { value: "America/Los_Angeles",            label: "Los Ángeles (GMT-8/-7)" },
  { value: "America/Sao_Paulo",              label: "São Paulo (GMT-3)" },
  { value: "Europe/Madrid",                  label: "Madrid (GMT+1/+2)" },
  { value: "Europe/London",                  label: "Londres (GMT+0/+1)" },
  { value: "UTC",                            label: "UTC (GMT+0)" },
]

const CURRENCIES = [
  { value: "USD", label: "USD — Dólar estadounidense" },
  { value: "ARS", label: "ARS — Peso argentino" },
  { value: "EUR", label: "EUR — Euro" },
  { value: "MXN", label: "MXN — Peso mexicano" },
  { value: "COP", label: "COP — Peso colombiano" },
  { value: "CLP", label: "CLP — Peso chileno" },
  { value: "PEN", label: "PEN — Sol peruano" },
  { value: "BRL", label: "BRL — Real brasileño" },
]

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
]

// ── Types ──────────────────────────────────────────────────────────────────────

interface Settings {
  id?:                string
  business_name:      string
  brand_color:        string
  brand_accent_color: string
  business_logo_url:  string | null
  timezone:           string
  currency:           string
  fiscal_year_start:  number
}

const DEFAULT_SETTINGS: Settings = {
  business_name:      "",
  brand_color:        BRAND_COLOR_HEX,
  brand_accent_color: BRAND_COLOR_HEX,
  business_logo_url:  null,
  timezone:           "America/Argentina/Buenos_Aires",
  currency:           "USD",
  fiscal_year_start:  1,
}

interface Props {
  initialSettings: Settings | null
}

// ── Color swatch row (reused for brand + accent) ───────────────────────────────

function ColorPicker({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {PRESET_COLORS.map(({ label, value: preset }) => (
          <button
            key={preset}
            type="button"
            title={label}
            onClick={() => onChange(preset)}
            className="w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            style={{
              backgroundColor: preset,
              borderColor: value === preset ? "#0a0a0a" : "transparent",
            }}
          />
        ))}
      </div>
      <div className="flex items-center gap-3">
        <input
          type="color"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-10 h-10 rounded cursor-pointer border border-border"
        />
        <Input
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="#236461"
          className="font-mono text-sm w-32"
          maxLength={7}
        />
        <div
          className="flex-1 h-10 rounded-md border border-border"
          style={{ backgroundColor: value }}
        />
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export function BrandingClient({ initialSettings }: Props) {
  const router = useRouter()
  const [saved, setSaved]       = useState<Settings>(initialSettings ?? DEFAULT_SETTINGS)
  const [settings, setSettings] = useState<Settings>(initialSettings ?? DEFAULT_SETTINGS)
  const [saving, setSaving]     = useState(false)
  const [logoFile, setLogoFile]   = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)

  useEffect(() => { document.title = "Branding — Omni" }, [])

  // Dirty state: any unsaved change (including a new logo file)
  const isDirty =
    logoFile !== null ||
    JSON.stringify(settings) !== JSON.stringify(saved)

  // ── Logo handlers ───────────────────────────────────────────────────────────

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      toast.error("La imagen debe pesar menos de 2 MB")
      return
    }
    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
  }

  function removeLogo() {
    setLogoFile(null)
    setLogoPreview(null)
    setSettings(s => ({ ...s, business_logo_url: null }))
  }

  // ── Save ────────────────────────────────────────────────────────────────────

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!isDirty) return
    setSaving(true)

    const supabase = createClient()
    let newLogoUrl = settings.business_logo_url

    // Upload new logo if one was selected
    if (logoFile) {
      const ext  = logoFile.name.split(".").pop()
      const path = `logo.${ext}`
      const { error: uploadError } = await supabase.storage
        .from("logos")
        .upload(path, logoFile, { upsert: true })

      if (uploadError) {
        toast.error("Error al subir el logo")
        setSaving(false)
        return
      }
      const { data: { publicUrl } } = supabase.storage.from("logos").getPublicUrl(path)
      newLogoUrl = publicUrl
      setLogoFile(null)
      setLogoPreview(null)
    }

    const payload = { ...settings, business_logo_url: newLogoUrl }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("client_settings")
      .upsert(payload)

    if (error) {
      toast.error("No se pudo guardar la configuración")
      setSaving(false)
      return
    }

    // Persist locally
    setSaved(payload)
    setSettings(s => ({ ...s, business_logo_url: newLogoUrl }))

    // Apply brand theme immediately (no page reload needed)
    const vars = buildThemeCssVars(settings.brand_color)
    document.documentElement.style.setProperty("--brand",       vars.brand)
    document.documentElement.style.setProperty("--brand-hover", vars.brandHover)
    document.documentElement.style.setProperty("--brand-soft",  vars.brandSoft)
    document.documentElement.style.setProperty("--primary",     vars.brand)
    document.documentElement.style.setProperty("--ring",        vars.brand)

    toast.success("Configuración guardada")

    // Refresh server renders so sidebar / header pick up new name + logo
    router.refresh()
    setSaving(false)
  }

  // ── Derived ─────────────────────────────────────────────────────────────────

  const previewLogoSrc = logoPreview ?? settings.business_logo_url
  const tzLabel = TIMEZONES.find(t => t.value === settings.timezone)?.label ?? settings.timezone

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/settings">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <PageHeader
          title="Branding"
          description="Personalizá la identidad visual de tu dashboard"
        />
      </div>

      <form onSubmit={handleSave}>
        <div className="grid gap-6 lg:grid-cols-[1fr_272px]">

          {/* ── Left: form ─────────────────────────────────────────────────── */}
          <div className="space-y-6">

            {/* Business name */}
            <Card className="border-border shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Nombre del negocio</CardTitle>
                <CardDescription className="text-xs">
                  Aparece en el header y en documentos exportados
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Input
                  value={settings.business_name}
                  onChange={e => setSettings(s => ({ ...s, business_name: e.target.value }))}
                  placeholder="Mi Empresa S.A."
                  maxLength={80}
                />
              </CardContent>
            </Card>

            {/* Logo */}
            <Card className="border-border shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Logo</CardTitle>
                <CardDescription className="text-xs">
                  Recomendado: fondo transparente, formato cuadrado.
                  JPG, PNG, WebP o SVG · Máx. 2 MB
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  {/* Thumbnail + upload trigger */}
                  <div className="relative group w-16 h-16 rounded-lg border-2 border-dashed border-border flex items-center justify-center overflow-hidden bg-muted/30 shrink-0">
                    {previewLogoSrc ? (
                      <>
                        <img
                          src={previewLogoSrc}
                          alt="Logo"
                          className="w-full h-full object-contain p-1"
                        />
                        <label
                          htmlFor="logo-upload"
                          className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        >
                          <Camera className="h-4 w-4 text-white" />
                        </label>
                      </>
                    ) : (
                      <label
                        htmlFor="logo-upload"
                        className="flex flex-col items-center gap-1 cursor-pointer text-muted-foreground hover:text-foreground transition-colors p-2"
                      >
                        <Upload className="h-5 w-5" />
                        <span className="text-[10px] text-center leading-tight">Subir logo</span>
                      </label>
                    )}
                    <input
                      id="logo-upload"
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/svg+xml"
                      className="hidden"
                      onChange={handleLogoChange}
                    />
                  </div>

                  {/* Meta */}
                  <div>
                    {previewLogoSrc ? (
                      <>
                        <p className="text-sm font-medium">Logo cargado</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Guardá los cambios para aplicarlo.
                        </p>
                        <button
                          type="button"
                          onClick={removeLogo}
                          className="mt-1.5 flex items-center gap-1 text-xs text-destructive hover:underline"
                        >
                          <X className="h-3 w-3" /> Eliminar logo
                        </button>
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">Sin logo</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Brand color */}
            <Card className="border-border shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Color de marca</CardTitle>
                <CardDescription className="text-xs">
                  Se aplica a botones primarios, links activos y acentos del dashboard
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ColorPicker
                  value={settings.brand_color}
                  onChange={v => setSettings(s => ({ ...s, brand_color: v }))}
                />
              </CardContent>
            </Card>

            {/* Accent color */}
            <Card className="border-border shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Color de acento</CardTitle>
                <CardDescription className="text-xs">
                  Se usa en highlights secundarios, badges y tags
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ColorPicker
                  value={settings.brand_accent_color}
                  onChange={v => setSettings(s => ({ ...s, brand_accent_color: v }))}
                />
              </CardContent>
            </Card>

            {/* Regional settings */}
            <Card className="border-border shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Configuración regional</CardTitle>
                <CardDescription className="text-xs">
                  Afecta cómo se formatean fechas, montos y reportes
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Timezone */}
                <div className="space-y-1.5">
                  <Label className="text-sm">Zona horaria</Label>
                  <Select
                    value={settings.timezone}
                    onValueChange={val => setSettings(s => ({ ...s, timezone: val }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar zona horaria" />
                    </SelectTrigger>
                    <SelectContent>
                      {TIMEZONES.map(tz => (
                        <SelectItem key={tz.value} value={tz.value}>
                          {tz.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Currency */}
                <div className="space-y-1.5">
                  <Label className="text-sm">Moneda</Label>
                  <Select
                    value={settings.currency}
                    onValueChange={val => setSettings(s => ({ ...s, currency: val }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar moneda" />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map(c => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Fiscal year start */}
                <div className="space-y-1.5">
                  <Label className="text-sm">Inicio del año fiscal</Label>
                  <Select
                    value={String(settings.fiscal_year_start)}
                    onValueChange={val => setSettings(s => ({ ...s, fiscal_year_start: Number(val) }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar mes" />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTHS.map((month, i) => (
                        <SelectItem key={i + 1} value={String(i + 1)}>
                          {month}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ── Right: live preview + save ──────────────────────────────────── */}
          <div className="lg:sticky lg:top-6 h-fit space-y-3">
            <Card className="border-border shadow-sm overflow-hidden">
              <CardHeader className="pb-2 border-b border-border">
                <CardTitle className="text-sm font-semibold">Vista previa</CardTitle>
                <CardDescription className="text-[11px]">
                  Se actualiza en tiempo real
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">

                {/* Mock sidebar header */}
                <div className="rounded-lg border border-border p-3 bg-muted/20 space-y-2">
                  <div className="flex items-center gap-2">
                    {previewLogoSrc ? (
                      <img
                        src={previewLogoSrc}
                        alt="Logo preview"
                        className="w-6 h-6 object-contain rounded shrink-0"
                      />
                    ) : (
                      <div
                        className="w-6 h-6 rounded flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                        style={{ backgroundColor: settings.brand_color }}
                      >
                        {(settings.business_name || "M").charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="text-xs font-semibold truncate">
                      {settings.business_name || "Mi Empresa"}
                    </span>
                  </div>

                  {/* Mock nav items */}
                  <div className="space-y-0.5">
                    {["Overview", "Leads", "Tareas"].map((item, i) => (
                      <div
                        key={item}
                        className="flex items-center gap-2 rounded px-2 py-1 text-xs"
                        style={
                          i === 0
                            ? { backgroundColor: settings.brand_color + "20", color: settings.brand_color }
                            : { color: "#888" }
                        }
                      >
                        <div
                          className="w-2.5 h-2.5 rounded-sm"
                          style={{ backgroundColor: i === 0 ? settings.brand_color : "#ccc" }}
                        />
                        {item}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Mock buttons */}
                <div className="space-y-2">
                  <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">
                    Botones
                  </p>
                  <button
                    type="button"
                    className="w-full py-1.5 rounded-lg text-white text-xs font-medium"
                    style={{ backgroundColor: settings.brand_color }}
                  >
                    Acción primaria
                  </button>
                  <button
                    type="button"
                    className="w-full py-1.5 rounded-lg text-xs font-medium border"
                    style={{
                      borderColor: settings.brand_accent_color,
                      color: settings.brand_accent_color,
                      backgroundColor: settings.brand_accent_color + "15",
                    }}
                  >
                    Acción secundaria
                  </button>
                </div>

                {/* Regional preview */}
                <div className="rounded-lg border border-border p-3 bg-muted/20 space-y-1.5">
                  <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide mb-2">
                    Regional
                  </p>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-muted-foreground">Moneda</span>
                    <span className="font-medium">{settings.currency}</span>
                  </div>
                  <div className="flex justify-between text-[11px] gap-2">
                    <span className="text-muted-foreground shrink-0">Zona horaria</span>
                    <span className="font-medium text-right leading-tight">{tzLabel.split("(")[0].trim()}</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-muted-foreground">Año fiscal</span>
                    <span className="font-medium">{MONTHS[settings.fiscal_year_start - 1]}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Save button */}
            <Button
              type="submit"
              className="w-full bg-brand hover:bg-brand-hover"
              disabled={!isDirty || saving}
            >
              {saving ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Guardando…</>
              ) : (
                "Guardar cambios"
              )}
            </Button>

            {isDirty && (
              <p className="text-[10px] text-center text-amber-600 font-medium">
                Tenés cambios sin guardar
              </p>
            )}
          </div>
        </div>
      </form>
    </div>
  )
}
