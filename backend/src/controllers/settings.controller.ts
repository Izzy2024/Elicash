import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { updateProfileSchema } from '../validation/schemas';

export const getProfile = async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    
    const [user, tenant] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true, name: true, roleId: true } }),
      prisma.tenant.findUnique({ where: { id: tenantId } })
    ]);

    res.json({ user, tenant });
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener perfil' });
  }
};

export const updateProfile = async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const { userName, tenantName, currency, symbol } = updateProfileSchema.parse(req.body);

    await prisma.$transaction(async (tx) => {
      if (userName) {
        await tx.user.update({
          where: { id: userId },
          data: { name: userName }
        });
      }

      if (tenantName || currency || symbol) {
        await tx.tenant.update({
          where: { id: tenantId },
          data: {
            ...(tenantName ? { name: tenantName } : {}),
            ...(currency ? { currency } : {}),
            ...(symbol ? { symbol } : {})
          }
        });
      }
    });

    res.json({ message: 'Perfil actualizado correctamente' });
  } catch (error) {
    if (error instanceof Error && 'issues' in error) {
      return res.status(400).json({ message: 'Datos de perfil inválidos' });
    }

    res.status(500).json({ message: 'Error al actualizar perfil' });
  }
};
