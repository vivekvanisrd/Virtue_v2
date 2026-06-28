# Transport Dependency Scan Report

This report analyzes the dependencies of the legacy transport-related tables in the PaVa-EDUX Enterprise (Virtue v2) ERP system. The goal of this scan is to verify whether any live, active modules depend on these tables, ensuring production safety during the upcoming V2 upgrade.

## Table Audit Summary

| Table Name | Category | References Count | External Module Dependency | Risk Level | Action Recommendation |
|---|---|---|---|---|---|
| **TransportAssignment** | `LEGACY` | 2 | **Yes** (Ledger) | Medium | Refactor to point to the new `StudentTransport` model. |
| **TransportCollection** | `LEGACY` | 2 | **Yes** (Ledger) | Medium | Keep/refactor ledger query to point to standard collections or V2 tracking. |
| **TransportStop** | `LEGACY` | 2 | **Yes** (Admissions / Enquiry) | Medium | Refactor to point to the new `VehicleStop` model. |
| **TransportDetail** | `UNUSED` | 0 | **No** (None) | Low | Safe to delete (after removing relations). |
| **VehicleStaff** | `UNUSED` | 0 | **No** (None) | Low | Safe to delete (after removing relations). |

---

## Detailed Dependency Scan

### 1. TransportAssignment
* **Status**: `LEGACY`
* **Prisma Model**: `TransportAssignment` (linked to `Student` and `School` in `prisma/schema.prisma`)
* **Database Records**: 0
* **External References**:
  * [ledger-service.ts](file:///j:/virtue_fb/virtue-v2/src/lib/services/ledger-service.ts#L36-L39):
    ```typescript
    prisma.transportAssignment.findUnique({
      where: { studentId },
      include: { route: true, stop: true }
    })
    ```
    *Note: The query includes `route` and `stop` relations which are not defined in the Prisma schema for `TransportAssignment`. This will trigger a runtime Prisma exception if executed.*
  * [ledger-service.ts](file:///j:/virtue_fb/virtue-v2/src/lib/services/ledger-service.ts#L64-L68):
    ```typescript
    const monthlyFare = Number(transport?.monthlyFare || 0);
    const transportMonths = transport?.transportMonths || 10;
    const grossTransport = monthlyFare * transportMonths;
    const transportWaiver = Number(transport?.transportWaiver || 0);
    ```
    *Note: `monthlyFare`, `transportMonths`, and `transportWaiver` are accessed but do not exist on the current `TransportAssignment` schema.*
* **Internal References**:
  * [transport-actions.ts](file:///j:/virtue_fb/virtue-v2/src/lib/actions/transport-actions.ts#L113-L116):
    ```typescript
    const assignment = await prisma.transportAssignment.findUnique({
      where: { studentId },
      include: { route: true, stop: true }
    });
    ```
* **Impact Analysis & Migration Plan**:
  * **Ledger Module Dependency**: The live ledger service reads this model to compute student financial standing (transport due vs paid).
  * **Resolution**: Replace this table with the new `StudentTransport` table in the V2 schema, and update the ledger service to look up `StudentTransport` and resolve the monthly fee from the assigned `VehicleStop` dynamically.

---

### 2. TransportCollection
* **Status**: `LEGACY`
* **Prisma Model**: `TransportCollection` (linked to `Student` in `prisma/schema.prisma`)
* **Database Records**: 0
* **External References**:
  * [ledger-service.ts](file:///j:/virtue_fb/virtue-v2/src/lib/services/ledger-service.ts#L44-L47):
    ```typescript
    prisma.transportCollection.findMany({
      where: { studentId },
      orderBy: { paymentDate: 'desc' }
    })
    ```
  * [ledger-service.ts](file:///j:/virtue_fb/virtue-v2/src/lib/services/ledger-service.ts#L83-L90): Matches standalone cash collections for transport to project them in the student's unified ledger history timeline.
* **Internal References**:
  * [transport-actions.ts](file:///j:/virtue_fb/virtue-v2/src/lib/actions/transport-actions.ts#L141-L146): Generates a custom `TS-YYYY-XXXX` receipt number and records the cash payment atomically in the database while running cash ledger updates.
* **Impact Analysis & Migration Plan**:
  * **Ledger Module Dependency**: The ledger service uses this table to fetch all historical transport payments made by a student.
  * **Resolution**: Since there are 0 records in production, this table can be safely migrated to the target architecture. However, we should retain a structured collection mechanism so ledger service integrations continue functioning.

---

### 3. TransportStop
* **Status**: `LEGACY`
* **Prisma Model**: `TransportStop` (linked to `School` in `prisma/schema.prisma`)
* **Database Records**: 0
* **External References**:
  * [enquiry-actions.ts](file:///j:/virtue_fb/virtue-v2/src/lib/actions/enquiry-actions.ts#L680-L685):
    ```typescript
    const stop = await prisma.transportStop.findUnique({ where: { id: enquiry.requestedStopId } });
    if (stop) {
        transportEstimate = Number(stop.fare) * 10;
        transportStopName = stop.name;
    }
    ```
    *Note: `fare` is accessed but does not exist on the current `TransportStop` schema.*
* **Internal References**:
  * [transport-actions.ts](file:///j:/virtue_fb/virtue-v2/src/lib/actions/transport-actions.ts#L85-L95): upserts stops under a route.
* **Impact Analysis & Migration Plan**:
  * **Admissions / Enquiry Dependency**: The live admissions flow queries this table to calculate transport fee estimates for prospective students based on their selected stop.
  * **Resolution**: Change this dependency to query the new `VehicleStop` table, which will store `monthlyFee`. The field `requestedStopId` on the `Enquiry` model (and the associated inputs) must be updated to refer to `VehicleStop` instead of `TransportStop`.

---

### 4. TransportDetail
* **Status**: `UNUSED`
* **Prisma Model**: `TransportDetail` (linked to `School`, `Branch`, `Student` in `prisma/schema.prisma`)
* **Database Records**: 0
* **External References**: None
* **Internal References**: None
* **Impact Analysis & Migration Plan**:
  * **Resolution**: This table is not used anywhere in the code. It is safe to delete in the migration. The reference `transport TransportDetail?` in the `Student` model must be removed.

---

### 5. VehicleStaff
* **Status**: `UNUSED`
* **Prisma Model**: `VehicleStaff` (linked to `Staff` and `Vehicle` in `prisma/schema.prisma`)
* **Database Records**: 0
* **External References**: None
* **Internal References**: None
* **Impact Analysis & Migration Plan**:
  * **Resolution**: Not referenced in code. Safe to delete. We will replace staff/driver management using the new `Driver` and `DriverAssignment` tables in V2.
