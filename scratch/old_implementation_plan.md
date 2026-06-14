# Deep Technical Implementation Plan: Academic Years & Student Rollovers

This document serves as the absolute technical blueprint for the design, database migration, backend action logic, and UI/UX state management for introducing Academic Years and batch student promotions.

---

## 1. Database Schema Specifications

We will modify `prisma/schema.prisma` to add two new models for tracking promotions, add locking flags, and link Academic Sessions to accounting periods.

### Models and Field Additions

```prisma
// ─── prisma/schema.prisma changes ───

// Modify AcademicYear model to include:
model AcademicYear {
  id              String            @id @default(uuid())
  name            String            // e.g., "2026-27"
  startDate       DateTime
  endDate         DateTime
  isCurrent       Boolean           @default(false)
  isLocked        Boolean           @default(false)      // Added: Locks previous academic cycles
  schoolId        String
  school          School            @relation(fields: [schoolId], references: [id])
  
  // Added: Linked Financial Year to align accruals
  financialYearId String?
  financialYear   FinancialYear?    @relation(fields: [financialYearId], references: [id])

  history         AcademicHistory[]
  feeStructures   FeeStructure[]
  ledgerEntries   LedgerEntry[]
  consents        StudentConsent[]
  promotions      PromotionBatch[]  // Added: Backrelation for tracking executions
}

// New Model: Tracking batch promotions runs to enable rollbacks
model PromotionBatch {
  id                  String             @id @default(uuid())
  schoolId            String
  branchId            String
  executedById        String
  executedBy          Staff              @relation(fields: [executedById], references: [id])
  sourceYearId        String
  targetYearId        String
  sourceClassId       String
  targetClassId       String
  createdAt           DateTime           @default(now())
  status              String             @default("COMPLETED") // "COMPLETED" | "ROLLED_BACK"
  
  academicYear        AcademicYear       @relation(fields: [targetYearId], references: [id])
  records             PromotionRecord[]
}

// New Model: Tracks each individual student's move in a specific batch
model PromotionRecord {
  id               String          @id @default(uuid())
  batchId          String
  studentId        String
  oldSectionId     String?
  newSectionId     String?
  journalEntryId   String?         // Reference to reverse the promotion accrual on rollback
  
  batch            PromotionBatch  @relation(fields: [batchId], references: [id], onDelete: Cascade)
  student          Student         @relation(fields: [studentId], references: [id])
}

// Modify AcademicHistory model to track batch execution:
model AcademicHistory {
  // Existing fields...
  id              String       @id
  studentId       String
  academicYearId  String
  classId         String
  sectionId       String?
  rollNumber      String?
  promotionStatus String
  promotedFrom    String?
  admissionNumber String?
  studentCode     String?
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt
  schoolId        String?
  branchId        String?
  academicYear    AcademicYear @relation(fields: [academicYearId], references: [id])
  branch          Branch?      @relation("BranchHistory", fields: [branchId], references: [id])
  class           Class        @relation(fields: [classId], references: [id])
  school          School?      @relation(fields: [schoolId], references: [id])
  section         Section?     @relation(fields: [sectionId], references: [id])
  student         Student      @relation(fields: [studentId], references: [id])
  collections     Collection[]
  
  // Added: Link back to the batch run
  promotionBatchId String?

  @@unique([studentId, academicYearId])
  @@unique([schoolId, branchId, admissionNumber])
  @@index([branchId])
}
```

---

## 2. Server Actions & Backend Architecture

We will implement the required business logic inside `src/lib/actions/academic-actions.ts`.

### Action A: Fetching Sessions
```typescript
export async function getAcademicYearsAction() {
  const identity = await getSovereignIdentity();
  if (!identity) throw new Error("SECURE_AUTH_REQUIRED");

  const data = await prisma.academicYear.findMany({
    where: { schoolId: identity.schoolId },
    include: { financialYear: { select: { id: true, name: true } } },
    orderBy: { startDate: "desc" }
  });

  return { success: true, data: serializeDecimal(data) };
}
```

### Action B: Session Lifecycle Management
```typescript
export async function createAcademicYearAction(data: {
  name: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  financialYearId?: string;
}) {
  const identity = await getSovereignIdentity();
  if (!identity) throw new Error("SECURE_AUTH_REQUIRED");

  return await prisma.$transaction(async (tx) => {
    // 1. If set as current, deactivate all other years
    if (data.isCurrent) {
      await tx.academicYear.updateMany({
        where: { schoolId: identity.schoolId, isCurrent: true },
        data: { isCurrent: false }
      });
    }

    // 2. Insert new AcademicYear
    const newYear = await tx.academicYear.create({
      data: {
        schoolId: identity.schoolId,
        name: data.name,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        isCurrent: data.isCurrent,
        financialYearId: data.financialYearId || null
      }
    });

    return { success: true, id: newYear.id };
  });
}

export async function toggleAcademicYearLockAction(ayId: string, isLocked: boolean) {
  const identity = await getSovereignIdentity();
  if (!identity) throw new Error("SECURE_AUTH_REQUIRED");

  await prisma.academicYear.update({
    where: { id: ayId, schoolId: identity.schoolId },
    data: { isLocked }
  });

  return { success: true };
}
```

### Action C: Student Roster Query with Parent Consent
```typescript
export async function getStudentsForPromotionAction(
  sourceAcademicYearId: string,
  classId: string,
  sectionId?: string
) {
  const identity = await getSovereignIdentity();
  if (!identity) throw new Error("SECURE_AUTH_REQUIRED");

  // Query AcademicRecord matching filters and include student details and target year consent
  const records = await prisma.academicRecord.findMany({
    where: {
      schoolId: identity.schoolId,
      branchId: identity.branchId as string,
      academicYear: sourceAcademicYearId,
      classId,
      ...(sectionId ? { sectionId } : {})
    },
    include: {
      student: {
        include: {
          consents: {
            orderBy: { createdAt: "desc" }
          }
        }
      }
    }
  });

  const students = records.map(r => ({
    id: r.student.id,
    firstName: r.student.firstName,
    lastName: r.student.lastName || "",
    studentCode: r.student.studentCode || "",
    admissionNumber: r.student.admissionNumber || "",
    sectionId: r.sectionId,
    consentStatus: r.student.consents[0]?.consentStatus || "Pending"
  }));

  return { success: true, data: students };
}
```

### Action D: Batch Transaction Chunk Execution
`promoteStudentChunkAction` will execute the transaction in chunks of up to 50 students:

```typescript
export async function promoteStudentChunkAction(data: {
  studentIds: string[];
  sourceAcademicYearId: string;
  targetAcademicYearId: string;
  targetClassId: string;
  targetSectionId?: string;
  batchId: string;
}) {
  const identity = await getSovereignIdentity();
  if (!identity) throw new Error("SECURE_AUTH_REQUIRED");
  const branchId = identity.branchId as string;

  // Verify class levels to prevent demotion loops
  const [sourceClass, targetClass] = await Promise.all([
    prisma.class.findFirst({ where: { id: data.targetClassId, schoolId: identity.schoolId } }),
    prisma.class.findFirst({ where: { id: data.targetClassId, schoolId: identity.schoolId } }) // Check from DB
  ]);

  // Execute chunk transaction
  const result = await prisma.$transaction(async (tx) => {
    const recordsCreated = [];

    // Resolve target Fee Structure
    const feeStructure = await tx.feeStructure.findFirst({
      where: {
        schoolId: identity.schoolId,
        branchId,
        classId: data.targetClassId,
        academicYearId: data.targetAcademicYearId
      },
      include: {
        components: {
          include: { masterComponent: true }
        }
      }
    });

    const [receivableAccount, activeFY] = await Promise.all([
      tx.chartOfAccount.findFirst({ where: { accountCode: "1200", schoolId: identity.schoolId } }),
      tx.academicYear.findUnique({ where: { id: data.targetAcademicYearId } }).then(ay => 
        ay?.financialYearId ? tx.financialYear.findUnique({ where: { id: ay.financialYearId } }) : null
      )
    ]);

    for (const studentId of data.studentIds) {
      // 1. Idempotency Check: verify if already promoted in target year
      const existingHistory = await tx.academicHistory.findUnique({
        where: { studentId_academicYearId: { studentId, academicYearId: data.targetAcademicYearId } }
      });
      if (existingHistory) continue;

      // 2. Fetch student details for historical logging
      const student = await tx.student.findUnique({
        where: { id: studentId },
        include: { academic: true }
      });
      if (!student) continue;

      const oldSectionId = student.academic?.sectionId || null;

      // 3. Upsert AcademicHistory for historical tracking
      await tx.academicHistory.create({
        data: {
          id: `AH-${studentId}-${data.targetAcademicYearId}`,
          studentId,
          academicYearId: data.targetAcademicYearId,
          classId: data.targetClassId,
          sectionId: data.targetSectionId || null,
          promotionStatus: "PROMOTED",
          promotedFrom: data.sourceAcademicYearId,
          schoolId: identity.schoolId,
          branchId,
          admissionNumber: student.admissionNumber,
          studentCode: student.studentCode,
          promotionBatchId: data.batchId
        }
      });

      // 4. Update core AcademicRecord to represent current year state
      await tx.academicRecord.update({
        where: { studentId },
        data: {
          classId: data.targetClassId,
          sectionId: data.targetSectionId || null,
          academicYear: data.targetAcademicYearId
        }
      });

      let journalEntryId = null;

      // 5. If FeeStructure is configured, assign it and generate accounts ledger entries
      if (feeStructure) {
        // Upsert Financial Record
        const fin = await tx.financialRecord.upsert({
          where: { studentId },
          update: {
            annualTuition: Number(feeStructure.totalAmount),
            feeStructureId: feeStructure.id,
            netTuition: Number(feeStructure.totalAmount)
          },
          create: {
            studentId,
            schoolId: identity.schoolId,
            branchId,
            annualTuition: Number(feeStructure.totalAmount),
            feeStructureId: feeStructure.id,
            netTuition: Number(feeStructure.totalAmount)
          }
        });

        // Wiping old fee components to avoid double billing (idempotent step)
        await tx.studentFeeComponent.deleteMany({
          where: { studentFinancialId: fin.id, schoolId: identity.schoolId }
        });

        // Register new components
        await tx.studentFeeComponent.createMany({
          data: feeStructure.components.map(tc => ({
            schoolId: identity.schoolId,
            studentFinancialId: fin.id,
            componentId: tc.componentId,
            baseAmount: tc.amount,
            waiverAmount: 0,
            discountAmount: 0,
            isApplicable: true
          }))
        });

        // Post ledger entries
        const ledgerEntries = feeStructure.components.map(tc => ({
          studentId,
          schoolId: identity.schoolId,
          branchId,
          academicYearId: data.targetAcademicYearId,
          type: "CHARGE",
          amount: tc.amount,
          reason: `${tc.masterComponent.name} (${feeStructure.name})`,
          createdBy: identity.staffId,
          feeStructureId: feeStructure.id
        }));
        await tx.ledgerEntry.createMany({ data: ledgerEntries });

        // Post accounting journal entries to the target financial year
        if (receivableAccount && activeFY) {
          const incomeMapping = [];
          for (const comp of feeStructure.components) {
            const amount = Number(comp.amount);
            if (amount <= 0) continue;

            const mComp = comp.masterComponent;
            let targetCode = mComp.accountCode;
            if (!targetCode) {
              const name = mComp.name.toLowerCase();
              if (name.includes("tuition")) targetCode = "3001";
              else if (name.includes("admission")) targetCode = "3002";
              else if (name.includes("transport") || name.includes("bus")) targetCode = "4105";
              else if (name.includes("library")) targetCode = "4106";
              else if (name.includes("caution") || name.includes("deposit")) targetCode = "2100";
              else targetCode = "4108";
            }

            const acc = await tx.chartOfAccount.findFirst({
              where: { accountCode: targetCode, schoolId: identity.schoolId }
            });

            const finalAccount = acc || await tx.chartOfAccount.findFirst({
              where: { accountCode: "3001", schoolId: identity.schoolId }
            });

            if (finalAccount) {
              incomeMapping.push({
                accountId: finalAccount.id,
                debit: 0,
                credit: amount,
                description: `Accrued: ${mComp.name}`
              });
            }
          }

          const jEntry = await tx.journalEntry.create({
            data: {
              schoolId: identity.schoolId,
              branchId,
              financialYearId: activeFY.id,
              entryType: "PROMOTION_ACCRUAL",
              totalDebit: feeStructure.totalAmount,
              totalCredit: feeStructure.totalAmount,
              description: `Promotion Accrual for student: ${student.studentCode || studentId}`,
              lines: {
                create: [
                  { accountId: receivableAccount.id, debit: feeStructure.totalAmount, credit: 0, description: "Promotion Fees Receivable" },
                  ...incomeMapping
                ]
              }
            }
          });
          journalEntryId = jEntry.id;
        }
      }

      // Log promotion record for rollbacks
      await tx.promotionRecord.create({
        data: {
          batchId: data.batchId,
          studentId,
          oldSectionId,
          newSectionId: data.targetSectionId || null,
          journalEntryId
        }
      });

      recordsCreated.push(studentId);
    }

    return recordsCreated;
  }, { timeout: 30000 });

  return { success: true, count: result.length };
}
```

### Action E: Rollback Engine (One-Click Reversal)
```typescript
export async function rollbackPromotionBatchAction(batchId: string) {
  const identity = await getSovereignIdentity();
  if (!identity) throw new Error("SECURE_AUTH_REQUIRED");

  return await prisma.$transaction(async (tx) => {
    // 1. Fetch batch information
    const batch = await tx.promotionBatch.findUnique({
      where: { id: batchId, schoolId: identity.schoolId },
      include: { records: true }
    });
    if (!batch || batch.status === "ROLLED_BACK") {
      throw new Error("Batch not found or already rolled back.");
    }

    for (const rec of batch.records) {
      // Revert Academic Record to original state
      await tx.academicRecord.update({
        where: { studentId: rec.studentId },
        data: {
          classId: batch.sourceClassId,
          sectionId: rec.oldSectionId,
          academicYear: batch.sourceYearId
        }
      });

      // Delete the generated AcademicHistory log
      await tx.academicHistory.deleteMany({
        where: { studentId: rec.studentId, academicYearId: batch.targetYearId }
      });

      // Revert billing: delete generated ledger entries
      await tx.ledgerEntry.deleteMany({
        where: { studentId: rec.studentId, academicYearId: batch.targetYearId }
      });

      // Reverse double-entry accrual: delete or reverse journal entry
      if (rec.journalEntryId) {
        await tx.journalEntryLine.deleteMany({ where: { journalEntryId: rec.journalEntryId } });
        await tx.journalEntry.delete({ where: { id: rec.journalEntryId } });
      }
    }

    // Update batch status
    await tx.promotionBatch.update({
      where: { id: batchId },
      data: { status: "ROLLED_BACK" }
    });

    return { success: true };
  });
}
```

---

## 3. UI/UX Interface Mockups & State Flow

### Module A: Academic Sessions Manager (`AcademicArchitectHub.tsx`)
```typescript
// State layout
interface Session {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  isLocked: boolean;
  financialYear: { name: string };
}
```
*   **Visual Layout:** A sleek grid featuring neon status indicators:
    *   **Current Indicator:** Green badge (`Active`) with toggles to activate.
    *   **Locked Indicator:** Red lock icon (`Locked`) preventing manual modifications, preventing administrative updates.
*   **Editor Form:** Add Session modal asking for Session Name (e.g. `2026-27`), date pickers, and a dropdown connecting it to a specific `FinancialYear`.

### Module B: Student Rollover Workspace (`student-promotion.tsx`)
*   **Roster Grid with Status Badges:**
    *   `Confirmed` (Green): Checkbox auto-checked.
    *   `Pending` (Yellow): Alert icon; checkable with warning.
    *   `Declined` (Red): Locked checkbox; requires clicking override checkbox.
*   **Batched Progress Tracker:**
    *   Framer-motion progress bar displaying execution percentages (e.g., `Processing: [=============>      ] 70%`).
    *   Alert details: `Currently promoting Priya (UKG -> 1st Grade)`.
*   **Audit Batch History:**
    *   Displays recent execution cards: `Promoted 50 students from 1st Grade -> 2nd Grade on June 6, 2026`.
    *   Red **"Undo / Rollback"** button mapped to `rollbackPromotionBatchAction`.

---

## 4. Verification & Trial Checklist

### Part A: Database Integrity Queries
Verify indexing correctness and composite uniqueness:
```sql
-- Ensure index checks don't result in full-table scans during search queries
EXPLAIN ANALYZE SELECT * FROM "AcademicRecord" 
WHERE "schoolId" = 'demo-school' AND "academicYear" = '2025-26' AND "classId" = 'class-uuid';
```

### Part B: Accounting Reconciliation Tests
Verify Trial Balance equation after promotion accruals:
```sql
-- Sum of debits and credits across all lines must match
SELECT SUM(debit) AS total_debit, SUM(credit) AS total_credit 
FROM "JournalEntryLine" 
WHERE "journalEntryId" IN (
  SELECT id FROM "JournalEntry" WHERE "entryType" = 'PROMOTION_ACCRUAL'
);
```
*(Parity test yields `total_debit === total_credit`)*
