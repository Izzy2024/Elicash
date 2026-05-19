# Plan: Rediseño de Clientes y Estado de Cuenta - EliCash

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aplicar el diseño "Precision Dashboard" a la lista de clientes y la página de estado de cuenta.

**Architecture:** Refactorización de `ClientList.tsx` y `AccountStatementPage.tsx` integrando los componentes atómicos de `MorosoUI.tsx` y aplicando las reglas de diseño de `DESIGN.md`.

---

### Task 1: Rediseño de `ClientList.tsx`

**Files:**
- Modify: `frontend/src/components/ClientList.tsx`

- [ ] **Paso 1: Actualizar el Buscador y el Layout de Lista**
    - Aplicar estilos de `DESIGN.md` al input y al grid de tarjetas.
- [ ] **Paso 2: Implementar la nueva Tarjeta de Cliente**
    - Agregar visualización de Score con colores dinámicos y micro-interacciones `press-96`.
- [ ] **Paso 3: Commit**
```bash
git add frontend/src/components/ClientList.tsx
git commit -m "feat: redesign ClientList with precision dashboard style"
```

### Task 2: Rediseño de `AccountStatementPage.tsx` - Layout y Métricas

**Files:**
- Modify: `frontend/src/components/AccountStatementPage.tsx`

- [ ] **Paso 1: Rediseñar el Header de Perfil y Botones**
    - Implementar el bloque oscuro (Slate 900) y unificar los botones de acción.
- [ ] **Paso 2: Integrar `SummaryCard` para métricas globales**
    - Reemplazar las cajas de resumen actuales por `SummaryCard` de `MorosoUI.tsx`.
- [ ] **Paso 3: Commit**
```bash
git add frontend/src/components/AccountStatementPage.tsx
git commit -m "feat: redesign AccountStatement header and summary stats"
```

### Task 3: Rediseño de `AccountStatementPage.tsx` - Préstamos y Tablas

**Files:**
- Modify: `frontend/src/components/AccountStatementPage.tsx`

- [ ] **Paso 1: Rediseñar la Card de Préstamo con Barra de Progreso**
    - Implementar la visualización de progreso y el grid de datos del préstamo.
- [ ] **Paso 2: Aplicar `tabular-nums` y nuevos estilos a las tablas de cuotas**
    - Asegurar alineación perfecta de montos y uso de `RiskBadge` para estados.
- [ ] **Paso 3: Commit**
```bash
git add frontend/src/components/AccountStatementPage.tsx
git commit -m "feat: complete redesign of loan details and payment tables"
```
