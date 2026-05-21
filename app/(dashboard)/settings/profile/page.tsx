"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { Loader2, ArrowLeft, Camera, KeyRound } from "lucide-react"
import Link from "next/link"
import { getInitials } from "@/lib/utils"

export default function ProfilePage() {
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [email, setEmail] = useState("")
  const [fullName, setFullName] = useState("")
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [originalName, setOriginalName] = useState("")

  // Password change dialog
  const [pwOpen, setPwOpen] = useState(false)
  const [currentPw, setCurrentPw] = useState("")
  const [newPw, setNewPw] = useState("")
  const [confirmPw, setConfirmPw] = useState("")
  const [savingPw, setSavingPw] = useState(false)

  useEffect(() => { document.title = "Mi perfil — Omni" }, [])

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)
      setEmail(user.email ?? "")

      const { data: profile } = await (supabase as any)
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("id", user.id)
        .single()

      if (profile) {
        // Si full_name es el email (por el coalesce del setup), tratarlo como vacío
        const name = profile.full_name?.includes("@") ? "" : (profile.full_name ?? "")
        setFullName(name)
        setOriginalName(name)
        setAvatarUrl(profile.avatar_url ?? null)
      }
      setLoading(false)
    }
    load()
  }, [])

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      toast.error("La imagen debe pesar menos de 2 MB")
      return
    }
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  async function handleSave() {
    if (!userId) return
    setSaving(true)
    try {
      let newAvatarUrl = avatarUrl

      // Upload avatar if changed
      if (avatarFile) {
        const ext = avatarFile.name.split(".").pop()
        const path = `${userId}/avatar.${ext}`
        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(path, avatarFile, { upsert: true })

        if (uploadError) {
          toast.error("Error al subir la imagen")
          setSaving(false)
          return
        }
        const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path)
        newAvatarUrl = publicUrl
      }

      const { error } = await (supabase as any)
        .from("profiles")
        .update({ full_name: fullName.trim() || null, avatar_url: newAvatarUrl })
        .eq("id", userId)

      if (error) throw error

      setOriginalName(fullName.trim())
      setAvatarUrl(newAvatarUrl)
      setAvatarFile(null)
      toast.success("Perfil actualizado")
    } catch {
      toast.error("Error al guardar los cambios")
    } finally {
      setSaving(false)
    }
  }

  async function handlePasswordChange() {
    if (newPw !== confirmPw) {
      toast.error("Las contraseñas no coinciden")
      return
    }
    if (newPw.length < 8) {
      toast.error("La contraseña debe tener al menos 8 caracteres")
      return
    }
    setSavingPw(true)
    try {
      // Re-authenticate first
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: currentPw,
      })
      if (signInError) {
        toast.error("Contraseña actual incorrecta")
        setSavingPw(false)
        return
      }

      const { error } = await supabase.auth.updateUser({ password: newPw })
      if (error) throw error

      toast.success("Contraseña actualizada")
      setPwOpen(false)
      setCurrentPw("")
      setNewPw("")
      setConfirmPw("")
    } catch {
      toast.error("Error al cambiar la contraseña")
    } finally {
      setSavingPw(false)
    }
  }

  const hasChanges =
    fullName !== originalName || avatarFile !== null

  const displayAvatar = avatarPreview ?? avatarUrl ?? undefined

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
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
        <PageHeader
          title="Mi perfil"
          description="Nombre, foto y contraseña de tu cuenta"
        />
      </div>

      {/* Avatar + name */}
      <Card className="border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Información personal</CardTitle>
          <CardDescription className="text-xs">Estos datos son visibles para tu equipo.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Avatar */}
          <div className="flex items-center gap-4">
            <div className="relative group">
              <Avatar className="h-16 w-16">
                <AvatarImage src={displayAvatar} />
                <AvatarFallback className="text-lg bg-brand text-brand-foreground">
                  {getInitials(fullName || email)}
                </AvatarFallback>
              </Avatar>
              <label
                htmlFor="avatar-upload"
                className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              >
                <Camera className="h-5 w-5 text-white" />
              </label>
              <input
                id="avatar-upload"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </div>
            <div>
              {fullName ? (
                <p className="text-sm font-medium">{fullName}</p>
              ) : (
                <p className="text-sm text-muted-foreground italic">Sin nombre</p>
              )}
              <p className="text-xs text-muted-foreground mt-0.5">
                JPG, PNG o WebP · Máx. 2 MB
              </p>
            </div>
          </div>

          <Separator />

          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="full-name">Nombre completo</Label>
            <Input
              id="full-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Tu nombre"
            />
          </div>

          {/* Email (readonly) */}
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              value={email}
              readOnly
              disabled
              className="bg-muted text-muted-foreground"
            />
            <p className="text-xs text-muted-foreground">
              El email no se puede cambiar desde acá.
            </p>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={handleSave}
              disabled={!hasChanges || saving}
              className="bg-brand hover:bg-brand-hover"
            >
              {saving ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Guardando…</>
              ) : (
                "Guardar cambios"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Password */}
      <Card className="border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Seguridad</CardTitle>
          <CardDescription className="text-xs">Cambiá tu contraseña de acceso.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            onClick={() => setPwOpen(true)}
            className="gap-2"
          >
            <KeyRound className="h-4 w-4" />
            Cambiar contraseña
          </Button>
        </CardContent>
      </Card>

      {/* Password dialog */}
      <Dialog open={pwOpen} onOpenChange={setPwOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cambiar contraseña</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Contraseña actual</Label>
              <Input
                type="password"
                value={currentPw}
                onChange={(e) => setCurrentPw(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Nueva contraseña</Label>
              <Input
                type="password"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                placeholder="Mínimo 8 caracteres"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Confirmar nueva contraseña</Label>
              <Input
                type="password"
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                placeholder="••••••••"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPwOpen(false)}>Cancelar</Button>
            <Button
              onClick={handlePasswordChange}
              disabled={savingPw || !currentPw || !newPw || !confirmPw}
              className="bg-brand hover:bg-brand-hover"
            >
              {savingPw ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Guardando…</> : "Actualizar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
