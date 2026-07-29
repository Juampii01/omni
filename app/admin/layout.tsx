"use client"

import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { LayoutGrid, LogOut } from "lucide-react"
import { useSession } from "@/lib/auth/use-session"
import { ThemeToggle } from "@/components/theme/theme-toggle"
import { createClient } from "@/lib/supabase"
import { cn } from "@/lib/utils"

const ADMIN_TABS = [
  { href: "/admin", label: "Clientes" },
  { href: "/admin/discovery", label: "Descubrimiento" },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { session, loading } = useSession()
  const router = useRouter()
  const pathname = usePathname()

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
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <LayoutGrid className="h-4 w-4 text-primary" strokeWidth={1.75} />
            <p className="font-heading text-lg italic">Omni — Plataforma</p>
          </div>
          <nav className="flex items-center gap-1">
            {ADMIN_TABS.map((tab) => (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "rounded-full px-3 py-1.5 text-sm transition-colors",
                  pathname === tab.href ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tab.label}
              </Link>
            ))}
          </nav>
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
