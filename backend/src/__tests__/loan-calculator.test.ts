import { describe, it, expect } from 'vitest';
import { LoanCalculatorService } from '../services/loan.service';

const BASE_DATE = new Date('2026-01-01T00:00:00.000Z');

describe('LoanCalculatorService.calcularAmortizacionSimple', () => {
  it('genera el número correcto de cuotas', () => {
    const table = LoanCalculatorService.calcularAmortizacionSimple(1000, 10, 10, 'mensual', BASE_DATE);
    expect(table).toHaveLength(10);
  });

  it('la cuota total es igual a (capital + interés) / n', () => {
    const monto = 1000;
    const tasa = 10;
    const cuotas = 5;
    const table = LoanCalculatorService.calcularAmortizacionSimple(monto, tasa, cuotas, 'mensual', BASE_DATE);

    const interesTotal = monto * (tasa / 100);
    const cuotaEsperada = Number(((monto + interesTotal) / cuotas).toFixed(2));

    for (const row of table) {
      expect(row.monto_cuota).toBeCloseTo(cuotaEsperada, 2);
    }
  });

  it('el saldo pendiente llega a 0 en la última cuota', () => {
    const table = LoanCalculatorService.calcularAmortizacionSimple(1000, 20, 4, 'mensual', BASE_DATE);
    const ultima = table[table.length - 1];
    expect(ultima?.saldo_pendiente).toBe(0);
  });

  it('las fechas de vencimiento siguen la frecuencia semanal', () => {
    const table = LoanCalculatorService.calcularAmortizacionSimple(500, 5, 3, 'semanal', BASE_DATE);
    const diff0 = table[0]!.fecha_vencimiento.getTime() - BASE_DATE.getTime();
    const diff1 = table[1]!.fecha_vencimiento.getTime() - table[0]!.fecha_vencimiento.getTime();
    const semana = 7 * 24 * 60 * 60 * 1000;
    expect(diff0).toBe(semana);
    expect(diff1).toBe(semana);
  });

  it('las fechas de vencimiento siguen la frecuencia diaria', () => {
    const table = LoanCalculatorService.calcularAmortizacionSimple(100, 5, 3, 'diaria', BASE_DATE);
    const dia = 24 * 60 * 60 * 1000;
    expect(table[0]!.fecha_vencimiento.getTime() - BASE_DATE.getTime()).toBe(dia);
  });

  it('todas las cuotas tienen estado pendiente', () => {
    const table = LoanCalculatorService.calcularAmortizacionSimple(1000, 10, 5, 'mensual', BASE_DATE);
    for (const row of table) {
      expect(row.estado).toBe('pendiente');
    }
  });
});

describe('LoanCalculatorService.calcularAmortizacionFrancesa', () => {
  it('genera el número correcto de cuotas', () => {
    const table = LoanCalculatorService.calcularAmortizacionFrancesa(1000, 2, 12, 'mensual', BASE_DATE);
    expect(table).toHaveLength(12);
  });

  it('todas las cuotas tienen el mismo monto_cuota', () => {
    const table = LoanCalculatorService.calcularAmortizacionFrancesa(1000, 2, 6, 'mensual', BASE_DATE);
    const primero = table[0]!.monto_cuota;
    for (const row of table) {
      expect(row.monto_cuota).toBeCloseTo(primero, 1);
    }
  });

  it('el saldo pendiente llega a 0 en la última cuota', () => {
    const table = LoanCalculatorService.calcularAmortizacionFrancesa(1000, 2, 6, 'mensual', BASE_DATE);
    const ultima = table[table.length - 1];
    expect(ultima?.saldo_pendiente).toBeCloseTo(0, 1);
  });

  it('el interés decrece y el capital crece cuota a cuota (amortización francesa)', () => {
    const table = LoanCalculatorService.calcularAmortizacionFrancesa(5000, 1.5, 6, 'mensual', BASE_DATE);
    for (let i = 1; i < table.length; i++) {
      expect(table[i]!.monto_interes).toBeLessThan(table[i - 1]!.monto_interes);
    }
  });

  it('con tasa 0 el saldo cae linealmente', () => {
    const table = LoanCalculatorService.calcularAmortizacionFrancesa(1000, 0, 4, 'mensual', BASE_DATE);
    expect(table[0]?.monto_interes).toBeCloseTo(0, 5);
    expect(table[0]?.monto_cuota).toBeCloseTo(250, 1);
  });
});

describe('LoanCalculatorService.calcularPrimerCuotaSinPlazo', () => {
  it('genera una sola cuota con interés + capital como monto_cuota', () => {
    const c = LoanCalculatorService.calcularPrimerCuotaSinPlazo(1000, 5, 'mensual', BASE_DATE);
    expect(c.numero).toBe(1);
    expect(c.monto_interes).toBeCloseTo(50, 2);      // 1000 * 5%
    expect(c.monto_cuota).toBeCloseTo(1050, 2);      // 1000 + 50
    expect(c.saldo_pendiente).toBe(1000);
    expect(c.estado).toBe('pendiente');
  });

  it('la fecha de vencimiento es un mes después con frecuencia mensual', () => {
    const c = LoanCalculatorService.calcularPrimerCuotaSinPlazo(500, 10, 'mensual', BASE_DATE);
    const expected = new Date('2026-02-01T00:00:00.000Z');
    expect(c.fecha_vencimiento.getFullYear()).toBe(expected.getFullYear());
    expect(c.fecha_vencimiento.getMonth()).toBe(expected.getMonth());
  });

  it('semanal: vence 7 días después', () => {
    const c = LoanCalculatorService.calcularPrimerCuotaSinPlazo(200, 2, 'semanal', BASE_DATE);
    const diff = c.fecha_vencimiento.getTime() - BASE_DATE.getTime();
    expect(diff).toBe(7 * 24 * 60 * 60 * 1000);
  });

  it('quincenal: vence en el próximo corte 15', () => {
    const c = LoanCalculatorService.calcularPrimerCuotaSinPlazo(200, 2, 'quincenal', BASE_DATE);
    expect(c.fecha_vencimiento.toISOString()).toBe('2026-01-15T00:00:00.000Z');
  });

  it('quincenal: si inicia después del 15 vence el 30 del mismo mes', () => {
    const c = LoanCalculatorService.calcularPrimerCuotaSinPlazo(
      200,
      2,
      'quincenal',
      new Date('2026-06-16T00:00:00.000Z')
    );

    expect(c.fecha_vencimiento.toISOString()).toBe('2026-06-30T00:00:00.000Z');
  });
});

describe('LoanCalculatorService.calcularSiguienteCuotaSinPlazo', () => {
  it('genera la cuota siguiente con el nuevo saldo reducido', () => {
    const c = LoanCalculatorService.calcularSiguienteCuotaSinPlazo(800, 5, 'mensual', BASE_DATE, 2);
    expect(c.numero).toBe(2);
    expect(c.monto_interes).toBeCloseTo(40, 2);    // 800 * 5%
    expect(c.monto_cuota).toBeCloseTo(840, 2);     // 800 + 40
    expect(c.saldo_pendiente).toBe(800);
  });

  it('el interés decrece a medida que baja el capital', () => {
    const c1 = LoanCalculatorService.calcularSiguienteCuotaSinPlazo(1000, 3, 'mensual', BASE_DATE, 1);
    const c2 = LoanCalculatorService.calcularSiguienteCuotaSinPlazo(700, 3, 'mensual', c1.fecha_vencimiento, 2);
    expect(c2.monto_interes).toBeLessThan(c1.monto_interes);
  });

  it('quincenal: después de un vencimiento 30, la siguiente cuota vence el 15 del mes siguiente', () => {
    const c = LoanCalculatorService.calcularSiguienteCuotaSinPlazo(
      800,
      5,
      'quincenal',
      new Date('2026-06-30T00:00:00.000Z'),
      2
    );

    expect(c.fecha_vencimiento.toISOString()).toBe('2026-07-15T00:00:00.000Z');
  });
});
