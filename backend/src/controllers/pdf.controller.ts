import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { PDFService } from '../services/pdf.service';
import { logger } from '../lib/logger';

export const generateLoanContract = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
      return res.status(401).json({ message: 'No autorizado' });
    }

    const loan = await prisma.loan.findFirst({
      where: {
        id,
        client: {
          tenantId
        }
      },
      select: { id: true }
    });

    if (!loan) {
      return res.status(404).json({ message: 'Préstamo no encontrado' });
    }

    const pdfBuffer = await PDFService.generateLoanContract(id);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=contrato-prestamo-${id.substring(0, 8)}.pdf`);
    res.send(pdfBuffer);
  } catch (error) {
    logger.error({ err: error, loanId: req.params['id'] }, 'Error generando contrato');
    res.status(500).json({ message: 'Error al generar contrato PDF' });
  }
};

export const generatePaymentReceipt = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
      return res.status(401).json({ message: 'No autorizado' });
    }

    const payment = await prisma.payment.findFirst({
      where: {
        id,
        installment: {
          loan: {
            client: {
              tenantId
            }
          }
        }
      },
      select: { id: true }
    });

    if (!payment) {
      return res.status(404).json({ message: 'Pago no encontrado' });
    }

    const pdfBuffer = await PDFService.generatePaymentReceipt(id);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=recibo-pago-${id.substring(0, 8)}.pdf`);
    res.send(pdfBuffer);
  } catch (error) {
    logger.error({ err: error, paymentId: req.params['id'] }, 'Error generando recibo');
    res.status(500).json({ message: 'Error al generar recibo PDF' });
  }
};

export const generateClientStatement = async (req: Request, res: Response) => {
  try {
    const clientId = req.params.id as string;
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
      return res.status(401).json({ message: 'No autorizado' });
    }

    const client = await prisma.client.findFirst({
      where: { id: clientId, tenantId },
      select: { id: true, nombre: true }
    });

    if (!client) {
      return res.status(404).json({ message: 'Cliente no encontrado' });
    }

    const pdfBuffer = await PDFService.generateClientStatement(clientId, tenantId);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition',
      `attachment; filename=estado-cuenta-${client.nombre.replace(/\s+/g, '-').toLowerCase()}-${clientId.substring(0, 8)}.pdf`);
    res.send(pdfBuffer);
  } catch (error) {
    logger.error({ err: error, clientId: req.params['id'] }, 'Error generando estado de cuenta');
    res.status(500).json({ message: 'Error al generar estado de cuenta PDF' });
  }
};
