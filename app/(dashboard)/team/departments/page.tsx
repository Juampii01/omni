import { requireAuth } from "@/lib/auth/get-user"
import { createClient } from "@/lib/supabase/server"
import { DepartmentsClient } from "./departments-client"

export const metadata = { title: "Departamentos" }

export default async function DepartmentsPage() {
  await requireAuth()
  const supabase = await createClient()

  const [{ data: depsData }, { data: profilesData }] = await Promise.all([
    supabase
      .from("departments")
      .select("*")
      .order("position")
      .order("name"),
    supabase
      .from("profiles")
      .select("id, full_name, department_id, is_active")
      .eq("is_active", true),
  ])

  return (
    <DepartmentsClient
      initialDepts={(depsData as any[]) ?? []}
      profiles={(profilesData as any[]) ?? []}
    />
  )
}
