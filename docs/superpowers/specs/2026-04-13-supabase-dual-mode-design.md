# EliCash Supabase Dual-Mode Design

Fecha: 2026-04-13

## Objetivo

Habilitar EliCash para usar:

- SQLite en desarrollo local.
- PostgreSQL en Supabase para producción.

Sin perder el flujo actual del proyecto ni mezclar credenciales de producción en el código.

## Contexto Detectado

El backend hoy está amarrado a SQLite en `backend/src/index.ts` y también en `backend/prisma/seed.ts`.
`backend/prisma.config.ts` ya lee `DATABASE_URL`, pero eso no basta para cambiar de proveedor Prisma en caliente.

El punto clave es este:

- Prisma necesita que el `provider` del schema y el adapter del runtime coincidan.
- Por eso, SQLite local y PostgreSQL en Supabase requieren separación explícita de Prisma por entorno.

## Alcance Aprobado

- Mantener SQLite local.
- Usar Supabase PostgreSQL en producción.
- Preparar el backend para elegir la base correcta por entorno.
- Mantener el comportamiento funcional actual de auth, clientes, préstamos, cobros, PDFs y reportes.

## Fuera De Alcance

- No cambiar a Supabase Auth.
- No rehacer el modelo de negocio.
- No migrar de inmediato a una base única para desarrollo.
- No introducir nuevas features de producto todavía.

## Opciones Consideradas

### Opción 1: Un solo schema para todo

No encaja bien con Prisma aquí, porque el provider y el adapter deben ser compatibles.

### Opción 2: PostgreSQL también en local

Es la más simple técnicamente, pero rompe el requisito de mantener SQLite local.

### Opción 3: Dual real con dos schemas/clientes Prisma

La recomendada.

- Un schema/client para SQLite local.
- Un schema/client para PostgreSQL en Supabase.
- El arranque del backend selecciona la implementación según variables de entorno.

## Diseño Propuesto

### 1. Capa de base de datos

Crear una abstracción interna para que el backend no dependa directamente del adapter concreto.

Responsabilidades:

- Exponer un `prisma` único para el resto de la app.
- Elegir cliente SQLite o PostgreSQL según entorno.
- Cerrar conexiones de forma segura al apagar el proceso.

### 2. Prisma local

Mantener SQLite como base local con el flujo actual:

- `DATABASE_URL=file:./dev.db`
- seed local sobre SQLite
- desarrollo rápido sin infraestructura externa

### 3. Prisma Supabase

Preparar la conexión de producción con:

- `DATABASE_URL` apuntando a Supabase PostgreSQL
- adapter `@prisma/adapter-pg`
- schema PostgreSQL separado para que Prisma genere el cliente correcto

### 4. Variables de entorno

Definir un patrón claro:

- `NODE_ENV=development` -> SQLite
- `NODE_ENV=production` -> Supabase PostgreSQL
- `DATABASE_URL` -> URL activa de la base correspondiente

Si hace falta, agregar una variable explícita como `DATABASE_PROVIDER`, pero solo si simplifica el arranque.

### 5. Seeds y migraciones

Separar el flujo de seed por entorno o por script:

- Seed SQLite local con los datos de prueba actuales.
- Seed PostgreSQL para Supabase con el mismo contenido lógico.

Las migraciones deben mantenerse sincronizadas entre ambos schemas para evitar drift.

## Flujo De Datos

1. El backend arranca.
2. Lee `NODE_ENV` y las variables de entorno.
3. Inicializa el cliente Prisma correcto.
4. El resto de controladores y servicios usa el mismo acceso a datos sin conocer el adapter.
5. En local se escribe sobre `dev.db`.
6. En producción se escribe sobre Supabase PostgreSQL.

## Manejo De Errores

- Si falta `DATABASE_URL`, el arranque debe fallar con un mensaje claro.
- Si el provider no coincide con el adapter, el proceso debe detenerse antes de levantar Express.
- Si la conexión a Supabase falla en producción, el error debe ser visible en logs y no dejar el servidor en estado incierto.

## Riesgos

- Duplicar schemas puede causar divergencia si no se sincronizan.
- Los seeds pueden desalinearse entre local y producción.
- Hay más mantenimiento que con una sola base, pero se cumple el requisito de SQLite local.

## Verificación

Antes de considerar esta fase completa, deberíamos validar:

- Arranque del backend con SQLite local.
- Seed local correcto.
- Arranque del backend con PostgreSQL/Supabase usando variables de entorno.
- Login funcionando en ambos entornos.
- CRUD de clientes funcionando en ambos entornos.
- Originación de préstamos y lectura de cobros sin errores de schema.

## Recomendación

Avanzar con la Opción 3, dual real con dos schemas/clientes Prisma.

Es la única que respeta simultáneamente:

- SQLite local.
- Supabase en producción.
- El stack actual de EliCash.

