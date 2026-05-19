# EliCash — Sistema de Gestión de Préstamos y Cobros

> 📅 Última actualización: 19 de mayo 2026 (v3 — Hardening de seguridad + producción)

EliCash es una PWA (Progressive Web App) de gestión de préstamos informales construida con Astro + React Islands en el frontend y Node.js + Express + Prisma en el backend. Diseñada para trabajar en campo, incluso sin internet.

---

## 🏗️ Arquitectura

```
EliCash/
├── frontend/              ← Astro + React Islands + Tailwind V4 (PWA)
│   ├── src/
│   │   ├── pages/         ← Rutas Astro
│   │   │   ├── login.astro            (Login con swipe)
│   │   │   ├── register.astro         (Registro de cuenta)
│   │   │   ├── index.astro            (Inicio / Dashboard rápido)
│   │   │   ├── clientes/             (Lista, Alta, Perfil)
│   │   │   ├── cobros/               (Ruta del día)
│   │   │   ├── mora/                 (Página de Morosos)
│   │   │   ├── prestamos/            (Originación, Detalle)
│   │   │   └── dashboard/            (Reportes)
│   │   ├── components/    ← React Islands (.tsx)
│   │   │   ├── LoginScreen.tsx
│   │   │   ├── RegisterScreen.tsx
│   │   │   ├── SwipeToEnter.tsx
│   │   │   ├── MorososList.tsx
│   │   │   ├── ClientList.tsx
│   │   │   ├── NewClientWizard.tsx
│   │   │   ├── CobrosDia.tsx
│   │   │   ├── NewLoanWizard.tsx
│   │   │   └── DashboardData.tsx
│   │   ├── layouts/
│   │   │   └── MainLayout.astro     (Nav inferior 5 ítems + AuthGuard + Logout)
│   │   ├── styles/
│   │   │   ├── global.css           (Tailwind V4 + design tokens)
│   │   │   └── login.css            (Animaciones login/registro)
│   └── public/
│       ├── manifest.json            (PWA)
│       └── sw.js                    (Service Worker)
│
└── backend/               ← Node.js + Express + Prisma + Supabase PostgreSQL
    ├── src/
    │   ├── index.ts                 (Entry point, Prisma adapter)
    │   ├── app.ts                   (Express config + CORS dinámico + rutas)
    │   ├── controllers/             (auth, clients, loans, cobros, reportes)
    │   ├── middleware/
    │   │   └── auth.middleware.ts   (JWT + dev bypass)
    │   ├── routes/                  (auth, clients, loans, cobros, reportes)
    │   └── services/
    │       ├── loan.service.ts      (Amortización simple/francesa)
    │       ├── score.service.ts     (Score 0-100 ponderado)
    │       └── alert.service.ts     (Cron job + WhatsApp placeholder)
    └── prisma/
        ├── schema.prisma            (Modelo completo: 10 tablas)
        ├── migrations/
        └── seed.ts                  (Datos de prueba incluidos)
```

---

## 🟢 Estado Actual del Sistema

### Servidores corriendo localmente

| Servicio | URL | Estado |
|---|---|---|
| **API REST (Express)** | `http://localhost:4000` | ✅ Activo |
| **Frontend PWA (Astro)** | `http://localhost:4322` | ✅ Activo |
| **Base de datos PostgreSQL** | Supabase | ✅ Configurada |

### Credenciales de prueba

| Campo | Valor |
|---|---|
| **Email** | `admin@elicash.com` |
| **Contraseña** | `admin` |

### APIs verificadas (respuesta real)

| Método | Endpoint | Función |
|---|---|---|
| GET | `/health` | Health check |
| POST | `/api/auth/login` | Login JWT ✅ |
| POST | `/api/auth/register` | Registro de cuenta ✅ |
| GET | `/api/auth/me` | Perfil usuario autenticado ✅ |
| GET | `/api/clients` | Lista de clientes ✅ |
| POST | `/api/clients` | Crear cliente |
| GET | `/api/clients/:id` | Perfil cliente |
| POST | `/api/loans` | Originar préstamo |
| GET | `/api/loans/:id` | Detalle préstamo |
| GET | `/api/loans/:id/contract` | Generar contrato PDF ✅ |
| GET | `/api/cobros/payments/:id/receipt` | Generar recibo PDF ✅ |
| GET | `/api/cobros/hoy` | Ruta del día ✅ |
| GET | `/api/cobros/morosos` | Lista de morosos ✅ |
| POST | `/api/cobros/payments` | Registrar pago |
| GET | `/api/cobros/payments/:id/receipt` | Generar recibo PDF ✅ |
| GET | `/api/reportes/dia` | Métricas del día ✅ |
| GET | `/api/reportes/cartera` | Cartera global |
| GET | `/api/reportes/ganancias` | Ganancias del mes |

---

## 📊 Avance por Fase

| Fase | Descripción | Estado |
|---|---|---|
| **Fase 1** | Fundación + Auth + PWA + Nav | ✅ Completa |
| **Fase 2** | Clientes (CRUD + Wizard UI + Score) | ✅ Completa |
| **Fase 3** | Préstamos + Amortización + Simulador | ✅ Completa |
| **Fase 4** | Ruta de Cobros + Modo Offline base | ✅ Completa |
| **Fase 5** | Score automático + AlertService cron | ✅ Backend listo |
| **Fase 6** | Dashboard + Reportes | ✅ Completa |
| **Fase 7** | Login/UI + Registro + Morosos | ✅ Completa |
| **Fase 8** | PDFs contratos + recibos | ✅ Completado |
| **Fase 9** | Offline sync + IndexedDB | ✅ Completado |
| **Fase 10** | UI Export Features | ✅ Completado |

### ✅ Completado en esta iteración (Fase 7)
- 🔐 Pantalla de Login — glassmorphism + gradiente animado + swipe-to-enter (responsive desktop/mobile)
- 📝 Pantalla de Registro — mismo estilo visual, link entre login ↔ registro, auto-login al registrar
- 🛡️ AuthGuard — MainLayout redirige a `/login` si no autenticado, botón "Salir"
- 🍪 Auth con JWT en cookie httpOnly + localStorage para sesión
- 🟠 Página de Morosos (`/mora`) — filtros por gravedad (Crítico/Urgente/Atrasado), deuda total, lista por vencimiento
- 🧭 Nav actualizado — 5 ítems: Inicio, Clientes, Cobros, Morosos, Reportes

### ✅ Completado en esta iteración (Fase 8 - PDFs) [DONE]
- 📄 Sistema de generación de PDFs implementado con PDFKit
- 📋 Contratos de préstamo completos con tabla de amortización
- 🧾 Recibos de pago con detalles del cobro
- 🔗 Nuevos endpoints: `GET /api/loans/:id/contract` y `GET /api/cobros/payments/:id/receipt`
- 🏗️ Arquitectura: PDFService con métodos estáticos, controladores dedicados
- 📝 Contenido: Información legal, términos y condiciones, firmas
- 🔧 Integración: Headers de descarga, manejo de errores, TypeScript tipado

### ✅ Completado en esta iteración (Fase 9 - Offline Sync) [DONE]
- 🔄 Sistema de sincronización offline implementado con IndexedDB
- 📱 Cola de operaciones pendientes con estados (pending/syncing/completed/failed)
- 🗄️ Servicio IndexedDB para almacenamiento local de datos y operaciones
- 📊 Indicador visual de estado de conexión y sincronización
- 🔄 Sincronización automática al recuperar conexión
- 💾 Cache inteligente de datos para lectura offline
- 🪝 Hook useSyncQueue para fácil integración en componentes
- 🌐 API Service mejorado con soporte offline automático

### ✅ Completado en esta iteración (Fase 10 - UI Export Features) [DONE]
- 📋 Página de detalle de préstamo con botón "Exportar Contrato"
- 🧾 Sistema de registro de pagos con botón "Recibo PDF"
- 📊 Página de estado de cuenta completo por cliente
- 📈 Exportación de reportes en Excel (`GET /api/reportes/excel`) con `exceljs`
- ☁️ Base única en Supabase configurada por Session Pooler + schema sincronizado + seed ejecutado
- 🖨️ Exportación de contratos de préstamo en PDF
- 🧾 Exportación de recibos de pago en PDF
- 📄 Estados de cuenta con historial completo de préstamos y pagos
- 🎨 Interfaz integrada en navegación existente
- 🔧 Errores de importación resueltos - sistema funcionando correctamente

### 📋 Pendiente para siguientes iteraciones
- 📲 Integrar Twilio / WhatsApp Business API — placeholder listo en `alert.service.ts`
- 🔔 Notificaciones push — alertas de cuotas vencidas
- 🎨 Perfil de usuario — página `/perfil` para editar nombre, negocio, contraseña

---

## ⚡ Cómo correr localmente

```bash
# Terminal 1 — Backend
cd backend
npx tsx src/index.ts

# Terminal 2 — Frontend
cd frontend
npm run dev

# Seed de datos (solo primera vez)
cd backend
npx tsx prisma/seed.ts
```

> El backend usa una sola base de datos en Supabase PostgreSQL a través de `@prisma/adapter-pg`.

---

## 🎨 Stack Tecnológico

| Capa | Tecnología |
|---|---|
| Frontend | Astro 6 + React 19 + Tailwind CSS V4 |
| Backend | Node.js + Express 5 + TypeScript (tsx) |
| ORM | Prisma v7 con adapter pattern |
| DB Producción | PostgreSQL en Supabase |
| Auth | JWT + bcryptjs + cookie-parser + rate-limit |
| Email | Resend (recuperación de contraseña) |
| PDF | PDFKit (contratos + recibos) ✅ |
| Alertas | node-cron + WhatsApp placeholder |
| PWA | Service Worker v3 + Web App Manifest + IndexedDB offline sync ✅ |
| Seguridad | helmet, CORS por env, zod, bcrypt rounds=12 |
