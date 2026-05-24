# AUDIT.md — Omni v1.0
> Generado: 24 mayo 2026 | Auditor: Claude Code

---

## 1. ESTADO ACTUAL DEL REPO

### Stack real (vs spec)
| Item | Spec dice | Realidad | Acción |
|---|---|---|---|
| Next.js | "15" | **16.2.6** | ✅ Ok, ignorar el typo |
| ORM | Prisma schema | **SQL puro + Supabase JS** | ⚠️ NO introducir Prisma |
| TypeScript | strict, sin `any` | `sb = supabase as any` establecido | ⚠️ Mantener patrón |
| Auth | Supabase Auth | ✅ Completo (roles, middleware, profiles) | — |
| RLS | Habilitado en todas | ✅ Habilitado en todas las tablas | — |
| Dark theme | #080808 + #22c55e | ✅ forcedTheme="dark" | — |
| Encryption | AES-256-GCM | ✅ lib/crypto.ts funcional | — |

---

## 2. BASE DE DATOS — ESTADO REAL vs SPEC

### Tablas existentes (confirmadas en producción hoy)
```
AUTENTICACIÓN     profiles, departments, integrations, audit_logs
NEGOCIO           client_settings, clients (012), leads, lead_activities
FINANZAS          revenue_records, expense_records, kpis
CONTENIDO         content_pieces, competitors, competitor_snapshots, business_docs
INSTAGRAM         instagram_accounts, instagram_media, instagram_media_insights,
                  instagram_account_insights, instagram_comments, instagram_webhooks_log
COMUNICACIÓN      channels, channel_members, messages, announcements
IA                ai_conversations, ai_messages, research_requests, ai_diagnoses,
                  client_strategies
OPERACIONES       tasks, team_members
LANZAMIENTOS      launches, launch_participants
AUTOMATIZACIONES  automations, automation_executions
DISCOVERY         discovery_forms, discovery_responses
ADS               meta_ads_snapshots, manychat_snapshots
```

### Tablas FALTANTES (requieren migración 014)
| Tabla | Para qué | Prioridad |
|---|---|---|
| `contacts` | Contactos múltiples por cliente (Ann, Cristián+Santo) | 🔴 CRÍTICA |
| `instagram_publish_queue` | Publisher — programar posts | 🟡 Alta |
| `instagram_conversations` | Inbox DMs | 🟡 Alta |
| `instagram_messages` | Mensajes de DMs | 🟡 Alta |

### Columnas FALTANTES en `clients`
La tabla existe (migración 012) pero le faltan:
- `health_score int default 80`
- `slack_channel text`
- `industry text`
- `parent_client_id uuid references clients(id)`
- `setup_paid numeric(10,2)`

---

## 3. RUTAS — QUÉ EXISTE vs QUÉ FALTA

### ✅ Módulos con UI real implementada
| Ruta | Estado | Notas |
|---|---|---|
| `/` | ✅ Dashboard funcional | Widgets con kpis, leads, tasks |
| `/clients` | ✅ Lista + add/edit | Falta: health score, contacts, detail page |
| `/crm` | ✅ Pipeline Kanban completo | — |
| `/tasks` | ✅ Lista + Kanban + Calendar | — |
| `/metrics` | ✅ Revenue + Expenses + KPIs | Recharts funcional |
| `/research` | ✅ AI Research + historial | Streaming con Claude |
| `/strategy` | ✅ CoachMap 7 outputs | Genera con Claude |
| `/launches` | ✅ CRUD completo | Lista + participantes |
| `/team` | ✅ UI básica | Sin datos reales |
| `/settings/*` | ✅ Profile + branding + billing | — |
| `/socials/instagram` | ✅ Connect + Analytics | Media grid, insights |

### 🔴 Módulos que son `<ComingSoon>` placeholder
| Ruta | Lo que necesita |
|---|---|
| `/automations` | UI completa con los 4 workflows activos |
| `/ads`, `/ads/meta`, `/ads/google` | Placeholders visuales (sin API todavía) |
| `/mobile` | Baja prioridad |

### 🟡 Módulos parciales — necesitan trabajo significativo
| Ruta | Qué falta |
|---|---|
| `/content` | **Carousel Studio: NO existe** — solo "carousel" como enum de formato. Hay que construirlo. |
| `/socials/instagram` | **Publisher UI** (crear/programar posts) + **Inbox UI** (DMs + comments) |

---

## 4. INSTAGRAM — GAPS ESPECÍFICOS

### ✅ Ya construido
- OAuth flow completo (start → callback → long-lived token → AES-256-GCM encrypt)
- Sync: profile, últimos 25 posts, media insights, 30 días account metrics
- Webhook endpoint + procesamiento async
- Cron diario (8am UTC)
- UI: AccountHeader, MediaGrid, InsightsChart

### ❌ Falta construir
| Feature | Qué falta |
|---|---|
| **Publisher** | UI de crear/programar posts + `instagram_publish_queue` tabla + métodos en cliente |
| **Inbox DMs** | `getConversations()`, `getMessages()`, `sendMessage()` en cliente + tablas + UI |
| **Webhook subscriptions** | Script `scripts/subscribe-instagram-webhooks.ts` |

---

## 5. SEED DATA — PROBLEMA CRÍTICO

### Estado actual en producción
- ❌ Data FICTICIA: Martina Rodríguez, Santiago Méndez, Valentina Lagos, etc.
- ❌ No hay ningún dato real de Juampi

### Lo que el spec pide (data real)
- Ann Sahakyan ($1,500 MRR) + contacto
- GovBidder ($500 MRR) + Cristián + Santo
- Vendly (interno pausado) + Spriovanni Indumentaria
- ~20 tareas reales urgentes
- 6 meses revenue real (Ann desde sept 2025, GovBidder desde ene 2026)
- Expenses reales (~$196/mes)
- 5 bases del negocio (misión, visión, ICP, oferta, stack)
- Launch histórico GovBidder
- 1 strategy para Ann

**Plan:** `scripts/seed-real.ts` que limpia demo y carga data real.

---

## 6. CAROUSEL STUDIO

**Hallazgo:** "carousel" existe solo como un `ContentFormat` enum (`"reel" | "post" | "carousel" | ...`) en `content-client.tsx`. **No hay ningún componente CarouselStudio.** El spec lo da por existente, pero en Omni hay que construirlo desde cero.

**MVP para esta sesión:**
- Editor de slides (texto + color de fondo + imagen)
- Exportar slides como imágenes
- Guardar borrador en `content_pieces`
- Integrar con Publisher de IG (carousel post)

---

## 7. DECISIONES TÉCNICAS — PRINCIPIOS PARA ESTA SESIÓN

### ❌ NO hacer
- Introducir Prisma (rompe todo — el patrón SQL+supabase-js está establecido)
- Cambiar el schema de `tasks` (tiene 21 filas reales + UI completa funcionando)
- Renombrar tablas existentes
- `any` en TypeScript nuevo (usar tipos explícitos donde sea posible)

### ✅ SÍ hacer
- Migración 014 para columnas faltantes en `clients` + 4 nuevas tablas
- Script de seed separado (`npm run seed:real`)
- Patrón Server Component → Client Component en páginas nuevas
- `sb = supabase as any` solo para tablas sin tipos generados

---

## 8. PLAN DE EJECUCIÓN — FASES REALES

### FASE 1 — Migración DB `014_clients_v2_and_ig_publisher.sql`
- ADD COLUMN: health_score, slack_channel, industry, parent_client_id, setup_paid → `clients`
- CREATE TABLE: contacts, instagram_publish_queue, instagram_conversations, instagram_messages
- RLS + indexes en todo

### FASE 2 — Seed real `scripts/seed-real.ts`
- Limpiar tablas demo
- Cargar: Ann, GovBidder (Cristián+Santo), Vendly, Spriovanni
- Cargar: 20 tareas reales, 6 meses revenue, expenses, 5 business docs, 1 launch, 1 strategy, 4 automations

### FASE 3 — Clientes mejorado
- Detail page por cliente con contexto completo
- Health score widget
- Contacts (múltiples por cliente)
- Slack channel link
- Parent/child (Vendly → Spriovanni)

### FASE 4 — Instagram Publisher + Inbox
- Publisher: crear IMAGE/REEL/CAROUSEL, programar, publicar
- Inbox: DMs + Comments unificados

### FASE 5 — Automatizaciones UI (reemplaza ComingSoon)
- Lista de 4 automations activas con estado
- Logs de ejecución
- Toggle enable/disable

### FASE 6 — Carousel Studio MVP
- Editor de slides básico
- Exportar como PNG
- Integrar con publisher

### FASE 7 — Docs de replicación
- DEPLOY-NEW-CLIENT.md
- INSTAGRAM-SETUP.md
- DEMO-SCRIPT.md

---

## 9. ESTIMACIÓN POR FASE

| Fase | Estimado | Riesgo |
|---|---|---|
| 014 migración | 1h | 🟢 Bajo |
| Seed real | 1h | 🟢 Bajo |
| Clientes mejorado | 2-3h | 🟢 Bajo |
| IG Publisher | 3-4h | 🟡 Medio |
| IG Inbox DMs | 4-5h | 🔴 Alto (Graph API DMs) |
| Automations UI | 1-2h | 🟢 Bajo |
| Carousel Studio MVP | 3-4h | 🟡 Medio |
| Docs | 1-2h | 🟢 Bajo |
| **TOTAL** | **~20h** | — |

---

## 10. RIESGOS

| Riesgo | Impacto | Mitigación |
|---|---|---|
| IG DMs requieren Business Verification en Meta | 🔴 Bloqueante | Implementar UI pero mostrar aviso claro si sin permisos |
| `tasks.created_by NOT NULL` con datos existentes | 🟡 Medio | Seed usa `(select id from profiles limit 1)` |
| Demo data ficticia convive con data real | 🟡 Medio | Seed real limpia primero las tablas |
| Carousel Studio complejo para hacer bien | 🟡 Medio | MVP: solo editor de texto + export, sin drag&drop |

---

## 11. FUERA DE SCOPE (esta sesión)

- Stripe / pagos
- ManyChat API (sin credenciales)
- Meta Ads API (sin credenciales)
- Google Ads
- Sentry
- Multi-tenant (es single-tenant)

---

## RESUMEN EJECUTIVO

**Funciona hoy y NO toca:** Auth, Layout, Tasks, CRM/Leads, Metrics, Research AI, CoachMap, Launches.

**Blocker crítico para ventas:** La data demo ficticia tiene que ser reemplazada por data real ANTES de mostrar el dashboard. Es lo primero que hago en Fase 2.

**Lo más complejo:** Instagram Inbox (DMs) — depende de Business Verification con Meta. Si no está aprobado, implemento la UI pero con estado "pendiente de verificación".

**Orden de impacto para ventas:**
1. Seed real (Ann + GovBidder visibles en el dashboard)
2. Clientes con health score + contacts
3. Automations UI (demuestra que el OS está "vivo")
4. IG Publisher (demuestra el módulo de contenido)

---

> ⏸️ **PAUSA — Esperando OK de Juampi para arrancar Fase 1.**

---

## 1. ESTADO ACTUAL — LO QUE EXISTE

### Tablas en DB (18 tablas reales)
| Tabla | Propósito | Estado |
|-------|-----------|--------|
| `client_settings` | Config global (singleton) | ✅ En uso |
| `profiles` | Usuarios del sistema | ✅ En uso |
| `departments` | Estructura org | ✅ En uso |
| `leads` | Pipeline de ventas (8 etapas) | ✅ En uso |
| `lead_activities` | Log de actividades por lead | ✅ En uso |
| `tasks` | Task management (6 status, 4 prioridad) | ✅ En uso |
| `kpis` | KPIs mensuales con targets | ✅ En uso |
| `content_pieces` | Contenido editorial (7 formatos) | ✅ En uso |
| `competitors` | Seguimiento competidores | ✅ En uso |
| `channels` + `channel_members` + `messages` | Chat interno | ✅ En uso |
| `ai_conversations` + `ai_messages` | Historial AI | ✅ En uso |
| `discovery_forms` + `discovery_responses` | Formularios públicos | ✅ En uso |
| `integrations` | OAuth tokens encriptados | ✅ En uso |
| `announcements` | Anuncios del equipo | ✅ En uso |
| `audit_logs` | Auditoría de cambios | ✅ En uso |

### Routes existentes
| Route | Módulo | Estado |
|-------|--------|--------|
| `/` | Overview | ✅ Funcional (rediseñado hoy) |
| `/kpis` | KPIs | ✅ Funcional |
| `/crm` | Leads/CRM | ✅ Funcional |
| `/crm/pipeline` | Pipeline | ✅ Funcional |
| `/crm/[id]` | Lead detail | ⚠️ UI vacía |
| `/tasks` | Tareas | ✅ Funcional |
| `/team` | Equipo | ⚠️ Básico |
| `/team/departments` | Departamentos | ✅ Funcional |
| `/content` | Contenido | ⚠️ Sin Instagram |
| `/competitors` | Competidores | ✅ Funcional |
| `/discovery` | Discovery forms | ✅ Funcional |
| `/comms` | Comunicaciones | ✅ Funcional |
| `/calendar` | Calendario + Calendly | ✅ Funcional |
| `/ai` | AI Asistente | ✅ Funcional |
| `/settings` | Configuración | ⚠️ Parcial |
| `/settings/profile` | Perfil | ⚠️ Placeholder |
| `/settings/branding` | Branding | ✅ Funcional |
| `/settings/billing` | Billing | ⚠️ Placeholder |
| `/integrations` | Integraciones | ⚠️ Placeholder |
| `/socials` | Redes sociales | ⚠️ Placeholder |
| `/ads` | Publicidad | ⚠️ Placeholder |

### API Routes
| Route | Estado |
|-------|--------|
| `/api/ai/chat` | ✅ Streaming, contexto inyectado, créditos |
| `/api/calendly` | ✅ GET/POST/DELETE con encriptación |
| `/api/onboarding/complete` | ✅ Funcional |
| `/api/team/invite` | ✅ Funcional |

---

## 2. DELTA VS SPEC — LO QUE FALTA

### 2.1 Design System (CAMBIO COMPLETO)
| Elemento | Actual | Spec |
|----------|--------|------|
| Background | `#090c14` (dark blue-gray) | `#080808` (casi negro) |
| Accent | Kavar Green `#236461` / `#3db5a5` | Verde lima `#22c55e` |
| Typography | Inter sans-serif | Georgia serif (display) + sistema UI (UI) |
| Card bg | `#0e121c` | `#111111` |
| Border | `#1e2538` | `#2a2a2a` |
| Sidebar bg | `#070a11` | `#111111` (o igual al secondary) |

**Riesgo:** Cambio en globals.css + shadcn tokens afecta TODOS los componentes existentes.  
**Plan:** Reescribir `globals.css` conservando la estructura Tailwind v4 pero cambiando todos los tokens.

### 2.2 Tablas Nuevas en DB
Todas estas tablas **no existen** y deben crearse como nuevas migraciones SQL:

| Tabla (spec) | Equivalente actual | Acción |
|--------------|-------------------|--------|
| `Client` (CRM de Juampi) | Parcial en `leads` (stage=won) | Crear tabla `clients` separada |
| `PipelineDeal` | `leads` (renombrar/reorientar) | `leads` sigue siendo pipeline, `clients` es clientes activos |
| `TeamMember` | Parcial en `profiles` + `departments` | Crear tabla `team_members` |
| `RevenueRecord` | En `kpis` (metric_name=MRR) | Crear tabla `revenue_records` |
| `ExpenseRecord` | No existe | Crear tabla `expense_records` |
| `MetaAdsSnapshot` | Parcial en `kpis` | Crear tabla `meta_ads_snapshots` |
| `ManyChatSnapshot` | No existe | Crear tabla `manychat_snapshots` |
| `BusinessDoc` | No existe | Crear tabla `business_docs` |
| `ResearchRequest` | Parcial en `discovery_forms` | Crear tabla `research_requests` |
| `CompetitorSnapshot` | `competitors` (texto libre) | Crear tabla `competitor_snapshots` |
| `AiDiagnosis` | No existe | Crear tabla `ai_diagnoses` |
| `ClientStrategy` | No existe | Crear tabla `client_strategies` |
| `Launch` | No existe | Crear tabla `launches` |
| `LaunchParticipant` | No existe | Crear tabla `launch_participants` |
| `Automation` | No existe | Crear tabla `automations` |
| `AutomationExecution` | No existe | Crear tabla `automation_executions` |
| **Instagram (7 tablas)** | Solo `integrations` (token) | Crear tablas IG completas |
| `InstagramAccount` | Token en `integrations` | Nueva tabla con metadata |
| `InstagramPost` | `content_pieces` (parcial) | Nueva tabla de posts IG sincronizados |
| `InstagramPublishQueue` | No existe | Nueva tabla de cola de publicación |
| `InstagramConversation` | No existe | Nueva tabla DMs |
| `InstagramMessage` | No existe | Nueva tabla mensajes DMs |
| `InstagramComment` | No existe | Nueva tabla comentarios |
| `InstagramWebhookEvent` | No existe | Nueva tabla eventos webhook |

**Total nuevas tablas:** 23 tablas adicionales (de 18 → 41 tablas)

### 2.3 Routes Nuevas (módulos faltantes)
| Route | Módulo | Acción |
|-------|--------|--------|
| `/research` | Inteligencia del Negocio | Crear (consolidar /competitors + /discovery + nuevo) |
| `/clients` | Clientes CRM | Crear (nueva tabla clients, diferente de leads) |
| `/metrics` | Métricas y Finanzas | Crear (renombrar /kpis + Meta Ads + ManyChat + Cashflow) |
| `/strategy` | CoachMap | Crear desde cero |
| `/launches` | Lanzamientos | Crear desde cero |
| `/automations` | Automatizaciones | Crear desde cero |
| `/content/instagram` | IG Publisher + Inbox | Expandir /content existente |

### 2.4 Instagram API — Completamente Faltante
**Nada de esto existe:**
- OAuth flow Instagram Login
- `InstagramClient` class
- Webhook endpoint `/api/webhooks/instagram`
- Cron jobs (refresh token, process webhooks, publish scheduled)
- UI: Inbox DMs, Publisher, Analytics

**Variables de entorno faltantes:**
```bash
META_APP_ID=
META_APP_SECRET=
META_WEBHOOK_VERIFY_TOKEN=
META_GRAPH_API_VERSION=v23.0
WEBHOOK_BASE_URL=
```

### 2.5 Carousel Studio — NO EXISTE
El spec menciona "Carousel Studio (ya existe)" pero no está en el repo.  
**Plan:** Construirlo como sub-módulo de `/content` con el generador de slides.

### 2.6 Demo Mode Toggle
No existe. Necesita:
- Campo `demo_mode` en `client_settings`
- Banner visual cuando activo
- Muting de notificaciones reales

---

## 3. LO QUE SE MANTIENE (no tocar)

| Componente | Razón |
|-----------|-------|
| Arquitectura Supabase (sin Prisma) | Funciona bien, migrations SQL son suficientes |
| Sistema de auth (Supabase Auth) | Robusto, con RLS |
| Encriptación AES-256-GCM (`lib/crypto.ts`) | Reusar para tokens de Instagram |
| API `/api/ai/chat` | Solo cambiar modelo si necesario |
| `/api/calendly` | Sigue funcionando |
| Componentes shadcn/ui base | Reuse, solo cambiar tokens CSS |
| Recharts para charts | Mantener |
| SWR para data fetching | Mantener |
| react-hook-form + zod | Mantener |
| Seguridad headers en next.config | Mantener + ampliar CSP |
| Realtime subscriptions (leads/tasks) | Mantener |
| Sistema de créditos AI | Mantener |
| Onboarding wizard | Mantener |
| RLS en todas las tablas | Mantener + ampliar |

---

## 4. LO QUE SE REESTRUCTURA

### Routes a renombrar/consolidar
| Actual | Nuevo | Nota |
|--------|-------|------|
| `/crm` | `/clients` (clientes activos) + `/crm` (pipeline leads) | Separar conceptos |
| `/kpis` | Mover contenido a `/metrics/kpis` | KPIs pasa a sub-sección |
| `/competitors` | Mover a `/research` | Sub-sección de Research |
| `/discovery` | Mover a `/research` | Sub-sección de Research |
| `/comms` | Mantener o integrar en sidebar | No es módulo principal en spec |
| `/socials` | Absorber en `/content/instagram` | Instagram es el módulo principal |
| `/ads` | Absorber en `/metrics/meta-ads` | Sub-sección de Métricas |

### Sidebar Navigation — 11 módulos del spec
```
Principal
  ● Home              /
  ● Inteligencia      /research
  ● Clientes          /clients
  ● Equipo            /team
  ● Métricas          /metrics

Operaciones
  ● Tareas            /tasks
  ● Contenido         /content

Crecimiento
  ● Estrategia        /strategy
  ● Lanzamientos      /launches
  ● Automatizaciones  /automations

Sistema
  ● Settings          /settings
```

---

## 5. RIESGOS Y CONSIDERACIONES

### 🔴 RIESGO ALTO
1. **Cambio de design system completo** — Afecta cada componente. Mitigar: cambiar primero globals.css + shadcn tokens, luego verificar visualmente módulo por módulo.
2. **Node.js 22 vs Next.js 16** — Dev server no funciona localmente (Node.js 22 vs Next.js 16 bundled picocolors/interop). Vercel usa Node 24.x (funciona). Solución: test visual solo en Vercel, o usar `vercel dev` localmente.
3. **Instagram OAuth en producción** — Necesita app Meta aprobada + webhooks configurados. El spec dice que los permisos están aprobados en Live mode.

### 🟡 RIESGO MEDIO
4. **Migración leads → clients** — La tabla `leads` se usa en toda la app. Agregar tabla `clients` sin eliminar `leads` es más seguro. Los leads son pipeline, los clients son los que cerraron.
5. **23 tablas nuevas** — Migraciones deben ser idempotentes y con RLS desde el inicio.
6. **Carousel Studio desde cero** — No existe en el repo, hay que construirlo.
7. **Datos seed KAVAR ya corridos** — La migración `008_seed_kavar.sql` ya está commiteada hoy. El seed de Fase 6 del spec deberá adaptarse.

### 🟢 RIESGO BAJO
8. **Georgia serif** — Solo CSS, no afecta funcionalidad.
9. **Renombrar routes** — Next.js App Router: simplemente mover carpetas. Los links en sidebar se actualizan en un lugar.
10. **Demo mode toggle** — Un campo en DB + lógica simple.

---

## 6. PLAN DE EJECUCIÓN — FASES

### FASE 1 — Design System + Foundation
**Duración estimada:** ~2h  
**Archivos afectados:** `globals.css`, componentes UI base, sidebar, topbar

Tareas:
- [ ] Reescribir `globals.css` con tokens del spec (#080808, #22c55e, Georgia)
- [ ] Actualizar shadcn component tokens
- [ ] Sidebar: nuevo diseño con 11 módulos
- [ ] Security headers: ampliar CSP para Meta Graph API
- [ ] `next.config.ts`: agregar dominios IG para imágenes
- [ ] Instalar `sharp` si no está (Next.js image optimization)

### FASE 2 — Schema DB (23 nuevas tablas)
**Duración estimada:** ~2h  
**Archivos afectados:** `supabase/migrations/012_spec_v1.sql`

Tareas:
- [ ] Migración SQL con todas las tablas del spec (en SQL nativo, sin Prisma)
- [ ] RLS en TODAS las tablas nuevas
- [ ] Indexes en queries frecuentes
- [ ] Agregar `demo_mode boolean` a `client_settings`
- [ ] Agregar `META_APP_ID` etc. a `.env.local.example`

### FASE 3 — Instagram Completo
**Duración estimada:** ~4h  
**Archivos nuevos:** `lib/instagram/client.ts`, `app/api/auth/instagram/`, `app/api/webhooks/instagram/`, `app/api/cron/`

Tareas:
- [ ] `lib/instagram/client.ts` — clase `InstagramClient`
- [ ] OAuth: `/api/auth/instagram/start` + `/api/auth/instagram/callback`
- [ ] Token encryption reusar `lib/crypto.ts`
- [ ] Webhook: `/api/webhooks/instagram` (verify GET + process POST)
- [ ] Cron: `/api/cron/refresh-ig-token`, `/api/cron/process-ig-webhooks`, `/api/cron/publish-scheduled`
- [ ] UI Instagram: `/content` expandido (Inbox, Publisher, Analytics)
- [ ] Script: `scripts/subscribe-instagram-webhooks.ts`
- [ ] UI Settings: Instagram OAuth button + status

### FASE 4 — Módulos CORE
**Duración estimada:** ~4h

Tareas (en orden):
1. [ ] **Home** — Mejorar con más widgets usando nuevas tablas (revenue, clients)
2. [ ] **Clientes** (`/clients`) — Nueva tabla, CRM completo, pipeline, health score
3. [ ] **Tareas** (`/tasks`) — Agregar BusinessDocs, kanban view, calendar view
4. [ ] **Métricas** (`/metrics`) — Revenue + Cashflow + Meta Ads + ManyChat
5. [ ] **Settings** — Instagram connect, Users management, Demo mode toggle

### FASE 5 — Módulos DEMO-GRADE
**Duración estimada:** ~4h

Tareas:
1. [ ] **Inteligencia** (`/research`) — UI + 3 research seeded + 1 AI Diagnosis real
2. [ ] **Equipo** (`/team`) — Expandir con TeamMember tabla, performance
3. [ ] **Estrategia** (`/strategy`) — CoachMap UI + 1 cliente con 7 outputs seeded
4. [ ] **Lanzamientos** (`/launches`) — UI + 1 lanzamiento de ejemplo seeded
5. [ ] **Automatizaciones** (`/automations`) — UI + 2-3 workflows (IG webhooks, refresh token, publish scheduled)
6. [ ] **Carousel Studio** — Builder de slides en `/content`

### FASE 6 — Seed Data Realista
**Duración estimada:** ~1h  
**Archivos:** `supabase/migrations/013_seed_v1.sql` (o script separado)

Tareas:
- [ ] Founder user (Juampi) — ya existe en prod
- [ ] 3-5 clients seeded (Ann, Cristián como clientes activos + 1-2 en pipeline)
- [ ] 30 días de revenue records
- [ ] 7 días de Meta Ads snapshots
- [ ] 1 client strategy con 7 outputs (para demo CoachMap)
- [ ] 1 launch de ejemplo seeded
- [ ] 3 automations activas (listadas, 2 funcionando)

### FASE 7 — Demo Mode + Polish
**Duración estimada:** ~1h

Tareas:
- [ ] Toggle demo mode en Settings
- [ ] Banner "Demo Mode" cuando activo
- [ ] Loading skeletons en todos los módulos
- [ ] Empty states diseñados
- [ ] Animaciones sutiles (framer-motion o tw-animate-css)

### FASE 8 — Documentación
**Duración estimada:** ~1h

Archivos a crear en `/docs`:
- [ ] `DEPLOY-NEW-CLIENT.md`
- [ ] `INSTAGRAM-SETUP.md`
- [ ] `ARCHITECTURE.md`
- [ ] `SECURITY.md`
- [ ] `DEMO-SCRIPT.md`

---

## 7. DEPENDENCIAS NUEVAS A INSTALAR

```bash
# Instagram API (no SDK oficial, usar fetch directo)
# Cron jobs en Vercel (via vercel.json)
# Para PDF generation (CoachMap outputs)
pnpm add @react-pdf/renderer
# Para rich text editor (BusinessDocs)
pnpm add @tiptap/react @tiptap/starter-kit @tiptap/extension-image
# Para drag & drop (Kanban tasks)
pnpm add @dnd-kit/core @dnd-kit/sortable
```

**No se necesita:**
- Prisma (se mantiene Supabase JS directo)
- Sentry (no está en el spec, evaluar en FASE 7)
- next-auth (se mantiene Supabase Auth)

---

## 8. VARIABLES DE ENTORNO FALTANTES

Agregar a `.env.local` (valores reales los pasa Juampi):
```bash
# Meta / Instagram
META_APP_ID=
META_APP_SECRET=
META_WEBHOOK_VERIFY_TOKEN=
META_GRAPH_API_VERSION=v23.0
WEBHOOK_BASE_URL=https://omni.vercel.app

# Ya existe (reusar para IG tokens):
# OAUTH_TOKEN_ENCRYPTION_KEY=... (64 hex chars)
```

---

## 9. LO QUE SE PRESERVA SIN CAMBIOS

- ✅ Supabase project + 18 tablas existentes (solo se agregan, no se eliminan)
- ✅ Auth flow (Supabase Auth)
- ✅ Encriptación `lib/crypto.ts` (AES-256-GCM)
- ✅ AI chat streaming + créditos
- ✅ Calendly integration
- ✅ RLS policies existentes
- ✅ Security headers
- ✅ Realtime subscriptions
- ✅ Seed KAVAR (migración `008_seed_kavar.sql` — datos reales de KAVAR)
- ✅ Onboarding wizard

---

## 10. CHECKLIST PRE-INICIO

Antes de arrancar Fase 1, confirmar:

- [ ] **Variables Meta:** Juampi provee META_APP_ID, META_APP_SECRET, META_WEBHOOK_VERIFY_TOKEN
- [ ] **Design system:** ¿Se abandona Kavar Green #236461 completamente? → Confirmado: sí, reemplazar con #22c55e + #080808 + Georgia
- [ ] **Carousel Studio:** Confirmar que hay que construirlo desde cero (no existe en repo)
- [ ] **Node.js local:** Dev server solo funciona en Vercel (Node 24.x). Test visual = `vercel dev` o `git push + vercel deploy`
- [ ] **Seed data:** ¿Los datos de KAVAR del seed 008 sirven de base o se reemplazan?

---

**Listo para revisión. Esperando confirmación para arrancar Fase 1.**
