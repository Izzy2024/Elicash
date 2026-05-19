const nodeEnv = process.env.NODE_ENV ?? 'development';

export const isProduction = nodeEnv === 'production';
export const cookieDomain = process.env.COOKIE_DOMAIN?.trim() || undefined;
export const cookieSameSite = (process.env.COOKIE_SAME_SITE?.trim().toLowerCase() || 'strict') as
  | 'lax'
  | 'strict'
  | 'none';
export const bcryptRounds = Number.parseInt(process.env.BCRYPT_ROUNDS?.trim() || '12', 10);

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is required`);
  }

  return value;
}

export function getJwtSecret(): string {
  if (isProduction) {
    return requireEnv('JWT_SECRET');
  }

  return process.env.JWT_SECRET?.trim() || 'super-secret-key-elicash';
}

export function getJwtResetSecret(): string {
  if (isProduction) {
    return requireEnv('JWT_RESET_SECRET');
  }

  return process.env.JWT_RESET_SECRET?.trim() || `${getJwtSecret()}-password-reset`;
}

export function getFrontendUrl(): string {
  if (isProduction) {
    return requireEnv('FRONTEND_URL');
  }

  return process.env.FRONTEND_URL?.trim() || 'http://localhost:4322';
}

export function getAllowedOrigins(): string[] {
  const frontendUrl = process.env.FRONTEND_URL?.trim();
  const origins = new Set<string>();

  if (frontendUrl) {
    origins.add(frontendUrl);
  }

  if (!isProduction) {
    origins.add('http://localhost:4322');
    origins.add('http://localhost:3000');
    origins.add('http://localhost:4000');
    origins.add('http://127.0.0.1:4322');
    origins.add('http://127.0.0.1:3000');
    origins.add('http://127.0.0.1:4000');
  }

  return Array.from(origins);
}

export function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) {
    return true;
  }

  const allowedOrigins = getAllowedOrigins();
  if (allowedOrigins.includes(origin)) {
    return true;
  }

  if (!isProduction) {
    try {
      const parsed = new URL(origin);
      const isLocalHost = parsed.protocol === 'http:' && (
        parsed.hostname === 'localhost' ||
        parsed.hostname === '127.0.0.1'
      );

      if (isLocalHost) {
        return true;
      }
    } catch (error) {
      return false;
    }
  }

  return false;
}

export function getRegistrationInviteCode(): string | null {
  const inviteCode = process.env.REGISTRATION_INVITE_CODE?.trim();
  return inviteCode || null;
}

export function getResendApiKey(): string | null {
  return process.env.RESEND_API_KEY?.trim() || null;
}

export function getFromEmail(): string {
  return process.env.FROM_EMAIL?.trim() || 'onboarding@resend.dev';
}
