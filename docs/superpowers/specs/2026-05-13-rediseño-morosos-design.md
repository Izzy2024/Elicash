# Spec: Rediseño de Pantalla de Morosos - EliCash

**Fecha:** 2026-05-13  
**Estado:** Draft  
**Autor:** Gemini CLI  

## 1. Contexto y Objetivos
Rediseñar la pantalla de "Morosos" para transformarla de una lista genérica a una herramienta de trabajo profesional y directa para dueños de negocios y asistentes. El objetivo es maximizar la eficiencia en la identificación y gestión de cobros vencidos.

## 2. Experiencia de Usuario (UX)
- **Register:** Product (Alta eficiencia, orientado a tareas).
- **Flujo Principal:** El usuario entra, ve el resumen de riesgo total y filtra por nivel de urgencia (Crítico > Urgente > Atrasado). Cada tarjeta permite una acción inmediata (Llamar o Ver Detalle).
- **Principios de Diseño:**
    - **Simplicidad Experta:** Información densa pero organizada.
    - **Claridad Accionable:** Énfasis en el monto y el tiempo de atraso.
    - **Confianza Visual:** Alineación perfecta y estados de color semánticos.

## 3. Interfaz de Usuario (UI)
Basado en `DESIGN.md`:
- **Tipografía:** Inter. Montos monetarios con `font-variant-numeric: tabular-nums`.
- **Colores:**
    - Crítico: `#EF4444` (Rojo)
    - Urgente: `#F59E0B` (Naranja)
    - Atrasado/Normal: `#3B82F6` (Azul)
- **Componentes:**
    - **Header de Resumen:** Grid de 3 columnas (Críticos, Urgentes, Deuda Total).
    - **Segmented Control:** Filtros de categoría con estados `active/inactive` claros.
    - **Action Card:** 
        - Borde concéntrico (1rem).
        - Barra lateral de color según riesgo.
        - Botón de acción rápida (Teléfono) y botón principal (Detalle).
        - Micro-interacción: `scale(0.96)` al presionar.

## 4. Requisitos Técnicos
- **Framework:** React (en Astro).
- **Estilos:** TailwindCSS.
- **Datos:** Consumir `/api/cobros/morosos`.
- **Estados:** Manejo de `loading` (Skeletons) y `error` states.
- **Responsive:** Mobile-first, optimizado para uso rápido en teléfonos.

## 5. Criterios de Aceptación
1. La deuda total se actualiza según el filtro seleccionado.
2. Los montos están alineados a la derecha y usan fuente tabular.
3. El feedback visual al presionar tarjetas es instantáneo.
4. Los filtros cambian la lista sin recargas de página bruscas.

## 6. Do's and Don'ts
- **Do:** Asegurar que el nombre del cliente sea lo más legible.
- **Do:** Usar `text-wrap: balance` en encabezados.
- **Don't:** Usar sombras pesadas; mantener la elevación sutil (`0 2px 10px rgba(0,0,0,0.06)`).
- **Don't:** Ocultar información crítica (monto) tras un click extra.
