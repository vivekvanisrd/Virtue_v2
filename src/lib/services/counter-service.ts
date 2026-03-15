import prisma from "../prisma";

/**
 * CounterService
 * 
 * Manages atomic sequential counters for different document types 
 * (Admissions, Receipts) scoped by School, Branch, and Academic/Financial Year.
 */
export const CounterService = {
  /**
   * getNextSequence
   * 
   * Atomically increments and returns the next sequence number.
   * Ensures no collisions occur even under heavy load.
   */
  async getNextSequence(params: {
    schoolId: string;
    branchId?: string;
    type: "ADMISSION" | "RECEIPT" | "EMPLOYEE";
    year: string;
  }): Promise<number> {
    const counter = await prisma.tenancyCounter.upsert({
      where: {
        schoolId_branchId_type_year: {
          schoolId: params.schoolId,
          branchId: (params.branchId || null) as any,
          type: params.type,
          year: params.year
        }
      },
      update: {
        lastValue: { increment: 1 }
      },
      create: {
        schoolId: params.schoolId,
        branchId: (params.branchId || null) as any,
        type: params.type,
        year: params.year,
        lastValue: 1
      }
    });

    return counter.lastValue;
  },

  /**
   * generateFormattedId
   * 
   * Generates a human-readable ID based on school code and sequence.
   * Format: [PREFIX]-[YEAR]-[BRANCH]-[SEQ]
   */
  async generateFormattedId(params: {
    schoolId: string;
    branchId: string;
    type: "ADMISSION" | "RECEIPT";
    year: string;
    prefix: string;
  }): Promise<string> {
    const seq = await this.getNextSequence(params);
    const branchCode = params.branchId.split('-').pop() || "GEN";
    const paddedSeq = seq.toString().padStart(5, '0');
    
    return `${params.prefix}-${params.year}-${branchCode}-${paddedSeq}`;
  }
};
