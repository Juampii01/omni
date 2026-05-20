import type React from "react"

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left panel — brand */}
      <div className="hidden lg:flex flex-col justify-between p-12 bg-brand text-brand-foreground">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-brand-foreground/20 flex items-center justify-center">
            <span className="text-sm font-bold text-brand-foreground">O</span>
          </div>
          <span className="text-lg font-semibold">Omni</span>
        </div>

        <div>
          <blockquote className="space-y-3">
            <p className="text-xl font-medium leading-relaxed text-brand-foreground/90">
              "El sistema operativo que mi empresa necesitaba desde hace años. Todo centralizado, todo claro."
            </p>
            <footer className="text-sm text-brand-foreground/60">
              — Founder, empresa de consultoría
            </footer>
          </blockquote>
        </div>

        <div className="text-xs text-brand-foreground/40">
          © {new Date().getFullYear()} Nova Softwares
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-10 lg:hidden">
            <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center">
              <span className="text-sm font-bold text-brand-foreground">O</span>
            </div>
            <span className="text-lg font-semibold">Omni</span>
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}
