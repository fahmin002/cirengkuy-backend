import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');
  const hashedPassword = await bcrypt.hash('admin123', 10);  
  // =========================
  // ADMIN
  // =========================
  // username: admin
  // password: hashedPassword
  await prisma.admin.create({
    data: {
      username: 'admin',
      password: hashedPassword,
    },
  })
  console.log('🎉 SEEDING DONE!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });