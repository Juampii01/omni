# Omni — Instagram Integration Setup

> Para cada instancia de Omni (Juampi + cada cliente).
> La integración usa la Instagram Graph API via una Meta App.

---

## Arquitectura

```
Usuario → Meta OAuth → Instagram Graph API
                ↓
          Long-lived token (60 días)
                ↓
       AES-256-GCM encrypted → Supabase
                ↓
         Omni Dashboard (Publisher, Insights, DMs)
```

---

## 1. Crear Meta App (una sola vez por instancia)

1. Ir a [developers.facebook.com](https://developers.facebook.com)
2. My Apps → Create App
3. Tipo: **Business** (permite Instagram Graph API)
4. Nombre: `Omni [Cliente]`
5. App ID → copiar a `META_APP_ID` en `.env.local`

### 1a. Agregar productos a la App

En el dashboard de la App:
- **Instagram Graph API** → Add
- **Facebook Login for Business** → Add (necesario para el OAuth)

### 1b. Configurar permisos

Instagram Graph API → Settings:
- Permisos requeridos:
  - `instagram_basic`
  - `instagram_content_publish`
  - `instagram_manage_comments`
  - `instagram_manage_insights`
  - `pages_show_list`
  - `pages_read_engagement`
  - `instagram_manage_messages` (para DMs — requiere revisión de Meta)

### 1c. OAuth redirect URI

Facebook Login for Business → Settings → Valid OAuth Redirect URIs:

```
https://[dominio-vercel].vercel.app/api/instagram/oauth/callback
https://[dominio-personalizado]/api/instagram/oauth/callback
```

> ⚠️ Agregar TAMBIÉN `http://localhost:3000/api/instagram/oauth/callback` para desarrollo local.

### 1d. App Secret

Settings → Basic → App Secret → copiar a `META_APP_SECRET`

---

## 2. Variables de entorno requeridas

```bash
META_APP_ID=123456789
META_APP_SECRET=abc123...
META_GRAPH_API_VERSION=v23.0
OAUTH_TOKEN_ENCRYPTION_KEY=hex32bytes...  # openssl rand -hex 32

# URL pública de la app (sin trailing slash)
NEXT_PUBLIC_APP_URL=https://tu-app.vercel.app
```

### Generar OAUTH_TOKEN_ENCRYPTION_KEY

```bash
openssl rand -hex 32
# → ejemplo: a1b2c3d4e5f6...
```

Esta clave encripta el access token de Instagram con AES-256-GCM antes de guardarlo en Supabase. **Si se pierde, todos los tokens guardados quedan inutilizables** — habría que reconectar todas las cuentas.

---

## 3. Conectar cuenta de Instagram

### Requisitos

- Cuenta de Instagram **Business** o **Creator** (no cuenta personal)
- La cuenta debe estar vinculada a una **Página de Facebook**

Para convertir a Business:
1. Instagram → Configuración → Cuenta → Cambiar a cuenta profesional

Para vincular a Página de Facebook:
1. Facebook → Configuración → Instagram → Conectar cuenta

### Proceso de conexión

1. En el dashboard Omni: ir a `/settings` → sección Instagram
2. Click en "Conectar Instagram"
3. Autorizar la app en Facebook
4. Seleccionar la Página de Facebook conectada
5. Omni guarda el token encriptado → aparece la cuenta conectada

---

## 4. Token refresh automático

Los long-lived tokens de Instagram expiran en 60 días. El cron de Vercel los refresca automáticamente:

**`vercel.json`:**
```json
{
  "crons": [
    {
      "path": "/api/cron/instagram-sync",
      "schedule": "0 8 * * *"
    }
  ]
}
```

El sync diario:
1. Refresca el token (renueva los 60 días)
2. Sincroniza media reciente → `instagram_media`
3. Sincroniza insights → `instagram_account_insights`

> Plan Hobby de Vercel: solo soporta 1 cron diario. Para crons más frecuentes (publisher cada 5min), usar Vercel Pro o un servicio externo como GitHub Actions o Upstash.

---

## 5. Webhook de Meta (para DMs y comentarios en tiempo real)

### Configurar en Meta App

1. Meta App → Webhooks → Add Subscriptions
2. Product: **Instagram**
3. Webhook URL: `https://[dominio]/api/instagram/webhook`
4. Verify Token: el valor de `CRON_SECRET` (o uno dedicado)
5. Suscribirse a:
   - `messages` (DMs)
   - `mentions`
   - `comments`
   - `story_insights`

### Variables adicionales

```bash
# Para validar firma HMAC-SHA256 del webhook
META_WEBHOOK_SECRET=...   # App Secret de Meta (el mismo META_APP_SECRET)
```

### Test del webhook

```bash
# Verificar que Meta puede llegar al endpoint
curl -X GET "https://[dominio]/api/instagram/webhook?hub.mode=subscribe&hub.verify_token=[CRON_SECRET]&hub.challenge=test123"
# Debe retornar: test123
```

---

## 6. Instagram Publisher

### Requisitos para publicar

- La cuenta debe tener permisos `instagram_content_publish`
- Las URLs de media deben ser **públicamente accesibles** (no requieren autenticación)
- Para usar Supabase Storage: generar URLs firmadas con expiración larga

### Tipos de contenido soportados

| Tipo | Formato | Límites |
|------|---------|---------|
| IMAGE | JPEG, PNG | Max 8MB, ratio 4:5 a 1.91:1 |
| REEL | MP4 (H.264) | Max 1GB, 15s - 90s |
| CAROUSEL | JPEG/PNG | 2-10 imágenes |

### Flujo de publicación

```
Usuario crea post en Omni
        ↓
  Row insertada en instagram_publish_queue (status: pending)
        ↓
  Cron /api/cron/ig-publish (cada 5min en Pro, manual en Hobby)
        ↓
  createImageContainer / createReelContainer → Meta API
        ↓
  publishContainer → Media publicada en Instagram
        ↓
  status: published, ig_media_id guardado
```

---

## 7. Permisos avanzados (para producción)

Por defecto, una Meta App en desarrollo solo puede conectar cuentas de testers. Para conectar cuentas de clientes reales:

1. Meta App → App Review → Solicitar permisos
2. Los permisos que requieren revisión:
   - `instagram_manage_messages` (DMs)
   - `instagram_content_publish` (publicación)
3. Proporcionar: política de privacidad, casos de uso, video demo
4. Tiempo de revisión: 5-10 días hábiles

> Para uso propio (tu cuenta de IG), desarrollo es suficiente — no necesitás revisión.

---

## Troubleshooting

### "Invalid OAuth redirect URI"
El dominio de callback no está en la whitelist de la Meta App. Agregar en: Facebook Login → Settings → Valid OAuth Redirect URIs.

### "Token inválido" después de 60 días
El cron de refresh falló. Reconectar manualmente desde `/settings`.

### Media no se publica
- Verificar que la URL de la imagen es pública (abrir en modo incógnito)
- Verificar que el ratio de aspecto es válido
- Revisar `instagram_publish_queue.last_error` para el mensaje de error de Meta

### DMs no llegan
Los webhooks de Meta requieren SSL válido y dominio público. No funciona en `localhost` sin un túnel (ej: ngrok).

---

*Documentación interna KAVAR LLC — v1.0 mayo 2026*
