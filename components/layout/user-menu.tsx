"use client"

import { useRouter } from "next/navigation"
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
import { LogOut, User, Settings } from "lucide-react"
import { ROLE_LABELS } from "@/lib/constants"
import type { UserRole } from "@/lib/constants"

interface UserMenuProps {
  /** compact=true renders avatar-only trigger (for sidebar bottom) */
  compact?: boolean
}

export function UserMenu({ compact }: UserMenuProps) {
  const router = useRouter()
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

  const displayName =
    user.full_name && !user.full_name.includes("@") ? user.full_name : user.email

  if (compact) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2.5 w-full rounded-md p-1 hover:bg-white/5 transition-colors outline-none group">
            <Avatar className="h-7 w-7 flex-shrink-0">
              <AvatarImage src={user.avatar_url ?? undefined} />
              <AvatarFallback className="text-[10px] font-bold bg-brand text-brand-foreground">
                {getInitials(user.full_name ?? user.email)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 text-left">
              <p className="text-[12px] font-medium text-foreground truncate font-sans leading-none">
                {displayName?.split(" ")[0] ?? "Usuario"}
              </p>
              <p className="text-[10px] text-muted-foreground truncate font-sans mt-0.5 leading-none">
                {ROLE_LABELS[user.role as UserRole]}
              </p>
            </div>
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" side="top" className="w-52 mb-1">
          <DropdownMenuLabel className="font-normal">
            <p className="text-sm font-medium truncate">{displayName}</p>
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

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 rounded-md p-1 hover:bg-white/5 transition-colors outline-none">
          <Avatar className="h-7 w-7">
            <AvatarImage src={user.avatar_url ?? undefined} />
            <AvatarFallback className="text-xs font-bold bg-brand text-brand-foreground">
              {getInitials(user.full_name ?? user.email)}
            </AvatarFallback>
          </Avatar>
          <span className="hidden sm:block text-sm font-medium max-w-[120px] truncate font-sans">
            {displayName}
          </span>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel className="font-normal">
          <p className="text-sm font-medium truncate">{displayName}</p>
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
