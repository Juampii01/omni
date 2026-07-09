"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { LayoutGrid, LogOut } from "lucide-react"
import { useSession } from "@/lib/auth/use-session"
import { ThemeToggle } from "@/components/theme/theme-toggle"
import { createClient } from "@/lib/supabase"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { session, loading } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (session && !session.isPlatformAdmin) router.replace("/dashboard")
  }, [session, router])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.replace("/login")
  }

  if (loading || !session || !session.isPlatformAdmin) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Cargando…</div>
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center justify-between border-b border-border/60 px-8 py-4">
        <div className="flex items-center gap-2">
          <LayoutGrid className="h-4 w-4 text-primary" strokeWidth={1.75} />
          <p className="font-heading text-lg italic">Omni — Plataforma</p>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-xs text-muted-foreground">{session.email}</p>
          <ThemeToggle />
          <button onClick={handleLogout} className="flex h-9 w-9 items-center justify-center rounded-full border border-border/60 text-muted-foreground hover:bg-accent hover:text-foreground">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>
      <main className="p-8">{children}</main>
    </div>
  )
}
