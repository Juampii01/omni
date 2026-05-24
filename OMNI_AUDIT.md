# OMNI DASHBOARD — AUDITORÍA TÉCNICA COMPLETA
**Fecha:** 21 de mayo de 2026  
**Versión:** 1.0  
**Proyecto:** Omni — Dashboard operativo para founders  
**Desarrollado por:** Nova Software

---

## ÍNDICE

1. [Resumen Ejecutivo](#1-resumen-ejecutivo)
2. [Stack Tecnológico](#2-stack-tecnológico)
3. [Estructura del Proyecto](#3-estructura-del-proyecto)
4. [Base de Datos](#4-base-de-datos)
5. [Autenticación y Permisos](#5-autenticación-y-permisos)
6. [API Routes](#6-api-routes)
7. [Páginas y Rutas](#7-páginas-y-rutas)
8. [Componentes y Design System](#8-componentes-y-design-system)
9. [Flujo de Datos](#9-flujo-de-datos)
10. [Integraciones Externas](#10-integraciones-externas)
11. [Variables de Entorno](#11-variables-de-entorno)
12. [Hallazgos y Gaps](#12-hallazgos-y-gaps)

---

## 1. RESUMEN EJECUTIVO

Omni es un dashboard operativo para founders/agencias construido con Next.js 16 (App Router) + Supabase + Anthropic. Es una aplicación **single-tenant**: cada instancia corresponde a un cliente, con su propio proyecto Supabase y deploy en Vercel.

### Estado actual del producto

| Módulo | Estado | Descripción |
|--------|--------|-------------|
| Overview | ✅ Completo | Home con saludo, stats rápidos, accesos directos |
| KPIs | ✅ Completo | Grid por mes, sparklines, delta vs período anterior |
| Leads / CRM | ✅ Completo | Tabla de leads con CRUD completo |
| Pipeline | ✅ Completo | Kanban drag-drop por etapa |
| Calendario | ✅ Completo | Doble tab: tareas/leads internos + Calendly |
| Tareas | ✅ Completo | Kanban drag-drop 5 columnas |
| Equipo | ✅ Completo | Gestión de miembros, invitaciones, roles |
| Contenido | ✅ Completo | Content calendar por plataforma y estado |
| Competidores | ✅ Completo | Tracking de competidores con redes sociales |
| IA Asistente | ✅ Completo | Chat con Claude + contexto real del negocio |
| Discovery | ✅ Completo | Formularios públicos de calificación |
| Comunicaciones | ✅ Completo | Anuncios internos del equipo |
| Redes Sociales | 🔜 Coming Soon | Septiembre 2026 |
| Publicidad | 🔜 Coming Soon | Agosto 2026 |
| Integraciones | 🔜 Coming Soon | Julio 2026 |
| App Móvil | 🔜 Coming Soon | Diciembre 2026 |

### Datos demo cargados (LM Mentoring)
- **60 leads** distribuidos en 8 etapas del pipeline
- **35 tareas** en 5 columnas del kanban
- **24 registros de KPIs** (12 meses de MRR + Alumnos activos + métricas de mayo 2026)
- **20 piezas de contenido** en diferentes estados
- **5 competidores** analizados
- **4 canales** de comunicación interna con mensajes de muestra
- **1 formulario de discovery** con 3 respuestas de prueba

---

## 2. STACK TECNOLÓGICO

### Framework y Runtime
| Tecnología | Versión | Rol |
|-----------|---------|-----|
| Next.js | 16.2.6 | Framework principal (App Router) |
| React | 19.2.4 | UI |
| TypeScript | 5 | Tipado estático (strict mode) |
| Node.js | 20 | Runtime |
| pnpm | latest | Package manager |

### Base de Datos y Auth
| Tecnología | Versión | Rol |
|-----------|---------|-----|
| @supabase/supabase-js | 2.49.4 | Client de DB y Auth |
| @supabase/ssr | 0.6.1 | Server-side auth con cookies |
| PostgreSQL | (via Supabase) | Base de datos relacional |

### IA
| Tecnología | Versión | Rol |
|-----------|---------|-----|
| @anthropic-ai/sdk | 0.40.0 | SDK de Claude API |
| Modelo | claude-opus-4-5 | LLM principal (chat + contexto) |

### UI y Estilo
| Tecnología | Versión | Rol |
|-----------|---------|-----|
| Tailwind CSS | 4 | Utilidades de CSS |
| Radix UI | varios | Primitivos accesibles (Dialog, Select, etc.) |
| Lucide React | 0.511.0 | Íconos (500+) |
| class-variance-authority | 0.7.1 | Variantes de componentes |
| tailwind-merge | 3.3.0 | Merge de clases Tailwind |
| sonner | 2.0.3 | Toast notifications |
| next-themes | 0.4.6 | Tema (instalado, no activado) |

### Formularios y Validación
| Tecnología | Versión | Rol |
|-----------|---------|-----|
| react-hook-form | 7.56.4 | Manejo de formularios |
| zod | 3.25.51 | Validación de esquemas |
| @hookform/resolvers | 3.10.0 | Bridge RHF ↔ Zod |

### Tablas y Gráficos
| Tecnología | Versión | Rol |
|-----------|---------|-----|
| @tanstack/react-table | 8.21.3 | Tablas con sorting/filtering |
| recharts | 2.15.3 | Gráficos (instalado) |

### Utilidades
| Tecnología | Versión | Rol |
|-----------|---------|-----|
| date-fns | 4.1.0 | Manejo de fechas |
| react-day-picker | 10.0.1 | Selector de calendario |
| cmdk | 1.1.1 | Command palette |
| swr | 2.3.3 | Data fetching (solo en useUser hook) |

### Scripts npm
```bash
pnpm dev      # Servidor de desarrollo
pnpm build    # Build de producción
pnpm start    # Servidor de producción
pnpm lint     # TypeScript type check (tsc --noEmit)
```

---

## 3. ESTRUCTURA DEL PROYECTO

```
omni/
├── app/
│   ├── (auth)/                     # Páginas de auth (no protegidas)
│   │   ├── login/
│   │   ├── signup/
│   │   ├── forgot-password/
│   │   └── reset-password/
│   ├── (dashboard)/                # Páginas del dashboard (protegidas)
│   │   ├── layout.tsx              # Layout con sidebar + tema dinámico
│   │   ├── page.tsx                # Overview / Home
│   │   ├── kpis/
│   │   ├── crm/
│   │   │   ├── page.tsx
│   │   │   └── pipeline/
│   │   ├── calendar/
│   │   ├── tasks/
│   │   ├── team/
│   │   ├── content/
│   │   ├── competitors/
│   │   ├── comms/
│   │   ├── discovery/
│   │   ├── ai/
│   │   ├── socials/                # Coming Soon
│   │   ├── ads/                    # Coming Soon
│   │   ├── integrations/           # Coming Soon
│   │   ├── mobile/                 # Coming Soon
│   │   └── settings/
│   ├── api/
│   │   ├── ai/chat/route.ts        # Streaming chat con Claude
│   │   ├── calendly/route.ts       # GET/POST/DELETE Calendly
│   │   └── team/invite/route.ts    # Invitar miembros al equipo
│   ├── globals.css                 # Variables CSS, estilos base
│   └── layout.tsx                  # Root layout (fuente, idioma)
│
├── components/
│   ├── layout/
│   │   ├── dashboard-layout.tsx    # Layout principal (sidebar + topbar)
│   │   ├── sidebar.tsx             # Navegación lateral
│   │   ├── topbar.tsx              # Barra superior + Cmd+K
│   │   ├── user-menu.tsx           # Menú de usuario (avatar dropdown)
│   │   └── command-palette.tsx     # Búsqueda global Cmd+K
│   ├── ui/                         # Primitivos shadcn/Radix (27 componentes)
│   ├── ai-chat-widget.tsx          # Widget flotante de IA
│   ├── ai-message.tsx              # Renderer de markdown para IA
│   ├── page-header.tsx             # Encabezado de página
│   ├── empty-state.tsx             # Estado vacío
│   ├── loading.tsx                 # Spinner de carga
│   ├── live-notifications.tsx      # Notificaciones demo periódicas
│   ├── last-seen-updater.tsx       # Actualiza last_seen_at del usuario
│   └── placeholder/
│       └── coming-soon.tsx         # Placeholder para módulos futuros
│
├── lib/
│   ├── auth/
│   │   ├── get-user.ts             # getUser(), requireAuth(), requireRole()
│   │   └── permissions.ts          # can(role, permission), hasMinRole()
│   ├── supabase/
│   │   ├── client.ts               # Cliente browser (anon key)
│   │   ├── server.ts               # Cliente server + service role
│   │   ├── middleware.ts           # updateSession() para cookies
│   │   └── types.ts                # Tipos generados de Supabase
│   ├── theme/
│   │   └── load-theme.ts           # Conversión hex→HSL, inyección CSS
│   ├── utils.ts                    # cn(), formatCurrency(), getInitials(), etc.
│   └── constants.ts                # Etapas, prioridades, roles, colores
│
├── hooks/
│   └── use-user.ts                 # Hook SWR para perfil de usuario
│
├── supabase/
│   └── migrations/
│       ├── 001_initial.sql         # Schema completo (19 tablas)
│       ├── 002_rls_policies.sql    # Políticas RLS
│       ├── 003_indexes.sql         # Índices + triggers updated_at
│       ├── 004_extras.sql          # announcements + storage buckets
│       ├── 005_fix_rls.sql         # Correcciones de políticas
│       ├── 006_seed_demo.sql       # Datos demo LM Mentoring
│       └── 007_add_calendly.sql    # Columnas Calendly en client_settings
│
├── public/                         # Assets estáticos
├── next.config.ts                  # Config Next.js + security headers
├── tsconfig.json                   # TypeScript (strict, path alias @/*)
├── components.json                 # Config shadcn/ui
└── package.json
```

**Patrón de archivos por página:**
- `page.tsx` → Server Component (fetch de datos, requireAuth)
- `*-client.tsx` → Client Component (UI interactiva, CRUD, estado local)

---

## 4. BASE DE DATOS

### 19 tablas en total, todas con RLS habilitado

#### 4.1 client_settings (singleton)
Configuración global del workspace. Una sola fila por instancia.

| Columna | Tipo | Default | Descripción |
|---------|------|---------|-------------|
| id | uuid | gen_random_uuid() | PK |
| business_name | text | 'Mi Empresa' | Nombre del negocio |
| business_logo_url | text | null | URL del logo |
| brand_color | text | '#236461' | Color principal (hex) |
| brand_accent_color | text | '#236461' | Color acento |
| timezone | text | 'America/Argentina/Buenos_Aires' | Zona horaria |
| currency | text | 'USD' | Moneda |
| fiscal_year_start | integer | 1 | Mes inicio año fiscal (1-12) |
| onboarding_completed | boolean | false | Si completó el onboarding |
| ai_credits_used | integer | 0 | Créditos IA usados |
| ai_credits_limit | integer | 100000 | Límite de créditos IA |
| calendly_api_key | text | null | API key de Calendly |
| calendly_user_uri | text | null | URI del usuario en Calendly |
| calendly_name | text | null | Nombre de la cuenta Calendly |
| calendly_email | text | null | Email de la cuenta Calendly |
| created_at | timestamptz | now() | |
| updated_at | timestamptz | now() | |

**RLS:** Solo `owner` y `admin` pueden modificar. Todos los autenticados pueden leer.

---

#### 4.2 profiles
Perfiles de usuario sincronizados con `auth.users`.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | uuid | PK = auth.users.id |
| email | text | UNIQUE, NOT NULL |
| full_name | text | Nombre completo |
| avatar_url | text | URL de avatar |
| role | text | owner \| admin \| manager \| team |
| department_id | uuid | FK → departments |
| is_active | boolean | Default true |
| last_seen_at | timestamptz | Última actividad |
| created_at | timestamptz | |
| updated_at | timestamptz | |

**Trigger automático:** `handle_new_user()` crea el perfil al registrarse en auth.users.

---

#### 4.3 departments
Estructura organizacional (árbol jerárquico).

| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | uuid | PK |
| name | text | Nombre del departamento |
| description | text | |
| color | text | Color hex |
| icon | text | Ícono |
| parent_id | uuid | FK → departments (árbol) |
| manager_id | uuid | FK → profiles |
| position | integer | Orden |

---

#### 4.4 leads
CRM de ventas — leads del pipeline.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | uuid | PK |
| full_name | text | NOT NULL |
| email | text | |
| phone | text | |
| source | text | Instagram, Facebook Ads, Google Ads, Referido, Web, LinkedIn, WhatsApp, Otro |
| origin_angle | text | Ángulo de entrada |
| stage | text | new \| qualified \| meeting_scheduled \| meeting_done \| proposal_sent \| negotiation \| won \| lost |
| amount | numeric(15,2) | Valor del deal |
| expected_close_date | date | Fecha estimada de cierre |
| closed_at | timestamptz | Fecha real de cierre |
| notes | text | Notas libres |
| tags | text[] | Etiquetas |
| assigned_to | uuid | FK → profiles |
| department_id | uuid | FK → departments |
| metadata | jsonb | Campos personalizados |
| deleted_at | timestamptz | Soft delete |
| created_at / updated_at | timestamptz | |

**Índices:** stage, assigned_to, created_at, department_id (todos con `WHERE deleted_at IS NULL`)

---

#### 4.5 lead_activities
Log de actividad por lead.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | uuid | PK |
| lead_id | uuid | FK → leads (CASCADE) |
| user_id | uuid | FK → profiles (CASCADE) |
| type | text | note \| call \| email \| meeting \| stage_change \| amount_change |
| description | text | |
| metadata | jsonb | |
| created_at | timestamptz | |

---

#### 4.6 tasks
Gestión de tareas del equipo.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | uuid | PK |
| title | text | NOT NULL |
| description | text | |
| status | text | backlog \| todo \| in_progress \| review \| done \| cancelled |
| priority | text | low \| medium \| high \| urgent |
| assigned_to | uuid | FK → profiles |
| created_by | uuid | FK → profiles (NOT NULL) |
| department_id | uuid | FK → departments |
| related_lead_id | uuid | FK → leads |
| due_date | timestamptz | |
| completed_at | timestamptz | |
| position | integer | Para orden drag-drop |
| tags | text[] | |
| metadata | jsonb | |
| deleted_at | timestamptz | Soft delete |
| created_at / updated_at | timestamptz | |

---

#### 4.7 kpis
KPIs mensuales por categoría.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | uuid | PK |
| period_month | date | Mes del período (ej: 2026-05-01) |
| category | text | revenue \| sales \| retention \| growth \| marketing \| etc. |
| metric_name | text | Nombre del KPI (ej: "MRR", "Alumnos activos") |
| metric_value | numeric(15,2) | Valor actual |
| metric_target | numeric(15,2) | Meta |
| unit | text | USD \| percent \| count \| score |
| department_id | uuid | FK → departments |
| notes | text | |

**Unique constraint:** (period_month, category, metric_name, department_id)

---

#### 4.8 channels + channel_members + messages
Comunicación interna del equipo.

- **channels:** nombre, descripción, is_private, department_id, created_by
- **channel_members:** (channel_id, user_id) → many-to-many
- **messages:** contenido, attachments JSON, reply_to (FK → messages), soft delete

---

#### 4.9 ai_conversations + ai_messages
Historial de chats con IA (metadata).

- **ai_conversations:** user_id, title, context_type (general/crm/tasks/kpis/content/analysis), context_id
- **ai_messages:** conversation_id, role (user/assistant/system), content, tokens_used, model

> Nota: El widget flotante de IA **NO usa estas tablas actualmente**. El historial vive en estado React local y se pierde al recargar la página.

---

#### 4.10 content_pieces
Calendario de contenido.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| format | text | reel \| post \| story \| video \| article \| thread \| carousel |
| platform | text | instagram \| tiktok \| youtube \| twitter \| linkedin |
| status | text | idea \| draft \| review \| scheduled \| published |
| scheduled_for | timestamptz | Fecha programada |
| published_at | timestamptz | Fecha de publicación real |
| metrics | jsonb | Engagement (likes, views, comments) |

---

#### 4.11 competitors
Inteligencia competitiva.

Campos: name, category, instagram_handle, tiktok_handle, youtube_handle, website_url, notes, tags, metadata

---

#### 4.12 integrations
Tokens OAuth de integraciones externas.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| provider | text | Nombre del servicio |
| access_token_encrypted | text | 🔒 Token de acceso (encriptado) |
| refresh_token_encrypted | text | 🔒 Token de refresco (encriptado) |
| expires_at | timestamptz | Expiración del token |
| scopes | text[] | Permisos solicitados |

**RLS:** Solo owner y admin.

---

#### 4.13 audit_logs
Registro de auditoría del sistema.

Campos: user_id, action, entity_type, entity_id, changes (JSON diff), ip_address, user_agent

**RLS:** Solo admin+ pueden leer. Service role puede insertar.

---

#### 4.14 discovery_forms + discovery_responses
Formularios públicos de calificación de leads.

- **discovery_forms:** title, description, questions (JSON array), is_active, created_by
- **discovery_responses:** form_id, respondent_email, respondent_name, answers (JSON), ai_analysis (JSON)

**Acceso público:** Los formularios activos y sus respuestas son accesibles sin autenticación (para el funnel de leads).

---

#### 4.15 announcements
Comunicados internos del equipo.

Campos: title, body, is_pinned (boolean), created_by

---

### Migraciones en orden

| Archivo | Propósito |
|---------|-----------|
| 001_initial.sql | Crea las 19 tablas del schema completo |
| 002_rls_policies.sql | Habilita RLS y define ~50 políticas |
| 003_indexes.sql | Índices de performance + trigger handle_updated_at() + trigger handle_new_user() |
| 004_extras.sql | Tabla announcements + Storage buckets (avatars, logos) |
| 005_fix_rls.sql | Relaja UPDATE en leads/tasks a todos los autenticados; normaliza owners duplicados |
| 006_seed_demo.sql | Datos demo de LM Mentoring (idempotente) |
| 007_add_calendly.sql | Agrega 4 columnas Calendly a client_settings |

### Storage Buckets (Supabase Storage)

| Bucket | Público | Uso |
|--------|---------|-----|
| avatars | Sí | Fotos de perfil de usuarios |
| logos | Sí | Logos del negocio |

### Diagrama de relaciones

```
auth.users
  └─→ profiles (id = auth.users.id)
        ├─→ departments (manager_id; parent_id self-ref)
        │     └─← leads, tasks, kpis (department_id)
        ├─→ leads (assigned_to)
        │     └─← lead_activities (lead_id)
        │     └─← tasks (related_lead_id)
        ├─→ tasks (assigned_to, created_by)
        ├─→ channels (created_by)
        │     ├─← channel_members (user_id)
        │     └─← messages (user_id, reply_to self-ref)
        ├─→ ai_conversations (user_id)
        │     └─← ai_messages (conversation_id)
        ├─→ content_pieces (created_by)
        ├─→ competitors (added_by)
        ├─→ integrations (created_by)
        ├─→ audit_logs (user_id)
        ├─→ announcements (created_by)
        └─→ discovery_forms (created_by)
              └─← discovery_responses (form_id)

client_settings (singleton — sin FK a profiles)
```

---

## 5. AUTENTICACIÓN Y PERMISOS

### 5.1 Flujo de autenticación

```
1. Usuario visita URL protegida
2. middleware → lib/supabase/middleware.ts → updateSession()
   → refresca cookies de sesión
3. page.tsx llama requireAuth()
   → getUser() → supabase.auth.getUser() → valida JWT
   → query profiles tabla → retorna AuthUser
   → Si null: redirect('/login?next=...')
4. Si autenticado: renderiza página con datos
```

### 5.2 Funciones de auth (lib/auth/get-user.ts)

```typescript
getUser(): Promise<AuthUser | null>
  // Obtiene usuario + perfil. Auto-crea perfil si no existe.
  // Primer usuario: role = 'owner'. Siguientes: role = 'team'.

requireAuth(): Promise<AuthUser>
  // Lanza redirect('/login') si no autenticado.

requireRole(...roles): Promise<AuthUser>
  // Lanza redirect('/') si el rol del usuario no está en la lista.
```

### 5.3 Roles y jerarquía

| Rol | Nivel | Capacidades |
|-----|-------|-------------|
| owner | 4 | Acceso total. Único con `member.update_role` |
| admin | 3 | Todo menos cambiar roles |
| manager | 2 | CRM, tareas, KPIs, formularios |
| team | 1 | Leer y crear leads/tareas propias |

### 5.4 Matriz de permisos (lib/auth/permissions.ts)

| Permiso | owner | admin | manager | team |
|---------|-------|-------|---------|------|
| lead.create | ✅ | ✅ | ✅ | ✅ |
| lead.delete | ✅ | ✅ | ❌ | ❌ |
| task.create | ✅ | ✅ | ✅ | ✅ |
| task.delete | ✅ | ✅ | ❌ | ❌ |
| kpi.create | ✅ | ✅ | ✅ | ❌ |
| member.invite | ✅ | ✅ | ❌ | ❌ |
| member.update_role | ✅ | ❌ | ❌ | ❌ |
| settings.update | ✅ | ✅ | ❌ | ❌ |
| integration.manage | ✅ | ✅ | ❌ | ❌ |
| audit.read | ✅ | ✅ | ❌ | ❌ |
| content.create | ✅ | ✅ | ✅ | ✅ |
| department.manage | ✅ | ✅ | ❌ | ❌ |

### 5.5 Clientes Supabase

**Server (con cookies de sesión):**
```typescript
// lib/supabase/server.ts
createClient()         // anon key + RLS → para usuarios normales
createServiceClient()  // service role → bypass RLS (solo operaciones admin)
```

**Browser:**
```typescript
// lib/supabase/client.ts
createClient()         // anon key + RLS → para mutaciones client-side
```

---

## 6. API ROUTES

### Resumen de endpoints

| Método | Ruta | Auth | Servicio externo | Descripción |
|--------|------|------|-----------------|-------------|
| POST | /api/ai/chat | requireAuth() | Anthropic Claude | Chat streaming con contexto del negocio |
| GET | /api/calendly | requireAuth() | Calendly API | Obtiene eventos agendados |
| POST | /api/calendly | requireAuth() | Calendly API | Conecta una API key |
| DELETE | /api/calendly | requireAuth() | — | Desconecta Calendly |
| POST | /api/team/invite | requireRole(owner,admin,manager) | Supabase Admin | Invita un miembro al equipo |

---

### POST /api/ai/chat

**Request:**
```json
{
  "messages": [{ "role": "user|assistant", "content": "string" }]
}
```

**Response:** `text/plain` (streaming) — tokens de Claude en tiempo real

**Contexto inyectado en el system prompt:**
- `client_settings`: business_name, currency, timezone
- `leads`: distribución por etapa + valor total del pipeline
- `tasks`: pendientes urgentes + en progreso (últimas 20)
- `kpis`: últimas métricas por nombre (últimas 30 filas)

**Modelo:** claude-opus-4-5 | **Max tokens:** 1024 | **Idioma:** Español rioplatense

**Errores:**
- `400`: messages inválido → `{ error: "Mensajes invalidos" }`
- `401`: no autenticado → `{ error: "No autorizado" }`

---

### GET /api/calendly

**Lógica:**
1. Lee `calendly_api_key` y `calendly_user_uri` de `client_settings`
2. Si no hay key: retorna `400 { error: "not_connected" }`
3. Si no hay userUri: llama `GET /users/me` y lo guarda en DB
4. Fetcha `scheduled_events` (ventana: -3 meses / +6 meses, máx 100 eventos activos)
5. Para cada evento (máx 60): fetcha invitees en paralelo (máx 5 por evento)

**Response:**
```json
{
  "events": [{
    "uri": "string",
    "name": "string",
    "start_time": "ISO 8601",
    "end_time": "ISO 8601",
    "location": { "type": "string", "join_url": "string" },
    "invitees": [{ "name": "string", "email": "string", "status": "string" }]
  }]
}
```

---

### POST /api/calendly

**Request:** `{ "api_key": "string" }`

**Lógica:** Valida la key llamando `GET /users/me`. Si es válida, guarda en `client_settings`:
- calendly_api_key, calendly_user_uri, calendly_name, calendly_email

**Response:** `{ success: true, name, email, slug }`

---

### DELETE /api/calendly

Limpia los 4 campos de Calendly en `client_settings` (setea null).

---

### POST /api/team/invite

**Request:** `{ "email": "string", "role": "admin|manager|team", "department_id": "uuid|null" }`

**Lógica:**
1. Verifica que el invitante tenga rol owner/admin/manager
2. Valida que `role` no sea "owner"
3. Llama `supabase.auth.admin.inviteUserByEmail()` (service role)
4. Pre-popula fila en `profiles` con rol y departamento

**Response:** `{ ok: true }`

---

## 7. PÁGINAS Y RUTAS

### Estructura de navegación (sidebar)

```
PRINCIPAL
  Overview      /
  KPIs          /kpis

VENTAS
  Leads         /crm
  Pipeline      /crm/pipeline
  Calendario    /calendar

OPERACIONES
  Tareas        /tasks
  Equipo        /team

CONTENIDO
  Contenido     /content
  Competidores  /competitors

INTELIGENCIA
  IA Asistente  /ai
  Discovery     /discovery

COMUNICACIÓN
  Comunicaciones /comms

CANALES
  Redes Sociales  /socials    (coming soon)
  Publicidad      /ads        (coming soon)
  Integraciones   /integrations (coming soon)
  App Móvil       /mobile     (coming soon)

FOOTER
  Configuración  /settings
```

---

### / — Overview (Home)

**Tipo:** Server Component puro  
**Datos:** client_settings (business_name), count de leads activos (stage: new/qualified/meeting_scheduled), count de tareas pendientes (status: todo/in_progress)

**UI:**
- Saludo dinámico según hora del día (Buen día / Buenas tardes / Buenas noches) + nombre del usuario
- 4 stat cards: leads activos, tareas pendientes (2 más a futuro)
- 4 accesos rápidos: KPIs, Pipeline, Tareas, IA Asistente
- Banner de onboarding (visible si `onboarding_completed = false`) → link a `/settings/branding`

---

### /kpis — KPIs

**Tipo:** Server + Client Component  
**Server fetches:** tabla `kpis` (completo, order: period_month DESC) + tabla `departments`  
**Client state:** filtro de mes activo, filtro de categoría, dialogs CRUD

**UI:**
- Tabs de meses (derivados de los datos, default = mes más reciente)
- Grid de cards por KPI con:
  - Franja de color izquierda según categoría (revenue=emerald, sales=blue, retention=violet, growth=cyan)
  - Valor formateado inteligentemente: `$21,600` (USD), `18.4%` (percent), `47` (count), `8.2` (score)
  - Meta con porcentaje de cumplimiento
  - Sparkline SVG personalizado (sin librería externa) — últimos N meses
  - Delta vs período anterior (ej: `+12.3%`)
  - Badge de estado: on_track (≥100% de meta) / at_risk (≥80%) / behind (<80%)
  - Menú contextual (hover): editar, eliminar
- Botón `+` para agregar KPI → dialog con form completo

---

### /crm — Leads

**Tipo:** Server + Client Component  
**Server fetches:** `leads` (sin deleted_at, order: created_at DESC) + `profiles` activos + `departments`

**UI:**
- Barra de búsqueda (full_name, email, phone)
- Filtros: stage, source, assigned_to, department_id
- Tabla con columnas: Nombre, Email, Teléfono, Fuente, Etapa (badge coloreado), Monto, Fecha cierre estimada, Asignado, Acciones
- Click en fila → detail page
- Botón `+` → dialog crear lead
- Menú por fila: editar, eliminar (soft delete)

**Etapas del pipeline con colores:**
- new (gray), qualified (blue), meeting_scheduled (violet), meeting_done (indigo), proposal_sent (amber), negotiation (orange), won (green), lost (red)

---

### /crm/pipeline — Pipeline Kanban

**Tipo:** Server + Client Component  
**Server fetches:** `leads` (campos mínimos para kanban) + `profiles` activos

**UI:**
- 7 columnas (excluye "lost" o lo incluye al final según config)
- Cada columna: encabezado con nombre + count, area scrolleable de cards
- Lead card: nombre, email, teléfono, fuente (badge), monto
- Drag & drop entre columnas (cambia el `stage`)
- Botón `+` en cada columna → form rápido de lead pre-seleccionando esa etapa

---

### /calendar — Calendario

**Tipo:** Server + Client Component  
**Server fetches:** `tasks` (con due_date, no done/cancelled) + `leads` (con expected_close_date, no won/lost) + `client_settings` (calendly_name, calendly_email, calendly_api_key)

**Props al cliente:** tasks[], leads[], calendlyConnected: {name, email} | null

**UI — Tab "Tareas" (interno):**
- Grid mensual Mon-start (42 celdas, 6 filas × 7 cols)
- Navegación mes anterior/siguiente
- Eventos en días: tareas (coloreadas por prioridad) + leads (coloreados por etapa)
- Click en día → panel lateral con lista de eventos del día

**UI — Tab "Calendly":**
- Si NO conectado: wizard de 4 pasos con instrucciones + input de API key + botón "Conectar"
- Si conectado: banner con nombre/email + botón desconectar + grid mensual con eventos de Calendly
- Card de evento: nombre, hora, duración, ícono de ubicación (video/presencial/web), link de reunión, lista de invitados

---

### /tasks — Tareas

**Tipo:** Server + Client Component  
**Server fetches:** `tasks` (con order: position, created_at DESC) + `profiles` + `departments`

**UI:**
- Kanban de 5 columnas: Backlog, Por hacer, En progreso, En revisión, Completado
- Colores de borde superior por columna: gray, blue, amber, purple, green
- Task card: título, ícono de prioridad (🔥 urgent, ⚠️ high, ↑ medium, ↓ low), avatar asignado, fecha límite, badge de departamento
- Drag & drop entre columnas
- Botón `+` global → dialog crear tarea
- Click en card → editar tarea

---

### /team — Equipo

**Tipo:** Server + Client Component  
**Server fetches:** `profiles` (order: full_name) + `departments`

**UI:**
- Tabla con: Avatar+Nombre, Email, Rol (badge), Departamento, Estado (activo/inactivo), Último acceso (relativo)
- Botón "Invitar miembro" → dialog (email, rol, departamento) → llama `POST /api/team/invite`
- Menú por fila: cambiar rol, activar/desactivar, eliminar
- Permisos: solo owner/admin pueden invitar o cambiar roles

**Formateo de último acceso:** "Hoy", "Ayer", "Hace X días", "Hace X meses"

---

### /content — Contenido

**Tipo:** Server + Client Component  
**Server fetches:** `content_pieces` (order: created_at DESC)

**UI:**
- Filtros: por estado (idea/draft/review/scheduled/published) y plataforma
- Grid de cards con: platform emoji, format badge, status badge, título, descripción preview, fecha programada
- Botón `+` → dialog crear pieza (title, description, format, platform, status, scheduled_for, url, tags)
- Editar / eliminar por card

---

### /competitors — Competidores

**Tipo:** Server + Client Component  
**Server fetches:** `competitors` (order: name ASC)

**UI:**
- Grid de cards por competidor: nombre, categoría, handles sociales (clickables), website, notas, tags
- Links sociales abren en nueva pestaña (auto-agrega https://)
- Botón `+` → dialog crear/editar competidor

---

### /ai — IA Asistente

**Tipo:** Client Component puro (no hay server fetch)

**UI:**
- Área de mensajes con bubbles: usuario (derecha, brand color) + IA (izquierda, gray)
- Estado inicial: 6 sugerencias rápidas en grid 2x3
- Input: textarea auto-resize, Enter = enviar, Shift+Enter = nueva línea
- Streaming en tiempo real (tokens de Claude se van mostrando)
- Botón "Copiar" en mensajes de IA
- Botón "Reset" (borra conversación)
- Markdown custom: **negrita**, *cursiva*, `código`, bloques de código, listas, headings

**Sugerencias predefinidas:**
1. "¿Cómo está mi pipeline hoy? Analizalo y decime qué hacer"
2. "Resumime los KPIs del mes y decime en qué estoy fallando"
3. "¿Qué tareas urgentes tengo pendientes?"
4. "Dame 3 acciones concretas para mejorar mi tasa de conversión"
5. "Escribime un email de seguimiento para un lead que no respondió hace 5 días"
6. "¿Cómo bajo el churn rate? Dame un plan de acción"

---

### /discovery — Discovery

**Tipo:** Server + Client Component  
**Server fetches:** `discovery_forms` + count de respuestas por formulario (desde `discovery_responses`)

**UI:**
- Lista de formularios con: título, descripción, conteo de respuestas, estado activo/inactivo
- Editor de formulario: drag-reorder de preguntas, tipos (text/textarea/choice/rating), required toggle
- Vista de respuestas por formulario
- Copia del link público del formulario
- El formulario en sí es accesible públicamente en `/discovery/[id]/respond`

---

### /comms — Comunicaciones

**Tipo:** Server + Client Component  
**Server fetches:** `announcements` (pinned primero, luego por fecha) + mapa de profiles (id → nombre/email) + rol del usuario actual

**UI:**
- Lista de anuncios: los "pinned" arriba con ícono de pin
- Card: título, cuerpo, autor, tiempo relativo
- Crear/editar/eliminar (solo si es autor o admin)
- Toggle pin (solo admin)

---

### /settings — Configuración

**Tipo:** Server Component (hub de navegación)

**Sub-páginas:**
- `/settings/profile` → Perfil personal
- `/settings/branding` → Logo, colores, nombre del negocio
- `/settings/integrations` → Conectar servicios externos
- `/settings/billing` → Plan, créditos IA, pagos

---

### Páginas Coming Soon

| Ruta | Ícono | Descripción | Disponible |
|------|-------|-------------|-----------|
| /socials | Radio | Instagram, TikTok, YouTube métricas | Septiembre 2026 |
| /ads | BarChart2 | Meta Ads + Google Ads en un panel | Agosto 2026 |
| /integrations | Plug | Hub de integraciones externas | Julio 2026 |
| /mobile | Smartphone | App iOS y Android | Diciembre 2026 |

---

## 8. COMPONENTES Y DESIGN SYSTEM

### 8.1 Layout (5 componentes)

| Componente | Archivo | Descripción |
|-----------|---------|-------------|
| DashboardLayout | layout/dashboard-layout.tsx | Two-column: sidebar fija (desktop) + Sheet drawer (mobile) + Toaster + AiChatWidget |
| Sidebar | layout/sidebar.tsx | Nav con logo, 7 secciones, 16 items, active detection |
| Topbar | layout/topbar.tsx | Header h-14, botón menú mobile, Cmd+K trigger, UserMenu |
| UserMenu | layout/user-menu.tsx | Avatar dropdown: nombre, email, rol, links a perfil/settings/logout |
| CommandPalette | layout/command-palette.tsx | Cmd+K: búsqueda de páginas (estático) + leads (live) + tareas (live) |

### 8.2 UI Primitives (27 componentes — shadcn/Radix)

Button, Card, Badge, Input, Avatar, Dialog, AlertDialog, ConfirmDialog, Sheet, DropdownMenu, Checkbox, Switch, Label, Textarea, Select, Command, Popover, Tooltip, Tabs, Table, ScrollArea, Separator, Calendar, Form, Skeleton, Alert, Sonner

### 8.3 Feature Components (8 componentes)

| Componente | Archivo | Descripción |
|-----------|---------|-------------|
| AiChatWidget | ai-chat-widget.tsx | Widget flotante bottom-right, panel 380×520px, streaming, quick suggestions |
| AiMessage | ai-message.tsx | Renderer de markdown custom (sin deps externas) |
| PageHeader | page-header.tsx | Encabezado estándar: título + descripción + slot para acciones |
| EmptyState | empty-state.tsx | Ícono + título + descripción + acciones opcionales |
| Loading | loading.tsx | Spinner Loader2, variantes: inline y fullpage |
| LiveNotifications | live-notifications.tsx | Demo: notificaciones aleatorias cada 45-90s |
| LastSeenUpdater | last-seen-updater.tsx | Actualiza `profiles.last_seen_at` cada 15min (throttled con localStorage) |
| ComingSoon | placeholder/coming-soon.tsx | Placeholder para módulos futuros: ícono + descripción + fecha disponible |

### 8.4 Design Tokens

**Color principal:** `#236461` (teal oscuro) → HSL: `163 47% 28%`

**Paleta CSS (variables en :root):**
```css
--brand:            163 47% 28%   /* #236461 — verde teal */
--brand-foreground: 0 0% 100%     /* blanco */
--brand-soft:       163 33% 94%   /* #ebf2f1 — mint suave */
--background:       0 0% 100%     /* blanco */
--foreground:       0 0% 4%       /* casi negro */
--muted:            220 9% 97%    /* gris muy claro */
--muted-foreground: 220 9% 46%    /* gris medio */
--border:           220 9% 90%    /* gris borde */
--destructive:      0 72% 51%     /* rojo */
--warning:          38 92% 50%    /* amber */
--success:          158 64% 32%   /* verde */
--info:             221 83% 53%   /* azul */
--radius:           0.5rem        /* 8px base */
```

**Tipografía:** Inter (Google Fonts), variable `--font-inter`

**Dark mode:** Instalado (`next-themes`) pero **NO activado**

**Íconos:** lucide-react v0.511.0 (todo el proyecto)

### 8.5 Patrón de theming dinámico

El color de marca se puede cambiar desde `client_settings.brand_color`. El dashboard layout hace:
1. Lee `brand_color` del servidor
2. Convierte hex → HSL
3. Inyecta `<style>` con las variables CSS sobreescritas
4. Previene FOUC (flash of unstyled content) al hacerlo server-side

---

## 9. FLUJO DE DATOS

### 9.1 Patrón principal (Server → Client)

```
Supabase DB
    ↓ (query server-side)
page.tsx (async Server Component)
    ↓ requireAuth() → valida JWT
    ↓ Promise.all([query1, query2, ...])
    ↓ props
*-client.tsx (Client Component)
    ↓ useState(initialData)
    ↓ CRUD → createClient() browser → Supabase RLS
    ↓ toast.success() / toast.error()
```

### 9.2 Estado global

**No existe.** No hay:
- Redux / Zustand / Jotai / Recoil
- React Context providers globales
- SWR/React Query global store

Cada componente cliente maneja su propio estado local. El hook `useUser()` usa SWR para cachear el perfil del usuario actual.

### 9.3 Mutaciones

Todas las mutaciones van directo al cliente Supabase del browser, con RLS server-side. Ejemplo:
```typescript
const sb = createClient()  // browser client, anon key
const { data, error } = await sb
  .from("leads")
  .update({ stage: "qualified" })
  .eq("id", leadId)
  .select()
  .single()
```

No se usan Server Actions de Next.js.

### 9.4 Real-time

**No hay subscripciones Supabase real-time.** Los datos se actualizan solo al navegar (refetch en cada page load). No hay sincronización entre pestañas ni entre usuarios.

### 9.5 Caching

- **Ninguno a nivel de páginas.** Cada carga → nuevas queries a Supabase.
- **useUser():** SWR con `revalidateOnFocus: false` (cachea el perfil del usuario entre renders)
- **No ISR ni static generation** para páginas del dashboard (siempre dynamic)

---

## 10. INTEGRACIONES EXTERNAS

### 10.1 Anthropic / Claude AI

| Parámetro | Valor |
|-----------|-------|
| SDK | @anthropic-ai/sdk 0.40.0 |
| Modelo | claude-opus-4-5 |
| Max tokens | 1024 |
| Streaming | Sí (ReadableStream) |
| API Key | Env var `ANTHROPIC_API_KEY` (solo server) |
| Idioma | Español rioplatense |

**Contexto inyectado por request** (construido en `/api/ai/chat`):
```
=== CONTEXTO REAL DEL NEGOCIO: [business_name] ===
PIPELINE ([N] leads totales, [N] activos):
  - Nuevos: [N] leads
  - Calificados: [N] leads ($XXX)
  ...
  → Valor total del pipeline activo: $XXX USD

KPIs (ultimo dato disponible por métrica):
  - MRR: $21,600 (meta: $24,000) [mayo 2026]
  ...

TAREAS PENDIENTES:
URGENTES: "Cerrar con...", ...
EN PROGRESO: ...
```

**Credit tracking:** campos `ai_credits_used` y `ai_credits_limit` en `client_settings` existen en DB pero **no están siendo chequeados/incrementados** en el código actual.

---

### 10.2 Calendly

| Parámetro | Valor |
|-----------|-------|
| Base URL | https://api.calendly.com |
| Auth | Bearer token (API key del usuario) |
| Almacenamiento | Tabla `client_settings` (plaintext) |
| Endpoints usados | /users/me, /scheduled_events, /scheduled_events/{uuid}/invitees |

**Ventana de eventos:** -3 meses / +6 meses desde hoy  
**Límite:** 100 eventos, 5 invitados por evento, procesamiento máx 60 eventos  
**Caching:** Ninguno (fetch fresco en cada GET /api/calendly)

---

### 10.3 Supabase Auth

- Proveedor de autenticación principal
- Email + password (magic link disponible pero no implementado en UI)
- Cookies de sesión manejadas por `@supabase/ssr`
- Service Role usada para: crear invitaciones, crear perfiles admin, bypassear RLS en operaciones internas

---

## 11. VARIABLES DE ENTORNO

### Requeridas

| Variable | Exposición | Descripción |
|----------|-----------|-------------|
| NEXT_PUBLIC_SUPABASE_URL | Cliente + Servidor | URL del proyecto Supabase |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Cliente + Servidor | Key pública (RLS activa) |
| SUPABASE_SERVICE_ROLE_KEY | Solo Servidor | Key admin (bypass RLS) |
| ANTHROPIC_API_KEY | Solo Servidor | Key de Claude API |
| NEXT_PUBLIC_APP_URL | Cliente + Servidor | URL base de la app |

### Security Headers (next.config.ts)

Aplicados en todas las rutas:
```
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
X-XSS-Protection: 1; mode=block
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

---

## 12. HALLAZGOS Y GAPS

### ✅ Fortalezas

1. **Separación Server/Client clara** — Server Components para fetching, Client Components para interactividad
2. **RLS en 100% de las tablas** — Seguridad a nivel de base de datos
3. **Tipado estático completo** — TypeScript strict, tipos Supabase generados
4. **Inyección de tema server-side** — Previene FOUC del color de marca
5. **Contexto real en IA** — El asistente tiene acceso a datos reales del negocio
6. **Soft deletes** — leads y tasks nunca se borran permanentemente
7. **Datos demo realistas** — Seed de LM Mentoring con 60 leads, 35 tareas, 24 KPIs

### ⚠️ Gaps identificados

| Gap | Impacto | Descripción |
|-----|---------|-------------|
| Sin middleware.ts en raíz | Medio | Las sesiones podrían no refrescarse en cada request |
| Sin real-time subscriptions | Bajo | Los datos se vuelven stale; no hay sincronización entre usuarios |
| Sin paginación | Medio | Queries con `.limit()` pero sin cursor/offset para datasets grandes |
| Historial IA no persistido | Bajo | Las conversaciones del chat viven en estado local (se pierden al recargar) |
| AI credits no enforced | Bajo | El límite está en DB pero no se chequea antes de llamar a Claude |
| Calendly API key en plaintext | Bajo | Guardada sin encriptar en `client_settings` |
| Sin error boundaries | Medio | Errores no capturados podrían crashear la app |
| Sin dark mode | Cosmético | `next-themes` instalado pero no activado |
| Sin ISR/caching | Rendimiento | Cada page load = nuevas queries a Supabase |
| Sin React Suspense | Rendimiento | No hay loading granular por sección |

### 🗺️ Módulos pendientes de implementar

1. **Redes Sociales** (`/socials`) — Instagram, TikTok, YouTube metrics
2. **Publicidad** (`/ads`) — Meta Ads + Google Ads
3. **Hub de Integraciones** (`/integrations`) — Conexión de herramientas externas
4. **App Móvil** (`/mobile`) — iOS + Android
5. **Sub-páginas de Settings** — Profile, Branding (UI), Billing
6. **Detalle de lead** (`/crm/[id]`) — Vista individual con actividades y timeline
7. **Persistencia de conversaciones IA** — Guardar historial en `ai_conversations` / `ai_messages`
8. **Enforcement de créditos IA** — Chequear y decrementar `ai_credits_used`

---

## APÉNDICE — Historial de Commits

| Commit | Descripción |
|--------|-------------|
| Initial | Create Next App bootstrap |
| Omni v1 | Dashboard operativo completo |
| Auth fixes | Eliminación de redirect loops en middleware |
| Feature modules | Content, Competitors, Comms, Discovery |
| Pipeline Kanban | Vista kanban del pipeline de ventas |
| Discovery public | Formulario público + respuestas |
| Cmd+K palette | Command palette de navegación |
| Drag-drop tasks | Kanban interactivo con notificaciones live |
| Mobile responsive | Overflow handling, columnas responsive |
| Demo seed data | LM Mentoring pre-poblado |
| KPIs redesign | Month tabs, sparklines, delta |
| AI assistant | Widget flotante con contexto del negocio |
| Sales Calendar | Doble tab: interno + Calendly |

---

*Documento generado automáticamente mediante auditoría multi-agente — Nova Software — Mayo 2026*
