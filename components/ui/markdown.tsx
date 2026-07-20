import ReactMarkdown from "react-markdown"

export function Markdown({ children }: { children: string }) {
  return (
    <ReactMarkdown
      components={{
        p: (props) => <p className="mt-2 first:mt-0" {...props} />,
        h1: (props) => <p className="mt-3 text-sm font-semibold first:mt-0" {...props} />,
        h2: (props) => <p className="mt-3 text-sm font-semibold first:mt-0" {...props} />,
        h3: (props) => <p className="mt-3 text-sm font-semibold first:mt-0" {...props} />,
        strong: (props) => <strong className="font-semibold" {...props} />,
        ul: (props) => <ul className="mt-2 list-disc space-y-1 pl-4 first:mt-0" {...props} />,
        ol: (props) => <ol className="mt-2 list-decimal space-y-1 pl-4 first:mt-0" {...props} />,
      }}
    >
      {children}
    </ReactMarkdown>
  )
}
