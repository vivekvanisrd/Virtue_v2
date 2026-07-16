# Task Checklist: Split Mailbox & Messaging Modules

- [x] Update `guardian-notification-actions.ts` to add `sendParentChatAction()` server action
- [x] Update `sendCustomEmailAction()` in `communication-actions.ts` to support CHAT types
- [x] Add mode selector and split logic in `MailboxHub.tsx`
- [x] Add mode selector and split logic in `ParentNotificationsHub.tsx`
- [x] Verify everything compiles successfully with `npx tsc --noEmit`
- [x] Add `getGuardianStudentTeachersAction` to `guardian-notification-actions.ts`
- [x] Add Start New Chat button and modal to `ParentNotificationsHub.tsx`
