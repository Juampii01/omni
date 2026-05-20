import { Suspense } from "react"
import { getUser } from "@/lib/auth/get-user"
import { redirect } from "next/navigation"
import LoginForm from "./login-form"

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; redirectTo?: string }>
}) {
  // Server-side: si ya está autenticado, redirigir al destino
  const user = await getUser()
  if (user) {
    const params = await searchParams
    const rawNext = params.next ?? params.redirectTo ?? "/"
    const dest = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/"
    redirect(dest)
  }

  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  )
}
