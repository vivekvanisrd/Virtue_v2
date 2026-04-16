import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🧐 Auditing Registry State...')
  
  const counts = {
    schools: await prisma.school.count(),
    branches: await prisma.branch.count(),
    students: await prisma.student.count(),
    staff: await prisma.staff.count(),
    academicYears: await prisma.academicYear.count(),
    financialYears: await prisma.financialYear.count()
  }

  console.log('--- REGISTRY AUDIT REPORT ---')
  console.table(counts)
  
  const total = Object.values(counts).reduce((acc, val) => acc + val, 0)
  if (total === 0) {
    console.log('✅ STERILE ENVIRONMENT CONFIRMED: 0 Records Found.')
  } else {
    console.warn('⚠️ WARNING: Artifacts detected in registry matrix.')
  }
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect())
