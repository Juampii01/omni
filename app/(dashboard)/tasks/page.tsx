import { requireAuth } from "@/lib/auth/get-user"
import { createClient } from "@/lib/supabase/server"
import { TasksClient } from "./tasks-client"

export const metadata = { title: "Tareas" }

export default async function TasksPage() {
  const user = await requireAuth()
  const supabase = await createClient()

  const [{ data: tasksData }, { data: profilesData }, { data: depsData }] = await Promise.all([
    supabase.from("tasks").select("*").is("deleted_at", null).order("position").order("created_at", { ascending: false }),
    supabase.from("profiles").select("id, full_name, avatar_url").eq("is_active", true),
    supabase.from("departments").select("id, name, color").order("name"),
  ])

  return (
    <TasksClient
      initialTasks={(tasksData as any[]) ?? []}
      profiles={(profilesData as any[]) ?? []}
      departments={(depsData as any[]) ?? []}
      currentUserId={user.id}
    />
  )
}
