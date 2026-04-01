const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const STUDENT_ID = 'd8afb46d-ff84-4d75-a3d4-54db25e475a3'; // Studen2
const PAYMENT_ID = 'pay_SYJmkcun9QH628';
const SCHOOL_ID = 'VIVA';
const FY_ID = 'VR-FY-2026-27';

async function forceReconcile() {
  console.log(`[FORCE_RECONCILE] 🚀 Settling ${PAYMENT_ID}...`);

  try {
    const existing = await prisma.collection.findFirst({
      where: { paymentReference: PAYMENT_ID }
    });

    if (existing) {
      console.log(`[FORCE_RECONCILE] ✅ Already settled.`);
      return;
    }

    await prisma.$transaction(async (tx) => {
      const collection = await tx.collection.create({
        data: {
          studentId: STUDENT_ID,
          schoolId: SCHOOL_ID,
          financialYearId: FY_ID,
          amountPaid: 254425,
          paymentMode: 'Razorpay',
          paymentReference: PAYMENT_ID,
          receiptNumber: 'VIVA-REC-2026-RECOVERY-99',
          status: 'Success',
          receivedBy: 'SYSTEM_RAZORPAY',
          collectionDate: new Date(),
          allocatedTo: {
            terms: ['term1'],
            rrn: 'AUTO_RECOVERED',
            notes: 'Recovered via AI Manual Override'
          }
        }
      });

      await tx.activityLog.create({
        data: {
          schoolId: SCHOOL_ID,
          userId: 'SYSTEM_RAZORPAY',
          entityType: 'COLLECTION',
          entityId: collection.id,
          action: 'RECONCILED_MANUALLY',
          details: `Manual recovery for missing payment ${PAYMENT_ID}`
        }
      });

      console.log(`[FORCE_RECONCILE] ✅ SUCCESS!`);
    });

  } catch (error) {
    console.error(`[FORCE_RECONCILE] ❌ FAILED: ${error.message}`);
  } finally {
    await prisma.$disconnect();
  }
}

forceReconcile();
