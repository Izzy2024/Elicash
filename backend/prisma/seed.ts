import 'dotenv/config';
import { PrismaClient } from '../generated/prisma';
import bcrypt from 'bcryptjs';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is required for seeding');
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log(`Start seeding ...`);

  const roleAdmin = await prisma.role.upsert({
    where: { name: 'admin' },
    update: {},
    create: { name: 'admin', description: 'Administrator' },
  });

  const tenant = await prisma.tenant.create({
    data: { name: 'Préstamos XYZ' }
  });

  const hash = await bcrypt.hash('admin', 10);
  const user = await prisma.user.create({
    data: {
      id: 'admin-id-1',
      email: 'admin@elicash.com',
      password: hash,
      name: 'Admin EliCash',
      roleId: roleAdmin.id,
      tenantId: tenant.id
    }
  });

  const rutaPrincipal = await prisma.ruta.create({
    data: {
      nombre: 'Ruta Central',
      descripcion: 'Ruta para el casco urbano',
      tenantId: tenant.id,
      cobrador_id: user.id
    }
  });

  const client1 = await prisma.client.create({
    data: {
      nombre: 'Juan Pérez',
      cedula: '123456789',
      telefono: '555-0101',
      direccion: 'Ciudad Central',
      score: 85,
      tenantId: tenant.id,
      ruta_id: rutaPrincipal.id
    }
  });

  const client2 = await prisma.client.create({
    data: {
      nombre: 'María García',
      cedula: '987654321',
      telefono: '555-0202',
      direccion: 'Sur',
      score: 92,
      tenantId: tenant.id
    }
  });

  // Préstamo 1
  const loan1 = await prisma.loan.create({
    data: {
      client_id: client1.id,
      monto: 1000,
      tasa_interes: 10,
      tipo_interes: 'simple',
      frecuencia: 'mensual',
      num_cuotas: 6,
      fecha_inicio: new Date(),
      created_by: user.id,
      estado: 'activo'
    }
  });

  await prisma.installment.create({
    data: {
      loan_id: loan1.id,
      numero: 1,
      fecha_vencimiento: new Date(),
      monto_cuota: 183.33,
      monto_interes: 16.66,
      saldo_pendiente: 183.33,
      estado: 'pendiente'
    }
  });

  await prisma.installment.create({
    data: {
      loan_id: loan1.id,
      numero: 2,
      fecha_vencimiento: new Date(new Date().setMonth(new Date().getMonth() + 1)),
      monto_cuota: 183.33,
      monto_interes: 16.66,
      saldo_pendiente: 183.33,
      estado: 'pendiente'
    }
  });


  console.log(`Seeding finished.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
