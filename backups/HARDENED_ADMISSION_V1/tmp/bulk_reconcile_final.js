const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function bulkReconcile() {
  const studentId = "95f9ac56-cb39-498f-9876-76c867961c5f"; // BHARGAV G YADAV
  const bhargavTerms = ["term1", "term2", "term3", "advance"];
  
  const payments = [
    { id: "pay_SYHSRr4gDDOamo", amount: 12500, fee: 221.25, terms: ["term2"] },
    { id: "pay_SYHEdQArc7E1F4", amount: 25000, fee: 442.50, terms: ["term3"] }, // Using it for Term 3 even if amount is higher
    { id: "pay_SYHAbKp8deiHgw", amount: 12500, fee: 221.25, terms: ["advance"] },
    { id: "pay_SYGOiibDpCts54", amount: 12647, fee: 224.37, terms: ["advance_2"] },
    { id: "pay_SYGAdlWM8bhUAd", amount: 12647, fee: 224.37, terms: ["advance_3"] },
    { id: "pay_SYFz5T0zItAsiw", amount: 12647, fee: 224.37, terms: ["advance_4"] },
    { id: "pay_SYEF638Ti5EApC", amount: 253521, fee: 4488, terms: ["general_settlement"] }
  ];

  console.log(`🚀 Starting Bulk Reconciliation for BHARGAV G YADAV (${studentId})...`);

  for (const p of payments) {
    // Check if already exists
    const existing = await prisma.collection.findFirst({
        where: { paymentReference: p.id }
    });

    if (existing) {
        console.log(`[EXISTING] Skip ${p.id}`);
        continue;
    }

    try {
        await prisma.collection.create({
            data: {
                studentId,
                receiptNumber: `VIVA-REC-FY 2026-AUTO-${p.id.slice(-6).toUpperCase()}`,
                schoolId: "VIVA",
                branchId: "VIVA-BR-01",
                financialYearId: "FY-VIVA-2026-27",
                amountPaid: p.amount.toString(),
                lateFeePaid: "0",
                convenienceFee: p.fee.toString(),
                totalPaid: (p.amount + p.fee).toString(),
                paymentMode: "Razorpay",
                paymentReference: p.id,
                paymentDate: new Date(),
                collectedBy: "SYSTEM_AUTO_RECONCILE",
                status: "Success",
                allocatedTo: {
                    terms: p.terms,
                    waiverReason: "[CRITICAL_AUTO_RECONCILE] Recovered from Captured Dashboard",
                    lateFeeWaived: false
                }
            }
        });
        console.log(`[SUCCESS] Reconciled ${p.id} to ${p.terms.join(',')}`);
    } catch (err) {
        console.error(`[FAILED] ${p.id}: ${err.message}`);
    }
  }

  console.log("🏁 Reconciliation Complete.");
}

bulkReconcile()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
