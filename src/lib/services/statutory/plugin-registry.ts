import { EPFOAdapter } from "./adapters/epfo-adapter";

export interface CalculationTraceInput {
  step: string;
  formula: string;
  input: string;
  output: string;
}

export interface StatutoryAdapter {
  type: string;
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
  ): {
    calculatedValues: Record<string, number>;
    traces: CalculationTraceInput[];
  };
  validate(input: any): { success: boolean; errors: string[] };
}

export class StatutoryPluginRegistry {
  private static adapters = new Map<string, StatutoryAdapter>();

  static registerAdapter(adapter: StatutoryAdapter) {
    this.adapters.set(adapter.type, adapter);
  }

  static getAdapter(type: string): StatutoryAdapter {
    const adapter = this.adapters.get(type);
    if (!adapter) throw new Error(`StatutoryAdapter for '${type}' is not registered.`);
    return adapter;
  }
}

// Auto-register statutory plugins
StatutoryPluginRegistry.registerAdapter(new EPFOAdapter());

