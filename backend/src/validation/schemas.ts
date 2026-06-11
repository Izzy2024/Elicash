import { z } from 'zod';

const nonEmptyString = z.string().trim().min(1).max(300);
const optionalString = z.string().trim().max(500).optional();
const optionalNullableString = z.string().trim().max(500).optional().nullable();
// Only allow http(s) URLs or inline images; blocks javascript:/data:text payloads
// that would execute when the stored value is rendered as an <img>/link.
// data:image can be a base64 photo, so its cap is the JSON body limit, not 2000.
const optionalImageUrl = z.string().trim().max(150_000)
  .refine((value) =>
    value === '' ||
    /^data:image\//i.test(value) ||
    (value.length <= 2000 && /^https?:\/\//i.test(value)), {
    message: 'URL de imagen inválida'
  })
  .optional()
  .nullable();
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
  foto_url: optionalImageUrl
});

export const loginSchema = z.object({
  email: z.email().trim(),
  password: z.string().min(1).max(128)
});

export const registerSchema = z.object({
  email: z.email().trim(),
  password: z.string().min(6).max(128),
  name: nonEmptyString,
  tenantName: optionalString,
  inviteCode: optionalString
});

export const forgotPasswordSchema = z.object({
  email: z.email().trim()
});

export const resetPasswordSchema = z.object({
  token: z.string().trim().min(1).max(2000),
  newPassword: z.string().min(6).max(128)
});

export const createClientSchema = z.object({
  nombre: nonEmptyString,
  cedula: nonEmptyString,
  direccion: optionalString,
  telefono: nonEmptyString,
  foto_url: optionalImageUrl,
  ruta_id: optionalNullableString,
  references: z.array(referenceSchema).max(20).optional(),
  guarantors: z.array(guarantorSchema).max(20).optional()
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

export const updateProfileSchema = z.object({
  userName: z.string().trim().min(1).max(300).optional(),
  tenantName: z.string().trim().min(1).max(300).optional(),
  currency: z.string().trim().min(1).max(10).optional(),
  symbol: z.string().trim().min(1).max(5).optional()
});

export const registerPaymentSchema = z.object({
  installment_id: nonEmptyString,
  monto_pagado: z.number().positive(),
  clientRequestId: optionalString,
  distribucion_manual: z.object({
    capital: z.number().nonnegative(),
    interes: z.number().nonnegative(),
    mora: z.number().nonnegative()
  }).optional(),
  foto_recibo: optionalImageUrl
});
