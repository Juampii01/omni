import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Providers } from "./providers"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
})

export const metadata: Metadata = {
  title: {
    default: "Omni",
    template: "%s — Omni",
  },
  description: "Sistema operativo interno para founders que escalan.",
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={`${inter.variable} h-full`} suppressHydrationWarning>
      <body className="min-h-full bg-background font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
