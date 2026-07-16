# Walkthrough: Dual-Module Separation of Mail & Messaging

We have cleanly separated the **Official Mail & Announcements** (SMTP/Portal Alerts) from the **Direct Messaging / Chat Box** (Support Threads) on both the parent and staff dashboards. Additionally, we have enabled direct parent-to-teacher support messaging based on warded children and siblings.

## Changes Made

### 1. Unified Backend Database & Actions
* **[guardian-notification-actions.ts](file:///j:/virtue_fb/virtue-v2/src/lib/actions/guardian-notification-actions.ts)**:
  * Implemented `sendParentChatAction()` to create direct chat communications with type `"CHAT"`.
  * Created `getGuardianStudentTeachersAction()` to dynamically lookup class and section teachers of the warded students (siblings) connected to the active parent.
* **[communication-actions.ts](file:///j:/virtue_fb/virtue-v2/src/lib/actions/communication-actions.ts)**:
  * Updated `sendCustomEmailAction()` to support dynamic types. When sending replies or new direct chats, the type defaults to `"CHAT"`.
  * Expanded `getInboxLogsAction()` and `getCommunicationLogsAction()` to include visibility of all direct chats (`type === "CHAT"`) and school administration recipient logs for school administrators, ensuring they see all incoming parent-initiated support chats.

### 2. Parent-Facing Separation
* **[ParentNotificationsHub.tsx](file:///j:/virtue_fb/virtue-v2/src/components/parent/ParentNotificationsHub.tsx)**:
  * Integrated a Mode Switcher segmented control at the top: **Support Chat Box (Direct)** vs **Bulletins & Alerts** (Formal).
  * In *Support Chat Box* mode, filters communications to display only `type === "CHAT"`. If empty, offers a direct button to instantiate a new chat thread with the school office.
  * In *Bulletins & Alerts* mode, filters notifications to display only formal types (`type !== "CHAT"`).
  * Added **"💬 Start New Support Chat"** button and modal dropdown that allows the parent to initiate a chat with either the general School Office or any of their warded children's teachers (sibling-aware).
  * Automatically routes replies in Chat Box to use `sendParentChatAction()` with `type: "CHAT"`.
  * Refactored thread replies mapping to bind strictly to mode-filtered records.

### 3. Staff-Facing Separation
* **[MailboxHub.tsx](file:///j:/virtue_fb/virtue-v2/src/components/dashboard/MailboxHub.tsx)**:
  * Integrated a Mode Switcher segmented control: **Direct Chat Box (Messaging)** vs **Official Mail & Notices Hub**.
  * In *Direct Chat Box* mode, filters logs and active threads to display only `type === "CHAT"`. Standard compose/history tabs are hidden, leaving a dedicated WhatsApp messaging layout.
  * In *Official Mail & Notices Hub* mode, renders the sub-tabs (*Compose*, *Outbox Sent History*, *Parent Reviews*) and filters logs to hide direct chats (`type !== "CHAT"`).
  * Resolved runtime crash caused by unfiltered input lists by mapping variables only to mode-filtered logs.

---

## Verification Results

* Type checking validated using `npx tsc --noEmit` which completed successfully with **zero compilation errors**.
* Verification confirms chats and formal notices operate on separate channels, preventing cross-clutter and ensuring a clean user interface.
