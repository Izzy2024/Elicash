import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { LoanCalculatorService } from '../services/loan.service';
import { ScoreService } from '../services/score.service';
import { loanInputSchema } from '../validation/schemas';
import { logger } from '../lib/logger';

export const createLoan = async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const {
      client_id, monto, tasa_interes, tipo_interes, tipo_prestamo,
      frecuencia, num_cuotas, fecha_inicio
    } = loanInputSchema.parse(req.body);

    const client = await prisma.client.findUnique({ where: { id: client_id } });
    if (!client || client.tenantId !== tenantId) {
      return res.status(404).json({ message: 'Cliente no encontrado' });
    }

    const isSinPlazo = tipo_prestamo === 'sin_plazo';

    let installments: ReturnType<typeof LoanCalculatorService.calcularPrimerCuotaSinPlazo>[] = [];
    if (isSinPlazo) {
      installments = [
        LoanCalculatorService.calcularPrimerCuotaSinPlazo(monto, tasa_interes, frecuencia, new Date(fecha_inicio))
      ];
    } else if (tipo_interes === 'simple') {
      installments = LoanCalculatorService.calcularAmortizacionSimple(
        monto, tasa_interes, num_cuotas!, frecuencia, new Date(fecha_inicio)
      );
    } else {
      installments = LoanCalculatorService.calcularAmortizacionFrancesa(
        monto, tasa_interes, num_cuotas!, frecuencia, new Date(fecha_inicio)
      );
    }

    const loan = await prisma.loan.create({
      data: {
        client_id,
        monto,
        tasa_interes,
        tipo_interes: isSinPlazo ? 'simple' : tipo_interes,
        tipo_prestamo: tipo_prestamo ?? 'cuotas',
        frecuencia,
        num_cuotas: isSinPlazo ? null : (num_cuotas ?? null),
        saldo_capital: isSinPlazo ? monto : null,
        fecha_inicio: new Date(fecha_inicio),
        created_by: userId,
        installments: { create: installments }
      },
      include: { installments: true }
    });

    // Recalcular score
    ScoreService.recalcularScore(client_id);

    res.status(201).json(loan);
  } catch (error) {
    if (error instanceof Error && 'issues' in error) {
      return res.status(400).json({ message: 'Datos de préstamo inválidos' });
    }

    logger.error({ err: error }, 'createLoan error');
    res.status(500).json({ message: 'Error al crear préstamo' });
  }
};

export const simulateLoan = async (req: Request, res: Response) => {
  try {
    const { monto, tasa_interes, tipo_interes, tipo_prestamo, frecuencia, num_cuotas, fecha_inicio } =
      loanInputSchema.omit({ client_id: true }).parse(req.body);

    const isSinPlazo = tipo_prestamo === 'sin_plazo';

    let installments;
    if (isSinPlazo) {
      // Simula N períodos asumiendo solo interés (sin reducción de capital)
      const periodos = num_cuotas ?? 12;
      const rows = [];
      let saldo = monto;
      let fecha = new Date(fecha_inicio);
      for (let i = 1; i <= periodos; i++) {
        rows.push(LoanCalculatorService.calcularSiguienteCuotaSinPlazo(saldo, tasa_interes, frecuencia, fecha, i));
        fecha = rows[rows.length - 1]!.fecha_vencimiento;
      }
      installments = rows;
    } else if (tipo_interes === 'simple') {
      installments = LoanCalculatorService.calcularAmortizacionSimple(
        monto, tasa_interes, num_cuotas!, frecuencia, new Date(fecha_inicio)
      );
    } else {
      installments = LoanCalculatorService.calcularAmortizacionFrancesa(
        monto, tasa_interes, num_cuotas!, frecuencia, new Date(fecha_inicio)
      );
    }

    res.json(installments);
  } catch (error) {
    if (error instanceof Error && 'issues' in error) {
      return res.status(400).json({ message: 'Datos de simulación inválidos' });
    }

    res.status(500).json({ message: 'Error al simular préstamo' });
  }
};

export const getLoanById = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.user!;
    const id = req.params.id as string;
    const loan = await prisma.loan.findUnique({
      where: { id },
      include: {
        client: true,
        installments: {
          orderBy: { numero: 'asc' }
        }
      }
    });

    if (!loan || loan.client.tenantId !== tenantId) {
      return res.status(404).json({ message: 'No encontrado' });
    }
    res.json(loan);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener préstamo' });
  }
};

export const getInstallments = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.user!;
    const id = req.params.id as string;

    const loan = await prisma.loan.findUnique({
      where: { id },
      include: { client: true }
    });

    if (!loan || loan.client.tenantId !== tenantId) {
      return res.status(404).json({ message: 'No encontrado' });
    }

    const installments = await prisma.installment.findMany({
      where: { loan_id: id },
      orderBy: { numero: 'asc' }
    });
    res.json(installments);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener cuotas' });
  }
};
