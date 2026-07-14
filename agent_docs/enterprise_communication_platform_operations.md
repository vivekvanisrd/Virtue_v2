# ECP: Enterprise Operations, Chaos Engineering & Disaster Recovery

This document details the chaos scenarios, SLO/SLI targets, capacity metrics, threat modeling, disaster recovery steps, and operational runbooks for the **Enterprise Communication Platform (ECP)**.

---

## 1. Chaos Engineering & Failure Testing

| Failure Scenario | Expected System Behavior | Recovery / Mitigation |
| :--- | :--- | :--- |
| **PostgreSQL Offline** | Outbox cannot log events; client APIs fail with status `500` or `503`. | **Mitigation**: Database clustering with automatic replica failover. In-flight API queries are queued on client retry budgets. |
| **Redis Offline** | Workers cannot fetch jobs. Queueing fails, but outbox logs events successfully. | **Mitigation**: Once Redis is back online, the outbox processor automatically re-publishes unprocessed logs. No messages are lost. |
| **Queue Worker Crash** | In-flight messages are locked in Redis. No new messages are processed. | **Mitigation**: Redis locks expire, returning messages to the queue. System health monitors launch replacement worker processes automatically. |
| **Provider Timeout / Down** | Message dispatches fail due to network errors or timeouts. | **Mitigation**: The queue worker retries the job with an exponential backoff. If failures persist, the platform routes the message to fallback channels. |
| **Clock Skew (Server Time)** | Scheduled messages may fire early or late. Outbox sorting may become inconsistent. | **Mitigation**: Sync all worker nodes with NTP servers. Check timestamp order during processing to verify sequence. |
| **Token Refresh Race** | Multiple devices refreshing tokens at the same time can cause database write conflicts. | **Mitigation**: Use Postgres transactional locks and upserts with retry-on-conflict rules. |

---

## 2. SLOs, SLIs, and Operational Targets

ECP establishes clear Service Level Objectives (SLOs) to guide operational monitoring:

* **SLI-1: API Latency**: Percentage of device registry / preference requests responding in $< 150\text{ms}$.
  * *Target*: $\ge 99.5\%$ (SLO).
* **SLI-2: Queue Latency**: Time elapsed from outbox processing to worker pickup.
  * *Target*: $< 2000\text{ms}$ for normal messages, $< 200\text{ms}$ for high priority (SLO).
* **SLI-3: Message Delivery Rate**: Percentage of dispatches resulting in successful provider delivery.
  * *Target*: $\ge 99.0\%$ (excluding invalid numbers/bounces).
* **SLI-4: Outbox Processing Rate**: Time to ingest outbox logs and push to queue.
  * *Target*: $< 1000\text{ms}$.

---

## 3. Observability Architecture

To ensure end-to-end traceability, ECP implements the following tracking:

```
Domain Trigger (X-Request-ID) ──► Outbox Event (Correlation-ID) ──► Queue Job ──► Provider Log ──► Client SW Event
```

* **Correlation ID**: Generated at the source transaction (e.g., fee collection). This ID is passed through the outbox, queue, provider, and service worker to trace the message lifecycle.
* **Distributed Tracing**: Integrates with OpenTelemetry, exporting spans to APM dashboards (such as Datadog, Jaeger, or Grafana) to isolate queue delays.
* **Operational Metrics**: Exposes metrics for queue lengths, active workers, provider error rates, and tenant delivery latency.

---

## 4. Security Threat Modeling

* **Threat 1: Cross-Tenant Access (Data Leaks)**:
  * *Risk*: A tenant queries devices or preferences belonging to another tenant.
  * *Mitigation*: The `businessId` query parameter is verified against JWT claims. Direct queries using unverified tenant parameters are rejected.
* **Threat 2: Queue Poisoning (Invalid Payloads)**:
  * *Risk*: A malformed message structure crashes worker processes.
  * *Mitigation*: Payload structures are validated using schemas (like Zod) before being added to the queue. Failed parses are immediately routed to the DLQ.
* **Threat 3: Token Theft / Notification Spoofing**:
  * *Risk*: An attacker steals a push token to send unauthorized alerts.
  * *Mitigation*: Push tokens in the database are encrypted. External delivery requests are rejected if they bypass the queue.

---

## 5. Disaster Recovery (DR)

Disaster recovery configurations establish strict bounds to ensure business continuity:

* **Recovery Time Objective (RTO)**: $< 15\text{ minutes}$ (maximum duration to recover the platform after a major outage).
* **Recovery Point Objective (RPO)**: $< 5\text{ seconds}$ (maximum acceptable data loss during failover).

### DR Procedures
1. **Primary Database Outage**:
   * Switch the application connection string to the hot-standby read-replica.
   * Promote the standby replica to primary.
2. **Redis Queue Corruption**:
   * Flush the corrupted Redis database.
   * Query PostgreSQL for all `TransactionalOutbox` events marked `isProcessed = false` or deliveries marked `QUEUED`, and re-add them to the queue.
3. **Region Failure**:
   * Route traffic to the secondary active-active region via cloud load balancers.

---

## 6. Capacity Planning (Scale: Millions of Users)

Based on a projection of **5 Million Active Users** and **10 Million Devices**:

* **Volume assumptions**:
  * Daily notifications: ~8 Million dispatches/day.
  * Peak traffic (e.g., morning attendance alerts): ~300,000 messages/minute (~5,000 messages/second).
* **Infrastructure capacity**:
  * **Database Storage**: At ~150 bytes per log, `MessageDelivery` grows by ~1.2GB/day. Monthly partitioning is required to keep active indexes small.
  * **Queue workers**: Assuming ~50ms per network send, 1 worker process handles 20 sends/second. To handle peak loads (5,000/sec), we require 250 parallel worker threads distributed across clustered container nodes.
  * **Redis Memory**: ~500 bytes per active queue item. Peak memory usage for 100k queued items is ~50MB.

---

## 7. Data Lifecycle Management

To prevent database bloat and performance degradation:
* **Hot Storage**: Keeps the last 30 days of deliveries in active database partitions.
* **Cold Storage / Archival**: A daily cron job archives logs older than 30 days to an analytical data lake (like BigQuery or AWS S3), keeping active indexes small.
* **Data Purging**: Permanently deletes archived records older than 2 years unless they are marked for a legal hold.

---

## 8. Versioning Strategy

All platform components support backward compatibility:
* **API Endpoints**: Uses URL versioning (e.g. `/api/v1/...`). Any breaking change requires introducing a new route prefix (`/api/v2/...`).
* **JSON Payloads**: Schema updates are backward-compatible. Fields must not be deleted or renamed; new parameters must be optional.
* **Service Workers**: Increment the version identifier (`VERSION = "v1.2.0"`) inside `sw.js`. The browser will automatically install the update in the background when it detects changes.

---

## 9. Performance Benchmarks & Load Testing

* **Target Benchmarks**:
  * Device Lookup: $< 5\text{ms}$ (using compound index).
  * Template Rendering: $< 2\text{ms}$ (using in-memory cache).
  * Bulk campaign throughput: $\ge 8,000\text{ messages/second}$.
* **Load Testing Strategy**:
  * Use tools like Locust or k6 to simulate high-volume device registrations.
  * Run mock provider tests to simulate peak campaign broadcasts (500k messages) and verify queue behavior under load.

---

## 10. Operational Runbooks

### Runbook A: Queue Backlog / Queue Stuck
* **Problem**: Message delivery latency increases; Redis queue sizes grow rapidly.
* **Actions**:
  1. Check worker container resource utilization. Scale up the worker container count if CPU/Memory is saturated.
  2. Inspect database logs for connection pool saturation. Scale connection limits if needed.
  3. Verify if provider API requests are failing or timing out.

### Runbook B: High Retry Rate / Provider Outage
* **Problem**: Messages are failing and retrying repeatedly.
* **Actions**:
  1. Inspect worker logs to identify the error code.
  2. If the error is a provider outage, update settings to route messages through fallback channels (e.g., falling back from Push to SMS).
  3. Pause the primary delivery queue and route jobs to the retry queue until the provider is restored.

---

## 11. Evolution Roadmap

```
Phase 1: Enterprise Push Notifications ────► Phase 2: Unified Communication Platform
(Implement schema & Push adapters)          (Add Email, SMS, WhatsApp channels)
                      │                                        │
                      ▼                                        ▼
Phase 3: Campaign Management           ────► Phase 4: Workflow Automation
(Audience segmenting & schedulers)          (Triggers, campaigns, & alerts)
                      │                                        │
                      ▼                                        ▼
Phase 5: AI-Driven Communication Engine  ──► Phase 6: Communication Intelligence
(AI channel & time selection)                (Cross-app analysis & optimization)
```
This phased roadmap minimizes design churn by establishing modular, decoupled boundaries early.
