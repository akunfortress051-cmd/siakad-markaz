import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding admin user...');

  const passwordHash = await bcrypt.hash('admin123', 10);

  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {
      passwordHash, // Reset password if already exists
    },
    create: {
      nama: 'Super Admin',
      username: 'admin',
      passwordHash,
      role: "ADMIN",
      isActive: true,
    },
  });

  // Seed default permissions for ADMIN
  const defaultAdminPermissions = [
    'dashboard', 'absen_sakan', 'absen_kelas', 'absen_kegiatan', 
    'absen_pengajar', 'input_nilai', 'rekap_sakan', 'rekap_kelas', 
    'rekap_kegiatan', 'rekap_pengajar', 'manajemen_kelas', 
    'manajemen_dufah', 'manajemen_user', 'syahadah', 'manajemen_konten'
  ];

  for (const permission of defaultAdminPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        role_permission: {
          role: "ADMIN",
          permission,
        }
      },
      update: {},
      create: {
        role: "ADMIN",
        permission,
      }
    });
  }

  console.log('Admin user seeded:', admin.username);
  console.log('Password default: admin123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
