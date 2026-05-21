"use client"

import { useEffect } from "react"

interface Props {
  error: Error & { digest?: string }
  reset: () => void
}

// global-error.tsx es el último fallback de Next.js.
// Debe incluir <html> y <body>. NO depender de Tailwind
// por si el CSS global tampoco cargó.
export default function GlobalError({ error, reset }: Props) {
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.error("[Global Error Boundary]", error)
    }
  }, [error])

  return (
    <html lang="es">
      <body
        style={{
          margin: 0,
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          backgroundColor: "#fafafa",
          color: "#0a0a0a",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          padding: "1.5rem",
          boxSizing: "border-box",
        }}
      >
        <div style={{ textAlign: "center", maxWidth: 400 }}>
          {/* Icon */}
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              backgroundColor: "#fef2f2",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 1.5rem",
            }}
          >
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#dc2626"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>

          <h1 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "0.5rem" }}>
            Error crítico
          </h1>
          <p style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "1.5rem", lineHeight: 1.6 }}>
            La aplicación encontró un error grave. Intentá recargar la página.
          </p>

          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center" }}>
            <button
              onClick={reset}
              style={{
                padding: "0.5rem 1.25rem",
                borderRadius: 8,
                border: "1px solid #e5e7eb",
                backgroundColor: "#fff",
                cursor: "pointer",
                fontSize: "0.875rem",
                fontWeight: 500,
              }}
            >
              Intentar de nuevo
            </button>
            <button
              onClick={() => { window.location.href = "/" }}
              style={{
                padding: "0.5rem 1.25rem",
                borderRadius: 8,
                border: "none",
                backgroundColor: "#236461",
                color: "#fff",
                cursor: "pointer",
                fontSize: "0.875rem",
                fontWeight: 500,
              }}
            >
              Ir al inicio
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
