import { z } from 'zod';

const nonEmptyString = z.string().trim().min(1);
const optionalString = z.string().trim().optional();
const optionalNullableString = z.string().trim().optional().nullable();

const referenceSchema = z.object({
  nombre: nonEmptyString,
  telefono: nonEmptyString,
  relacion: nonEmptyString
});

const guarantorSchema = z.object({
  nombre: nonEmptyString,
  cedula: nonEmptyString,
  telefono: nonEmptyString,
  foto_url: optionalNullableString
});

export const loginSchema = z.object({
  email: z.email().trim(),
  password: nonEmptyString
});

export const registerSchema = z.object({
  email: z.email().trim(),
  password: z.string().min(6),
  name: nonEmptyString,
  tenantName: optionalString,
  inviteCode: optionalString
});

export const forgotPasswordSchema = z.object({
  email: z.email().trim()
});

export const resetPasswordSchema = z.object({
  token: nonEmptyString,
  newPassword: z.string().min(6)
});

export const createClientSchema = z.object({
  nombre: nonEmptyString,
  cedula: nonEmptyString,
  direccion: nonEmptyString,
  telefono: nonEmptyString,
  foto_url: optionalNullableString,
  ruta_id: optionalNullableString,
  references: z.array(referenceSchema).optional(),
  guarantors: z.array(guarantorSchema).optional()
});

export const loanInputSchema = z.object({
  client_id: nonEmptyString,
  monto: z.number().positive(),
  tasa_interes: z.number().nonnegative(),
  tipo_interes: z.enum(['simple', 'compuesto']),
  tipo_prestamo: z.enum(['cuotas', 'sin_plazo']).default('cuotas'),
  frecuencia: z.enum(['diaria', 'semanal', 'quincenal', 'mensual']),
  num_cuotas: z.number().int().positive().optional(),
  fecha_inicio: z.iso.datetime()
}).refine(
  (d) => d.tipo_prestamo === 'sin_plazo' || (d.num_cuotas !== undefined && d.num_cuotas > 0),
  { message: 'num_cuotas es requerido para préstamos con plazo fijo', path: ['num_cuotas'] }
);

export const registerPaymentSchema = z.object({
  installment_id: nonEmptyString,
  monto_pagado: z.number().positive(),
  clientRequestId: optionalString,
  distribucion_manual: z.object({
    capital: z.number().nonnegative(),
    interes: z.number().nonnegative(),
    mora: z.number().nonnegative()
  }).optional(),
  foto_recibo: optionalNullableString
});
