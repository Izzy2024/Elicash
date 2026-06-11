-- Invalidación de sesiones tras reset de contraseña.
-- Aplicar ANTES de desplegar el backend con el chequeo de tokenVersion.
-- Opciones: pegar en el SQL Editor de Supabase, o ejecutar `npx prisma db push` desde backend/.
ALTER TABLE "User" ADD COLUMN "tokenVersion" INTEGER NOT NULL DEFAULT 0;
