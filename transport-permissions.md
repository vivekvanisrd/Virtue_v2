# Transport V2 Permissions & Capabilities Matrix

This document defines the server-side permission scopes and authorization controls enforced across all Transport V2 business logic and server actions.

## Role Definition Scopes

All actions resolve the user context using `getTenantFilter()` and enforce permissions using `enforcePermission(actionName)`. The following roles are permitted access:

1.  **DEVELOPER:** Full read/write administrative access.
2.  **OWNER:** Enterprise administrative access scoped to the school organization.
3.  **PRINCIPAL:** Executive operations manager scope.
4.  **TRANSPORT_ADMIN:** Specialized staff scope responsible for day-to-day transport fleet, routes, and driver setup.

---

## Action-Level Permissions Matrix

| Component | Action Name / Trigger | Allowed Roles | Enforced Server-Side Rules |
| :--- | :--- | :--- | :--- |
| **Route** | `ROUTE_CREATE` | DEVELOPER, OWNER, PRINCIPAL, TRANSPORT_ADMIN | Scopes write to `schoolId` and checks unique `routeCode` constraint. |
| | `ROUTE_EDIT` | DEVELOPER, OWNER, PRINCIPAL, TRANSPORT_ADMIN | Scopes check to owner context; enforces Optimistic Concurrency Control (`updatedAt`). |
| | `ROUTE_DELETE` | DEVELOPER, OWNER, PRINCIPAL, TRANSPORT_ADMIN | Cascades soft deletion (`isDeleted = true`) to Stops, Assignments, and Student Allocations. |
| **Vehicle** | `VEHICLE_CREATE` | DEVELOPER, OWNER, PRINCIPAL, TRANSPORT_ADMIN | Verifies route ID presence and active state. Checks unique `registrationNo`. |
| | `VEHICLE_EDIT` | DEVELOPER, OWNER, PRINCIPAL, TRANSPORT_ADMIN | Scopes checks to tenant; enforces OCC check (`updatedAt`). |
| | `VEHICLE_DELETE` | DEVELOPER, OWNER, PRINCIPAL, TRANSPORT_ADMIN | Soft deletes vehicle assets and cascades soft-delete to active assignments. |
| **VehicleStop**| `STOP_CREATE` | DEVELOPER, OWNER, PRINCIPAL, TRANSPORT_ADMIN | Verifies route association presence and tenant context. |
| | `STOP_EDIT` | DEVELOPER, OWNER, PRINCIPAL, TRANSPORT_ADMIN | Enforces OCC check (`updatedAt`). |
| | `STOP_DELETE` | DEVELOPER, OWNER, PRINCIPAL, TRANSPORT_ADMIN | Soft deletes stop records (`isDeleted = true`). |
| **Driver** | `DRIVER_CREATE` | DEVELOPER, OWNER, PRINCIPAL, TRANSPORT_ADMIN | Salting and hashing passwords via `bcrypt`. Uniqueness checks on phone & license. |
| | `DRIVER_EDIT` | DEVELOPER, OWNER, PRINCIPAL, TRANSPORT_ADMIN | Optional password reset hashing; enforces OCC check (`updatedAt`). |
| | `DRIVER_DELETE` | DEVELOPER, OWNER, PRINCIPAL, TRANSPORT_ADMIN | Soft deletes driver record; cascades soft-delete to active assignments. |
| **Driver Assign**| `DRIVER_ASSIGN` | DEVELOPER, OWNER, PRINCIPAL, TRANSPORT_ADMIN | Concurrency blocks: prevents multiple active assignments on a single driver/vehicle. |
| | `DRIVER_UNASSIGN` | DEVELOPER, OWNER, PRINCIPAL, TRANSPORT_ADMIN | Archives assignment status to `Historical` and marks `isDeleted = true`. |
| **Student Alloc**| `STUDENT_ASSIGN` | DEVELOPER, OWNER, PRINCIPAL, TRANSPORT_ADMIN | Unique constraint block: only 1 active allocation per student. Syncs to legacy table. |
| | `STUDENT_UNASSIGN` | DEVELOPER, OWNER, PRINCIPAL, TRANSPORT_ADMIN | Soft deletes allocation; reverses legacy sync double-write mapping. |
| **TripSession**| `TRIP_CREATE` | DEVELOPER, OWNER, PRINCIPAL, TRANSPORT_ADMIN | Verifies active drivers & vehicles. Concurrency blocks overlapping active trips. |
| | `TRIP_EDIT` | DEVELOPER, OWNER, PRINCIPAL, TRANSPORT_ADMIN | Enforces OCC check (`updatedAt`). |
| | `TRIP_DELETE` | DEVELOPER, OWNER, PRINCIPAL, TRANSPORT_ADMIN | Cascades soft-delete to active bus attendance logs. |
| **Incidents** | `INCIDENT_CREATE` | DEVELOPER, OWNER, PRINCIPAL, TRANSPORT_ADMIN | Logs breakdown/delay events under tenant context. |
| | `INCIDENT_EDIT` | DEVELOPER, OWNER, PRINCIPAL, TRANSPORT_ADMIN | Enforces OCC check (`updatedAt`). |
| | `INCIDENT_DELETE` | DEVELOPER, OWNER, PRINCIPAL, TRANSPORT_ADMIN | Soft deletes incident logs (`isDeleted = true`). |
| **Maintenance**| `MAINTENANCE_CREATE`| DEVELOPER, OWNER, PRINCIPAL, TRANSPORT_ADMIN | Logs expense details under tenant context. |
| | `MAINTENANCE_EDIT` | DEVELOPER, OWNER, PRINCIPAL, TRANSPORT_ADMIN | Enforces OCC check (`updatedAt`). |
| | `MAINTENANCE_DELETE`| DEVELOPER, OWNER, PRINCIPAL, TRANSPORT_ADMIN | Soft deletes maintenance records (`isDeleted = true`). |

---

## Hardening Security Safeguards

1.  **Race Condition Prevention:** The database level enforces uniqueness on active records using partial indices (e.g. `WHERE status = 'Active' AND isDeleted = false`).
2.  **Audit Integrity:** Mutation logic occurs in transactions. Audit logging occurs post-transaction commit. Database write failure on audit is caught and reported to the system logging layer in structured JSON format (`event: TRANSPORT_AUDIT_FAILURE`) without throwing errors to the client, preventing workflows from crashing.
