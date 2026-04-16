import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const schools = await prisma.school.findMany({ select: { id: true, code: true, name: true } })
  const branches = await prisma.branch.findMany({ select: { id: true, code: true, name: true } })
  const academicYears = await prisma.academicYear.findMany({ select: { id: true, name: true } })
  const classes = await prisma.class.findMany({ select: { id: true, name: true } })
  
  console.log('--- Database Context ---')
  console.log('Schools:', schools)
  console.log('Branches:', branches)
  console.log('Academic Years:', academicYears)
  console.log('Classes:', classes)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
