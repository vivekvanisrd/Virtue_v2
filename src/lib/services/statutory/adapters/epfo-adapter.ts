import { StatutoryAdapter, CalculationTraceInput } from "../plugin-registry";

export class EPFOAdapter implements StatutoryAdapter {
  type = "EPFO";

  validate(input: any) {
    const errors: string[] = [];
    if (input.basicSalary === undefined) errors.push("Missing basicSalary");
    return {
      success: errors.length === 0,
      errors
    };
  }

  calculate(
    input: {
      basicSalary: number;
      daAmount: number;
      hraAmount: number;
      otherAllowances: number;
      grossSalary: number;
      lwpDays: number;
      employeeDetails: {
        uan?: string;
        isInternationalWorker?: boolean;
        vpfPercent?: number;
        higherPensionOption?: boolean;
        isEPSEligible?: boolean;
        isEDLIEligible?: boolean;
      };
    },
    rules: Record<string, string>
  ) {
    const traces: CalculationTraceInput[] = [];

    // 1. Resolve configuration parameters (or fallbacks)
    const pfRate = parseFloat(rules.PF_RATE || "0.12");
    const epsRate = parseFloat(rules.EPS_RATE || "0.0833");
    const edliRate = parseFloat(rules.EDLI_RATE || "0.005");
    const adminRate = parseFloat(rules.ADMIN_RATE || "0.005");
    const wageCeiling = parseFloat(rules.WAGE_CEILING || "15000");

    const basicPlusDa = input.basicSalary + input.daAmount;

    // Tracing Wage Calculation
    traces.push({
      step: "PF_WAGES",
      formula: "BASIC_SALARY + DA_AMOUNT",
      input: JSON.stringify({ basic: input.basicSalary, da: input.daAmount }),
      output: basicPlusDa.toString()
    });

    // 2. Applied Ceiling
    const isHigherPension = input.employeeDetails.higherPensionOption || false;
    const pfWagesCapped = isHigherPension ? basicPlusDa : Math.min(basicPlusDa, wageCeiling);

    traces.push({
      step: "PF_WAGES_CAPPED",
      formula: isHigherPension ? "PF_WAGES (higher option active)" : "min(PF_WAGES, WAGE_CEILING)",
      input: JSON.stringify({ PF_WAGES: basicPlusDa, WAGE_CEILING: wageCeiling }),
      output: pfWagesCapped.toString()
    });

    // 3. Employee PF Contribution
    const employeePF = Math.round(pfWagesCapped * pfRate);
    traces.push({
      step: "EMPLOYEE_PF",
      formula: "PF_WAGES_CAPPED * PF_RATE",
      input: JSON.stringify({ PF_WAGES_CAPPED: pfWagesCapped, PF_RATE: pfRate }),
      output: employeePF.toString()
    });

    // 4. Employee VPF (Voluntary PF)
    const vpfPercent = input.employeeDetails.vpfPercent || 0;
    const employeeVPF = Math.round(basicPlusDa * (vpfPercent / 100));
    if (vpfPercent > 0) {
      traces.push({
        step: "EMPLOYEE_VPF",
        formula: "PF_WAGES * (VPF_PERCENT / 100)",
        input: JSON.stringify({ PF_WAGES: basicPlusDa, VPF_PERCENT: vpfPercent }),
        output: employeeVPF.toString()
      });
    }

    // 5. Employer Pension EPS
    const isEPSEligible = input.employeeDetails.isEPSEligible ?? true;
    const epsWagesCapped = isHigherPension ? basicPlusDa : Math.min(basicPlusDa, wageCeiling);
    const employerEPS = isEPSEligible ? Math.round(epsWagesCapped * epsRate) : 0;
    
    traces.push({
      step: "EMPLOYER_EPS",
      formula: isEPSEligible ? "min(PF_WAGES, WAGE_CEILING) * EPS_RATE" : "0 (not eligible)",
      input: JSON.stringify({ PF_WAGES: basicPlusDa, WAGE_CEILING: wageCeiling, EPS_RATE: epsRate }),
      output: employerEPS.toString()
    });

    // 6. Employer PF (12% minus EPS)
    const totalEmployerPFShare = Math.round(pfWagesCapped * pfRate);
    const employerPF = Math.max(0, totalEmployerPFShare - employerEPS);
    traces.push({
      step: "EMPLOYER_PF",
      formula: "totalEmployerPFShare - EMPLOYER_EPS",
      input: JSON.stringify({ totalEmployerPFShare, EMPLOYER_EPS: employerEPS }),
      output: employerPF.toString()
    });

    // 7. EDLI Contribution
    const isEDLIEligible = input.employeeDetails.isEDLIEligible ?? true;
    const edliWagesCapped = Math.min(basicPlusDa, wageCeiling);
    const employerEDLI = isEDLIEligible ? Math.round(edliWagesCapped * edliRate) : 0;
    traces.push({
      step: "EMPLOYER_EDLI",
      formula: isEDLIEligible ? "min(PF_WAGES, EDLI_CEILING) * EDLI_RATE" : "0",
      input: JSON.stringify({ PF_WAGES: basicPlusDa, EDLI_CEILING: wageCeiling, EDLI_RATE: edliRate }),
      output: employerEDLI.toString()
    });

    // 8. Administrative charges (borne by employer)
    const adminCharges = Math.round(basicPlusDa * adminRate);
    traces.push({
      step: "ADMIN_CHARGES",
      formula: "PF_WAGES * ADMIN_RATE",
      input: JSON.stringify({ PF_WAGES: basicPlusDa, ADMIN_RATE: adminRate }),
      output: adminCharges.toString()
    });

    return {
      calculatedValues: {
        pfWages: basicPlusDa,
        pfWagesCapped,
        employeePF,
        employeeVPF,
        employerPF,
        employerEPS,
        employerEDLI,
        adminCharges
      },
      traces
    };
  }
}
