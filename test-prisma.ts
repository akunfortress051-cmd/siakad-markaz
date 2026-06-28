import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
type P = Parameters<typeof prisma.perizinan.create>[0]['data']
const p: P = { statusAbsen: 'IZIN' } as any;
console.log('OK')
