import { z } from 'zod';

const nonEmptyString = z.string().trim().min(1);
const optionalString = z.string().trim().optional();
const optionalNullableString = z.string().trim().optional().nullable();
const moneyAmount = z.number().positive().max(1_000_000_000_000);
const interestRate = z.number().nonnegative().max(1_000);
const installmentCount = z.number().int().positive().max(600);

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

const loanBaseSchema = z.object({
  client_id: nonEmptyString,
  monto: moneyAmount,
  tasa_interes: interestRate,
  tipo_interes: z.enum(['simple', 'compuesto']),
  tipo_prestamo: z.enum(['cuotas', 'sin_plazo']).default('cuotas'),
  frecuencia: z.enum(['diaria', 'semanal', 'quincenal', 'mensual']),
  num_cuotas: installmentCount.optional(),
  fecha_inicio: z.iso.datetime()
});

const cuotasRefine = (d: { tipo_prestamo?: string; num_cuotas?: number | undefined }) =>
  d.tipo_prestamo === 'sin_plazo' || (d.num_cuotas !== undefined && d.num_cuotas > 0);
const cuotasRefineMsg = { message: 'num_cuotas es requerido para préstamos con plazo fijo', path: ['num_cuotas'] };

export const loanInputSchema = loanBaseSchema.refine(cuotasRefine, cuotasRefineMsg);

export const loanSimulateSchema = loanBaseSchema.omit({ client_id: true }).refine(cuotasRefine, cuotasRefineMsg);

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
