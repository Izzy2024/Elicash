export interface AuthenticatedUser {
  userId: string;
  tenantId: string;
  role: string;
}

export interface AuthTokenPayload extends AuthenticatedUser {
  tokenVersion?: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export {};
