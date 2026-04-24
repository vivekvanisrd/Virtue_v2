import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding Multi-Tenant Database...')

  // --- SCHOOL 1: VIRTUE SCHOOL ---
  const school1 = await prisma.school.upsert({
    where: { code: 'VIRTUE-MAIN' },
    update: {},
    create: {
      id: 'VR-SCH01',
      name: 'Virtue Next Gen School',
      code: 'VIRTUE-MAIN',
      highestClass: 'Class 12',
    },
  })

  const branch1 = await prisma.branch.upsert({
    where: { schoolId_code: { schoolId: school1.id, code: 'RCB01' } },
    update: {},
    create: {
      id: 'VR-RCB01',
      schoolId: school1.id,
      name: 'Rajajinagar Branch',
      code: 'RCB01',
    },
  })

  // AY/FY for School 1
  await prisma.academicYear.upsert({
    where: { id: 'VR-AY-2026-27' },
    update: { schoolId: school1.id },
    create: {
      id: 'VR-AY-2026-27',
      schoolId: school1.id,
      name: '2026-27',
      startDate: new Date('2026-06-01'),
      endDate: new Date('2027-03-31'),
      isCurrent: true,
    },
  })

  await prisma.financialYear.upsert({
    where: { id: 'VR-FY-2026-27' },
    update: { schoolId: school1.id },
    create: {
      id: 'VR-FY-2026-27',
      schoolId: school1.id,
      name: 'FY 2026-27',
      startDate: new Date('2026-04-01'),
      endDate: new Date('2027-03-31'),
      isCurrent: true,
    },
  })

  // --- SCHOOL 2: GLOBAL INTERNATIONAL ---
  const school2 = await prisma.school.upsert({
    where: { code: 'GLOBAL-INT' },
    update: {},
    create: {
      id: 'GI-SCH02',
      name: 'Global International Academy',
      code: 'GLOBAL-INT',
      highestClass: 'Class 12',
    },
  })

  const branch2 = await prisma.branch.upsert({
    where: { schoolId_code: { schoolId: school2.id, code: 'IND02' } },
    update: {},
    create: {
      id: 'GI-IND02',
      schoolId: school2.id,
      name: 'Indiranagar Branch',
      code: 'IND02',
    },
  })

  // AY/FY for School 2
  await prisma.academicYear.upsert({
    where: { id: 'GI-AY-2026-27' },
    update: { schoolId: school2.id },
    create: {
      id: 'GI-AY-2026-27',
      schoolId: school2.id,
      name: '2026-27',
      startDate: new Date('2026-06-01'),
      endDate: new Date('2027-03-31'),
      isCurrent: true,
    },
  })

  // --- STAFF ---
  await prisma.staff.upsert({
    where: { schoolId_staffCode: { schoolId: school1.id, staffCode: 'VR-OWN-01' } },
    update: {},
    create: {
      staffCode: 'VR-OWN-01',
      firstName: 'Virtue',
      lastName: 'Owner',
      schoolId: school1.id,
      branchId: branch1.id,
      role: 'OWNER',
      status: 'Active'
    }
  })

  await prisma.staff.upsert({
    where: { schoolId_staffCode: { schoolId: school2.id, staffCode: 'GI-PRIN-02' } },
    update: {},
    create: {
      staffCode: 'GI-PRIN-02',
      firstName: 'Global',
      lastName: 'Principal',
      schoolId: school2.id,
      branchId: branch2.id,
      role: 'PRINCIPAL',
      status: 'Active'
    }
  })

  // --- CHART OF ACCOUNTS ---
  const coaData = [
    { code: '1001', name: 'Cash in Hand', type: 'Asset' },
    { code: '1002', name: 'HDFC Bank', type: 'Asset' },
    { code: '3001', name: 'Tuition Fees', type: 'Income' },
    { code: '3002', name: 'Admission Fees', type: 'Income' },
    { code: '4001', name: 'Staff Salary', type: 'Expense' },
  ]

  for (const item of coaData) {
    await prisma.chartOfAccount.upsert({
      where: { schoolId_accountCode: { schoolId: school1.id, accountCode: item.code } },
      update: {},
      create: {
        schoolId: school1.id,
        branchId: branch1.id,
        accountCode: item.code,
        accountName: item.name,
        accountType: item.type,
      },
    })
  }

  // --- CLASSES ---
  const class1 = await prisma.class.upsert({
    where: { id: 'VR-CLASS-1' },
    update: {},
    create: { id: 'VR-CLASS-1', name: 'Class 1', level: 1 }
  })

  await prisma.section.upsert({
    where: { id: 'VR-SEC-1A' },
    update: {},
    create: { id: 'VR-SEC-1A', name: 'A', classId: class1.id }
  })

  // --- SAMPLE STUDENT ---
  await prisma.student.upsert({
    where: { schoolId_admissionNumber: { schoolId: school1.id, admissionNumber: 'VR-2026-0001' } },
    update: {},
    create: {
      admissionNumber: 'VR-2026-0001',
      studentCode: 'STU001',
      firstName: 'Aditi',
      lastName: 'Sharma',
      schoolId: school1.id,
      academic: {
        create: {
          id: 'VR-AC-001',
          schoolId: school1.id,
          branchId: branch1.id,
          classId: class1.id,
          academicYear: '2026-27',
          admissionDate: new Date(),
        }
      }
    }
  })

  console.log('✅ Seed complete!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
