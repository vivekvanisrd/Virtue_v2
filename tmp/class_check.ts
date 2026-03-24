import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const classes = await prisma.class.findMany();
  console.log("Classes:", JSON.stringify(classes, null, 2));

  const sections = await prisma.section.findMany({ include: { class: { select: { name: true } } } });
  console.log("Sections:", JSON.stringify(sections, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
