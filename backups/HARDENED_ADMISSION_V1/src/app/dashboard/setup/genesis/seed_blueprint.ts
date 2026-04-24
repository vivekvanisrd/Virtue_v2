import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seed() {
  console.log("🧬 [GENESIS SEED] Injecting Platform Blueprint DNA...");
  
  const standardGrades = [
    { name: "LKG", level: -2 },
    { name: "UKG", level: -1 },
    { name: "1st Grade", level: 1 },
    { name: "2nd Grade", level: 2 },
    { name: "3rd Grade", level: 3 },
    { name: "4th Grade", level: 4 },
    { name: "5th Grade", level: 5 },
    { name: "6th Grade", level: 6 },
    { name: "7th Grade", level: 7 },
    { name: "8th Grade", level: 8 },
    { name: "9th Grade", level: 9 },
    { name: "10th Grade", level: 10 }
  ];

  for (const g of standardGrades) {
    const pc = await prisma.platformClass.upsert({
      where: { name: g.name },
      update: { level: g.level },
      create: { 
        name: g.name, 
        level: g.level 
      }
    });

    console.log(`✅ Seeded Grade: ${pc.name}`);

    // Seed Sections A and B for each
    for (const sectionName of ["A", "B"]) {
      const existingSection = await prisma.platformSection.findFirst({
        where: { name: sectionName, platformClassId: pc.id }
      });
      
      if (!existingSection) {
        await prisma.platformSection.create({
          data: {
            name: sectionName,
            platformClassId: pc.id
          }
        });
        console.log(`  └─ Created Section: ${sectionName}`);
      }
    }
  }

  console.log("🌟 [GENESIS SEED] Blueprint DNA fully instantiated.");
}

seed()
  .catch(function(e) { console.error(e); })
  .finally(async function() { await prisma.$disconnect(); });
