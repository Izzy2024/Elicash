---
name: EliCash
description: Gestión de préstamos directa, profesional y fácil de usar.
colors:
  primary: "#0F172A"
  secondary: "#3B82F6"
  accent: "#10B981"
  danger: "#EF4444"
  warning: "#F59E0B"
  background: "#F8FAFC"
  surface: "#FFFFFF"
typography:
  display:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 700
    lineHeight: 1.2
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 400
    lineHeight: 1.5
rounded:
  sm: "0.375rem"
  md: "0.75rem"
  lg: "1rem"
spacing:
  sm: "0.5rem"
  md: "1rem"
  lg: "1.5rem"
---

# Design System: EliCash

## 1. Overview

**Creative North Star: "Precision Dashboard"**

EliCash es una herramienta de productividad diaria diseñada para la eficiencia. La estética es limpia, profesional y directa, evitando decoraciones innecesarias que distraigan de los datos financieros. Se basa en una jerarquía clara, tipografía legible y una paleta de colores que comunica estados de riesgo de forma inmediata.

**Key Characteristics:**
- Alta densidad de información sin saturación.
- Uso semántico del color para indicar urgencia.
- Micro-interacciones sutiles que confirman acciones.

## 2. Colors

La paleta es sobria con acentos vibrantes para estados funcionales.

### Primary
- **Slate Night** (#0F172A): Usado para textos principales y navegación, transmitiendo seriedad.

### Secondary
- **Trust Blue** (#3B82F6): Color de marca para acciones principales y enlaces.

### Neutral
- **Paper White** (#FFFFFF): Fondo de superficies y tarjetas.
- **Soft Slate** (#F8FAFC): Fondo general de la aplicación.

### Named Rules
**The Risk Color Rule.** El rojo (#EF4444) y el naranja (#F59E0B) están reservados exclusivamente para estados de mora y errores críticos. Nunca se usan con fines decorativos.

## 3. Typography

**Display & Body Font:** Inter (System-ui fallback)

### Hierarchy
- **Display** (700, 2.25rem): Títulos de página principales.
- **Title** (600, 1.25rem): Encabezados de tarjetas y secciones.
- **Body** (400, 1.125rem): Texto general y datos.
- **Label** (500, 0.875rem): Metadatos y etiquetas pequeñas.

### Named Rules
**The Tabular Data Rule.** Todos los montos monetarios deben usar `font-variant-numeric: tabular-nums` para asegurar que las columnas de números se alineen perfectamente.

## 4. Elevation

El sistema prefiere el uso de bordes sutiles y cambios de tono sobre sombras pesadas para mantener la interfaz ligera.

### Shadow Vocabulary
- **Subtle Surface** (0 2px 10px rgba(0,0,0,0.06)): Usada en tarjetas para dar una ligera separación del fondo.

## 5. Components

### Cards
- **Shape:** Rounded Large (1rem / 16px)
- **Background:** Surface (#FFFFFF)
- **Border:** 1px solid Gray 100

### Buttons
- **Shape:** Rounded Medium (0.75rem / 12px)
- **Primary:** Background {colors.secondary}, Text White.
- **Scale on Press:** Todos los botones interactivos deben usar `scale(0.96)` al hacer clic.

## 6. Do's and Don'ts

### Do:
- **Do** usar bordes concéntricos (radio exterior = radio interior + padding).
- **Do** alinear montos monetarios a la derecha en tablas y listas.

### Don't:
- **Don't** usar degradados llamativos; prefiere colores sólidos y limpios.
- **Don't** usar iconos con pesos inconsistentes; mantén una línea visual uniforme.
- **Don't** saturar la pantalla con tarjetas anidadas; mantén la jerarquía plana.
