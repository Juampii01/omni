"use client"

import { Component, type ReactNode } from "react"
import { AlertCircle, RefreshCw } from "lucide-react"

interface Props {
  children: ReactNode
  tabName?: string
}
interface State {
  hasError: boolean
  error?: Error
}

export class IGTabErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error("[IGTabErrorBoundary]", this.props.tabName, error, info)
  }

  reset = () => {
    this.setState({ hasError: false, error: undefined })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
          <div className="w-12 h-12 rounded-2xl bg-[var(--muted)] flex items-center justify-center">
            <AlertCircle size={20} className="text-[var(--muted-foreground)]" />
          </div>
          <p className="text-sm font-semibold text-[var(--foreground)] mb-1">
            Error al cargar {this.props.tabName ?? "esta sección"}
          </p>
          <p className="text-xs text-[var(--muted-foreground)]">
            {process.env.NODE_ENV === "production" ? "Ocurrió un error inesperado." : this.state.error?.message}
          </p>
          <button
            onClick={this.reset}
            className="flex items-center gap-2 text-xs px-4 py-2 rounded-xl border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
          >
            <RefreshCw size={12} />
            Reintentar
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
