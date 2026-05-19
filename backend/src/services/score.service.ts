import { prisma } from '../lib/prisma';
import { startOfDay } from 'date-fns';
import { logger } from '../lib/logger';

export class ScoreService {
  /**
   * Recalcula el score de un cliente basado en los factores del plan.
   * Resultado: 1-100 mapeado a estrellas después en frontend.
   */
  static async recalcularScore(clientId: string) {
    try {
      const client = await prisma.client.findUnique({
        where: { id: clientId },
        include: {
          loans: {
            include: { installments: true }
          },
          references: true,
          guarantors: true
        }
      });

      if (!client) return;

      let score = 0;

      // 1. Historial de pago puntual (40%)
      let totalInstallments = 0;
      let puntuales = 0;
      
      let maxMonto = 0;
      let completedLoans = 0;

      for (const loan of client.loans) {
        if (loan.monto > maxMonto) maxMonto = loan.monto;
        if (loan.estado === 'completado') completedLoans++;

        for (const inst of loan.installments) {
          if (inst.estado === 'pagada') {
            totalInstallments++;
            
            // Check if it was paid on time
            const payments = await prisma.payment.findMany({
              where: { installment_id: inst.id }
            });
            
            // If any payment was made after due date, it's considered "late" for the point calculation
            const paidLate = payments.some(p => startOfDay(p.fecha_pago) > startOfDay(inst.fecha_vencimiento));
            
            if (!paidLate) {
              puntuales++;
            }
          } else if (inst.estado === 'mora' || (inst.estado === 'pendiente' && startOfDay(new Date()) > startOfDay(inst.fecha_vencimiento))) {
            totalInstallments++;
            // No puntuales++
          }
        }
      }

      const ratioPuntual = totalInstallments > 0 ? puntuales / totalInstallments : 0;
      score += ratioPuntual * 40;

      // 2. Préstamos completados (20%) - max out at 5 loans for full 20%
      const ratioCompleted = Math.min(completedLoans / 5, 1);
      score += ratioCompleted * 20;

      // 3. Monto máximo manejado (20%) - max out at approx 10k abstract currency
      const ratioMonto = Math.min(maxMonto / 10000, 1);
      score += ratioMonto * 20;

      // 4. Referencias y fiador (10%)
      const hasGuarantor = client.guarantors.length > 0 ? 5 : 0;
      const refCount = Math.min(client.references.length, 2) * 2.5; // up to 5 points
      score += hasGuarantor + refCount;

      // 5. Tiempo como cliente (10%) - max out at 1 year
      const monthsAsClient = (new Date().getTime() - new Date(client.createdAt).getTime()) / (1000 * 60 * 60 * 24 * 30);
      const ratioTime = Math.min(monthsAsClient / 12, 1);
      score += ratioTime * 10;

      // Save score
      await prisma.client.update({
        where: { id: clientId },
        data: { 
          score: Math.round(score),
          score_updated_at: new Date()
        }
      });

    } catch (error) {
      logger.error({ err: error, clientId }, 'Error recalculating score');
    }
  }
}
