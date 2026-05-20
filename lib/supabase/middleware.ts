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

  const hasUser = !!user

  // Usuario sin sesión intentando acceder a ruta protegida
  if (!hasUser && !isAuthPage) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    url.searchParams.set("next", pathname)
    const redirectResponse = NextResponse.redirect(url)
    // CRÍTICO: propagar cookies de sesión refrescadas en la respuesta de redirect
    // Sin esto, si el token se refresheó en este request, el refresh se pierde
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value)
    })
    return redirectResponse
  }

  // Usuario autenticado intentando acceder a página de auth
  if (hasUser && isAuthPage) {
    const rawNext =
      request.nextUrl.searchParams.get("next") ??
      request.nextUrl.searchParams.get("redirectTo") ??
      "/"
    // Validar para prevenir open redirect: debe ser ruta interna
    const safePath = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/"
    const url = request.nextUrl.clone()
    url.pathname = safePath
    url.search = ""
    const redirectResponse = NextResponse.redirect(url)
    // CRÍTICO: propagar cookies de sesión refrescadas en la respuesta de redirect
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value)
    })
    return redirectResponse
  }

  // IMPORTANTE: siempre devolver supabaseResponse — nunca crear un nuevo NextResponse.next()
  // Si se crea una nueva respuesta acá, las cookies seteadas por setAll() se pierden
  return supabaseResponse
}
