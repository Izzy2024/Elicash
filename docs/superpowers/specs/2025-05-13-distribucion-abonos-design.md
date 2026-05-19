# Diseño: Distribución de Abonos en Pagos de Préstamos

**Fecha:** 2025-05-13  
**Estado:** Aprobado  
**Autor:** EliCash Team  
**Área:** Backend, Frontend, Base de Datos

---

## Resumen Ejecutivo

Los clientes de préstamos informales frecuentemente realizan abonos parciales que no cubren el monto completo de una cuota. Actualmente el sistema solo reduce el `saldo_pendiente` sin distinguir si el pago va a capital o a intereses. Este spec define una arquitectura extensible para distribuir pagos automáticamente (waterfall: interés primero, luego capital) con opción de override manual por el cobrador.

---

## Contexto

### Estado Actual
- Modelo `Payment` solo registra `monto_pagado` y se resta directamente de `saldo_pendiente` en la cuota.
- El estado de cuenta muestra cuotas como bloques monolíticos sin desglose.
- No hay forma de saber cuánto capital vs interés ha pagado un cliente.

### Problema
- Abonos parciales quedan como "deuda genérica" sin trazabilidad contable.
- Imposible calcular capital real recuperado para reportes financieros.
- Disputas con clientes sobre "a qué se aplicó su pago" son difíciles de resolver.

### Objetivo
- Todo pago debe distribuirse explícitamente en capital, interés y mora.
- Distribución automática por defecto (waterfall), override manual disponible.
- Estados de cuenta y reportes deben mostrar el desglose completo.

---

## Decisiones de Arquitectura

### Enfoque seleccionado: PaymentAllocation extensible (Opción C)

Se descartaron:
- **Opción A** (pago contra cuota con waterfall implícito): No guarda trazabilidad del desglose.
- **Opción B** (saldos desagregados en cuota sin tabla de distribución): Difícil de auditar y extender a mora/refinanciación.

La **Opción C** guarda la distribución en cada fila `Payment`, permitiendo:
- Auditoría completa de cada transacción.
- Extensión futura a mora, refinanciación y contabilidad doble.
- Reportes detallados sin recálculos complejos.

---

## Cambios en Base de Datos

### Modelo `Payment` (modificado)

```prisma
model Payment {
  id              String      @id @default(uuid())
  installment_id  String
  installment     Installment @relation(fields: [installment_id], references: [id])
  
  monto_pagado    Float       // Total entregado por el cliente
  monto_a_capital Float       @default(0)
  monto_a_interes Float       @default(0)
  monto_a_mora    Float       @default(0)
  
  fecha_pago      DateTime    @default(now())
  foto_recibo_url String?
  cobrador_id     String
  numero_control  Int         @default(0)
  clientRequestId String?     @unique
  
  distribucion_manual Boolean @default(false)
  notas           String?
}
```

### Modelo `Installment` (modificado)

```prisma
model Installment {
  id              String    @id @default(uuid())
  loan_id         String
  loan            Loan      @relation(fields: [loan_id], references: [id])
  numero          Int
  fecha_vencimiento DateTime
  monto_cuota     Float
  monto_interes   Float
  
  capital_pagado  Float     @default(0)
  interes_pagado  Float     @default(0)
  mora_pagada     Float     @default(0)
  
  saldo_pendiente Float
  estado          String    @default("pendiente")
  
  payments        Payment[]
}
```

### Nuevo modelo `LoanConfig`

```prisma
model LoanConfig {
  id                    String @id @default(uuid())
  loan_id               String @unique
  loan                  Loan   @relation(fields: [loan_id], references: [id])
  
  orden_distribucion    String @default("interes_primero")
  permite_distribucion_manual Boolean @default(true)
  tasa_mora_diaria      Float  @default(0)
}
```

**Relación:** Un `Loan` tiene un `LoanConfig` opcional 1:1. Si no existe, se usan defaults.

---

## Reglas de Distribución Automática (Waterfall)

Para un pago de monto `M` contra una cuota:

1. **Mora vencida** (si existe): `aMora = min(M, moraPendiente)`
2. **Interés corriente**: `aInteres = min(M - aMora, interesRestante)`
3. **Capital**: `aCapital = min(M - aMora - aInteres, capitalRestante)`
4. **Excedente**: `excedente = M - aMora - aInteres - aCapital`

Si `excedente > 0`, se aplica recursivamente a la siguiente cuota pendiente.

---

## Cambios en Backend

### Nuevo servicio: `PaymentDistributionService`

```typescript
class PaymentDistributionService {
  static distribuirPago(
    montoTotal: number,
    installment: Installment,
    ordenDistribucion: string = 'interes_primero',
    distribucionManual?: { capital: number; interes: number; mora: number }
  ): DistributionResult {
    if (distribucionManual) {
      const totalManual = distribucionManual.capital + distribucionManual.interes + distribucionManual.mora;
      if (Math.abs(totalManual - montoTotal) > 0.01) {
        throw new Error('Distribución manual no coincide con monto total');
      }
      return { ...distribucionManual, excedente: 0 };
    }

    // Waterfall automático
    let restante = montoTotal;
    const aMora = Math.min(restante, installment.mora_pendiente || 0);
    restante -= aMora;
    const aInteres = Math.min(restante, installment.monto_interes - installment.interes_pagado);
    restante -= aInteres;
    const aCapital = Math.min(restante, (installment.monto_cuota - installment.monto_interes) - installment.capital_pagado);
    restante -= aCapital;

    return { capital: aCapital, interes: aInteres, mora: aMora, excedente: restante };
  }
}
```

### Endpoint actualizado: `POST /api/cobros/payments`

**Request body:**
```json
{
  "installment_id": "uuid",
  "monto_pagado": 150.00,
  "clientRequestId": "uuid-unico",
  "foto_recibo": "base64...",
  "distribucion_manual": {
    "capital": 100.00,
    "interes": 50.00,
    "mora": 0
  }
}
```

**Response:**
```json
{
  "payment": { /* Payment completo */ },
  "distribucion": {
    "a_capital": 100.00,
    "a_interes": 50.00,
    "a_mora": 0,
    "excedente": 0,
    "cuota_saldo_restante": 350.00,
    "cuota_estado": "pendiente"
  },
  "loan_completado": false,
  "siguiente_cuota_afectada": null
}
```

### Lógica de transacción en `registerPayment`

```typescript
await prisma.$transaction(async (tx) => {
  // 1. Obtener configuración del préstamo
  const loanConfig = await tx.loanConfig.findUnique({ where: { loan_id: installment.loan_id } });

  // 2. Calcular distribución
  const dist = PaymentDistributionService.distribuirPago(
    monto_pagado,
    installment,
    loanConfig?.orden_distribucion,
    body.distribucion_manual
  );

  // 3. Crear pago con desglose
  const payment = await tx.payment.create({
    data: {
      installment_id,
      monto_pagado,
      monto_a_capital: dist.capital,
      monto_a_interes: dist.interes,
      monto_a_mora: dist.mora,
      distribucion_manual: !!body.distribucion_manual,
      cobrador_id: userId,
      clientRequestId,
      foto_recibo_url: body.foto_recibo
    }
  });

  // 4. Actualizar saldos desagregados de la cuota
  const updatedInstallment = await tx.installment.update({
    where: { id: installment_id },
    data: {
      capital_pagado: { increment: dist.capital },
      interes_pagado: { increment: dist.interes },
      mora_pagada: { increment: dist.mora },
      saldo_pendiente: { decrement: monto_pagado },
      estado: nuevoSaldo <= 0 ? 'pagada' : 'pendiente'
    }
  });

  // 5. Si hay excedente, aplicar a siguiente cuota
  if (dist.excedente > 0) {
    await aplicarExcedenteASiguienteCuota(tx, installment.loan_id, dist.excedente);
  }

  // 6. Verificar si préstamo completado
  if (nuevoSaldo <= 0) {
    const remaining = await tx.installment.count({
      where: { loan_id: installment.loan_id, estado: { not: 'pagada' } }
    });
    if (remaining === 0) {
      await tx.loan.update({ where: { id: installment.loan_id }, data: { estado: 'completado' } });
    }
  }

  return payment;
});
```

### Endpoint de estado de cuenta (actualizado)

El endpoint `/api/clients/:id` debe incluir en cada `Payment`:
- `monto_a_capital`
- `monto_a_interes`
- `monto_a_mora`
- `distribucion_manual`

Y en cada `Installment`:
- `capital_pagado`
- `interes_pagado`
- `mora_pagada`

---

## Cambios en Frontend

### `CobrosDia.tsx`

Al expandir la confirmación de pago (`confirmId === cobro.id`), mostrar:

1. **Input de monto recibido** (igual que ahora).
2. **Resumen de distribución automática** calculado en tiempo real (debajo del input).
3. **Toggle "Distribución manual"** (checkbox avanzado).
4. **Si toggle activo**: inputs para capital, interés y mora con validación de suma.

```typescript
// Nuevo estado
const [modoManual, setModoManual] = useState(false);
const [distManual, setDistManual] = useState({ capital: '', interes: '', mora: '' });

// Validación
const totalManual = parseFloat(distManual.capital || 0) + parseFloat(distManual.interes || 0) + parseFloat(distManual.mora || 0);
const validoManual = Math.abs(totalManual - parseFloat(customAmount || 0)) < 0.01;
```

**Envío al backend:**
```typescript
const paymentData = {
  installment_id: installmentId,
  monto_pagado: monto,
  cobrador_id: user?.id,
  clientRequestId: self.crypto.randomUUID(),
  foto_recibo: receiptPhoto,
  ...(modoManual && validoManual ? {
    distribucion_manual: {
      capital: parseFloat(distManual.capital),
      interes: parseFloat(distManual.interes),
      mora: parseFloat(distManual.mora)
    }
  } : {})
};
```

### `AccountStatementPage.tsx`

**Tabla de cuotas:** agregar columnas o tooltip con:
- Capital pagado / total
- Interés pagado / total
- Mora pagada / total

**Expansión de cuota:** lista de pagos con desglose:
```
Pago #001 - 08/05/2025
  Recibido: $100
  → A capital: $75
  → A interés: $25
  → Saldo restante: $100
```

**Resumen del préstamo:** agregar:
- Capital pagado total
- Interés pagado total

**Exportación PDF/Excel:** incluir columna de desglose por pago.

---

## Flujo de Datos

```
[Cobrador ingresa monto]
        ↓
[Frontend calcula preview automático]
        ↓
[Cobrador confirma o activa modo manual]
        ↓
[POST /api/cobros/payments]
        ↓
[PaymentDistributionService.distribuirPago()]
        ↓
[Transacción Prisma: Payment + Installment update]
        ↓
[Si excedente > 0 → recursión siguiente cuota]
        ↓
[Response con distribución aplicada]
        ↓
[Frontend actualiza UI y muestra resumen]
```

---

## Edge Cases y Manejo de Errores

| Escenario | Comportamiento |
|-----------|---------------|
| Pago > saldo de cuota | Aplica excedente a siguiente cuota automáticamente |
| Pago parcial < interés de cuota | Todo va a interés, capital queda igual, cuota sigue pendiente |
| Distribución manual no suma el total | Error 400: "La distribución manual no coincide con el monto total" |
| Cuota ya pagada | Error 400: "La cuota ya fue pagada" |
| Offline (PWA) | La cola offline guarda el pago completo con distribución; se sincroniza tal cual al recuperar conexión |

---

## Migración de Datos Existentes

### Migración `npx prisma migrate dev`

1. Agregar columnas a `Payment`:
   - `monto_a_capital` default 0
   - `monto_a_interes` default 0
   - `monto_a_mora` default 0
   - `distribucion_manual` default false
   - `notas` nullable

2. Agregar columnas a `Installment`:
   - `capital_pagado` default 0
   - `interes_pagado` default 0
   - `mora_pagada` default 0

3. Crear tabla `LoanConfig`.

4. **Script de backfill** (post-migración):
   ```typescript
   // Para cada Payment existente:
   // - Si monto_pagado >= saldo_pendiente original de la cuota: asumir proporcional según monto_interes / monto_cuota
   // - Si pago parcial: asumir todo a interés primero, resto a capital (waterfall)
   // Marcar distribucion_manual = false
   // Actualizar capital_pagado e interes_pagado en Installment
   ```

Nota: Como EliCash está en desarrollo activo y aún no hay datos productivos críticos, el backfill puede ser simplificado o ejecutado junto con `prisma migrate reset` si se acuerda con el usuario.

---

## Testing

### Unitarios (Backend)
- `PaymentDistributionService.distribuirPago()` con múltiples escenarios:
  - Pago completo
  - Pago parcial menor a interés
  - Pago parcial entre interés y capital
  - Pago con excedente
  - Distribución manual válida e inválida

### Integración
- `POST /api/cobros/payments` con distribución automática
- `POST /api/cobros/payments` con distribución manual
- Verificación de recursión con excedente
- Verificación de estado de cuenta con desglose

### Frontend
- Renderizado de preview automático al cambiar monto
- Activación/desactivación de modo manual
- Validación de suma en modo manual
- Visualización de distribución en estado de cuenta

---

## Consideraciones Futuras

- **Mora automática:** `LoanConfig.tasa_mora_diaria` permite calcular mora acumulada por días vencidos.
- **Refinanciación:** Al cambiar plazos/tasas, se puede crear un nuevo `LoanConfig` y recalcular.
- **Contabilidad doble:** La tabla `Payment` ya separa conceptos; puede ligarse a un ledger contable.
- **Reportes financieros:** Capital recuperado vs intereses ganados será trivial de calcular.

---

## Aprobaciones

| Sección | Estado |
|---------|--------|
| Cambios en Base de Datos | ✅ Aprobado por usuario |
| API y Lógica de Negocio | ✅ Aprobado por usuario |
| Interfaz de Usuario | ✅ Aprobado por usuario |
