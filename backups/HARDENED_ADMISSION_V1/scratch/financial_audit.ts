import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  console.log('🔍 [FORENSIC AUDIT] Checking Financial Infrastructure...')
  
  const schoolCount = await prisma.school.count()
  const branchCount = await prisma.branch.count()
  const coaCount = await prisma.chartOfAccount.count()
  const fyCount = await prisma.financialYear.count()
  const feeMasterCount = await prisma.feeComponentMaster.count()

  console.log(`- Schools: ${schoolCount}`)
  console.log(`- Branches: ${branchCount}`)
  console.log(`- Chart of Accounts: ${coaCount}`)
  console.log(`- Financial Years: ${fyCount}`)
  console.log(`- Fee Components: ${feeMasterCount}`)

  if (coaCount > 0) {
    const criticalAccounts = ['1110', '1200', '4100', '4200']
    for (const code of criticalAccounts) {
      const acc = await prisma.chartOfAccount.findFirst({ where: { accountCode: code } })
      console.log(`- Account [${code}]: ${acc ? '✅ FOUND (' + acc.name + ')' : '❌ MISSING'}`)
    }
  }

  const activeFY = await prisma.financialYear.findFirst({ where: { isCurrent: true } })
  console.log(`- Active Financial Year: ${activeFY ? '✅ ' + activeFY.name : '❌ NONE'}`)
  
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
