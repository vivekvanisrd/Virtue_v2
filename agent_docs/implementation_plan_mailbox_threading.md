# Implementation Plan: Parent-Teacher Chat Connectivity

This plan details the implementation of a new parent-facing feature that lets parents see and message the specific class teachers of all their children (including siblings) directly from the Support Chat Box.

## Proposed Changes

### 1. Server Actions

#### [MODIFY] [guardian-notification-actions.ts](file:///j:/virtue_fb/virtue-v2/src/lib/actions/guardian-notification-actions.ts)
* Add `getGuardianStudentTeachersAction()` server action:
  * Resolves active guardian ID.
  * Fetches student IDs warded to this guardian (supporting siblings).
  * Finds active class and section IDs for those students.
  * Fetches active `Staff` members who are assigned as class teachers or section teachers for those classes.
  * Exposes their names, emails, and assigned class details.

---

### 2. Client Components (Parent Portal)

#### [MODIFY] [ParentNotificationsHub.tsx](file:///j:/virtue_fb/virtue-v2/src/components/parent/ParentNotificationsHub.tsx)
* **Start New Chat UI**: Add a **"💬 Start New Chat"** button at the top of the chat list in *Support Chat Box* mode.
* **New Chat Modal**: Implement a modal window:
  * Displays a select input with options for "School Administration" and the list of warded student teachers (labeled with their assigned classes).
  * Allows typing a custom initial message.
  * Dispatches `sendParentChatAction()` to initialize the chat thread with the selected recipient.
* **Initialization Hook**: Fetch the list of student teachers on mount using `getGuardianStudentTeachersAction()`.

---

## Verification Plan

### Automated Tests
* Run `npx tsc --noEmit` to verify type-safe compilation.

### Manual Verification
* Log in as a parent, switch to **Support Chat Box**, click **"Start New Chat"**.
* Verify that the dropdown lists all teachers of their children's classes.
* Compose and send a message, verifying that a new thread is created and successfully appears on the admin's messaging hub.
