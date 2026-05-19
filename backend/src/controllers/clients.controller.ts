import { Request, Response } from 'express';
import { Prisma } from '../../generated/prisma';
import { prisma } from '../lib/prisma';
import { createClientSchema } from '../validation/schemas';
import { logger } from '../lib/logger';

export const getClients = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.user!;
    const clients = await prisma.client.findMany({
      where: { tenantId },
      orderBy: { nombre: 'asc' }
    });
    res.json(clients);
  } catch (error) {
    logger.error({ err: error }, 'getClients error');
    res.status(500).json({ message: 'Error al obtener clientes' });
  }
};

export const getClientById = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.user!;
    const id = req.params.id as string;

    const client = await prisma.client.findFirst({
      where: { id, tenantId },
      include: {
        references: true,
        guarantors: true,
        documents: true,
        loans: {
          include: {
            installments: {
              orderBy: { numero: 'asc' },
              include: {
                payments: {
                  orderBy: { fecha_pago: 'asc' }
                }
              }
            }
          },
          orderBy: { fecha_inicio: 'desc' }
        }
      }
    });

    if (!client) return res.status(404).json({ message: 'Cliente no encontrado' });

    // Enriquecer cuotas con campos calculados (igual que en /cobros/hoy)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const enrichedClient = {
      ...client,
      loans: client.loans.map((loan) => ({
        ...loan,
        installments: loan.installments.map((inst) => {
          const diasVencido = Math.floor(
            (todayStart.getTime() - new Date(inst.fecha_vencimiento).getTime()) / (1000 * 60 * 60 * 24)
          );
          return {
            ...inst,
            dias_vencido: diasVencido,
            es_mora: diasVencido > 0 && inst.estado !== 'pagada',
            es_hoy: diasVencido === 0 && inst.estado !== 'pagada',
            es_futuro: diasVencido < 0 && inst.estado !== 'pagada',
            tiene_abono: (inst.capital_pagado || 0) > 0 || (inst.interes_pagado || 0) > 0,
          };
        }),
      })),
    };

    res.json(enrichedClient);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener cliente' });
  }
};

export const createClient = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.user!;
    const { 
      nombre, cedula, direccion, telefono, foto_url, ruta_id,
      references, guarantors 
    } = createClientSchema.parse(req.body);

    const existing = await prisma.client.findUnique({ 
      where: { 
        tenantId_cedula: {
          tenantId,
          cedula
        }
      } 
    });
    if (existing) {
      return res.status(400).json({ message: 'Ya existe un cliente con esta cédula/DPI en tu negocio' });
    }

    const clientData: Prisma.ClientCreateInput = {
      nombre,
      cedula,
      direccion,
      telefono,
      foto_url: foto_url ?? null,
      tenantId
    };

    if (ruta_id) {
      clientData.ruta = {
        connect: { id: ruta_id }
      };
    }

    if (references) {
      clientData.references = { create: references };
    }

    if (guarantors) {
      clientData.guarantors = {
        create: guarantors.map((guarantor) => ({
          ...guarantor,
          foto_url: guarantor.foto_url ?? null
        }))
      };
    }

    const client = await prisma.client.create({
      data: clientData
    });

    res.status(201).json(client);
  } catch (error) {
    if (error instanceof Error && 'issues' in error) {
      return res.status(400).json({ message: 'Datos de cliente inválidos' });
    }

    logger.error({ err: error }, 'createClient error');
    res.status(500).json({ message: 'Error al crear cliente' });
  }
};

export const updateClient = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.user!;
    const id = req.params.id as string;
    const data = req.body;

    const client = await prisma.client.findFirst({ where: { id, tenantId } });
    if (!client) {
      return res.status(404).json({ message: 'Cliente no encontrado' });
    }

    const updated = await prisma.client.update({
      where: { id },
      data
    });

    res.json(updated);
  } catch (error) {
    logger.error({ err: error }, 'updateClient error');
    res.status(500).json({ message: 'Error al actualizar cliente' });
  }
};
