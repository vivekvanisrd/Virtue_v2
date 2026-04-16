import { PrismaClient } from '@prisma/client';
import { getStaffDirectoryAction, getStaffHubStats, getSalaryHubStats } from './src/lib/actions/staff-actions';
import { generatePayrollDraftAction } from './src/lib/actions/payroll-actions';
import { getFinanceKPIs, getRazorpayReport } from './src/lib/actions/finance-actions';

// Mock getTenantContext for testing
jest.mock('./src/lib/utils/tenant-context', () => ({
  getTenantContext: jest.fn().mockResolvedValue({
    schoolId: 'VIVA',
    branchId: 'GLOBAL',
    staffId: 'DEV-BYPASS',
    role: 'DEVELOPER',
    permissions: ['*']
  }),
  getTenancyFilters: jest.requireActual('./src/lib/utils/tenant-context').getTenancyFilters
}));

async function testGlobalAccess() {
  console.log("--- Testing GLOBAL Developer Access ---");

  // 1. Staff Directory
  const staffRes = await getStaffDirectoryAction();
  console.log(`Staff Directory: ${staffRes.success ? 'SUCCESS' : 'FAILED'} (Count: ${staffRes.data?.length})`);
  if (!staffRes.success || staffRes.data.length === 0) {
    console.error("FAIL: Staff Directory empty for GLOBAL admin.");
  }

  // 2. Staff Hub Stats
  const hubRes = await getStaffHubStats();
  console.log(`Staff Hub Stats: ${hubRes.success ? 'SUCCESS' : 'FAILED'} (Total: ${hubRes.data?.totalStaff})`);

  // 3. Salary Hub Stats
  const salRes = await getSalaryHubStats();
  console.log(`Salary Hub Stats: ${salRes.success ? 'SUCCESS' : 'FAILED'}`);

  // 4. Payroll Draft Generation
  const payrollRes = await generatePayrollDraftAction(3, 2026, 30, 'GLOBAL');
  console.log(`Payroll Draft Generation: ${payrollRes.success ? 'SUCCESS' : 'FAILED'}`);
  if (!payrollRes.success) {
    console.error("FAIL: Payroll Draft Generation failed for GLOBAL admin:", payrollRes.error);
  }

  // 5. Finance KPIs
  const kpiRes = await getFinanceKPIs();
  console.log(`Finance KPIs: ${kpiRes.success ? 'SUCCESS' : 'FAILED'}`);

  console.log("--- Test Complete ---");
}

// Since we are in a real environment, I'll just run a simplified version using ts-node directly
// because mocking server actions in a standalone script is tricky.
