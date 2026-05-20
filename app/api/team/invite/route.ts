import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { requireRole } from "@/lib/auth/get-user"

export async function POST(req: NextRequest) {
  try {
    await requireRole("manager")
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }

  const { email, role, department_id } = await req.json()

  if (!email || !role) {
    return NextResponse.json({ error: "Email y rol son obligatorios" }, { status: 400 })
  }

  const validRoles = ["admin", "manager", "team"]
  if (!validRoles.includes(role)) {
    return NextResponse.json({ error: "Rol inválido" }, { status: 400 })
  }

  const supabase = await createServiceClient()

  const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
    data: { role, department_id: department_id ?? null },
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  // Pre-populate profile with role + department so it's ready when user accepts
  if (data.user) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await supabase.from("profiles").upsert({
      id: data.user.id,
      email,
      role,
      department_id: department_id ?? null,
    } as any)
  }

  return NextResponse.json({ ok: true })
}
