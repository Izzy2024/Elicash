# Diseño: Reprogramación automática de abonos parciales

**Fecha:** 2026-05-14  
**Estado:** Borrador aprobado en conversación  
**Área:** Backend, Frontend, UX

---

## Resumen ejecutivo

Hoy un pago parcial deja la cuota visible como pendiente en la ruta de cobros, aunque ya fue atendida parcialmente. Eso confunde al cobrador porque mezcla "trabajo de hoy" con "saldo histórico".  

La solución propuesta separa ambas cosas: el cobro parcial se registra y se conserva en el historial, pero la cuota original deja de aparecer en la ruta del día y el saldo no cubierto se convierte automáticamente en una nueva cuota al final del préstamo.

---

## Problema

- Una cuota con abono parcial sigue apareciendo como si fuera un cobro vigente de la fecha original.
- La pantalla `/cobros` mezcla cuotas atendidas con cuotas todavía activas.
- El usuario necesita una regla simple: si ya hubo abono, esa visita/cobro deja de estar en la lista operativa.

---

## Objetivo

1. Quitar de la ruta operativa las cuotas que ya recibieron un abono parcial.
2. Mantener trazabilidad completa del pago y su distribución.
3. Convertir el saldo restante en una nueva cuota automática al final del préstamo.
4. No romper la lógica actual de distribución entre interés y capital.

---

## Decisión seleccionada

### Reprogramación automática del saldo remanente

Cuando el cliente paga menos que el valor total de la cuota:

- el pago recibido se distribuye igual que hoy: interés primero y luego capital;
- la cuota original se marca como **reprogramada**;
- el saldo restante se crea como una **nueva cuota** con vencimiento futuro;
- la ruta `/cobros` solo muestra cuotas realmente pendientes, no cuotas ya atendidas parcialmente.

Esto evita confusión sin perder auditoría.

---

## Alternativas consideradas

### Opción A: Mantener la cuota visible como "abonada parcial"
Más simple de implementar, pero sigue confundiendo la ruta de cobros.

### Opción B: Reprogramar automáticamente el saldo remanente
Más clara para operación diaria. Es la opción elegida.

### Opción C: Reprogramación manual
Da control total, pero añade pasos y fricción al cobrador.

---

## Cambios de datos

### `Installment`
- agregar `estado = pendiente | pagada | reprogramada`
- agregar `tipo = normal | arrastre`
- agregar `cuota_origen_id` opcional para enlazar la nueva cuota con la original

### `Payment`
- agregar `saldo_reprogramado` para registrar cuánto saldo quedó movido al final

---

## Flujo de negocio

1. El cobrador registra un pago parcial.
2. El backend calcula la distribución automática o manual.
3. Si el pago no cubre la cuota completa:
   - la cuota original queda cerrada operativamente como `reprogramada`;
   - se crea una nueva cuota por el saldo restante;
   - esa nueva cuota hereda el siguiente vencimiento disponible según la frecuencia del préstamo.
4. Si el pago cubre toda la cuota:
   - el comportamiento actual se mantiene.
5. Si sobra dinero:
   - se mantiene la lógica actual de excedente hacia la siguiente cuota.

---

## Impacto en UI

### `/cobros`
- mostrar solo cuotas activas pendientes;
- ocultar cuotas reprogramadas de la lista del día;
- si una cuota fue reprogramada, el cobrador ya no la verá como pendiente operativa.

### Estado de cuenta / detalle del préstamo
- mostrar la cuota original con badge "Reprogramada";
- mostrar la nueva cuota automática como una cuota futura normal;
- conservar el detalle del pago y su distribución.

---

## Reglas de borde

- La distribución manual sigue validando que la suma coincida con el monto pagado.
- Si el préstamo ya estaba completado, no se crea cuota nueva.
- Si una cuota reprogramada vuelve a recibir un pago parcial, se aplica la misma regla otra vez.
- Los reportes deben seguir contando el dinero recibido, no solo las cuotas cerradas.

---

## Pruebas necesarias

- pago parcial menor a la cuota: crea cuota nueva y saca la original de `/cobros`;
- pago completo: no crea cuota nueva;
- pago con excedente: conserva la lógica actual;
- distribución manual válida e inválida;
- visualización en estado de cuenta con badge de reprogramación.

