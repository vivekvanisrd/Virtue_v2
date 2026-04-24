const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function check() {
  try {
    const s = await prisma.student.findFirst({
      where: { registrationId: 'VIVES-RCB-2026-27-PROV-00002' },
      include: { 
        financial: { include: { components: { include: { masterComponent: true } } } }, 
        ledgerEntries: true 
      }
    });
    if (!s) { console.log('not found by regId'); return; }
    console.log('STUDENT:', s.firstName, s.lastName, 'ID:', s.id);
    console.log('ANNUAL TUITION:', s.financial?.annualTuition);
    console.log('COMPONENTS:', s.financial?.components?.length);
    s.financial?.components?.forEach(c => {
       console.log(' - COMP:', c.masterComponent.name, 'AMT:', c.baseAmount);
    });
    console.log('LEDGER ENTRIES:', s.ledgerEntries?.length);
    s.ledgerEntries?.forEach(e => {
       console.log(' - LEDGER:', e.type, 'REASON:', e.reason, 'AMT:', e.amount);
    });
  } catch (e) {
    console.error(e);
  } finally {
    process.exit();
  }
}
check();
