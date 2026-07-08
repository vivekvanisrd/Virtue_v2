import { prismaBypass } from "@/lib/prisma";

export class RuleLoader {
  /**
   * Loads and merges active rules for a specific scope hierarchy
   * Hierarchy: PLATFORM -> TENANT -> BRANCH -> EMPLOYEE (with overrides)
   */
  static async loadActiveRules(
    schoolId: string,
    type: string,
    targetDate: Date,
    options: { branchId?: string; staffId?: string } = {}
  ): Promise<Record<string, string>> {
    // 1. Fetch config headers that are ACTIVE and envelope the targetDate
    const configs = await prismaBypass.statutoryConfigHeader.findMany({
      where: {
        schoolId,
        type,
        status: "ACTIVE",
        effectiveFrom: { lte: targetDate },
        OR: [
          { effectiveTo: null },
          { effectiveTo: { gte: targetDate } }
        ]
      },
      include: {
        rules: true
      },
      orderBy: {
        version: "asc" // Latest versions loaded last so they override
      }
    });

    const mergedRules: Record<string, string> = {};

    // 2. Separate by scopes
    const platformConfigs = configs.filter(c => c.scope === "PLATFORM");
    const tenantConfigs = configs.filter(c => c.scope === "TENANT");
    const branchConfigs = options.branchId ? configs.filter(c => c.scope === "BRANCH" && c.scopeId === options.branchId) : [];
    const employeeConfigs = options.staffId ? configs.filter(c => c.scope === "EMPLOYEE" && c.scopeId === options.staffId) : [];

    // 3. Apply overrides sequentially in order of precedence: Platform -> Tenant -> Branch -> Employee
    const applyRules = (list: typeof configs) => {
      list.forEach(header => {
        header.rules.forEach(rule => {
          mergedRules[rule.parameter] = rule.value;
        });
      });
    };

    applyRules(platformConfigs);
    applyRules(tenantConfigs);
    applyRules(branchConfigs);
    applyRules(employeeConfigs);

    return mergedRules;
  }
}
