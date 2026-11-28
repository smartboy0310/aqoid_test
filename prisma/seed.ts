import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';

// Prisma ORM 7 talabi: bu yerda ham (asosiy ilovadan mustaqil skript bo'lgani uchun)
// PrismaClient alohida, o'z adapteri bilan yaratiladi.
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const huquq = await prisma.faculty.upsert({
    where: { name: 'Islom huquqshunosligi fakulteti' },
    update: {},
    create: { name: 'Islom huquqshunosligi fakulteti' },
  });

  await prisma.group.createMany({
    data: [
      { name: '101-guruh', course: 1, facultyId: huquq.id },
      { name: '102-guruh', course: 1, facultyId: huquq.id },
      { name: '201-guruh', course: 2, facultyId: huquq.id },
    ],
    skipDuplicates: true,
  });

  console.log("Seed muvaffaqiyatli bajarildi. Bu — NAMUNA ma'lumot, haqiqiy fakultet/guruh ro'yxati bilan almashtiring.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
