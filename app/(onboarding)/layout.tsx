import type React from "react"

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      {children}
    </div>
  )
}
