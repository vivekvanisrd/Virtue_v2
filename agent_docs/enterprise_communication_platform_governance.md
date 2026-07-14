# ECP: Enterprise Architecture Governance & Compliance Standards

This document establishes the architecture principles, decision records, standards, and compliance checklists for the **Enterprise Communication Platform (ECP)**.

---

## 1. Core Architecture Principles

* **P1: Loose Coupling via Events**: Business modules must never call delivery services directly. They publish domain events to an event bus, which the ECP subscribes to.
* **P2: Provider-Agnostic Core**: Zero vendor-specific imports are allowed in business domains. All provider logic is isolated behind abstract channel provider interfaces.
* **P3: Event-Driven Queueing**: External communications are always queued. APIs must respond immediately (HTTP 202) while dispatching occurs asynchronously.
* **P4: Multi-Tenant Data Isolation**: Tenant boundaries (`businessId`) are hardcoded at database query and index levels. Cross-tenant queries are blocked by design.

---

## 2. Architecture Decision Records (ADR)

### ADR-001: Transactional Outbox Pattern for Message Durability
* **Status**: APPROVED
* **Context**: If a business operation (e.g. fee collection) commits to the DB but the notification engine (e.g. Redis) is offline, messages are lost.
* **Decision**: We use the **Transactional Outbox Pattern**. Business logic writes both the domain entity and an event to the `TransactionalOutbox` table in a single atomic database transaction. A background worker reads from the outbox and publishes the message.
* **Consequences**: Guarantees at-least-once message delivery. Adds write overhead to PostgreSQL but prevents data loss.

### ADR-002: Polymorphic Decoupled Recipient Registry
* **Status**: APPROVED
* **Context**: Tight database coupling forces tables to hold specific foreign keys (like `guardianId`, `staffId`), making future user types difficult to add.
* **Decision**: Implement a decoupled `MessageRecipient` model using polymorphic strings (`recipientId`) and a `UserType` enum.
* **Consequences**: Allows ECP to serve any ERP product or user role (Students, Drivers, Customers, Vendors) without schema updates.

---

## 3. Architecture Standards

### A. Database Design Standards
* **Index Strategy**: Compound indexes on composite queries (e.g. `[businessId, userId]`) are mandatory.
* **Data Limits**: Raw JSON payload columns are capped at 10KB. Large payloads must reside in cloud storage, with only URLs stored in logs.
* **Soft Deletes**: Devices must be marked `isActive = false` on logout instead of being deleted. This preserves delivery audit logs.

### B. Event Naming Standards
* Structure: `<domain>.<entity>.<action>` (uppercase with periods).
* Examples:
  * `FINANCE.FEE_COLLECTION.SUCCESS`
  * `ACADEMIC.STUDENT_ATTENDANCE.ABSENT`
  * `TRANSPORT.DRIVER_TELEMETRY.SPEEDING`

### C. API Design Standards
* **Headers**: Every API call must supply `X-Correlation-ID` and `X-Request-ID` for end-to-end tracing.
* **Versioning**: All public route endpoints require `/v1/` prefixing (e.g., `/api/v1/notifications/devices/register`).

### D. Queue Design Standards
* **Failures**: Every job must define an exponential backoff retry policy (e.g., retry 3 times, backoff starting at 5 seconds).
* **DLQ Routing**: Jobs that fail permanently after retries must be routed to a Dead Letter Queue (DLQ) for manual review.

---

## 4. Enterprise Architecture Compliance Checklist

Every future communication module or integration must pass this compliance checklist before deployment:

| Checklist Question | Pass / Fail | Mitigation / Design Choice |
| :--- | :--- | :--- |
| **1. Multi-Tenant Isolation** | | Must query only using JWT-derived `businessId`. |
| **2. Idempotency Guard** | | Must require a unique `idempotencyKey` to prevent duplicate alerts. |
| **3. Retry Durability** | | Worker jobs must support retries without generating duplicate messages. |
| **4. Transactional Safety** | | Must commit events to the `TransactionalOutbox` atomically with the entity. |
| **5. Provider Abstraction** | | Integration must implement abstract `ChannelProvider` interfaces. |
| **6. Observability Tracing** | | Must propagate correlation IDs from trigger to provider payload. |
| **7. Async Dispatch** | | Delivery must occur inside background queue workers, never inline. |
| **8. Preference Verification** | | Must query `UserCommunicationPreference` before delivery. |
