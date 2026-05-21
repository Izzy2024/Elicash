import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { bcryptRounds, cookieDomain, cookieSameSite, getFrontendUrl, getJwtResetSecret, getJwtSecret, getRegistrationInviteCode, isProduction } from '../config/env';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { forgotPasswordSchema, loginSchema, registerSchema, resetPasswordSchema } from '../validation/schemas';
import { sendEmail, getPasswordResetEmailHtml, getPasswordResetEmailText } from '../services/email.service';

const JWT_SECRET = getJwtSecret();
const JWT_RESET_SECRET = getJwtResetSecret();
const FRONTEND_URL = getFrontendUrl();

const authCookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: cookieSameSite,
  domain: cookieDomain,
  path: '/',
  maxAge: 7 * 24 * 60 * 60 * 1000
} as const;

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ 
      where: { email }, 
      include: { 
        role: true,
        tenant: true
      } 
    });

    if (!user) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    const token = jwt.sign(
      { userId: user.id, tenantId: user.tenantId, role: user.role.name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.cookie('token', token, authCookieOptions);

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role.name,
        tenantId: user.tenantId,
        tenantName: user.tenant.name,
        currency: user.tenant.currency,
        symbol: user.tenant.symbol
      }
    });
  } catch (error) {
    if (error instanceof Error && 'issues' in error) {
      return res.status(400).json({ message: 'Datos de acceso inválidos' });
    }

    logger.error({ err: error }, 'auth login error');
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, name, tenantName, inviteCode } = registerSchema.parse(req.body);

    const registrationInviteCode = getRegistrationInviteCode();

    if (isProduction && (!registrationInviteCode || inviteCode !== registrationInviteCode)) {
      return res.status(403).json({ message: 'Registro no disponible' });
    }

    // Check if user exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ message: 'Email ya registrado' });
    }

    const hashedPassword = await bcrypt.hash(password, bcryptRounds);
    
    // Create tenant, role and user
    let role = await prisma.role.findUnique({ where: { name: 'admin' } });
    if (!role) {
      role = await prisma.role.create({ data: { name: 'admin', description: 'Admin del sistema' } });
      await prisma.role.create({ data: { name: 'cobrador', description: 'Cobrador de ruta' } });
    }

    const tenant = await prisma.tenant.create({
      data: { name: tenantName || 'Mi Negocio' }
    });

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        tenantId: tenant.id,
        roleId: role.id
      }
    });

    res.status(201).json({ message: 'Usuario creado exitosamente', userId: user.id });
  } catch (error) {
    if (error instanceof Error && 'issues' in error) {
      return res.status(400).json({ message: 'Datos de registro inválidos' });
    }

    logger.error({ err: error }, 'auth register error');
    res.status(500).json({ message: 'Error al registrar' });
  }
};

export const me = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ message: 'No autorizado' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { 
        role: true,
        tenant: true
      }
    });
    
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role.name,
      tenantId: user.tenantId,
      tenantName: user.tenant.name,
      currency: user.tenant.currency,
      symbol: user.tenant.symbol
    });
  } catch (error) {
    logger.error({ err: error }, 'auth me error');
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

export const logout = async (_req: Request, res: Response) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: isProduction,
    sameSite: cookieSameSite,
    domain: cookieDomain,
    path: '/'
  });

  return res.status(200).json({ message: 'Sesión cerrada correctamente' });
};

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = forgotPasswordSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });
    const genericMessage = 'Si el email existe, enviamos instrucciones para restablecer tu contraseña';

    // Always return the same message to avoid account enumeration.
    if (!user) {
      return res.status(200).json({ message: genericMessage });
    }

    const token = jwt.sign(
      { userId: user.id, purpose: 'password_reset' },
      JWT_RESET_SECRET,
      { expiresIn: '15m' }
    );

    const resetUrl = `${FRONTEND_URL}/reset-password?token=${encodeURIComponent(token)}`;

    // Send reset email via Resend
    const emailResult = await sendEmail({
      to: user.email,
      subject: 'Restablece tu contraseña — EliCash',
      html: getPasswordResetEmailHtml(resetUrl, user.name),
      text: getPasswordResetEmailText(resetUrl, user.name),
    });

    if (!emailResult.success) {
      logger.warn({ email, emailError: emailResult.error }, 'Password reset email failed');
      // In development, return the reset URL so the developer can test without email
      if (!isProduction) {
        return res.status(200).json({
          message: genericMessage,
          resetToken: token,
          resetUrl,
          emailError: emailResult.error,
        });
      }
    }

    return res.status(200).json({ message: genericMessage });
  } catch (error) {
    if (error instanceof Error && 'issues' in error) {
      return res.status(400).json({ message: 'Email inválido' });
    }

    logger.error({ err: error }, 'forgotPassword error');
    return res.status(500).json({ message: 'Error al procesar recuperación de contraseña' });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = resetPasswordSchema.parse(req.body);

    const decoded = jwt.verify(token, JWT_RESET_SECRET) as { userId?: string; purpose?: string };

    if (!decoded?.userId || decoded.purpose !== 'password_reset') {
      return res.status(400).json({ message: 'Token inválido' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, bcryptRounds);

    await prisma.user.update({
      where: { id: decoded.userId },
      data: { password: hashedPassword }
    });

    return res.status(200).json({ message: 'Contraseña actualizada correctamente' });
  } catch (error) {
    if (error instanceof Error && 'issues' in error) {
      return res.status(400).json({ message: 'Datos inválidos para restablecer contraseña' });
    }

    if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.TokenExpiredError) {
      return res.status(400).json({ message: 'Token inválido o expirado' });
    }

    logger.error({ err: error }, 'resetPassword error');
    return res.status(500).json({ message: 'Error al restablecer contraseña' });
  }
};
