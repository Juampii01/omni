"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useCreateBlockNote } from "@blocknote/react"
import { BlockNoteView } from "@blocknote/mantine"
import { useTheme } from "next-themes"
import { ChevronDown, ChevronRight, FileText, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { fetchWithAuth } from "@/lib/api-client"
import { Skeleton } from "@/components/ui/skeleton"
import "@blocknote/core/fonts/inter.css"
import "@blocknote/mantine/style.css"

type Page = {
  id: string
  parent_id: string | null
  title: string
  icon: string | null
  content: any[]
  sort_order: number
}

type TreeNode = { page: Page; children: TreeNode[] }

function buildTree(pages: Page[]): TreeNode[] {
  const byParent = new Map<string, Page[]>()
  for (const p of pages) {
    const key = p.parent_id ?? "__root__"
    if (!byParent.has(key)) byParent.set(key, [])
    byParent.get(key)!.push(p)
  }
  for (const list of byParent.values()) list.sort((a, b) => a.sort_order - b.sort_order)
  const build = (p: Page): TreeNode => ({ page: p, children: (byParent.get(p.id) ?? []).map(build) })
  return (byParent.get("__root__") ?? []).map(build)
}

function TreeRow({
  node,
  depth,
  selectedId,
  onSelect,
  onAddChild,
  onDelete,
}: {
  node: TreeNode
  depth: number
  selectedId: string | null
  onSelect: (id: string) => void
  onAddChild: (parentId: string) => void
  onDelete: (id: string) => void
}) {
  const [expanded, setExpanded] = useState(true)
  const hasChildren = node.children.length > 0
  const isSelected = selectedId === node.page.id

  return (
    <div>
      <div
        onClick={() => onSelect(node.page.id)}
        style={{ paddingLeft: `${8 + depth * 14}px` }}
        className={`group flex cursor-pointer items-center gap-1.5 rounded-lg py-1.5 pr-2 text-sm ${
          isSelected ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50"
        }`}
      >
        <button
          onClick={(e) => {
            e.stopPropagation()
            setExpanded((v) => !v)
          }}
          className={`shrink-0 ${hasChildren ? "" : "invisible"}`}
        >
          {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        </button>
        <span className="shrink-0">{node.page.icon || <FileText className="h-3.5 w-3.5" />}</span>
        <span className="flex-1 truncate">{node.page.title}</span>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onAddChild(node.page.id)
          }}
          className="hidden shrink-0 text-sidebar-foreground/40 hover:text-sidebar-foreground group-hover:block"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDelete(node.page.id)
          }}
          className="hidden shrink-0 text-sidebar-foreground/40 hover:text-destructive group-hover:block"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      {expanded && hasChildren && (
        <div>
          {node.children.map((child) => (
            <TreeRow key={child.page.id} node={child} depth={depth + 1} selectedId={selectedId} onSelect={onSelect} onAddChild={onAddChild} onDelete={onDelete} />
          ))}
        </div>
      )}
    </div>
  )
}

function DocEditor({ page, onSave }: { page: Page; onSave: (content: any[]) => void }) {
  const { resolvedTheme } = useTheme()
  const editor = useCreateBlockNote({
    initialContent: page.content && page.content.length > 0 ? page.content : undefined,
  })
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return editor.onChange(() => {
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => onSave(editor.document), 800)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor])

  return <BlockNoteView editor={editor} theme={resolvedTheme === "dark" ? "dark" : "light"} />
}

export default function DocsPage() {
  const [pages, setPages] = useState<Page[] | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  async function load() {
    const res = await fetchWithAuth("/api/omni/docs")
    const data = await res.json()
    const list = (data.pages ?? []) as Page[]
    setPages(list)
    if (!selectedId && list.length > 0) setSelectedId(list[0].id)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const tree = useMemo(() => buildTree(pages ?? []), [pages])
  const selected = pages?.find((p) => p.id === selectedId) ?? null

  async function handleAddRoot() {
    const res = await fetchWithAuth("/api/omni/docs", { method: "POST", body: JSON.stringify({ title: "Nueva página" }) })
    const data = await res.json()
    if (data.page) {
      setPages((prev) => [...(prev ?? []), data.page])
      setSelectedId(data.page.id)
    }
  }

  async function handleAddChild(parentId: string) {
    const res = await fetchWithAuth("/api/omni/docs", { method: "POST", body: JSON.stringify({ title: "Nueva página", parentId }) })
    const data = await res.json()
    if (data.page) {
      setPages((prev) => [...(prev ?? []), data.page])
      setSelectedId(data.page.id)
    }
  }

  async function handleDelete(id: string) {
    await fetchWithAuth(`/api/omni/docs/${id}`, { method: "DELETE" })
    setPages((prev) => (prev ?? []).filter((p) => p.id !== id && p.parent_id !== id))
    if (selectedId === id) setSelectedId(null)
    toast.success("Página eliminada")
  }

  async function handleTitleChange(id: string, title: string) {
    setPages((prev) => (prev ?? []).map((p) => (p.id === id ? { ...p, title } : p)))
    await fetchWithAuth(`/api/omni/docs/${id}`, { method: "PATCH", body: JSON.stringify({ title }) })
  }

  async function handleContentSave(id: string, content: any[]) {
    await fetchWithAuth(`/api/omni/docs/${id}`, { method: "PATCH", body: JSON.stringify({ content }) })
  }

  if (pages === null) {
    return (
      <div className="flex gap-6">
        <Skeleton className="h-96 w-64 rounded-2xl" />
        <Skeleton className="h-96 flex-1 rounded-2xl" />
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-6">
      <aside className="w-64 shrink-0 space-y-1 overflow-y-auto rounded-2xl border border-border/60 bg-card p-3">
        <div className="mb-2 flex items-center justify-between px-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Documentos</p>
          <button onClick={handleAddRoot} className="text-muted-foreground hover:text-foreground">
            <Plus className="h-4 w-4" />
          </button>
        </div>
        {tree.map((node) => (
          <TreeRow key={node.page.id} node={node} depth={0} selectedId={selectedId} onSelect={setSelectedId} onAddChild={handleAddChild} onDelete={handleDelete} />
        ))}
        {tree.length === 0 && <p className="px-2 text-xs text-muted-foreground">Sin páginas todavía.</p>}
      </aside>

      <div className="flex-1 overflow-y-auto rounded-2xl border border-border/60 bg-card p-6">
        {selected ? (
          <div className="mx-auto max-w-3xl">
            <input
              value={selected.title}
              onChange={(e) => handleTitleChange(selected.id, e.target.value)}
              className="w-full bg-transparent font-heading text-3xl outline-none"
            />
            <div className="mt-6">
              <DocEditor key={selected.id} page={selected} onSave={(content) => handleContentSave(selected.id, content)} />
            </div>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Seleccioná o creá una página.
          </div>
        )}
      </div>
    </div>
  )
}
