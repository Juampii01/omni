import type { ReactNode } from "react"
import { Fraunces, Hanken_Grotesk, JetBrains_Mono } from "next/font/google"

// Fuentes propias de la landing (scopeadas a marketing — no tocan el producto).
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
  display: "swap",
})
const hanken = Hanken_Grotesk({
  subsets: ["latin"],
  variable: "--font-hanken",
  weight: ["400", "500", "600", "700"],
  display: "swap",
})
const jbMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jbmono",
  weight: ["400", "500"],
  display: "swap",
})

// Layout público de marketing: SIN sidebar, SIN auth, SIN shell del dashboard.
export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <style>{`html { scroll-behavior: smooth; }`}</style>
      <div className={`${fraunces.variable} ${hanken.variable} ${jbMono.variable}`}>{children}</div>
    </>
  )
}
