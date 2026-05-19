# Rediseño de Pantalla de Morosos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformar la pantalla de morosos en un "Precision Dashboard" altamente eficiente y profesional.

**Architecture:** Refactorización del componente `MorososList.tsx` para extraer sub-componentes atómicos (`SummaryCard`, `RiskBadge`, `ActionCard`) y aplicar estilos consistentes con `DESIGN.md`. Se mantendrá la lógica de filtrado y fetching actual para minimizar riesgos.

**Tech Stack:** React, TailwindCSS, Lucide-React (opcional para iconos), Inter Font.

---

### Task 1: Preparación de Iconos y Estilos

**Files:**
- Modify: `frontend/src/styles/global.css`

- [ ] **Paso 1: Agregar utilidad tabular-nums y scale-press**
    - [ ] Editar `global.css` para asegurar que las clases de Tailwind funcionen o agregar utilidades personalizadas.

```css
@layer utilities {
  .tabular-nums {
    font-variant-numeric: tabular-nums;
  }
  .press-96 {
    @apply active:scale-[0.96] transition-transform duration-100;
  }
}
```

- [ ] **Paso 2: Commit**
```bash
git add frontend/src/styles/global.css
git commit -m "style: add tabular-nums and press-96 utilities"
```

### Task 2: Componentes Atómicos de UI

**Files:**
- Create: `frontend/src/components/ui/MorosoUI.tsx`

- [ ] **Paso 1: Definir interfaces y componentes base**
```tsx
// frontend/src/components/ui/MorosoUI.tsx
export const RiskBadge = ({ level, days }: { level: string, days: number }) => {
  const styles = {
    critico: "bg-red-50 text-red-600 border-red-100",
    urgente: "bg-orange-50 text-orange-600 border-orange-100",
    atrasado: "bg-blue-50 text-blue-600 border-blue-100",
  }[level.toLowerCase()] || "bg-gray-50 text-gray-600 border-gray-100";

  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${styles}`}>
      {level} • {days}d
    </span>
  );
};
```

- [ ] **Paso 2: Commit**
```bash
git add frontend/src/components/ui/MorosoUI.tsx
git commit -m "feat: add RiskBadge atomic component"
```

### Task 3: Refactorización de `MorososList.tsx`

**Files:**
- Modify: `frontend/src/components/MorososList.tsx`

- [ ] **Paso 1: Implementar nuevo Header y Filtros**
    - [ ] Actualizar el grid de resumen y los botones de filtro con el estilo "Precision Dashboard".

- [ ] **Paso 2: Implementar la nueva Tarjeta (`MorosoActionCard`)**
    - [ ] Reemplazar el mapeo actual por el nuevo diseño con barra lateral y tabular-nums.

- [ ] **Paso 3: Commit**
```bash
git add frontend/src/components/MorososList.tsx
git commit -m "feat: complete redesign of MorososList component"
```
