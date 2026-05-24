# Omni — Deploy para nuevo cliente

> Tiempo estimado: 2-3 horas primera vez, 45 min a partir de la segunda.
> Modelo de negocio: $4,000 setup + $500/mes mantenimiento.

---

## Índice

1. Pre-requisitos
2. Fork / copy del repo
3. Supabase — nuevo proyecto
4. Variables de entorno
5. Vercel — nuevo proyecto
6. Migraciones y seed inicial
7. Configuración del cliente en Omni
8. Checklist final

---

## 1. Pre-requisitos

- Cuenta GitHub con acceso al repo `Juampii01/omni`
- Cuenta Vercel (plan Hobby es suficiente para empezar)
- Cuenta Supabase (Free tier — hasta 500MB DB, 1GB storage)
- Node.js 18+ instalado localmente
- Supabase CLI: `npm i -g supabase`

---

## 2. Fork / copy del repo

```bash
# Opción A: usar el template directamente
gh repo create omni-[cliente] --template Juampii01/omni --private

# Opción B: clonar y subir a nuevo repo
git clone https://github.com/Juampii01/omni.git omni-[cliente]
cd omni-[cliente]
git remote set-url origin https://github.com/Juampii01/omni-[cliente].git
git push -u origin main
```

---

## 3. Supabase — nuevo proyecto

1. Ir a [supabase.com](https://supabase.com) → New project
2. Nombre: `omni-[cliente]`
3. Contraseña de DB: generar una fuerte (guardar en 1Password)
4. Región: elegir la más cercana al cliente
5. Una vez creado, ir a **Settings → API** y copiar:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`
6. Ir a **Settings → General → Reference ID** → copiar el `project_ref` (ej: `nygcxwaxfvxximehybzv`)

---

## 4. Variables de entorno

Crear `.env.local` en la raíz del proyecto:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://[ref].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# App
NEXT_PUBLIC_APP_URL=https://omni-[cliente].vercel.app

# Instagram (Meta App — ver INSTAGRAM-SETUP.md)
META_APP_ID=
META_APP_SECRET=
META_GRAPH_API_VERSION=v23.0
OAUTH_TOKEN_ENCRYPTION_KEY=   # 32 bytes hex: openssl rand -hex 32

# Claude AI (para Research + CoachMap)
ANTHROPIC_API_KEY=sk-ant-...

# Cron security
CRON_SECRET=   # openssl rand -hex 32
```

> ⚠️ NUNCA commitear `.env.local`. Está en `.gitignore`.

---

## 5. Vercel — nuevo proyecto

1. Ir a [vercel.com](https://vercel.com) → Add New Project
2. Importar desde GitHub: `omni-[cliente]`
3. Framework: **Next.js** (auto-detectado)
4. **Environment Variables**: copiar todas las del `.env.local`
5. Deploy → esperar que se complete
6. Configurar dominio personalizado si el cliente tiene uno (ej: `dashboard.miempresa.com`)

---

## 6. Migraciones y seed inicial

### 6a. Aplicar migraciones via Supabase Management API

```bash
# Obtener PAT de Supabase (Management API)
# https://supabase.com/dashboard → Account → Access Tokens
export SUPABASE_PAT="sbp_..."
export PROJECT_REF="[ref]"

# Aplicar cada migración
for f in supabase/migrations/*.sql; do
  SQL=$(cat "$f")
  curl -s -X POST "https://api.supabase.com/v1/projects/$PROJECT_REF/database/query" \
    -H "Authorization: Bearer $SUPABASE_PAT" \
    -H "Content-Type: application/json" \
    -d "$(echo "$SQL" | jq -Rs '{"query": .}')"
  echo "✅ Applied: $f"
done
```

### 6b. Seed inicial del cliente

Editar `scripts/seed-real.sql` con los datos del cliente (o crear `scripts/seed-[cliente].sql`) y ejecutar:

```bash
SQL=$(cat scripts/seed-real.sql)
curl -s -X POST "https://api.supabase.com/v1/projects/$PROJECT_REF/database/query" \
  -H "Authorization: Bearer $SUPABASE_PAT" \
  -H "Content-Type: application/json" \
  -d "$(echo "$SQL" | jq -Rs '{"query": .}')"
```

### 6c. Crear primer usuario

1. Ir a Supabase → Authentication → Users → Invite user
2. Email del cliente → enviar invitación
3. El cliente hace click en el link y setea su contraseña

---

## 7. Configuración del cliente en Omni

### 7a. client_settings

```sql
UPDATE public.client_settings SET
  business_name = '[Nombre del negocio]',
  currency      = 'USD',
  timezone      = 'America/Argentina/Buenos_Aires',
  onboarding_completed = true,
  demo_mode     = false;
```

### 7b. Agregar clientes del cliente

El cliente los puede agregar desde `/clients` en el dashboard.

O via SQL:

```sql
INSERT INTO public.clients (full_name, company, status, tier, monthly_fee, currency, health_score)
VALUES ('[Nombre cliente]', '[Empresa]', 'active', 'standard', 2000, 'USD', 80);
```

### 7c. Instagram (opcional)

Ver `INSTAGRAM-SETUP.md` para el setup completo de la integración.

---

## 8. Checklist final

```
[ ] Repo privado creado en GitHub
[ ] Supabase project creado + migraciones aplicadas
[ ] Vercel project desplegado
[ ] Variables de entorno configuradas en Vercel
[ ] Primer usuario creado (el cliente)
[ ] client_settings actualizado (nombre del negocio, moneda, timezone)
[ ] Clientes cargados
[ ] Instagram conectado (si aplica)
[ ] Dominio personalizado configurado (si aplica)
[ ] CRON_SECRET configurado
[ ] ANTHROPIC_API_KEY configurada
[ ] Demo de 30 min con el cliente
```

---

## Troubleshooting

### "Error: relation does not exist"
Las migraciones no se aplicaron en orden. Verificar que estén todas.

### "Invalid API key"
Revisar que las keys de Supabase son del proyecto correcto (no del proyecto de Juampi).

### Build failed en Vercel
Revisar los logs de build. Usualmente es una variable de entorno faltante o un import roto.

### Instagram OAuth redirige a error
Ver `INSTAGRAM-SETUP.md` — el dominio de callback debe estar en la whitelist de la Meta App.

---

*Documentación interna KAVAR LLC — v1.0 mayo 2026*
