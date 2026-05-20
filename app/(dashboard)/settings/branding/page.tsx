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
import { Loader2, ArrowLeft } from "lucide-react"
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

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    const supabase = createClient()
    const { error } = await supabase
      .from("client_settings")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .upsert({ ...settings } as any)

    if (error) {
      toast.error("No se pudo guardar la configuración")
    } else {
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
