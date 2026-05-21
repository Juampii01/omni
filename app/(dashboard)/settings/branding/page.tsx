"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { Loader2, ArrowLeft, Camera, Upload, X } from "lucide-react"
import Link from "next/link"
import { BRAND_COLOR_HEX } from "@/lib/constants"

const PRESET_COLORS = [
  { label: "NOVA Verde",  value: "#236461" },
  { label: "Azul",       value: "#2563eb" },
  { label: "Índigo",     value: "#4f46e5" },
  { label: "Púrpura",    value: "#7c3aed" },
  { label: "Rosa",       value: "#db2777" },
  { label: "Naranja",    value: "#ea580c" },
  { label: "Slate",      value: "#475569" },
  { label: "Negro",      value: "#0a0a0a" },
]

interface Settings {
  business_name: string
  brand_color: string
  business_logo_url: string | null
}

export default function BrandingPage() {
  const [settings, setSettings] = useState<Settings>({
    business_name: "",
    brand_color: BRAND_COLOR_HEX,
    business_logo_url: null,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)

  useEffect(() => { document.title = "Branding — Omni" }, [])

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from("client_settings")
      .select("business_name, brand_color, business_logo_url")
      .single()
      .then(({ data }) => {
        if (data) setSettings(data)
        setLoading(false)
      })
  }, [])

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

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    const supabase = createClient()
    let newLogoUrl = settings.business_logo_url

    // Upload logo if changed
    if (logoFile) {
      const ext = logoFile.name.split(".").pop()
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await supabase
      .from("client_settings")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .upsert({ ...settings, business_logo_url: newLogoUrl } as any)

    if (error) {
      toast.error("No se pudo guardar la configuración")
    } else {
      setSettings(s => ({ ...s, business_logo_url: newLogoUrl }))
      toast.success("Configuración guardada")
      // Apply theme live
      document.documentElement.style.setProperty(
        "--brand",
        hexToHslString(settings.brand_color)
      )
    }
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="max-w-2xl space-y-4">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="h-64 bg-muted animate-pulse rounded-lg" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/settings">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <PageHeader title="Branding" description="Personalizá la identidad visual de tu dashboard" />
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Nombre del negocio */}
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
              onChange={(e) => setSettings((s) => ({ ...s, business_name: e.target.value }))}
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
              Aparece en el header y en documentos exportados. Recomendado: fondo transparente, formato cuadrado.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              {/* Preview + upload trigger */}
              <div className="relative group w-16 h-16 rounded-lg border-2 border-dashed border-border flex items-center justify-center overflow-hidden bg-muted/30 flex-shrink-0">
                {(logoPreview ?? settings.business_logo_url) ? (
                  <>
                    <img
                      src={logoPreview ?? settings.business_logo_url ?? ""}
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
                {(logoPreview ?? settings.business_logo_url) ? (
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
                      <X className="h-3 w-3" />
                      Eliminar logo
                    </button>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">Sin logo</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      JPG, PNG, WebP o SVG · Máx. 2 MB
                    </p>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Color de marca */}
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Color de marca</CardTitle>
            <CardDescription className="text-xs">
              Se aplica a botones, links activos y acentos del dashboard
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Presets */}
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map(({ label, value }) => (
                <button
                  key={value}
                  type="button"
                  title={label}
                  onClick={() => setSettings((s) => ({ ...s, brand_color: value }))}
                  className="w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  style={{
                    backgroundColor: value,
                    borderColor: settings.brand_color === value ? "#0a0a0a" : "transparent",
                  }}
                />
              ))}
            </div>

            {/* Custom hex */}
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={settings.brand_color}
                onChange={(e) => setSettings((s) => ({ ...s, brand_color: e.target.value }))}
                className="w-10 h-10 rounded cursor-pointer border border-border"
              />
              <Input
                value={settings.brand_color}
                onChange={(e) => setSettings((s) => ({ ...s, brand_color: e.target.value }))}
                placeholder="#236461"
                className="font-mono text-sm w-32"
                maxLength={7}
              />
              <div
                className="flex-1 h-10 rounded-md border border-border"
                style={{ backgroundColor: settings.brand_color }}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" className="bg-brand hover:bg-brand-hover" disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Guardando…
              </>
            ) : (
              "Guardar cambios"
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}

function hexToHslString(hex: string): string {
  const clean = hex.replace("#", "")
  const r = parseInt(clean.slice(0, 2), 16) / 255
  const g = parseInt(clean.slice(2, 4), 16) / 255
  const b = parseInt(clean.slice(4, 6), 16) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h = 0, s = 0
  const l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      case b: h = ((r - g) / d + 4) / 6; break
    }
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`
}
