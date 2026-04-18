export interface SalaryBreakdown {
  basic: number;
  da: number;
  hra: number;
  specialAllowance: number;
  transportAllowance: number;
  grossRemuneration: number;
  complianceBase: number; // The base for PF/ESI calculation after 50% rule application
  isCompliant: boolean;
  complianceWarning?: string;
  violations: string[];
  deductions: {
    pf: number;
    esi: number;
    pt: number;
    lwp: number;
    total: number;
  };
  netSalary: number;
}

export class PayrollEngine {
  // Standard Statutory Rates (2026)
  static readonly PF_RATE = 0.12;   // 12%
  static readonly ESI_RATE = 0.0075; // 0.75%
  static readonly PT_RATE = 200;    // Standard Professional Tax (Simplified)

  /**
   * Safely evaluates a salary formula.
   */
  static evaluateFormula(formula: string | null | undefined, context: { basic: number }): number {
    if (!formula || formula.trim() === "") return 0;
    const cleanFormula = formula.toLowerCase().replace(/\s+/g, "");
    if (!/^[0-9.+\-*/(basic)]+$/.test(cleanFormula)) return 0;

    try {
      let expression = cleanFormula.replace(/basic/g, context.basic.toString());
      const result = new Function(`return ${expression}`)();
      return Math.max(0, Number(result) || 0);
    } catch (error) {
      return 0;
    }
  }

  /**
   * Calculates the full salary breakdown and checks 2026 statutory compliance.
   */
  static calculateStaffRemuneration(
    prof: {
      basicSalary: number | any;
      hraAmount?: number | any;
      hraFormula?: string | null;
      daAmount?: number | any;
      daFormula?: string | null;
      specialAllowance?: number | any;
      transportAllowance?: number | any;
      isDAEnabled?: boolean;
      isPFEnabled?: boolean;
      isESIEnabled?: boolean;
      isPTEnabled?: boolean;
    },
    options: { skipStatutory?: boolean; lwpDays?: number; lateCount?: number; totalDays?: number } = {}
  ): SalaryBreakdown {
    const basic = Number(prof.basicSalary || 0);
    
    // Evaluate Allowances
    const hra = prof.hraFormula ? this.evaluateFormula(prof.hraFormula, { basic }) : Number(prof.hraAmount || 0);
    const da = (prof.isDAEnabled && prof.daFormula) ? this.evaluateFormula(prof.daFormula, { basic }) : Number(prof.daAmount || 0);
    const specialAllowance = Number(prof.specialAllowance || 0);
    const transportAllowance = Number(prof.transportAllowance || 0);
    
    const grossRemuneration = basic + da + hra + specialAllowance + transportAllowance;
    const basicPlusDa = basic + da;
    
    // 50% Wage Rule Compliance
    const targetBase = grossRemuneration * 0.50;
    const isCompliant = basicPlusDa >= targetBase;
    const complianceBase = isCompliant ? basicPlusDa : targetBase;
    
    const violations = [];
    if (!isCompliant) {
      violations.push(`Basic + DA (${basicPlusDa}) is less than 50% of Gross (${grossRemuneration}).`);
    }

    // --- DEDUCTIONS CALCULATION ---
    let pf = 0;
    let esi = 0;
    let pt = 0;
    let lwp = 0;

    if (!options.skipStatutory) {
      if (prof.isPFEnabled) pf = this.roundINR(complianceBase * this.PF_RATE);
      if (prof.isESIEnabled) esi = this.roundINR(grossRemuneration * this.ESI_RATE);
      if (prof.isPTEnabled) pt = this.PT_RATE;
    }

    // 🏛️ SOVEREIGN PENALTY ENGINE: 3 Lates = 0.5 Day Reduction
    const penaltyDays = options.lateCount ? Math.floor(options.lateCount / 3) * 0.5 : 0;
    const totalDeductibleDays = (options.lwpDays || 0) + penaltyDays;

    if (totalDeductibleDays > 0 && options.totalDays && options.totalDays > 0) {
      lwp = this.roundINR((grossRemuneration / options.totalDays) * totalDeductibleDays);
    }

    const totalDeductions = pf + esi + pt + lwp;
    const netSalary = grossRemuneration - totalDeductions;

    return {
      basic,
      da,
      hra,
      specialAllowance,
      transportAllowance,
      grossRemuneration,
      complianceBase,
      isCompliant,
      complianceWarning: isCompliant ? undefined : "STATUTORY_VIOLATION_50_RULE",
      violations,
      deductions: {
        pf,
        esi,
        pt,
        lwp,
        total: totalDeductions
      },
      netSalary
    };
  }

  static roundINR(amount: number): number {
    return Math.round(amount);
  }
}

