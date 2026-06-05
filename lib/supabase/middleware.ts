import { createServerClient, type CookieOptions } from "@supabase/ssr"
import { type NextRequest, NextResponse } from "next/server"
import type { Database } from "./types"

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  // Guard: si no hay env vars configuradas, pasar sin redirigir
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return supabaseResponse
  }

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: usar getUser() — valida el token contra Supabase (no solo JWT local)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  const isAuthPage =
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password")

  // Rutas PÚBLICAS (landing de marketing + endpoint del form de demo).
  // No requieren sesión — el proxy no debe redirigirlas a /login.
  const isPublicPath =
    pathname === "/landing" ||
    pathname.startsWith("/landing/") ||
    pathname === "/api/demo"

  // SOLO redirigir usuarios no autenticados que intentan acceder a rutas protegidas.
  // NO redirigir usuarios autenticados desde páginas de auth — eso lo maneja
  // el server component de cada página de auth para evitar loops.
  if (!user && !isAuthPage && !isPublicPath) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    url.searchParams.set("next", pathname)
    const redirectResponse = NextResponse.redirect(url)
    // Propagar cookies de sesión refrescadas
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value)
    })
    return redirectResponse
  }

  // IMPORTANTE: siempre devolver supabaseResponse — nunca crear un nuevo NextResponse.next()
  return supabaseResponse
}
