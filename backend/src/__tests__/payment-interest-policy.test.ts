import { describe, expect, it, vi } from 'vitest';
import { calcularMontoSugeridoCobro, debeOmitirInteresPorPagoAdelantado } from '../services/payment-policy.service';

describe('debeOmitirInteresPorPagoAdelantado', () => {
  it('cobra interés en la primera cuota aunque el pago sea antes del vencimiento', () => {
    vi.setSystemTime(new Date('2026-06-10T12:00:00.000Z'));

    const omiteInteres = debeOmitirInteresPorPagoAdelantado(
      new Date('2026-06-15T00:00:00.000Z'),
      'quincenal',
      false,
      1
    );

    expect(omiteInteres).toBe(false);
  });

  it('omite interés en cuotas posteriores si el pago es adelantado', () => {
    vi.setSystemTime(new Date('2026-06-10T12:00:00.000Z'));

    const omiteInteres = debeOmitirInteresPorPagoAdelantado(
      new Date('2026-06-15T00:00:00.000Z'),
      'quincenal',
      false,
      2
    );

    expect(omiteInteres).toBe(true);
  });
});

describe('calcularMontoSugeridoCobro', () => {
  it('incluye interés en la primera cuota futura', () => {
    vi.setSystemTime(new Date('2026-06-10T12:00:00.000Z'));

    const result = calcularMontoSugeridoCobro({
      numero: 1,
      fecha_vencimiento: new Date('2026-06-15T00:00:00.000Z'),
      monto_cuota: 1100,
      monto_interes: 100,
      saldo_pendiente: 1100,
      capital_pagado: 0,
      interes_pagado: 0,
    }, 'quincenal');

    expect(result.interes_omitido_por_adelanto).toBe(false);
    expect(result.interes_pendiente_cobro).toBe(100);
    expect(result.monto_sugerido_cobro).toBe(1100);
  });

  it('excluye interés en una cuota futura posterior', () => {
    vi.setSystemTime(new Date('2026-06-10T12:00:00.000Z'));

    const result = calcularMontoSugeridoCobro({
      numero: 2,
      fecha_vencimiento: new Date('2026-06-15T00:00:00.000Z'),
      monto_cuota: 1100,
      monto_interes: 100,
      saldo_pendiente: 1100,
      capital_pagado: 0,
      interes_pagado: 0,
    }, 'quincenal');

    expect(result.interes_omitido_por_adelanto).toBe(true);
    expect(result.interes_pendiente_cobro).toBe(0);
    expect(result.monto_sugerido_cobro).toBe(1000);
  });

  it('suma la mora pendiente al monto sugerido de cobro', () => {
    vi.setSystemTime(new Date('2026-06-20T12:00:00.000Z'));

    const result = calcularMontoSugeridoCobro({
      numero: 2,
      fecha_vencimiento: new Date('2026-06-15T00:00:00.000Z'),
      monto_cuota: 1100,
      monto_interes: 100,
      saldo_pendiente: 1100,
      capital_pagado: 0,
      interes_pagado: 0,
    }, 'quincenal', 55);

    expect(result.mora_pendiente_cobro).toBe(55);
    expect(result.total_exigible_cobro).toBe(1155);
    expect(result.monto_sugerido_cobro).toBe(1155);
  });
});
