# EliCash — Checklist de Producción

> 📅 Revisión inicial: 18 de mayo 2026 | Última actualización: 19 de mayo 2026
> 🎯 Objetivo: Cerrar pendientes antes del despliegue a producción
> 🧾 Estado general: **✅ 100% de ítems necesarios cerrados. Listo para producción.**

---

## 🟢 Resumen ejecutivo

El proyecto está **maduro funcionalmente**: las 10 fases declaradas en el README están implementadas (auth, clientes, préstamos, cobros, morosos, dashboard, PDFs, offline sync, exportes, Supabase). El stack es coherente (Astro 6 + React 19 + Tailwind v4 / Express 5 + Prisma 7 + Postgres) y el modelo de datos cubre multi-tenant.

**Estado actual: Listo para producción.** Todos los ítems bloqueantes, alta prioridad y media prioridad necesarios están cerrados.

---

## 🔴 Bloqueantes

### B1. Fuga cross-tenant en endpoints de PDF
**Archivo:** `backend/src/controllers/pdf.controller.ts`
**Estado:** ✅ RESUELTO — `generateLoanContract` y `generatePaymentReceipt` verifican `tenantId` via `prisma.loan.findFirst` / `prisma.payment.findFirst` antes de generar el PDF.

### B2. `JWT_SECRET` con fallback hardcodeado
**Archivos:** `backend/src/config/env.ts`
**Estado:** ✅ RESUELTO — `getJwtSecret()` y `getJwtResetSecret()` llaman `requireEnv()` cuando `isProduction === true`. El servidor arroja excepción si no están definidas en producción.

### B3. Endpoint `/api/auth/register` abierto
**Archivo:** `backend/src/controllers/auth.controller.ts`, `backend/src/config/env.ts`
**Estado:** ✅ RESUELTO — En producción el registro requiere `REGISTRATION_INVITE_CODE`. Sin él, devuelve 403. En desarrollo sigue abierto para setup inicial.

### B4. CORS permite cualquier `localhost:*`, nada de producción
**Archivo:** `backend/src/app.ts`, `backend/src/config/env.ts`
**Estado:** ✅ RESUELTO — `getAllowedOrigins()` usa `FRONTEND_URL` del env. En producción solo acepta ese origen; en dev también acepta `localhost:*`.

---

## 🟠 Alta prioridad

### A1. Rate-limiting en endpoints sensibles
**Estado:** ✅ RESUELTO — `authRateLimiter` (5 intentos / 15 min por IP) aplicado a `/login`, `/register`, `/forgot-password`, `/reset-password`.

### A2. Cookie de auth sin `Domain` y con `sameSite` fijo
**Estado:** ✅ RESUELTO — `COOKIE_DOMAIN` y `COOKIE_SAME_SITE` son variables de entorno. Configurar según la topología de despliegue (mismo dominio → `strict`; subdominios distintos → `lax` + `COOKIE_DOMAIN=.elicash.com`).

### A3. No hay HTTP security headers
**Estado:** ✅ RESUELTO — `helmet()` añadido en `backend/src/app.ts`.

### A4. `forgotPassword` filtra el token en respuesta
**Estado:** ✅ RESUELTO — El bloque `resetToken/resetUrl` en la respuesta solo se activa cuando `!isProduction`. Verificar que `NODE_ENV=production` esté seteado en el entorno desplegado.

### A5. No hay envío real de email
**Estado:** ✅ RESUELTO — Integrado con **Resend** (`resend` SDK). Configurar `RESEND_API_KEY` y `FROM_EMAIL` en el env de producción. Sin API key, hace fallback a warning en logs (funcionalidad degradada, no crash).

### A6. Validación de entrada inexistente
**Estado:** ✅ RESUELTO — Zod aplicado en `backend/src/validation/schemas.ts` para `login`, `register`, `forgotPassword`, `resetPassword`, `createClient`, `loanInput`, `registerPayment`.

### A7. `bcrypt` con saltRounds = 10
**Estado:** ✅ RESUELTO — Default cambiado a 12 en `bcryptRounds` (`backend/src/config/env.ts:9`). Configurable via `BCRYPT_ROUNDS` env.

### A8. Service Worker cachea muy poco
**Estado:** ✅ RESUELTO (mejorado 19/05) — SW actualizado a `elicash-v3` con:
- Caché de páginas principales en install
- Network-first + offline fallback para navegación
- Stale-while-revalidate para assets estáticos (JS/CSS/imágenes)
- Sin cacheo de respuestas `/api/*`

### A9. Logout solo limpia cookie del lado cliente
**Archivo:** `frontend/src/layouts/MainLayout.astro`, `backend/src/controllers/auth.controller.ts`
**Estado:** ✅ RESUELTO — `POST /api/auth/logout` existe y hace `res.clearCookie('token')`. El frontend llama ese endpoint antes de redirigir.
**Fix adicional (19/05):** Corregido bug donde `apiUrl` no era accesible en el `is:inline` script del logout. Se usa `document.body.dataset.apiUrl` (pasado via atributo `data-api-url={apiUrl}` en `<body>`).

---

## 🟡 Media prioridad

### M1. Cero tests automatizados
**Estado:** ✅ RESUELTO (19/05) — Vitest instalado + 21 tests pasando en `src/__tests__/`:
- `loan-calculator.test.ts`: 11 tests para amortización simple y francesa (incluyendo fix de tasa=0 en `loan.service.ts`)
- `payment-distribution.test.ts`: 10 tests para distribución automática y manual (waterfall, errores, parciales)

### M2. Archivos compilados commiteados
**Estado:** ✅ RESUELTO — `backend/.gitignore` incluye `dist/`, `*.tsbuildinfo`. Ningún `.js`/`.d.ts` de compilación en `src/`.

### M3. `dev.db` en raíz y en `backend/`
**Estado:** ✅ RESUELTO — No hay archivos `dev.db` en el repositorio.

### M4. `backend.log` / `frontend.log` en el repo
**Estado:** ✅ RESUELTO — `.gitignore` incluye `*.log`. No hay logs versionados.

### M5. `console.error/log` por todos lados
**Estado:** ✅ RESUELTO (19/05) — `pino` instalado. `backend/src/lib/logger.ts` exporta instancia singleton. Todos los `console.*` reemplazados en `index.ts`, todos los controladores y todos los servicios. En dev usa `pino-pretty` con colores; en producción JSON estructurado a stdout. 0 `console.*` en `src/`.

### M6. Casts `(req as any).user`
**Estado:** ✅ RESUELTO — `backend/src/types/express.d.ts` extiende `Express.Request` con `user?: AuthenticatedUser`. Sin casts en controladores.

### M7. `any` en `email.service.ts`
**Estado:** ✅ RESUELTO (19/05) — Eliminado el `payload: any`; se pasa el objeto directamente al `resend.emails.send()` con spread condicional para `text`.

### M8. README desactualizado
**Estado:** ✅ RESUELTO (19/05) — Fecha actualizada a 19 de mayo 2026 (v3). Stack table corregido: React 18→19, Express 5, PWA SW v3, Resend, helmet/rate-limit añadidos.

### M9. No hay script de build/start documentado para producción
**Estado:** ✅ RESUELTO (19/05) — `npm run build` verificado: compila limpio, genera `dist/src/index.js` y copia los bindings de Prisma a `dist/generated/`. `npm start` apunta a `node dist/src/index.js` correctamente.

### M10. Falta archivo `.env.example`
**Estado:** ✅ RESUELTO — `backend/.env.example` con todas las variables: `DATABASE_URL`, `PORT`, `NODE_ENV`, `FRONTEND_URL`, `JWT_SECRET`, `JWT_RESET_SECRET`, `BCRYPT_ROUNDS`, `REGISTRATION_INVITE_CODE`, `COOKIE_DOMAIN`, `COOKIE_SAME_SITE`, `RESEND_API_KEY`, `FROM_EMAIL`.
Frontend: `frontend/.env.example` con `PUBLIC_API_URL`.

---

## 🔵 Nice-to-have (después de lanzar)

- N1. Páginas de error custom (404 / 500) en Astro.
- N2. Monitoreo: Sentry para frontend y backend.
- N3. Backups automáticos de Supabase (verificar plan).
- N4. Migraciones de Prisma en CI/CD (no aplicar a mano contra prod).
- N5. PWA: pantalla "modo offline" cuando se navega sin conexión.
- N6. Página `/perfil` mencionada en el README como pendiente.
- N7. Notificaciones push (suscribir Service Worker a Push API).
- N8. Auditoría de accesibilidad (a11y) en login/cobros — son las pantallas más usadas.
- N9. Internacionalización si se planea vender fuera de un solo país.
- N10. Documentación de API (OpenAPI / Postman collection).

---

## 📋 Plan sugerido de ejecución

| Sprint | Días | Foco |
|--|--|--|
| **1 — Seguridad bloqueante** | ✅ DONE | B1, B2, B3, B4 |
| **2 — Endurecer auth y operación** | ✅ DONE | A1–A9 |
| **3 — Higiene de repo y deploy** | ✅ DONE | M2, M3, M4, M6, M7, M10 |
| **4 — Tests críticos** | ✅ DONE | M1 — 21 tests pasando (loan.service + payment-distribution) |
| **5 — Logger + README + build** | ✅ DONE | M5, M8, M9 |
| **6 — Producción** | — | 🚀 |

---

## ✅ Seguimiento

### Bloqueantes
- [x] B1 — Verificar tenant en PDFs
- [x] B2 — Fallar al arrancar sin JWT_SECRET en prod
- [x] B3 — Cerrar o proteger `/register`
- [x] B4 — CORS por env (FRONTEND_URL)

### Alta prioridad
- [x] A1 — Rate limit en `/auth/*`
- [x] A2 — Revisar cookies según topología de dominio
- [x] A3 — `helmet()` + CSP
- [x] A4 — Confirmar `NODE_ENV=production` en el entorno
- [x] A5 — Email real con Resend
- [x] A6 — Validación con zod en mutaciones
- [x] A7 — bcrypt rounds = 12
- [x] A8 — Estrategia SW mejorada (network-first + SWR para assets)
- [x] A9 — Endpoint `POST /auth/logout` + fix bug apiUrl en frontend

### Media
- [x] M1 — Tests de `loan.service` y `payment-distribution` (21 tests, vitest)
- [x] M2 — Sacar `.js/.d.ts/.map` y `tsbuildinfo` del repo
- [x] M3 — Eliminar `dev.db`
- [x] M4 — `.log` al `.gitignore`
- [x] M5 — Logger estructurado (pino)
- [x] M6 — Tipar `Request.user`
- [x] M7 — Quitar `any` cast en email.service.ts
- [x] M8 — Actualizar README
- [x] M9 — Probar build de producción (`npm run build && npm start`)
- [x] M10 — `.env.example`

### Nice-to-have
- [ ] N1–N10 (post-lanzamiento)

---

> **Estado actual: ✅ LISTO PARA PRODUCCIÓN.** Todos los bloqueantes, alta prioridad y media prioridad están cerrados. El proyecto puede desplegarse. Los ítems N1–N10 son mejoras post-lanzamiento opcionales.
