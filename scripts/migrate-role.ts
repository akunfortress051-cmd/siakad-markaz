import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';

const prisma = new PrismaClient();

async function main() {
  console.log("Melakukan migrasi tipe kolom role ke TEXT secara aman...");
  
  try {
    // Jalankan query SQL langsung di database untuk merubah kolom enum ke text secara terpisah
    await prisma.$executeRawUnsafe(`ALTER TABLE "User" ALTER COLUMN "role" TYPE text USING "role"::text`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "RolePermission" ALTER COLUMN "role" TYPE text USING "role"::text`);
    await prisma.$executeRawUnsafe(`DROP TYPE IF EXISTS "UserRole"`);
    
    console.log("Kolom berhasil dimigrasi ke TEXT di database!");
    
    // Sinkronkan prisma client
    console.log("Menjalankan npx prisma db push...");
    execSync("npx prisma db push", { stdio: 'inherit' });
    console.log("Database push selesai!");
    
    console.log("Menjalankan ulang prisma generate...");
    execSync("npx prisma generate", { stdio: 'inherit' });
    console.log("Prisma generate selesai!");
    
  } catch (error) {
    console.error("Terjadi error saat migrasi database:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
