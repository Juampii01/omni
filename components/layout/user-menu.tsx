"use client"

import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { createClient } from "@/lib/supabase/client"
import { useUser } from "@/hooks/use-user"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { getInitials } from "@/lib/utils"
import { LogOut, User, Settings, Moon, Sun } from "lucide-react"
import { ROLE_LABELS } from "@/lib/constants"
import type { UserRole } from "@/lib/constants"

export function UserMenu() {
  const router = useRouter()
  const { resolvedTheme, setTheme } = useTheme()
  const { user, isLoading } = useUser()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  if (isLoading || !user) {
    return <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 rounded-md p-1 hover:bg-muted transition-colors outline-none">
          <Avatar className="h-7 w-7">
            <AvatarImage src={user.avatar_url ?? undefined} />
            <AvatarFallback className="text-xs bg-brand text-brand-foreground">
              {getInitials(user.full_name ?? user.email)}
            </AvatarFallback>
          </Avatar>
          <span className="hidden sm:block text-sm font-medium max-w-[120px] truncate">
            {(user.full_name && !user.full_name.includes("@")) ? user.full_name : user.email}
          </span>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel className="font-normal">
          <p className="text-sm font-medium truncate">
            {(user.full_name && !user.full_name.includes("@")) ? user.full_name : "Sin nombre"}
          </p>
          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          <p className="text-xs text-brand mt-0.5">{ROLE_LABELS[user.role as UserRole]}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push("/settings/profile")}>
          <User className="mr-2 h-4 w-4" />
          Mi perfil
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push("/settings")}>
          <Settings className="mr-2 h-4 w-4" />
          Configuración
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}>
          {resolvedTheme === "dark" ? (
            <Sun className="mr-2 h-4 w-4" />
          ) : (
            <Moon className="mr-2 h-4 w-4" />
          )}
          {resolvedTheme === "dark" ? "Modo claro" : "Modo oscuro"}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleSignOut}
          className="text-destructive focus:text-destructive"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
