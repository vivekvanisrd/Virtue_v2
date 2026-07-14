import dns from "dns";
if (dns && typeof dns.setDefaultResultOrder === "function") {
  dns.setDefaultResultOrder("ipv4first");
}

import { prismaBypass } from "../src/lib/prisma";

async function main() {
  const schoolId = "VIVES";
  const studentId = "82a28bc3-2f85-4ae1-8023-340f9bf9ab23"; // N.SHREYANVI

  console.log("🚀 Starting removal of payment records for N.SHREYANVI...");

  await prismaBypass.$transaction(async (tx) => {
    // 1. Fetch all collections for the student
    const collections = await tx.collection.findMany({
      where: { studentId }
    });

    console.log(`Found ${collections.length} collection entries to delete.`);

    let totalAmountRefunded = 0;
    let cashRefunded = 0;
    let bankRefunded = 0;

    for (const col of collections) {
      const amount = Number(col.amountPaid || 0);
      totalAmountRefunded += amount;
      if (col.paymentMode === "ONLINE") {
        bankRefunded += amount;
      } else {
        cashRefunded += amount;
      }

      // Delete allocations
      await tx.collectionAllocation.deleteMany({
        where: { collectionId: col.id }
      });

      // Delete Journal Entry & Lines
      if (col.journalEntryId) {
        await tx.journalLine.deleteMany({
          where: { journalEntryId: col.journalEntryId }
        });
        await tx.journalEntry.delete({
          where: { id: col.journalEntryId }
        });
      }

      // Delete collection itself
      await tx.collection.delete({
        where: { id: col.id }
      });
    }

    // 2. Delete payment ledger entries
    const ledgerDeletes = await tx.ledgerEntry.deleteMany({
      where: { studentId, type: "PAYMENT" }
    });
    console.log(`Deleted ${ledgerDeletes.count} ledger payment statements.`);

    // 3. Reset warded invoice balances
    const invoices = await tx.feeInvoice.findMany({
      where: { studentId },
      include: { items: true }
    });

    for (const inv of invoices) {
      await tx.feeInvoiceItem.updateMany({
        where: { invoiceId: inv.id },
        data: {
          paidAmount: 0,
          balance: { set: 0 } // Reset temporarily to match raw set logic
        }
      });

      // Explicitly set balances equal to original amounts
      for (const item of inv.items) {
        await tx.feeInvoiceItem.update({
          where: { id: item.id },
          data: { balance: item.amount }
        });
      }

      await tx.feeInvoice.update({
        where: { id: inv.id },
        data: {
          paidAmount: 0,
          balance: inv.totalAmount,
          status: "PENDING"
        }
      });
    }
    console.log(`Reset ${invoices.length} invoices to fully unpaid.`);

    // 4. Calibrate GL accounts
    if (cashRefunded > 0) {
      await tx.chartOfAccount.updateMany({
        where: { schoolId, accountCode: "1110" },
        data: { currentBalance: { decrement: cashRefunded } }
      });
    }
    if (bankRefunded > 0) {
      await tx.chartOfAccount.updateMany({
        where: { schoolId, accountCode: "1120" },
        data: { currentBalance: { decrement: bankRefunded } }
      });
    }
    if (totalAmountRefunded > 0) {
      await tx.chartOfAccount.updateMany({
        where: { schoolId, accountCode: "1200" },
        data: { currentBalance: { increment: totalAmountRefunded } }
      });
    }
    console.log(`Calibrated GL ledger accounts: Cash (-${cashRefunded}), Bank (-${bankRefunded}), AR (+${totalAmountRefunded}).`);
  });

  console.log("✅ Successfully cleared all payment data for N.SHREYANVI!");
}

main()
  .catch(console.error)
  .finally(() => prismaBypass.$disconnect());
