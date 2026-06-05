import "./landing.css"
import type { Metadata } from "next"
import Link from "next/link"
import {
  LayoutDashboard,
  Users,
  MessageCircle,
  MessagesSquare,
  CheckSquare,
  TrendingUp,
  BarChart3,
  Zap,
  Sparkles,
  LayoutGrid,
  ArrowRight,
} from "lucide-react"
import { DemoForm } from "@/components/landing/demo-form"
import { LandingFx } from "@/components/landing/landing-fx"

export const metadata: Metadata = {
  title: "Omni — El sistema operativo de todo tu negocio",
  description:
    "Operación, clientes, conversaciones, equipo, tareas, métricas y automatizaciones en una sola plataforma —con una IA que te dice qué hacer. Tu instancia privada. Agendá una demo.",
  openGraph: {
    title: "Omni — El sistema operativo de todo tu negocio",
    description:
      "Todo tu negocio en un lugar, y una IA que te dice qué hacer con eso. Tu instancia privada. Agendá una demo.",
    type: "website",
    locale: "es_AR",
    siteName: "Omni",
  },
  twitter: { card: "summary_large_image", title: "Omni", description: "El sistema operativo de todo tu negocio." },
}

const MODULES: { n: string; icon: React.ElementType; title: string; text: string; feat?: boolean }[] = [
  { n: "01", icon: Users, title: "Clientes", text: "Ficha viva de cada cliente: historial, estado, resultados y todo lo hablado. El CRM, sin un CRM aparte." },
  { n: "02", icon: MessageCircle, title: "Conversaciones", text: "Bandeja unificada: WhatsApp, Instagram y mail en un solo lugar. Nada se te pasa, nada queda sin responder." },
  { n: "03", icon: MessagesSquare, title: "Equipo & chat interno", text: "Tu equipo coordina adentro de Omni, junto al cliente del que están hablando. Sin saltar a otra app." },
  { n: "04", icon: CheckSquare, title: "Tareas & proyectos", text: "Quién hace qué y para cuándo. Tareas atadas a clientes y a resultados, no perdidas en una planilla." },
  { n: "05", icon: TrendingUp, title: "Leads & pipeline", text: "Cada lead calificado y puntuado automáticamente. Sabés qué seguir hoy y por qué." },
  { n: "06", icon: BarChart3, title: "Métricas & KPIs", text: "Tus números reales en tiempo real. No más planillas que arrastrás a mano cada lunes." },
  { n: "07", icon: LayoutGrid, title: "Contenido & redes", text: "Calendario, ángulos y piezas conectados a las ventas que generan. Sabés qué post trajo plata." },
  { n: "08", icon: Zap, title: "Automatizaciones", text: "Seguimientos, secuencias y disparadores que corren solos mientras vos y tu equipo deciden." },
  { n: "09", icon: Sparkles, title: "Omni Intelligence", text: "La capa que lee todo tu negocio —clientes, equipo, números— y te dice qué hacer a continuación.", feat: true },
]

const TRUST = [
  "CRM",
  "Bandeja de DMs / WhatsApp",
  "Chat del equipo",
  "Gestor de tareas",
  "Planillas de métricas",
  "Calendario de contenido",
  "Automatizaciones",
  "Reportes manuales",
]

export default function LandingPage() {
  return (
    <div className="lp">
      <LandingFx />

      {/* NAV */}
      <nav id="lp-nav">
        <div className="nav-in">
          <a href="#top" className="brand">
            <span className="mark">O</span>Omni
          </a>
          <div className="nav-r">
            <a href="#problema" className="txt">Producto</a>
            <a href="#modulos" className="txt">Todo lo que hace</a>
            <a href="#instancia" className="txt">Tu instancia</a>
            <Link href="/login" className="btn btn-ghost" style={{ padding: "11px 22px" }}>Entrar</Link>
            <a href="#demo" className="btn btn-primary">Agendá una demo <span className="arr">→</span></a>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <header id="top">
        <div className="wrap">
          <span className="eyebrow reveal in">Tu propio sistema operativo</span>
          <h1 className="reveal in d1">
            El sistema operativo de<br />
            <em>todo tu negocio.</em>
          </h1>
          <p className="lede reveal in d2">
            Operación, comunicación con clientes, equipo, tareas, métricas y automatizaciones —el servicio completo, en una
            sola plataforma. Y una capa de inteligencia que no se queda en los números: te dice qué hacer con todo eso.
          </p>
          <div className="hero-cta reveal in d3">
            <a href="#demo" className="btn btn-primary">Agendá una demo <span className="arr">→</span></a>
            <a href="#modulos" className="btn btn-ghost">Ver todo lo que hace</a>
          </div>
          <div className="micro reveal in d4">Una instancia privada. Tu negocio entero. Cero ruido.</div>

          {/* WORKSPACE MOCKUP */}
          <div className="stage reveal in d4">
            <div className="panel">
              <div className="topbar">
                <span className="dot" /><span className="dot" /><span className="dot" />
                <span className="title">omni · tu instancia · hoy</span>
                <span className="live"><span className="pulse" />EQUIPO EN LÍNEA</span>
              </div>
              <div className="dash">
                <aside className="rail">
                  <span className="seg">Operación</span>
                  <a href="#" className="on"><LayoutDashboard className="ic" />Hoy</a>
                  <a href="#"><Users className="ic" />Clientes</a>
                  <a href="#"><MessageCircle className="ic" />Conversaciones<span className="badge">37</span></a>
                  <span className="seg">Equipo</span>
                  <a href="#"><MessagesSquare className="ic" />Chat interno</a>
                  <a href="#"><CheckSquare className="ic" />Tareas<span className="badge">9</span></a>
                  <span className="seg">Crecimiento</span>
                  <a href="#"><TrendingUp className="ic" />Pipeline</a>
                  <a href="#"><BarChart3 className="ic" />Métricas</a>
                  <a href="#"><Zap className="ic" />Automatizaciones</a>
                </aside>
                <div className="main">
                  <div className="kpis">
                    <div className="kpi"><div className="lbl">Conversaciones abiertas</div><div className="val">37</div><div className="chg">12 sin responder · SLA ok</div></div>
                    <div className="kpi"><div className="lbl">Tareas para hoy</div><div className="val">9</div><div className="chg">▲ 4 completadas</div></div>
                    <div className="kpi"><div className="lbl">Cash collected</div><div className="val">$226.900</div><div className="chg">▲ 38% vs. mes ant.</div></div>
                  </div>
                  <div className="lower">
                    <div className="card">
                      <h4>Bandeja unificada <span>clientes · todos los canales</span></h4>
                      <div className="inbox">
                        <div className="msg"><span className="av" style={{ background: "var(--green)" }}>JL</span><div className="mt"><div className="mr"><span className="nm">Josep León</span><span className="tag wa">WhatsApp</span></div><div className="sn">«Perfecto, agendo la sesión del jueves entonces»</div></div><span className="tm">2m</span></div>
                        <div className="msg"><span className="av" style={{ background: "var(--green-soft)" }}>MC</span><div className="mt"><div className="mr"><span className="nm">Mara Castro</span><span className="tag ig">Instagram</span></div><div className="sn">Respondió tu historia: «me interesa, cómo arranco?»</div></div><span className="tm">14m</span></div>
                        <div className="msg"><span className="av" style={{ background: "#8fd7a8" }}>FR</span><div className="mt"><div className="mr"><span className="nm">Fidel R.</span><span className="tag em">Email</span></div><div className="sn">Envió el contrato firmado · onboarding pendiente</div></div><span className="tm">1h</span></div>
                      </div>
                    </div>
                    <div className="card">
                      <h4>Tareas del equipo <span>hoy</span></h4>
                      <div className="tasks">
                        <div className="task done"><span className="cbx done" /><span className="tx">Auditar oferta — cliente nuevo</span><span className="who">Mati</span></div>
                        <div className="task"><span className="cbx" /><span className="tx">Grabar 3 audios de objeciones</span><span className="who">Rama</span></div>
                        <div className="task"><span className="cbx" /><span className="tx">Cargar secuencia de seguimiento</span><span className="who">Nacho</span></div>
                        <div className="task"><span className="cbx" /><span className="tx">Revisar guiones de la semana</span><span className="who">Juani</span></div>
                      </div>
                    </div>
                  </div>
                  <div className="team">
                    <span className="avs"><span style={{ background: "var(--green)" }}>M</span><span style={{ background: "var(--green-soft)" }}>R</span><span style={{ background: "#8fd7a8" }}>N</span><span style={{ background: "#5fc98a" }}>J</span></span>
                    4 del equipo trabajando ahora
                    <span className="who2">última actividad · hace 30s</span>
                  </div>
                  <div className="ai">
                    <div className="glyph">O</div>
                    <div className="body">
                      <div className="t">Qué hacer hoy · Omni Intelligence</div>
                      <p>
                        Tenés <b>12 conversaciones sin responder</b> de leads A — respondé primero a Mara (alta intención). El
                        ángulo <b>«sin lanzamientos»</b> trajo 3× más agendas esta semana: conviene reforzarlo mañana.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* TRUST */}
      <section className="trust wrap">
        <p className="reveal">Un solo sistema reemplaza a</p>
        <div className="strip reveal d1">
          {TRUST.map((t) => (
            <span key={t} className="chip">{t}</span>
          ))}
        </div>
      </section>

      {/* PROBLEMA */}
      <section className="statement" id="problema">
        <div className="wrap">
          <span className="kicker reveal">El problema</span>
          <h2 className="reveal d1">
            Tu negocio está repartido<br />en <em>ocho herramientas.</em>
          </h2>
          <p className="sub reveal d2">
            El CRM por un lado, las métricas por otro, el contenido en otro lado, las redes aparte. Las charlas con clientes en
            un chat, las del equipo en otro, las tareas en una planilla. Nadie cruza los datos. Terminás con mil números y cero
            claridad sobre qué hacer.
          </p>
        </div>
      </section>

      <div className="rule reveal" />

      {/* SOLUCIÓN */}
      <section className="statement" id="solucion">
        <div className="wrap">
          <span className="kicker reveal">La solución</span>
          <h2 className="reveal d1">
            Todo el negocio en un lugar.<br />Y algo que te dice <em>qué hacer.</em>
          </h2>
          <p className="sub reveal d2">
            Omni junta clientes, conversaciones, equipo, tareas, leads, métricas, KPIs, contenido, redes y automatizaciones.
            Dejás de saltar entre pestañas y empezás a operar tu negocio entero desde un solo lugar.
          </p>
        </div>
      </section>

      {/* MODULES */}
      <section className="modules wrap" id="modulos">
        <div className="sec-head reveal">
          <h3>Una plataforma. <em>El negocio completo.</em></h3>
          <p>
            No es un dashboard. Es el back-office entero: operás, te comunicás, coordinás al equipo, hacés seguimiento y medís
            —todo conectado al mismo dato, sin exportar ni copiar y pegar.
          </p>
        </div>
        <div className="grid">
          {MODULES.map(({ n, icon: Icon, title, text, feat }, i) => (
            <div key={n} className={`cell reveal${feat ? " feat" : ""}${i % 3 === 1 ? " d1" : i % 3 === 2 ? " d2" : ""}`}>
              <span className="num">{n}</span>
              <div className="ico" style={feat ? { borderColor: "rgba(68,240,140,.5)" } : undefined}>
                <Icon size={20} />
              </div>
              <h5>{title}</h5>
              <p>{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* STATS */}
      <section className="stats wrap">
        <div className="stats-in reveal">
          <div className="stat"><div className="n"><em>8</em>→1</div><div className="d">herramientas reemplazadas por un solo sistema</div></div>
          <div className="stat"><div className="n"><em>1</em></div><div className="d">lugar para clientes, equipo, tareas y datos</div></div>
          <div className="stat"><div className="n"><em>0</em></div><div className="d">pestañas y planillas que mantener a mano</div></div>
          <div className="stat"><div className="n">24<em>/</em>7</div><div className="d">tu instancia siempre corriendo, solo para vos</div></div>
        </div>
      </section>

      {/* TU INSTANCIA */}
      <section className="statement" id="instancia">
        <div className="wrap">
          <span className="kicker reveal">Tu instancia</span>
          <h2 className="reveal d1">
            No compartís Omni<br />con nadie. <em>Es tuyo.</em>
          </h2>
          <p className="sub reveal d2">
            Cada negocio corre en una instancia dedicada y privada. Tus clientes, tus conversaciones, tu equipo y tus números
            viven en tu propio espacio —aislado, seguro y configurado a la medida de cómo trabajás.
          </p>
        </div>
      </section>

      {/* CTA + FORM */}
      <section className="cta" id="demo">
        <div className="ring" />
        <div className="wrap">
          <h2 className="reveal">
            Operá todo tu negocio<br />desde <em>un solo lugar.</em>
          </h2>
          <p className="reveal d1">
            Agendá una demo de 20 minutos y te mostramos tu negocio entero adentro de Omni —con tus clientes, tu equipo y tus
            datos en una sola pantalla.
          </p>
          <div className="form-wrap reveal d2">
            <DemoForm />
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer>
        <div className="wrap">
          <div className="foot">
            <div>
              <a href="#top" className="brand"><span className="mark">O</span>Omni</a>
              <p className="tag2">
                El sistema operativo de todo tu negocio. Operá, comunicáte, coordiná y medí —todo en un lugar, y algo que te
                dice qué hacer con eso.
              </p>
            </div>
            <div className="foot-cols">
              <div className="fcol"><h6>Producto</h6><a href="#modulos">Todo lo que hace</a><a href="#problema">Cómo funciona</a><a href="#instancia">Tu instancia</a><a href="#demo">Demo</a></div>
              <div className="fcol"><h6>Empresa</h6><Link href="/privacy">Privacidad</Link><a href="#demo">Contacto</a></div>
              <div className="fcol"><h6>Cuenta</h6><Link href="/login">Entrar</Link><a href="#demo">Agendá una demo</a></div>
            </div>
          </div>
          <div className="copy">
            <span>© {new Date().getFullYear()} Omni — Tu propio sistema operativo.</span>
            <span>Hecho para operar tu negocio, no para juntar pestañas.</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
