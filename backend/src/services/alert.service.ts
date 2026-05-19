import cron from 'node-cron';
import { prisma } from '../lib/prisma';
import { addDays, startOfDay, endOfDay, isBefore } from 'date-fns';
import { ScoreService } from './score.service';
import { logger } from '../lib/logger';

export class AlertService {
  static init() {
    // Run every day at 8:00 AM
    cron.schedule('0 8 * * *', async () => {
      logger.info('Running daily alert cron job');
      await this.processAlerts();
    });
  }

  static async processAlerts() {
    try {
      const todayStart = startOfDay(new Date());
      const tomorrowStart = addDays(todayStart, 1);
      const tomorrowEnd = endOfDay(tomorrowStart);

      // Find installments due tomorrow (D-1)
      const dueTomorrow = await prisma.installment.findMany({
        where: {
          estado: 'pendiente',
          fecha_vencimiento: {
            gte: tomorrowStart,
            lte: tomorrowEnd
          }
        },
        include: { loan: { include: { client: true } } }
      });

      for (const inst of dueTomorrow) {
        await this.sendWhatsApp(inst.loan.client.telefono, 
          `Hola ${inst.loan.client.nombre}, te recordamos que mañana vence tu cuota de $${inst.monto_cuota}.`);
        await this.logAlert(inst.id, inst.loan.client.id, 'recordatorio');
      }

      // Find due today (D-0)
      const dueToday = await prisma.installment.findMany({
        where: {
          estado: 'pendiente',
          fecha_vencimiento: {
            gte: todayStart,
            lte: endOfDay(todayStart)
          }
        },
        include: { loan: { include: { client: true } } }
      });

      for (const inst of dueToday) {
        await this.sendWhatsApp(inst.loan.client.telefono, 
          `Hola ${inst.loan.client.nombre}, te recordamos que HOY vence tu cuota de $${inst.monto_cuota}.`);
        await this.logAlert(inst.id, inst.loan.client.id, 'vencimiento');
      }

      // Find past due (D+1 and beyond)
      const pastDue = await prisma.installment.findMany({
        where: {
          estado: 'pendiente',
          fecha_vencimiento: {
            lt: todayStart
          }
        },
        include: { loan: { include: { client: true } } }
      });

      for (const inst of pastDue) {
        // Update status if it wasn't mora already
        if (inst.estado !== 'mora') {
          await prisma.installment.update({
            where: { id: inst.id },
            data: { estado: 'mora' }
          });
          // Recalcular score al entrar en mora
          ScoreService.recalcularScore(inst.loan.client.id);
        }
        await this.sendWhatsApp(inst.loan.client.telefono, 
          `Hola ${inst.loan.client.nombre}, tu cuota de $${inst.monto_cuota} se encuentra EN MORA. Por favor contáctanos.`);
        await this.logAlert(inst.id, inst.loan.client.id, 'mora');
      }

    } catch (error) {
      logger.error({ err: error }, 'Error processing alerts');
    }
  }

  static async sendWhatsApp(phone: string, message: string) {
    // Placeholder for Twilio / WhatsApp Business API integration
    logger.info({ phone, message }, 'WhatsApp placeholder');
  }

  static async logAlert(installmentId: string, clientId: string, tipo: string) {
    try {
      await prisma.alertLog.create({
        data: {
          installment_id: installmentId,
          client_id: clientId,
          tipo_alerta: tipo
        }
      });
    } catch (error) {
      logger.error({ err: error }, 'Error logging alert');
    }
  }
}
