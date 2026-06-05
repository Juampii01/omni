import type { Metadata } from "next"
import Link from "next/link"
import {
  BrainCircuit,
  Users,
  Contact,
  BarChart2,
  Gauge,
  FileEdit,
  Instagram,
  Target,
  Rocket,
  Zap,
  Sparkles,
  Layers,
  ArrowRight,
  Building2,
  User,
  Store,
  Check,
} from "lucide-react"
import { DemoForm } from "@/components/landing/demo-form"
import { Faq } from "@/components/landing/faq"

export const metadata: Metadata = {
  title: "Omni — Tu propio sistema operativo de negocio, con IA que te aconseja",
  description:
    "Omni unifica clientes, leads, métricas, contenido y redes en una sola plataforma —con tu marca, tu dominio, tu instancia. Y una IA que lee tus números y te dice el próximo paso.",
  openGraph: {
    title: "Omni — Tu propio sistema operativo, con IA que te aconseja",
    description:
      "Clientes, leads, métricas, contenido y redes en un solo lugar. Tu marca, tu dominio, tu instancia. Agendá una demo.",
    type: "website",
    locale: "es_AR",
    siteName: "Omni",
  },
  twitter: { card: "summary_large_image", title: "Omni", description: "Tu propio sistema operativo, con IA que te aconseja." },
}

const MODULES: { icon: React.ElementType; label: string }[] = [
  { icon: BrainCircuit, label: "Inteligencia" },
  { icon: Users, label: "Clientes" },
  { icon: Contact, label: "Leads" },
  { icon: BarChart2, label: "Métricas" },
  { icon: Gauge, label: "KPIs" },
  { icon: FileEdit, label: "Contenido" },
  { icon: Instagram, label: "Social" },
  { icon: Target, label: "Estrategia" },
  { icon: Rocket, label: "Lanzamientos" },
  { icon: Zap, label: "Automatizaciones" },
]

const STEPS = [
  { n: "1", t: "Agendás una demo y entendemos tu negocio." },
  { n: "2", t: "Configuramos tu instancia con tu marca y tu dominio." },
  { n: "3", t: "Empezás a operar, con acompañamiento y soporte." },
]

const AUDIENCE: { icon: React.ElementType; title: string; text: string }[] = [
  {
    icon: User,
    title: "Founders / emprendedores",
    text: "Dejá de improvisar. Tu negocio entero a la vista y una IA que te marca el rumbo.",
  },
  {
    icon: Building2,
    title: "Agencias",
    text: "Operá a todos tus clientes desde un solo lugar —y ofrecé un sistema con tu propia marca.",
  },
  {
    icon: Store,
    title: "PyMEs",
    text: "Unificá lo que hoy tenés en planillas y herramientas sueltas, sin perder el control.",
  },
]

const CTA_PRIMARY =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-6 py-3 text-sm font-semibold text-brand-foreground transition-opacity hover:opacity-90"
const CTA_SECONDARY =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--border)] px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-[var(--muted)]"

export default function LandingPage() {
  return (
    <main>
      {/* ── Nav ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand text-brand-foreground font-bold">O</div>
            <span className="font-serif text-lg text-foreground">Omni</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              Entrar
            </Link>
            <a href="#demo" className={CTA_PRIMARY + " !px-4 !py-2"}>
              Agendá una demo
            </a>
          </div>
        </div>
      </header>

      {/* ── 1. Hero ─────────────────────────────────────── */}
      <section className="relative overflow-hidden px-5 py-24 sm:py-32">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_50%_at_50%_0%,hsl(var(--brand)/0.18),transparent)]" />
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--card)] px-3 py-1 text-xs text-muted-foreground">
            <Sparkles size={12} className="text-brand" /> Tu sistema operativo de negocio
          </span>
          <h1 className="mt-6 font-serif text-4xl leading-[1.1] text-foreground sm:text-6xl">
            No es otro dashboard. Es tu propio sistema operativo —
            <span className="text-brand"> con IA que te aconseja.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Omni unifica clientes, leads, métricas, contenido y redes en una sola plataforma. Con tu marca, tu dominio, tu
            instancia. Y una inteligencia que lee tus números y te dice el próximo paso.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a href="#demo" className={CTA_PRIMARY}>
              Agendá una demo <ArrowRight size={16} />
            </a>
            <a href="#como-funciona" className={CTA_SECONDARY}>
              Ver cómo funciona
            </a>
          </div>
        </div>
      </section>

      {/* ── 2-3-4-5. Narrativa ──────────────────────────── */}
      <div className="mx-auto max-w-5xl space-y-16 px-5 py-12 sm:space-y-24">
        <Story
          kicker="El problema"
          title="Tu negocio está repartido en ocho herramientas."
          text="El CRM por un lado, las métricas por otro, el contenido en otro lado, las redes aparte. Nadie cruza los datos. Terminás con mil números y cero claridad sobre qué hacer."
        />
        <Story
          kicker="La solución"
          title="Todo en un solo lugar. Y algo que te dice qué hacer con eso."
          text="Omni junta clientes, leads, métricas, KPIs, contenido, redes y automatizaciones. Dejás de saltar entre pestañas y empezás a tomar decisiones."
        />
        <Story
          kicker="Tu instancia"
          title="No compartís Omni con nadie. Es tuyo."
          text="La mayoría de los SaaS te meten en una base compartida con miles de usuarios. Omni no: cada cliente tiene su propia instancia —tu dominio, tu marca, tus datos aislados. Es tu sistema, no un inquilino más en el de otro."
        />
        <Story
          icon={Sparkles}
          kicker="La IA que aconseja"
          title="Una IA que entiende tu negocio, no un chatbot genérico."
          text="Omni lee tus KPIs reales —ventas, leads, engagement, contenido— y te da contexto y recomendaciones concretas. No te pregunta '¿en qué te ayudo?'. Te dice 'tus reels bajaron 30% esta semana, conviene reforzar X'."
        />
      </div>

      {/* ── 6. Módulos ──────────────────────────────────── */}
      <section className="px-5 py-16">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-2 text-center font-serif text-3xl text-foreground">Un módulo para cada parte de tu negocio.</h2>
          <p className="mx-auto mb-10 max-w-xl text-center text-sm text-muted-foreground">
            Todo conectado, todo bajo la misma marca.
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {MODULES.map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-3.5"
              >
                <Icon size={18} className="text-brand" />
                <span className="text-sm font-medium text-foreground">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 7. Cómo funciona ────────────────────────────── */}
      <section id="como-funciona" className="px-5 py-16">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-3 text-center font-serif text-3xl text-foreground">Cómo funciona</h2>
          <p className="mx-auto mb-12 max-w-xl text-center text-sm text-muted-foreground">
            Setup acompañado, de punta a punta. No es self-serve: lo armamos con vos.
          </p>
          <div className="grid gap-6 sm:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n} className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6">
                <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-full bg-brand/15 font-serif text-lg text-brand">
                  {s.n}
                </div>
                <p className="text-sm leading-relaxed text-foreground">{s.t}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 8. ¿Para quién es? ──────────────────────────── */}
      <section className="px-5 py-16">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-10 text-center font-serif text-3xl text-foreground">¿Para quién es Omni?</h2>
          <div className="grid gap-5 sm:grid-cols-3">
            {AUDIENCE.map(({ icon: Icon, title, text }) => (
              <div key={title} className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-brand/15">
                  <Icon size={18} className="text-brand" />
                </div>
                <h3 className="mb-2 font-serif text-lg text-foreground">{title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 9. Prueba social (placeholder) ──────────────── */}
      <section className="px-5 py-16">
        <div className="mx-auto max-w-5xl">
          <p className="mb-8 text-center text-xs uppercase tracking-wider text-muted-foreground">
            Negocios que ya operan con Omni
          </p>
          <div className="mb-12 flex flex-wrap items-center justify-center gap-x-10 gap-y-4 opacity-40">
            {["LOGO", "LOGO", "LOGO", "LOGO", "LOGO"].map((l, i) => (
              <div key={i} className="font-serif text-lg text-muted-foreground">
                {l}
              </div>
            ))}
          </div>
          <div className="grid gap-5 sm:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6">
                <p className="mb-5 text-sm leading-relaxed text-muted-foreground">
                  &ldquo;Testimonio pendiente — placeholder listo para completar con una cita real del cliente.&rdquo;
                </p>
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-[var(--muted)]" />
                  <div>
                    <div className="text-sm font-medium text-foreground">Nombre Apellido</div>
                    <div className="text-xs text-muted-foreground">Cargo · Empresa</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 10. CTA final + form ────────────────────────── */}
      <section id="demo" className="scroll-mt-20 px-5 py-20">
        <div className="mx-auto grid max-w-5xl items-center gap-10 lg:grid-cols-2">
          <div>
            <h2 className="font-serif text-3xl text-foreground sm:text-4xl">¿Listo para tener tu propio sistema?</h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              Agendá una demo. Entendemos tu negocio y te mostramos cómo se vería Omni con tu marca y tus datos.
            </p>
            <ul className="mt-6 space-y-2.5">
              {["Tu instancia, tu dominio, tu marca", "Datos aislados —no compartís base", "IA que lee tus KPIs y te recomienda", "Setup acompañado, con soporte"].map(
                (b) => (
                  <li key={b} className="flex items-center gap-2 text-sm text-foreground">
                    <Check size={15} className="flex-shrink-0 text-brand" /> {b}
                  </li>
                ),
              )}
            </ul>
          </div>
          <DemoForm />
        </div>
      </section>

      {/* ── 11. FAQ ─────────────────────────────────────── */}
      <section className="px-5 pb-24">
        <h2 className="mb-10 text-center font-serif text-3xl text-foreground">Preguntas frecuentes</h2>
        <Faq />
      </section>

      {/* ── Footer ──────────────────────────────────────── */}
      <footer className="border-t border-[var(--border)] px-5 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-brand text-brand-foreground text-xs font-bold">O</div>
            <span className="font-serif text-foreground">Omni</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#demo" className="transition-colors hover:text-foreground">Agendá una demo</a>
            <Link href="/privacy" className="transition-colors hover:text-foreground">Privacidad</Link>
            <Link href="/login" className="transition-colors hover:text-foreground">Entrar</Link>
          </div>
        </div>
        <p className="mx-auto mt-6 max-w-6xl text-center text-xs text-muted-foreground sm:text-left">
          © {new Date().getFullYear()} Omni. Tu sistema, tu marca, tus datos.
        </p>
      </footer>
    </main>
  )
}

// Sección narrativa reutilizable (problema / solución / diferenciador / IA)
function Story({ kicker, title, text, icon: Icon }: { kicker: string; title: string; text: string; icon?: React.ElementType }) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      <span className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-brand">
        {Icon && <Icon size={13} />} {kicker}
      </span>
      <h2 className="mt-3 font-serif text-3xl leading-tight text-foreground sm:text-4xl">{title}</h2>
      <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">{text}</p>
    </div>
  )
}
