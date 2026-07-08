export class FormulaEngine {
  /**
   * Safely evaluates a statutory formula.
   * Supporting functions: min, max, round, ceil, floor.
   * Supporting variables from context.
   */
  static evaluate(formula: string, context: Record<string, number>): number {
    let cleanFormula = formula.trim();
    if (!cleanFormula) return 0;

    // Convert variables in context to values in expression
    // Sort keys by length descending to prevent substring replace conflicts (e.g. "PF_WAGES" replacing "PF_WAGE")
    const sortedKeys = Object.keys(context).sort((a, b) => b.length - a.length);
    for (const key of sortedKeys) {
      const val = context[key] ?? 0;
      // Replace variables matching key boundary
      const regex = new RegExp(`\\b${key}\\b`, "g");
      cleanFormula = cleanFormula.replace(regex, val.toString());
    }

    // Lowercase and strip whitespace
    cleanFormula = cleanFormula.toLowerCase().replace(/\s+/g, "");

    // Sanity check to avoid arbitrary script execution
    // Only allow digits, operators, parentheses, and math functions (min, max, round, ceil, floor)
    const allowedRegex = /^[0-9.+\-*/() ,]|(min)|(max)|(round)|(ceil)|(floor)+$/;
    if (!allowedRegex.test(cleanFormula)) {
      console.warn(`[FORMULA_ENGINE] Formula execution blocked due to invalid characters: ${cleanFormula}`);
      return 0;
    }

    try {
      // Map min/max/round/ceil/floor to Math functions in execution context
      const fn = new Function(
        "min", "max", "round", "ceil", "floor",
        `return ${cleanFormula}`
      );
      const result = fn(
        Math.min, Math.max, Math.round, Math.ceil, Math.floor
      );
      return Math.max(0, Number(result) || 0);
    } catch (e: any) {
      console.error(`[FORMULA_ENGINE] Failed to evaluate formula: ${formula}. Error:`, e.message);
      return 0;
    }
  }
}
