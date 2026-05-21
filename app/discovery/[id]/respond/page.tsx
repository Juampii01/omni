import { createServiceClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { RespondClient } from "./respond-client"

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props) {
  const { id } = await params
  const supabase = await createServiceClient()
  const { data } = await (supabase as any)
    .from("discovery_forms")
    .select("title")
    .eq("id", id)
    .eq("is_active", true)
    .single()
  return { title: data?.title ?? "Formulario" }
}

export default async function RespondPage({ params }: Props) {
  const { id } = await params
  const supabase = await createServiceClient()

  const { data: form } = await (supabase as any)
    .from("discovery_forms")
    .select("id, title, description, questions, is_active")
    .eq("id", id)
    .eq("is_active", true)
    .single()

  if (!form) notFound()

  return <RespondClient form={form} />
}
