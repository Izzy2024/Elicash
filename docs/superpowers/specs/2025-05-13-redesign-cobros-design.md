# Diseño: Redesign de Sección Cobros (/cobros)

**Fecha:** 2025-05-13  
**Estado:** Aprobado  
**Autor:** EliCash Team  
**Área:** Backend, Frontend, UX

---

## Resumen Ejecutivo

La sección `/cobros` es la herramienta principal que usa el cobrador en la calle para registrar pagos. Actualmente muestra una lista plana de cuotas vencidas o que vencen hoy, sin permitir filtrar, buscar, ni acceder rápidamente a datos del cliente (teléfono, dirección). Este spec transforma `/cobros` en una herramienta de campo optimizada para cobradores móviles.

---

## Contexto

### Estado Actual
- `GET /api/cobros/hoy` devuelve cuotas con `estado='pendiente'` y `fecha_vencimiento <= hoy`
- `CobrosDia.tsx` renderiza una lista simple de cuotas con botón "+" para cobrar
- No hay búsqueda, filtros, ni datos de contacto del cliente
- La distribución manual está siempre visible, ocupando espacio valioso en móvil

### Problema
- El cobrador no puede buscar un cliente por nombre si no está en la lista de hoy
- No sabe cuántos días lleva vencida una cuota (solo ve la fecha)
- No puede llamar al cliente directamente desde la app
- La interfaz no prioriza visualmente los cobros más urgentes (mora)
- No tiene resumen de cuánto ha recaudado en el día

### Objetivo
- Permitir filtrar por categoría (hoy, mora, activos, todos)
- Permitir buscar por nombre de cliente
- Mostrar datos de contacto clickeables (teléfono, dirección)
- Indicar visualmente la urgencia (mora = rojo, hoy = amarillo, abono parcial = azul)
- Ocultar opciones avanzadas (distribución manual) tras un toggle colapsado
- Mostrar resumen flotante de efectivo recaudado hoy

---

## Decisiones de Arquitectura

### Enfoque seleccionado: Híbrido optimizado para campo (Opción C)

Se descartaron:
- **Opción A** (refinar mínimamente): No resuelve los problemas de contacto, priorización ni resumen de caja.
- **Opción B** (tarjetas agrupadas por cliente): Cambia demasiado el modelo mental del cobrador que está acostumbrado a "cuota por cuota".

La **Opción C** mejora la lista existente con filtros, indicadores visuales y contactos sin redescomponer la estructura.

---

## Cambios en Backend

### Endpoint actualizado: `GET /api/cobros/hoy`

**Query params nuevos:**
- `filtro` (string, opcional): `"hoy" | "mora" | "activos" | "todos"` — default `"hoy"`
- `search` (string, opcional): búsqueda parcial por nombre del cliente

**Lógica por filtro:**
- `"hoy"`: `estado='pendiente' AND fecha_vencimiento <= endOfDay(today) AND fecha_vencimiento >= startOfDay(today)`
- `"mora"`: `estado='pendiente' AND fecha_vencimiento < startOfDay(today)`
- `"activos"`: `loan.estado='activo' AND installment.estado='pendiente'` (todas las cuotas pendientes de préstamos activos)
- `"todos"`: sin filtro de fecha, solo `estado='pendiente'`

**Response enriquecido** — cada item incluye:
```json
{
  "id": "uuid",
  "numero": 3,
  "monto_cuota": 500,
  "saldo_pendiente": 350,
  "capital_pagado": 100,
  "interes_pagado": 50,
  "estado": "pendiente",
  "fecha_vencimiento": "2025-05-10T00:00:00.000Z",
  "dias_vencido": 3,
  "es_mora": true,
  "es_hoy": false,
  "tiene_abono": true,
  "loan": {
    "id": "uuid",
    "client": {
      "id": "uuid",
      "nombre": "Juan Pérez",
      "telefono": "555-1234",
      "direccion": "Calle 123",
      "score": 85
    }
  }
}
```

**Campos calculados:**
- `dias_vencido`: `Math.floor((today - fecha_vencimiento) / (1000 * 60 * 60 * 24))`, mínimo 0
- `es_mora`: `dias_vencido > 0`
- `es_hoy`: `fecha_vencimiento es hoy`
- `tiene_abono`: `capital_pagado > 0 OR interes_pagado > 0`

**Ordenamiento:**
- Si filtro=`mora`: por `dias_vencido DESC` (más morosos primero)
- Si filtro=`hoy`: por `fecha_vencimiento ASC`
- Otros: por `fecha_vencimiento ASC`

---

## Cambios en Frontend

### `CobrosDia.tsx` — Reestructuración completa

#### Estados nuevos
```typescript
const [filtro, setFiltro] = useState<'hoy' | 'mora' | 'activos' | 'todos'>('hoy');
const [searchTerm, setSearchTerm] = useState('');
const [totalRecaudadoHoy, setTotalRecaudadoHoy] = useState(0);
const [clientesVisitadosHoy, setClientesVisitadosHoy] = useState(0);
const [mostrarOpcionesAvanzadas, setMostrarOpcionesAvanzadas] = useState(false);
```

#### Layout general
```
┌─────────────────────────────────────────────┐
│  🔍 Buscar cliente...                       │
├─────────────────────────────────────────────┤
│  [Hoy] [Mora] [Activos] [Todos]            │
├─────────────────────────────────────────────┤
│  ┌─────────────────────────────────────┐   │
│  │ 🔴 MORA (3 días)         $500 #3   │   │
│  │ 👤 Juan Pérez                       │   │
│  │ 📞 555-1234  |  📍 Calle 123        │   │
│  │ 💰 Saldo $350 | Cap $100/150        │   │
│  │ [📞] [📍]              [+] COBRAR   │   │
│  └─────────────────────────────────────┘   │
│  ┌─────────────────────────────────────┐   │
│  │ 🟡 HOY                   $500 #4   │   │
│  │ 👤 María García                     │   │
│  │ 📞 555-5678                         │   │
│  │ [📞]                   [+] COBRAR   │   │
│  └─────────────────────────────────────┘   │
│  ...                                        │
├─────────────────────────────────────────────┤
│  💵 $1,250 recaudado | 5/12 clientes  [📊] │
└─────────────────────────────────────────────┘
```

#### Tarjeta de cuota (diseño)

**Colores de fondo según estado:**
- `es_mora`: `bg-red-50 border-red-200`
- `es_hoy`: `bg-amber-50 border-amber-200`
- `tiene_abono && !es_mora && !es_hoy`: `bg-blue-50 border-blue-200`
- Pagada: `bg-emerald-50 border-emerald-200`

**Badges:**
- 🔴 `MORA (X días)` — rojo
- 🟡 `HOY` — amarillo
- 🔵 `ABONO` — azul
- 🟢 `PAGADA` — verde (si se muestra)

**Datos de contacto:**
- Teléfono: `<a href={`tel:${telefono}`}>` con ícono 📞
- Dirección: texto con ícono 📍 (copiable al portapapeles en tap largo)
- Si no hay dirección, no se muestra la línea

#### Filtros rápidos
Píldoras horizontales scrollables si no caben:
- `Hoy` (default, azul cuando activo)
- `Mora` (rojo cuando activo)
- `Activos` (gris cuando activo)
- `Todos` (gris cuando activo)

Al cambiar filtro, se hace `fetchCobros()` con el nuevo parámetro.

#### Búsqueda
- Input de texto con ícono de lupa
- Filtra localmente en el frontend (no requiere nuevo request)
- Busca coincidencia parcial en `loan.client.nombre`

#### Resumen flotante inferior (sticky)
```
┌─────────────────────────────────────────────────────────┐
│  💵 $1,250 recaudado hoy      5/12 clientes      [📊]  │
│  Efectivo en caja: $1,250  |  Meta: $3,500              │
└─────────────────────────────────────────────────────────┘
```

- `totalRecaudadoHoy`: suma de `monto_pagado` de todos los pagos registrados hoy por el cobrador
- `clientesVisitadosHoy`: cuenta de clientes únicos que pagaron algo hoy
- `meta`: suma de `saldo_pendiente` de todas las cuotas visibles en filtro actual
- Se actualiza con cada cobro exitoso

#### Opciones avanzadas colapsadas
En el panel de confirmación de pago:
- Por default solo se ve: monto, preview automático, foto, botón confirmar
- Toggle "⚙️ Opciones avanzadas" abre:
  - Checkbox "Distribución manual" + inputs capital/interés/mora
  - (Futuro) "Aplicar a otra cuota"
  - (Futuro) "Registrar como promesa"

### `pages/cobros/index.astro`
Sin cambios mayores. El título puede cambiar de "Operativa" a "Cobros del Día" si se prefiere.

---

## Flujo de Interacción

```
[Cobrador abre /cobros]
        ↓
[Default filtro="hoy", carga lista]
        ↓
[Ve cuotas en amarillo, rojo, azul]
        ↓
[Toca filtro "Mora" para priorizar morosos]
        ↓
[Toca 📞 para llamar al cliente]
        ↓
[Regresa a app, toca + para cobrar]
        ↓
[Ingresa monto, ve preview automático]
        ↓
[Opcional: abre Opciones avanzadas → distribución manual]
        ↓
[Confirma cobro]
        ↓
[Barra inferior actualiza: recaudado +1, clientes +1]
        ↓
[Tarjeta se marca como pagada/abonada]
```

---

## Edge Cases

| Escenario | Comportamiento |
|-----------|---------------|
| Filtro "mora" sin resultados | Muestra empty state: "No hay morosos 🎉" |
| Búsqueda sin coincidencias | Muestra empty state: "Ningún cliente coincide" |
| Cliente sin teléfono | No muestra el botón 📞 |
| Cliente sin dirección | No muestra la línea 📍 |
| Modo manual activo pero suma no coincide | Deshabilita botón confirmar, muestra error rojo |
| Sin conexión | Funciona igual (colas offline), barra inferior actualiza localmente |

---

## Testing

### Backend
- `GET /api/cobros/hoy?filtro=mora` devuelve solo cuotas vencidas
- `GET /api/cobros/hoy?search=juan` filtra por nombre
- Campos calculados `dias_vencido`, `es_mora`, `tiene_abono` son correctos

### Frontend
- Cambio de filtro actualiza la lista
- Búsqueda filtra localmente correctamente
- Indicadores de color coinciden con estado
- Teléfono genera link `tel:` correcto
- Barra flotante suma correctamente los cobros del día
- Opciones avanzadas se colapsan/expanden

---

## Notas de Implementación

- El resumen flotante debe usar `position: sticky` o `fixed` para mantenerse visible
- Los filtros deben ser responsivos (scroll horizontal en móvil si no caben)
- Las tarjetas deben ser lo suficientemente grandes para tocar fácilmente en móvil (min-height 120px)
- El badge de mora debe ser muy visible (texto en negrita, fondo contrastante)
