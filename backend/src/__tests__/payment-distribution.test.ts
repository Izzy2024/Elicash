import { describe, it, expect } from 'vitest';
import { PaymentDistributionService } from '../services/payment-distribution.service';
import type { Installment } from '../../generated/prisma';

function makeInstallment(overrides: Partial<Installment> = {}): Installment {
  return {
    id: 'inst-1',
    loan_id: 'loan-1',
    numero: 1,
    fecha_vencimiento: new Date(),
    monto_cuota: 200,
    monto_interes: 50,
    capital_pagado: 0,
    interes_pagado: 0,
    mora_pagada: 0,
    estado: 'pendiente',
    ...overrides,
  } as Installment;
}

describe('PaymentDistributionService.calcularDistribucion', () => {
  describe('modo automático (waterfall)', () => {
    it('pago exacto: distribuye capital e interés sin excedente', () => {
      const inst = makeInstallment({ monto_cuota: 200, monto_interes: 50 });
      const result = PaymentDistributionService.calcularDistribucion(200, inst);
      expect(result.interes).toBeCloseTo(50, 2);
      expect(result.capital).toBeCloseTo(150, 2);
      expect(result.mora).toBe(0);
      expect(result.excedente).toBe(0);
    });

    it('pago excedente: el sobrante queda en excedente', () => {
      const inst = makeInstallment({ monto_cuota: 200, monto_interes: 50 });
      const result = PaymentDistributionService.calcularDistribucion(300, inst);
      expect(result.excedente).toBeCloseTo(100, 2);
    });

    it('pago parcial: solo cubre interés cuando hay interes_primero', () => {
      const inst = makeInstallment({ monto_cuota: 200, monto_interes: 50 });
      const result = PaymentDistributionService.calcularDistribucion(30, inst, 'interes_primero');
      expect(result.interes).toBeCloseTo(30, 2);
      expect(result.capital).toBe(0);
      expect(result.excedente).toBe(0);
    });

    it('pago parcial con capital_primero: prioriza capital', () => {
      const inst = makeInstallment({ monto_cuota: 200, monto_interes: 50 });
      const result = PaymentDistributionService.calcularDistribucion(30, inst, 'capital_primero');
      expect(result.capital).toBeCloseTo(30, 2);
      expect(result.interes).toBe(0);
    });

    it('aplica mora antes que interés y capital', () => {
      const inst = makeInstallment({ monto_cuota: 200, monto_interes: 50 });
      const result = PaymentDistributionService.calcularDistribucion(220, inst, 'interes_primero', undefined, 20);
      expect(result.mora).toBeCloseTo(20, 2);
      expect(result.interes).toBeCloseTo(50, 2);
      expect(result.capital).toBeCloseTo(150, 2);
    });

    it('respeta capital e interés ya pagados parcialmente', () => {
      const inst = makeInstallment({
        monto_cuota: 200,
        monto_interes: 50,
        capital_pagado: 75,
        interes_pagado: 25,
      });
      // Capital restante: 150 - 75 = 75; interés restante: 50 - 25 = 25
      const result = PaymentDistributionService.calcularDistribucion(100, inst);
      expect(result.interes).toBeCloseTo(25, 2);
      expect(result.capital).toBeCloseTo(75, 2);
      expect(result.excedente).toBe(0);
    });
  });

  describe('modo manual', () => {
    it('acepta distribución manual válida', () => {
      const inst = makeInstallment({ monto_cuota: 200, monto_interes: 50 });
      const result = PaymentDistributionService.calcularDistribucion(
        200, inst, 'interes_primero',
        { capital: 150, interes: 50, mora: 0 }
      );
      expect(result.capital).toBe(150);
      expect(result.interes).toBe(50);
      expect(result.mora).toBe(0);
    });

    it('lanza error si la suma manual no coincide con el total', () => {
      const inst = makeInstallment({ monto_cuota: 200, monto_interes: 50 });
      expect(() =>
        PaymentDistributionService.calcularDistribucion(
          200, inst, 'interes_primero',
          { capital: 100, interes: 50, mora: 0 }
        )
      ).toThrow('no coincide');
    });

    it('lanza error si el capital manual excede el capital pendiente', () => {
      const inst = makeInstallment({ monto_cuota: 200, monto_interes: 50 });
      expect(() =>
        PaymentDistributionService.calcularDistribucion(
          300, inst, 'interes_primero',
          { capital: 300, interes: 0, mora: 0 }
        )
      ).toThrow('capital pendiente');
    });

    it('lanza error si hay valores negativos', () => {
      const inst = makeInstallment({ monto_cuota: 200, monto_interes: 50 });
      expect(() =>
        PaymentDistributionService.calcularDistribucion(
          200, inst, 'interes_primero',
          { capital: 250, interes: -50, mora: 0 }
        )
      ).toThrow('negativos');
    });
  });
});
