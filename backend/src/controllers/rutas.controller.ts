import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

export const getRutas = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.user!;
    const rutas = await prisma.ruta.findMany({
      where: { tenantId },
      include: { cobrador: true, _count: { select: { clients: true } } },
      orderBy: { nombre: 'asc' }
    });
    res.json(rutas);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener rutas' });
  }
};

export const createRuta = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.user!;
    const { nombre, descripcion, cobrador_id } = req.body;

    const ruta = await prisma.ruta.create({
      data: {
        nombre,
        descripcion,
        tenantId,
        cobrador_id
      }
    });

    res.status(201).json(ruta);
  } catch (error) {
    res.status(500).json({ message: 'Error al crear ruta' });
  }
};

export const updateRuta = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.user!;
    const id = req.params.id as string;
    const { nombre, descripcion, cobrador_id, activa } = req.body;

    const ruta = await prisma.ruta.findFirst({ where: { id, tenantId } });
    if (!ruta) return res.status(404).json({ message: 'Ruta no encontrada' });

    const updated = await prisma.ruta.update({
      where: { id },
      data: {
        nombre,
        descripcion,
        cobrador_id,
        activa
      }
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar ruta' });
  }
};

export const getRutaClientes = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.user!;
    const id = req.params.id as string;

    const ruta = await prisma.ruta.findFirst({ 
      where: { id, tenantId },
      include: {
        clients: {
          orderBy: { nombre: 'asc' }
        }
      }
    });

    if (!ruta) return res.status(404).json({ message: 'Ruta no encontrada' });
    res.json(ruta.clients);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener clientes de la ruta' });
  }
};
