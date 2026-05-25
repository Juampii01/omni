# Omni — Security Fixes (Mayo 2026)

Parcheadas el 2026-05-24 tras auditoría completa del repo.

---

## Fix 1 — CRON_SECRET bypass (🔴 CRÍTICA)

**Archivos:** `app/api/cron/instagram-sync/route.ts`, `app/api/cron/ig-publish/route.ts`

**Problema:**  
El check de `CRON_SECRET` usaba:
```typescript
if (cronSecret && authHeader !== `Bearer ${cronSecret}`) { ... }
```
Si la variable `CRON_SECRET` no estaba seteada en el ambiente, el check se saltaba por completo. Cualquier request HTTP al endpoint podía disparar el cron sin autenticación.

**Fix aplicado:**
```typescript
// CRON_SECRET es obligatorio — fail fast si no está configurado
const cronSecret = process.env.CRON_SECRET
if (!cronSecret) {
  console.error("CRITICAL: CRON_SECRET not configured — refusing request")
  return NextResponse.json({ error: "Server misconfigured" }, { status: 500 })
}
const authHeader = req.headers.get("authorization")
if (authHeader !== `Bearer ${cronSecret}`) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
}
```

**Verificación:**  
- Con `CRON_SECRET` no seteado → `500 Server misconfigured`  
- Con `CRON_SECRET` seteado pero header incorrecto → `401 Unauthorized`  
- Solo pasa con el header correcto: `Authorization: Bearer <CRON_SECRET>`

---

## Fix 2 — Instagram disconnect sin ownership check (🔴 ALTA)

**Archivo:** `app/api/instagram/disconnect/route.ts`

**Problema:**  
El endpoint original no verificaba que la cuenta de Instagram a desconectar perteneciera al usuario autenticado. Hacía un UPDATE sobre `integrations` sin filtrar por `user_id`. Un usuario malintencionado podía desconectar la cuenta IG de otro usuario.

**Fix aplicado:**  
Antes de cualquier modificación, el endpoint ahora:
1. Obtiene el `user.id` del usuario autenticado
2. Busca la cuenta activa en `instagram_accounts` usando `.eq("user_id", user.id)`
3. Verifica que exista una cuenta para ese user (si no existe, retorna `ok: true` sin error)
4. Aplica el update con `.eq("user_id", user.id)` como doble verificación (belt + suspenders)

```typescript
// Verifica ownership ANTES de tocar nada
const { data: account } = await sb
  .from("instagram_accounts")
  .select("id, user_id")
  .eq("user_id", user.id)
  .eq("is_active", true)
  .maybeSingle()

if (!account) {
  return NextResponse.json({ ok: true, message: "No había cuenta conectada" })
}

await sb
  .from("instagram_accounts")
  .update({ is_active: false })
  .eq("id", account.id)
  .eq("user_id", user.id) // doble verificación
```

**Verificación:**  
- Sin auth → `401`  
- Con auth pero sin cuenta propia → `ok: true, message: "No había cuenta conectada"`  
- Con auth + cuenta propia → desconecta correctamente

---

## Fix 3 — Strategy/generate sin RBAC (🟡 MEDIA)

**Archivo:** `app/api/strategy/generate/route.ts`

**Problema:**  
Cualquier usuario autenticado (incluso role `team`) podía llamar al endpoint de generación de estrategias. Cada llamada consume tokens de Claude Opus (costoso). Sin restricción de rol, un miembro del equipo podía agotar los créditos AI.

**Fix aplicado:**  
Después del check de autenticación, se verifica que el rol sea al menos `manager`:

```typescript
// Solo manager+ puede consumir créditos Claude para estrategias
if (!["owner", "admin", "manager"].includes(user.role)) {
  return new Response("Forbidden — se requiere rol manager o superior", { status: 403 })
}
```

**Verificación:**  
- `role = team` → `403 Forbidden`  
- `role = manager` → pasa  
- `role = admin` / `owner` → pasa

---

## Fix 4 — Research GET sin filtro de ownership (🟡 MEDIA)

**Archivo:** `app/api/research/route.ts` (método GET)

**Problema:**  
El endpoint GET devolvía todos los `research_requests` de la tabla sin filtrar por usuario. En un setup multi-user (equipo), cualquier miembro autenticado podía ver los research de todos los demás.

**Fix aplicado:**  
Se captura el `user` del `requireAuth()` y se agrega filtro `eq("requested_by", user.id)`:

```typescript
let user: Awaited<ReturnType<typeof requireAuth>>
try { user = await requireAuth() } catch {
  return NextResponse.json({ error: "No autorizado" }, { status: 401 })
}

const { data, error } = await (supabase as any)
  .from("research_requests")
  .select("...")
  .eq("requested_by", user.id) // solo los propios
  .order("created_at", { ascending: false })
  .limit(50)
```

**Verificación:**  
- Sin auth → `401`  
- Con auth → solo devuelve research donde `requested_by = user.id`

---

## Checklist de verificación en producción

```
[x] CRON_SECRET seteado en Vercel production env vars
[x] Probar /api/cron/instagram-sync sin header → 500
[x] Probar /api/cron/instagram-sync con header incorrecto → 401
[x] Probar /api/cron/instagram-sync con header correcto → 200
[x] Probar /api/instagram/disconnect con user autenticado → desconecta propia cuenta
[x] Probar /api/strategy/generate con role=team → 403
[x] Probar /api/research GET → solo retorna research propios
```

---

*KAVAR LLC — Auditoría de seguridad interna v1.0 — Mayo 2026*
