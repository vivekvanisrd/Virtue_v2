const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const crypto = require('crypto');

async function exportBankCSVToFile(payrollRunId, format, fileName) {
  const run = await prisma.payrollRun.findUnique({
    where: { id: payrollRunId },
    include: { 
      branch: true,
      slips: {
        include: {
          staff: {
            include: {
              bank: true
            }
          }
        }
      }
    }
  });

  if (!run) return;

  const schoolDebitAccount = "915010023357136"; 
  let csvData = "";
  
  if (format === "AXIS_INTERNAL") {
     const header = `"Debit Account Number  \n(Mandatory)","Transaction Amount\n(Mandatory)","Transaction Currency\n(Non-Mandatory)","Beneficiary Account Number\n(Mandatory)","Transaction Date\n(Mandatory)","Customer Reference Number\n(Mandatory)","Beneficiary Code\n(Non-Mandatory)","Beneficiary Name\n(Mandatory)",,\n`;
     csvData = header;
     
     const mm = run.month.toString().padStart(2, "0");
     const yyyy = run.year.toString();
     const refPrefix = `vs${mm}${yyyy}`;

     let seq = 1;
     for (const slip of run.slips) {
       if (slip.netSalary <= 0) continue;
       const bank = slip.staff?.bank;
       if (!bank || !bank.accountNumber || !bank.ifscCode) continue;
       if (!bank.ifscCode.toUpperCase().startsWith("UTIB")) continue;

       const dateStr = `16/04/26`; // Using fixed date for historical pack consistency
       const ref = `${refPrefix}${seq.toString().padStart(3, "0")}`;
       const name = bank.accountName || `${slip.staff.firstName} ${slip.staff.lastName}`;
       
       csvData += `${schoolDebitAccount},${Math.round(Number(slip.netSalary))},,${bank.accountNumber},${dateStr},${ref},,${name},,\n`;
       seq++;
     }
  } 
  else {
     const header = `"Debit Account Number\n(Mandatory)","Transaction Amount\n(Mandatory)","Transaction Currency\n(Non-Mandatory)","Beneficiary Name\n(Mandatory)","Beneficiary Account Number\n(Mandatory)","Beneficiary IFSC Code\n(Mandatory)","Transaction Date\n(Mandatory)","Payment Mode\n(Mandatory)",Customer Reference Number(Mandatory),"Beneficiary Nickname/Code\n(Mandatory)","Bank Account Type\n(Non-Mandatory)","Debit Narration\n(Non-Mandatory)","Credit Narration\n(Non-Mandatory)","Beneficiary Address 1\n(Non-Mandatory)","Beneficiary Address 2\n(Non-Mandatory)","Beneficiary Address 3\n(Non-Mandatory)","Beneficiary City\n(Non-Mandatory)","Beneficiary State\n(Non-Mandatory)","Beneficiary Pin Code\n(Non-Mandatory)","Beneficiary Bank Name\n(Non-Mandatory)","Beneficiary Email address 1\n(Non-Mandatory)","Beneficiary Email address 2\n(Non-Mandatory)","Beneficiary Mobile Number\n(Non-Mandatory)","Add Info1\n(Non-Mandatory)","Add Info2\n(Non-Mandatory)","Add Info3\n(Non-Mandatory)","Add Info4\n(Non-Mandatory)","Add Info5\n(Non-Mandatory)","Add Info6\n(Non-Mandatory)"\n`;
     csvData = header;
     
     const mm = run.month.toString().padStart(2, "0");
     const yyyy = run.year.toString();
     const refPrefix = `VA${mm}${yyyy}`;

     let seq = 1;
     for (const slip of run.slips) {
       if (slip.netSalary <= 0) continue;
       const bank = slip.staff?.bank;
       if (!bank || !bank.accountNumber || !bank.ifscCode) continue;
       if (bank.ifscCode.toUpperCase().startsWith("UTIB")) continue;

       const dateStr = `16/04/2026`;
       const ref = `${refPrefix}${seq.toString().padStart(3, "0")}`;
       const name = bank.accountName || `${slip.staff.firstName} ${slip.staff.lastName}`;
       const nickname = (slip.staff.firstName + (slip.staff.lastName || "")).replace(/[^a-zA-Z0-9]/g, "").substring(0, 15);
       
       csvData += `${schoolDebitAccount},${Math.round(Number(slip.netSalary))},,${name},${bank.accountNumber},${bank.ifscCode},${dateStr},IMPS,${ref},${nickname},,,,,,,,,,,,,,,,,,,\n`;
       seq++;
     }
  }

  fs.writeFileSync(`j:/virtue_fb/virtue-v2/scratch/${fileName}`, csvData);
}

async function main() {
  const runs = await prisma.payrollRun.findMany({
    where: { year: { in: [2025, 2026] }, month: { in: [12, 1, 2, 3] } }
  });

  for (const run of runs) {
    const monthNames = ["", "JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
    const mName = monthNames[run.month];
    
    await exportBankCSVToFile(run.id, "AXIS_INTERNAL", `BANK_EXPORT_${mName}_${run.year}_INTERNAL.csv`);
    await exportBankCSVToFile(run.id, "AXIS_EXTERNAL", `BANK_EXPORT_${mName}_${run.year}_EXTERNAL.csv`);
    console.log(`✅ Generated export pair for ${mName} ${run.year}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
