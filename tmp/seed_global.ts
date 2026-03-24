import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const classes = [
    { id: "cls_1", name: "Class 1", level: 1 },
    { id: "cls_2", name: "Class 2", level: 2 },
    { id: "cls_3", name: "Class 3", level: 3 },
    { id: "cls_4", name: "Class 4", level: 4 },
    { id: "cls_5", name: "Class 5", level: 5 },
    { id: "cls_6", name: "Class 6", level: 6 },
    { id: "cls_7", name: "Class 7", level: 7 },
    { id: "cls_8", name: "Class 8", level: 8 },
    { id: "cls_9", name: "Class 9", level: 9 },
    { id: "cls_10", name: "Class 10", level: 10 },
    { id: "cls_11", name: "Class 11", level: 11 },
    { id: "cls_12", name: "Class 12", level: 12 },
  ];

  const sections = ["A", "B", "C", "D"];

  console.log("Seeding Classes and Sections...");

  for (const c of classes) {
    await prisma.class.upsert({
      where: { id: c.id },
      update: { name: c.name, level: c.level },
      create: { id: c.id, name: c.name, level: c.level }
    });

    for (const s of sections) {
      const sectionId = `${c.id}_sec_${s.toLowerCase()}`;
      await prisma.section.upsert({
        where: { id: sectionId },
        update: { name: s },
        create: { id: sectionId, name: s, classId: c.id }
      });
    }
  }

  // Also seed a default Fee Structure if missing
  const feeStructure = await prisma.feeStructure.findFirst();
  if (!feeStructure) {
    const ay = await prisma.academicYear.findFirst({ where: { schoolId: "VIVA" } });
    if (ay) {
        await prisma.feeStructure.create({
            data: {
                id: "fs_std",
                name: "Standard Fee Schedule",
                schoolId: "VIVA",
                branchId: "VIVA-BR-01",
                academicYearId: ay.id,
                totalAmount: 50000
            }
        });
    }
  }

  console.log("Seeding completed successfully.");
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
