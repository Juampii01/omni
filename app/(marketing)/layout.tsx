import type { ReactNode } from "react"

// Layout público de marketing: SIN sidebar, SIN auth, SIN shell del dashboard.
// Hereda <html>/<body> (dark + fuentes) del root layout. Acá solo el contenedor
// y el scroll suave para los anchors de la landing.
export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <style>{`html { scroll-behavior: smooth; }`}</style>
      <div className="min-h-screen bg-background text-foreground">{children}</div>
    </>
  )
}
