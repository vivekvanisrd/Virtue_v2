const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const schoolId = 'VIVES';
  const categoryName = 'Fee Collector';
  
  console.log(`Adding staff category '${categoryName}' for school '${schoolId}'...`);
  
  const existing = await prisma.staffCategory.findFirst({
    where: {
      schoolId,
      name: categoryName
    }
  });
  
  if (existing) {
    console.log(`Category '${categoryName}' already exists.`);
  } else {
    const created = await prisma.staffCategory.create({
      data: {
        schoolId,
        name: categoryName
      }
    });
    console.log('Category created successfully:', created);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
