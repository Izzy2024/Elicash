# Spec: Rediseño de Clientes y Estado de Cuenta - EliCash

**Fecha:** 2026-05-13  
**Estado:** Draft  
**Autor:** Gemini CLI  

## 1. Contexto y Objetivos
Unificar la experiencia visual de la gestión de clientes con el estándar "Precision Dashboard" establecido en el rediseño de Morosos. El objetivo es proporcionar una vista clara del historial financiero del cliente y facilitar la navegación entre la lista y los detalles.

## 2. Experiencia de Usuario (UX)
- **Register:** Product.
- **Flujo Lista:** Búsqueda rápida -> Identificación por Score/Riesgo -> Acceso a detalles.
- **Flujo Detalle (Estado de Cuenta):** Resumen de deuda -> Progreso de préstamos activos -> Historial de cuotas.

## 3. Interfaz de Usuario (UI)
### 3.1 Lista de Clientes (`ClientList.tsx`)
- **Buscador:** Input con bordes `rounded-xl`, sombra `subtle-surface` e icono de búsqueda minimalista.
- **Client Card:**
    - Radio de 1rem, borde sutil.
    - Avatar circular con iniciales.
    - Score mostrado con colores semánticos (Emerald para >4.0, Amber para 3.0-4.0, Red para <3.0).
    - Feedback táctil: `press-96`.

### 3.2 Estado de Cuenta (`AccountStatementPage.tsx`)
- **Header de Perfil:** Bloque con fondo `Slate-900`, texto en blanco, botones de acción (Atrás, Exportar) con estilos consistentes.
- **Métricas:** Uso de `SummaryCard` para "Total Pagado", "Saldo Pendiente" y "Préstamos Activos".
- **Loan Cards:**
    - Barra de progreso visual (`bg-blue-500` sobre `bg-slate-100`).
    - Grid de 4 columnas para datos del préstamo (Monto, Tasa, Cuotas, Pendiente).
- **Tablas de Cuotas:**
    - Encabezados en mayúsculas, fuente pequeña y bold.
    - Montos con `tabular-nums`.
    - Badges de estado (Pagada, Mora, Pendiente) consistentes con `MorosoUI`.

## 4. Requisitos Técnicos
- **Reutilización:** Importar `SummaryCard`, `RiskBadge` y utilidades de `MorosoUI.tsx`.
- **Estilos:** TailwindCSS 4.0.
- **A11y:** Asegurar contrastes adecuados en las barras de progreso y badges.

## 5. Criterios de Aceptación
1. La barra de progreso del préstamo refleja fielmente las cuotas pagadas vs. totales.
2. Todos los montos monetarios en la tabla de cuotas están alineados a la derecha.
3. El buscador filtra la lista instantáneamente sin saltos visuales.
