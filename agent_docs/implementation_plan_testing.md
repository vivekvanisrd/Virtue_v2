# Implementation Plan: Testing Student Admission Flow

This plan outlines the steps we will take to test and verify the recently developed student admission features (Per-Step Validation and Dynamic Data Persistence).

## User Review Required

> [!WARNING]
> Please review this testing plan. Running the full flow requires the Next.js development server to be active. I will start the server and use a browser subagent to perform these tests. Are you comfortable with this approach? 

## Proposed Verification Phases

### 1. Manual Testing via Browser Subagent
I will use an automated browser to navigate to the locally hosted application and simulate user input for the admission form.

- **Phase 1: Validation testing**
  - Attempt to submit Step 1 (Personal Details) with empty fields.
  - Verify that inline validation errors appear (e.g., "First name is required").
  - Test the Aadhaar debounce feature by entering an existing Aadhaar number and ensuring the warning banner appears and navigation is blocked.

- **Phase 2: Successful Submission Flow**
  - Fill all required fields across the 7 steps with mock data.
  - Successfully submit the form.

### 2. Database Verification
After the form submission:
- I will execute Prisma database queries or view the `Student` table to confirm that the mock data was correctly persisted, especially checking the `branchId`, `academicYearId`, and fixed `Decimal` serialization.
- Ensure that the tenant configuration behaves properly and does not pollute other tenant's data.

## Open Questions

> [!IMPORTANT]
> - Should I proceed with starting the local development server to run these tests?
> - Do you have any specific mock data or edge cases you'd like me to consider during testing?

## Next Steps Upon Approval
1. Run `npm run dev`.
2. Configure tests with the browser subagent.
3. Validate database entries.
4. Update `agent_docs/task_list.md` and create a final `walkthrough.md` in `agent_docs`.
