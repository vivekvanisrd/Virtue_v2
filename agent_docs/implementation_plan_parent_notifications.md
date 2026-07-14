# Implementation Plan: Parent Portal Notifications & Alerts Inbox

This plan details the design, architecture, and integration of the parent portal notification feeds, read/unread states, and layout navigation badge indicators.

---

## 🛠️ Proposed Changes

### 1. Server Actions
We will add parent-facing notification query and update actions:

#### [NEW] [guardian-notification-actions.ts](file:///j:/virtue_fb/virtue-v2/src/lib/actions/guardian-notification-actions.ts)
* **`getParentNotificationsAction()`**:
  * Authenticates the parent session via `getGuardianIdentity()`.
  * Fetches `CommunicationLog` records where `parentId === identity.guardianId` OR `recipient === identity.email` OR `recipient === identity.phone`.
  * Returns them ordered by `createdAt DESC`.
* **`markParentNotificationAsReadAction(notificationId)`**:
  * Authenticates the parent session.
  * Validates that the log belongs to this parent.
  * Updates the database, setting `isRead = true` and `readAt = new Date()`.
* **`getUnreadParentNotificationsCountAction()`**:
  * Authenticates the parent session.
  * Counts all logs where `isRead === false` to support navigation badge indicators.

### 2. Routes & Frontend Components
We will register a new navigation path and inbox component:

#### [NEW] [page.tsx](file:///j:/virtue_fb/virtue-v2/src/app/parent/dashboard/notifications/page.tsx)
* Next.js route page container that decrypts the parent session, checks warded students, and mounts `<ParentNotificationsHub>`.

#### [NEW] [ParentNotificationsHub.tsx](file:///j:/virtue_fb/virtue-v2/src/components/parent/ParentNotificationsHub.tsx)
* Client-side inbox UI panel with premium styling features:
  * Tab filter between "All Messages" and "Unread Only".
  * Badge category styling depending on notification type (`RECEIPT`, `REMINDER`, `ADMISSION`, etc.).
  * Message drawer/modal: clicking expands full email details (subject, date, sender, HTML/text body).
  * Automatically triggers `markParentNotificationAsReadAction` when opened.

### 3. Sidebar Navigation Badge
We will integrate a dynamic notification badge in the global parent layout:

#### [MODIFY] [layout.tsx](file:///j:/virtue_fb/virtue-v2/src/app/parent/dashboard/layout.tsx)
* Retrieve `unreadCount` at server-rendering time and display it adjacent to the "Notifications" sidebar link as a vibrant badge.

---

## 🧪 Verification Plan

### Automated Tests
* Run `npx tsc --noEmit` to verify type-safe exports and imports.

### Manual Verification
* Log in as a test parent and verify that alerts show up in the sidebar.
* Expand a notification, check that it changes state from "Unread" to "Read", and verify that the sidebar badge count decrements dynamically.
