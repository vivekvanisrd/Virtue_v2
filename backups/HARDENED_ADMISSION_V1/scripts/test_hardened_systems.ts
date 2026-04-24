import { PrismaClient } from '@prisma/client';
import { CounterService } from '../src/lib/services/counter-service';
import { finalizePayrollAction, exportBankCSVAction, generatePayrollDraftAction } from '../src/lib/actions/payroll-actions';

const prisma = new PrismaClient();

async function testSystems() {
  console.log('--- STARTING COMPREHENSIVE SYSTEM VERIFICATION ---');

  const school = await prisma.school.findFirst({ where: { code: 'VIVA' } });
  const branch = await prisma.branch.findFirst({ where: { code: 'RCB' } });
  
  if (!school || !branch) {
      console.error('Core entities VIVA or RCB not found. Please run migration first.');
      return;
  }

  // 1. TEST IDENTITY GENERATION
  console.log('\n[1/3] Testing Identity Generation...');
  const testAdm = await CounterService.generateAdmissionNumber({
    schoolId: school.id,
    schoolCode: school.code,
    branchId: branch.id,
    branchCode: branch.code,
    year: '2026-27'
  });
  console.log(`Generated Admission ID: ${testAdm} (Expected: VIVA-RCB-2026-27-ADM-XXXXX)`);

  const testStu = await CounterService.generateStudentCode({
    schoolId: school.id,
    schoolCode: school.code,
    branchId: branch.id,
    branchCode: branch.code,
    year: '2026-27'
  });
  console.log(`Generated Student ID: ${testStu} (Expected: VIVA-RCB-2026-27-STU-XXXX)`);

  // 2. TEST PAYROLL FINALIZATION & SEALING
  console.log('\n[2/3] Testing Payroll Sealing...');
  // Find a draft payroll run
  const draftRun = await prisma.payrollRun.findFirst({ where: { status: 'Draft', schoolId: school.id } });
  if (draftRun) {
      console.log(`Found Draft Run for ${draftRun.month}/${draftRun.year}. Finalizing...`);
      const res = await finalizePayrollAction(draftRun.id);
      if (res.success) {
          const sealedSlips = await prisma.salarySlip.findMany({ where: { payrollRunId: draftRun.id } });
          console.log(`Successfully sealed ${sealedSlips.length} slips.`);
          console.log(`Sample Hash: ${sealedSlips[0].hash}`);
      } else {
          console.error(`Finalization Failed: ${res.error}`);
      }
  } else {
      console.log('No Draft Payroll Run found to test sealing.');
  }

  // 3. TEST BANK EXPORT
  console.log('\n[3/3] Testing Bank Export...');
  const approvedRun = await prisma.payrollRun.findFirst({ where: { status: 'Approved', schoolId: school.id } });
  if (approvedRun) {
      const csvRes = await exportBankCSVAction(approvedRun.id);
      if (csvRes.success && csvRes.csvData) {
          console.log('Bank CSV Generated Successfully.');
          console.log('CSV Preview (First line):');
          console.log(csvRes.csvData.split('\n')[1]); 
      } else {
          console.error(`Export Failed: ${csvRes.error}`);
      }
  } else {
      console.log('No Approved Payroll Run found to test export.');
  }

  console.log('\n--- VERIFICATION FINISHED ---');
}

testSystems().catch(console.error).finally(() => prisma.$disconnect());
