import { prismaBypass } from "@/lib/prisma";
import { RuleLoader } from "./rule-loader";
import { ValidationEngine } from "./validation-engine";
import { StatutoryPluginRegistry } from "./plugin-registry";
import crypto from "crypto";

export class CalculationEngine {
  /**
   * Main calculation interface.
   * Resolves rules, executes plugins, logs step-by-step traces, and stores frozen snapshot logs.
   */
  static async calculateStatutoryDeductions(
    schoolId: string,
    payrollRunId: string,
    staffId: string,
    salaryStructure: {
      basicSalary: number;
      daAmount: number;
      hraAmount: number;
      otherAllowances: number;
      grossSalary: number;
      lwpDays: number;
    },
    targetDate: Date,
    options: { branchId?: string } = {}
  ) {
    // 1. Validate employee configuration
    const valReport = await ValidationEngine.validateStaff(
      schoolId,
      staffId,
      salaryStructure,
      targetDate
    );

    // 2. Fetch Employee Nominees count
    const nomineeRecords = await prismaBypass.nomineeMaster.findMany({
      where: { staffId, isActive: true }
    });

    // 3. Resolve active rule sets
    const activeRules = await RuleLoader.loadActiveRules(
      schoolId,
      "EPFO",
      targetDate,
      { branchId: options.branchId, staffId }
    );

    // 4. Fetch the registered EPFO Adapter
    const epfoAdapter = StatutoryPluginRegistry.getAdapter("EPFO");

    // 5. Execute calculation mapping
    const employeeDetails = {
      uan: undefined as string | undefined,
      isInternationalWorker: false,
      vpfPercent: 0,
      higherPensionOption: false,
      isEPSEligible: true,
      isEDLIEligible: true
    };

    const calcResult = epfoAdapter.calculate(
      {
        basicSalary: salaryStructure.basicSalary,
        daAmount: salaryStructure.daAmount,
        hraAmount: salaryStructure.hraAmount,
        otherAllowances: salaryStructure.otherAllowances,
        grossSalary: salaryStructure.grossSalary,
        lwpDays: salaryStructure.lwpDays,
        employeeDetails
      },
      activeRules
    );

    // 6. Write Calculation Traces to Database
    const ruleVersion = activeRules.VERSION ? parseInt(activeRules.VERSION) : 1;
    const traceInserts = calcResult.traces.map(trace => {
      return prismaBypass.calculationTrace.create({
        data: {
          payrollRunId,
          staffId,
          step: trace.step,
          formula: trace.formula,
          input: trace.input,
          output: trace.output,
          ruleVersion
        }
      });
    });
    await Promise.all(traceInserts);

    // 7. Freeze the Snapshot JSON and sign with SHA-256 for integrity auditing
    const frozenData = {
      salaryStructure,
      employeeDetails,
      nomineesCount: nomineeRecords.length,
      calculatedValues: calcResult.calculatedValues,
      activeRules,
      timestamp: targetDate.toISOString()
    };

    const dataString = JSON.stringify(frozenData);
    const hash = crypto.createHash("sha256").update(dataString).digest("hex");

    await prismaBypass.payrollSnapshot.create({
      data: {
        payrollRunId,
        staffId,
        frozenData: frozenData as any,
        hash
      }
    });

    return {
      success: true,
      calculatedValues: calcResult.calculatedValues,
      validation: valReport
    };
  }
}
