const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log("==========================================");
    console.log("         CASH PAYMENT AUDIT REPORT        ");
    console.log("==========================================\n");

    // 1. Fetch all Chart of Accounts related to Cash and Bank
    const accounts = await prisma.chartOfAccount.findMany({
      where: {
        OR: [
          { accountCode: { in: ['1110', '1120', '1200', '4100', '4200'] } },
          { accountName: { contains: 'Cash', mode: 'insensitive' } },
          { accountName: { contains: 'Bank', mode: 'insensitive' } }
        ]
      }
    });

    const accountMap = {};
    console.log("--- Relevant Chart of Accounts ---");
    for (const acc of accounts) {
      accountMap[acc.id] = acc;
      console.log(`Code: ${acc.accountCode.padEnd(20)} | Name: ${acc.accountName.padEnd(25)} | Balance: ${acc.currentBalance.toString().padStart(12)} | Type: ${acc.accountType}`);
    }
    console.log("");

    // 2. Fetch all Journal Entries and their Lines that affect Cash accounts
    const journalEntries = await prisma.journalEntry.findMany({
      include: {
        lines: {
          include: {
            account: true
          }
        }
      },
      orderBy: { entryDate: 'asc' }
    });

    console.log(`--- Total Journal Entries Found: ${journalEntries.length} ---`);
    
    let totalCashDebits = 0;
    let totalCashCredits = 0;
    let totalBankDebits = 0;
    let totalBankCredits = 0;

    let onlineSettledAsCashCount = 0;
    let onlineSettledAsCashTotal = 0;
    let pureCashReceiptCount = 0;
    let pureCashReceiptTotal = 0;
    let otherReceiptCount = 0;
    let otherReceiptTotal = 0;

    const receiptAuditRows = [];

    const cashAccountId = accounts.find(a => a.accountCode === '1110')?.id;
    const bankAccountId = accounts.find(a => a.accountCode === '1120')?.id;

    for (const je of journalEntries) {
      // We focus on RECEIPT entries, but also scan if they touch Cash (1110) or Bank (1120)
      const touchesCash = je.lines.some(l => l.accountId === cashAccountId);
      const touchesBank = je.lines.some(l => l.accountId === bankAccountId);

      // Check debits/credits on 1110 (Cash in Hand)
      for (const line of je.lines) {
        if (line.accountId === cashAccountId) {
          totalCashDebits += Number(line.debit);
          totalCashCredits += Number(line.credit);
        }
        if (line.accountId === bankAccountId) {
          totalBankDebits += Number(line.debit);
          totalBankCredits += Number(line.credit);
        }
      }

      if (je.entryType === 'RECEIPT') {
        const descLower = (je.description || "").toLowerCase();
        const isOnline = descLower.includes('razorpay') || descLower.includes('callback') || descLower.includes('webhook') || descLower.includes('ref: pay_');
        const isCash = descLower.includes('mode: cash') || descLower.includes('ref: ') && !isOnline;

        // Find what account was debited
        const debitLine = je.lines.find(l => Number(l.debit) > 0);
        const debitedAccount = debitLine ? debitLine.account : null;
        const totalAmount = Number(je.totalDebit);

        if (isOnline) {
          if (debitedAccount && debitedAccount.accountCode === '1110') {
            onlineSettledAsCashCount++;
            onlineSettledAsCashTotal += totalAmount;
            receiptAuditRows.push({
              jeId: je.id,
              date: je.entryDate,
              description: je.description,
              amount: totalAmount,
              debitedAccount: `${debitedAccount.accountName} (${debitedAccount.accountCode})`,
              classification: "ONLINE_SETTLED_AS_CASH",
              status: "⚠️ ERROR: Razorpay payment debited to Cash In Hand!"
            });
          } else {
            otherReceiptCount++;
            otherReceiptTotal += totalAmount;
            receiptAuditRows.push({
              jeId: je.id,
              date: je.entryDate,
              description: je.description,
              amount: totalAmount,
              debitedAccount: debitedAccount ? `${debitedAccount.accountName} (${debitedAccount.accountCode})` : 'Unknown',
              classification: "ONLINE_OK",
              status: "✅ OK"
            });
          }
        } else if (isCash || descLower.includes('fee collection')) {
          pureCashReceiptCount++;
          pureCashReceiptTotal += totalAmount;
          receiptAuditRows.push({
            jeId: je.id,
            date: je.entryDate,
            description: je.description,
            amount: totalAmount,
            debitedAccount: debitedAccount ? `${debitedAccount.accountName} (${debitedAccount.accountCode})` : 'Unknown',
            classification: "PURE_CASH",
            status: debitedAccount && debitedAccount.accountCode === '1110' ? "✅ OK" : "⚠️ WARNING: Cash payment debited to non-cash account!"
          });
        } else {
          otherReceiptCount++;
          otherReceiptTotal += totalAmount;
          receiptAuditRows.push({
            jeId: je.id,
            date: je.entryDate,
            description: je.description,
            amount: totalAmount,
            debitedAccount: debitedAccount ? `${debitedAccount.accountName} (${debitedAccount.accountCode})` : 'Unknown',
            classification: "OTHER_RECEIPT",
            status: "ℹ️ Review Required"
          });
        }
      }
    }

    console.log("--- Receipt Classifications and Audit ---");
    receiptAuditRows.forEach((row, i) => {
      console.log(`[${i+1}] Date: ${row.date.toDateString()} | Amt: ${row.amount.toFixed(2).padStart(10)} | Account: ${row.debitedAccount.padEnd(25)}`);
      console.log(`    Desc: ${row.description}`);
      console.log(`    Status: ${row.status}\n`);
    });

    console.log("--- Summary of Audited Receipts ---");
    console.log(`- Pure Cash Receipts:                  Count: ${pureCashReceiptCount.toString().padStart(3)} | Total: ${pureCashReceiptTotal.toFixed(2).padStart(12)}`);
    console.log(`- Online (Razorpay) Settled as Cash:   Count: ${onlineSettledAsCashCount.toString().padStart(3)} | Total: ${onlineSettledAsCashTotal.toFixed(2).padStart(12)} (⚠️ AUDIT DEFECT)`);
    console.log(`- Other Receipts:                      Count: ${otherReceiptCount.toString().padStart(3)} | Total: ${otherReceiptTotal.toFixed(2).padStart(12)}`);
    console.log(`Total Receipt JEs Processed:           Count: ${(pureCashReceiptCount + onlineSettledAsCashCount + otherReceiptCount).toString().padStart(3)} | Total: ${(pureCashReceiptTotal + onlineSettledAsCashTotal + otherReceiptTotal).toFixed(2).padStart(12)}\n`);

    console.log("--- Ledger vs Chart of Accounts Reconciliation ---");
    const coaCashBalance = Number(accounts.find(a => a.accountCode === '1110')?.currentBalance || 0);
    const coaBankBalance = Number(accounts.find(a => a.accountCode === '1120')?.currentBalance || 0);
    
    const calculatedCashBalance = totalCashDebits - totalCashCredits;
    const calculatedBankBalance = totalBankDebits - totalBankCredits;

    console.log(`* Cash in Hand (1110):`);
    console.log(`  - COA Recorded Balance:  ${coaCashBalance.toFixed(2)}`);
    console.log(`  - Sum of Journal Debits: ${totalCashDebits.toFixed(2)}`);
    console.log(`  - Sum of Journal Credits:${totalCashCredits.toFixed(2)}`);
    console.log(`  - Net Journal Impact:    ${calculatedCashBalance.toFixed(2)}`);
    console.log(`  - Discrepancy:          ${(coaCashBalance - calculatedCashBalance).toFixed(2)}`);
    console.log(`  - Note: In this Cash balance, ₹${onlineSettledAsCashTotal.toFixed(2)} is from Online (Razorpay) settlements that should be in the Bank Account!\n`);

    console.log(`* Main Bank Account (1120):`);
    console.log(`  - COA Recorded Balance:  ${coaBankBalance.toFixed(2)}`);
    console.log(`  - Sum of Journal Debits: ${totalBankDebits.toFixed(2)}`);
    console.log(`  - Sum of Journal Credits:${totalBankCredits.toFixed(2)}`);
    console.log(`  - Net Journal Impact:    ${calculatedBankBalance.toFixed(2)}`);
    console.log(`  - Discrepancy:          ${(coaBankBalance - calculatedBankBalance).toFixed(2)}\n`);

    console.log("--- Missing Collection Records Check ---");
    const dbCollectionsCount = await prisma.collection.count();
    console.log(`- Collections in 'Collection' table: ${dbCollectionsCount}`);
    if (dbCollectionsCount === 0 && receiptAuditRows.length > 0) {
      console.log(`⚠️ CRITICAL ERROR: The 'Collection' database table has 0 records, but there are ${receiptAuditRows.length} 'RECEIPT' journal entries in the database!`);
      console.log(`   This means collection records are completely missing or have been deleted/wiped (e.g. by clean/reset scripts) while the accounting journals remain!`);
    }

  } catch (err) {
    console.error("Audit script failed:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
