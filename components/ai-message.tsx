import { cn } from "@/lib/utils"

// ── Simple markdown renderer (no external deps) ───────────────────────────────
// Handles: **bold**, *italic*, `code`, ```blocks```, - lists, ## headings, \n\n paragraphs

interface Part {
  type: "text" | "bold" | "italic" | "code"
  content: string
}

function parseInline(text: string): Part[] {
  const parts: Part[] = []
  // Regex: bold (**), italic (*), inline code (`)
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|`([^`]+)`)/g
  let last = 0
  let match: RegExpExecArray | null

  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) {
      parts.push({ type: "text", content: text.slice(last, match.index) })
    }
    if (match[2] !== undefined) parts.push({ type: "bold",   content: match[2] })
    else if (match[3] !== undefined) parts.push({ type: "italic", content: match[3] })
    else if (match[4] !== undefined) parts.push({ type: "code",   content: match[4] })
    last = match.index + match[0].length
  }

  if (last < text.length) parts.push({ type: "text", content: text.slice(last) })
  return parts
}

function InlineParts({ text }: { text: string }) {
  const parts = parseInline(text)
  return (
    <>
      {parts.map((p, i) => {
        if (p.type === "bold")   return <strong key={i} className="font-semibold">{p.content}</strong>
        if (p.type === "italic") return <em key={i}>{p.content}</em>
        if (p.type === "code")   return <code key={i} className="bg-black/10 dark:bg-white/10 px-1 py-0.5 rounded text-[0.8em] font-mono">{p.content}</code>
        return <span key={i}>{p.content}</span>
      })}
    </>
  )
}

export function AiMessage({ content, isUser }: { content: string; isUser: boolean }) {
  if (!content) return null

  // Split into blocks by double newline
  const rawBlocks = content.split(/\n{2,}/)

  const blocks: React.ReactNode[] = []

  rawBlocks.forEach((block, bi) => {
    // Code fence
    if (block.startsWith("```")) {
      const lines = block.split("\n")
      const lang = lines[0].replace("```", "").trim()
      const code = lines.slice(1).filter(l => !l.startsWith("```")).join("\n")
      blocks.push(
        <pre key={bi} className="bg-black/10 dark:bg-white/10 rounded-lg p-3 my-1 overflow-x-auto text-[0.78em] font-mono whitespace-pre-wrap">
          {lang && <span className="opacity-50 text-[10px] uppercase tracking-wider block mb-1">{lang}</span>}
          {code}
        </pre>
      )
      return
    }

    // Heading
    const headingMatch = block.match(/^(#{1,3})\s+(.+)/)
    if (headingMatch) {
      const level = headingMatch[1].length
      const text = headingMatch[2]
      const cls = level === 1 ? "text-base font-bold mt-2" : level === 2 ? "text-sm font-bold mt-1.5" : "text-sm font-semibold mt-1"
      blocks.push(<p key={bi} className={cls}><InlineParts text={text} /></p>)
      return
    }

    // Horizontal rule
    if (block.trim() === "---" || block.trim() === "***") {
      blocks.push(<hr key={bi} className="border-current opacity-20 my-2" />)
      return
    }

    // List block (lines starting with - or • or *)
    const lines = block.split("\n")
    const isListBlock = lines.every(l => /^[\-\*•]\s/.test(l.trim()) || l.trim() === "")

    if (isListBlock) {
      const items = lines.filter(l => /^[\-\*•]\s/.test(l.trim()))
      blocks.push(
        <ul key={bi} className="space-y-1 my-1 pl-1">
          {items.map((item, ii) => {
            const text = item.replace(/^[\-\*•]\s+/, "")
            return (
              <li key={ii} className="flex gap-2 text-sm leading-relaxed">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-current shrink-0 opacity-60" />
                <span><InlineParts text={text} /></span>
              </li>
            )
          })}
        </ul>
      )
      return
    }

    // Numbered list
    const isNumbered = lines.every(l => /^\d+\.\s/.test(l.trim()) || l.trim() === "")
    if (isNumbered) {
      const items = lines.filter(l => /^\d+\.\s/.test(l.trim()))
      blocks.push(
        <ol key={bi} className="space-y-1 my-1 pl-1 list-none">
          {items.map((item, ii) => {
            const text = item.replace(/^\d+\.\s+/, "")
            return (
              <li key={ii} className="flex gap-2 text-sm leading-relaxed">
                <span className="shrink-0 font-semibold opacity-70 tabular-nums min-w-[1.2em]">{ii + 1}.</span>
                <span><InlineParts text={text} /></span>
              </li>
            )
          })}
        </ol>
      )
      return
    }

    // Mixed block: some list lines, some text — just render each line
    if (lines.length > 1) {
      blocks.push(
        <div key={bi} className="space-y-0.5">
          {lines.map((line, li) => {
            if (!line.trim()) return <br key={li} />
            if (/^[\-\*•]\s/.test(line.trim())) {
              return (
                <p key={li} className="flex gap-2 text-sm leading-relaxed">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-current shrink-0 opacity-60" />
                  <span><InlineParts text={line.replace(/^[\-\*•]\s+/, "")} /></span>
                </p>
              )
            }
            return <p key={li} className="text-sm leading-relaxed"><InlineParts text={line} /></p>
          })}
        </div>
      )
      return
    }

    // Default: paragraph
    const text = block.trim()
    if (text) {
      blocks.push(
        <p key={bi} className="text-sm leading-relaxed">
          <InlineParts text={text} />
        </p>
      )
    }
  })

  return (
    <div className={cn("space-y-1.5", isUser && "text-right")}>
      {blocks}
    </div>
  )
}
