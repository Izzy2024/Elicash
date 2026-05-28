import { prisma } from '../lib/prisma';
import type { Installment } from '../../generated/prisma';

export interface DistributionResult {
  capital: number;
  interes: number;
  mora: number;
  excedente: number;
}

export interface ManualDistributionInput {
  capital: number;
  interes: number;
  mora: number;
}

export class PaymentDistributionService {
  /**
   * Calcula la distribución óptima de un pago sobre una cuota.
   * Waterfall: mora → interés → capital → excedente.
   */
  static calcularDistribucion(
    montoTotal: number,
    installment: Installment,
    ordenDistribucion: string = 'interes_primero',
    distribucionManual?: ManualDistributionInput,
    moraPendiente: number = 0,
    cobrarInteres: boolean = true
  ): DistributionResult {
    const interesRestante = cobrarInteres
      ? Math.max(0, installment.monto_interes - (installment.interes_pagado || 0))
      : 0;
    const capitalTotal = installment.monto_cuota - installment.monto_interes;
    const capitalRestante = Math.max(0, capitalTotal - (installment.capital_pagado || 0));

    if (distribucionManual) {
      const capitalManual = distribucionManual.capital ?? 0;
      const interesManual = distribucionManual.interes ?? 0;
      const moraManual = distribucionManual.mora ?? 0;
      if (capitalManual < 0 || interesManual < 0 || moraManual < 0) {
        throw new Error('La distribución manual no puede usar valores negativos');
      }
      const totalManual = capitalManual + interesManual + moraManual;
      if (Math.abs(totalManual - montoTotal) > 0.01) {
        throw new Error('La distribución manual no coincide con el monto total del pago');
      }
      if (capitalManual > capitalRestante + 0.01) {
        throw new Error('La distribución manual excede el capital pendiente de la cuota');
      }
      if (interesManual > interesRestante + 0.01) {
        throw new Error('La distribución manual excede el interés pendiente de la cuota');
      }
      if (moraManual > moraPendiente + 0.01) {
        throw new Error('La distribución manual excede la mora pendiente de la cuota');
      }

      return {
        capital: Number(capitalManual.toFixed(2)),
        interes: Number(interesManual.toFixed(2)),
        mora: Number(moraManual.toFixed(2)),
        excedente: 0
      };
    }

    // Waterfall automático
    let restante = montoTotal;

    const aMora = Math.min(restante, moraPendiente);
    restante -= aMora;

    const aplicarInteresPrimero = ordenDistribucion !== 'capital_primero';
    let aInteres = 0;
    let aCapital = 0;

    if (aplicarInteresPrimero) {
      aInteres = Math.min(restante, interesRestante);
      restante -= aInteres;
      aCapital = Math.min(restante, capitalRestante);
      restante -= aCapital;
    } else {
      aCapital = Math.min(restante, capitalRestante);
      restante -= aCapital;
      aInteres = Math.min(restante, interesRestante);
      restante -= aInteres;
    }

    return {
      capital: Number(aCapital.toFixed(2)),
      interes: Number(aInteres.toFixed(2)),
      mora: Number(aMora.toFixed(2)),
      excedente: Number(restante.toFixed(2))
    };
  }

  /**
   * Obtiene o crea la configuración de un préstamo.
   */
  static async obtenerConfiguracion(loanId: string) {
    let config = await prisma.loanConfig.findUnique({
      where: { loan_id: loanId }
    });

    if (!config) {
      config = await prisma.loanConfig.create({
        data: {
          loan_id: loanId,
          orden_distribucion: 'interes_primero',
          permite_distribucion_manual: true,
          tasa_mora_diaria: 0
        }
      });
    }

    return config;
  }
}
