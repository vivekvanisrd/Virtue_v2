# Implementation Plan: Dynamic Student Search

Implement a live search feature in the Student Admission form to check for existing students as the user types the first name.

## User Review Required
> [!IMPORTANT]
> The search results will show potentially sensitive data (Parent Names and Mobile Numbers) to prevent duplicate admissions. Ensure this aligns with your data privacy policy.

## Proposed Changes

### [Server Actions]
#### [MODIFY] [student-actions.ts](file:///J:/virtue_fb/virtue-v2/src/lib/actions/student-actions.ts)
- Add `searchStudentsAction(query: string)`:
  - fuzzy search on `firstName`, `lastName`, or `aadhaarNumber`.
  - Include `family` and `academic` relations.
  - Apply strict tenancy filters.
- **[NEW] Aadhaar Uniqueness Check**:
  - In `submitAdmissionAction`, check if `aadhaarNumber` already exists for the school.
  - Return a "Duplicate Aadhaar" error if a match is found.

### [UI Components]
#### [MODIFY] [student-form.tsx](file:///J:/virtue_fb/virtue-v2/src/components/students/student-form.tsx)
- Add `searchResults` and `isSearching` state.
- Implement a debounced effect that calls `searchStudentsAction` when `firstName` or `aadhaarNumber` changes.
- **Strict Duplicate Flagging**:
  - If a search result returns an EXACT Aadhaar match, display a "DUPLICATE PREVENTED" warning and disable the "Next/Submit" buttons.
  - Style the results to highlight Aadhaar matches in red.

## Verification Plan
### Automated Tests
- Test the search action with sample queries focusing on case-insensitivity.
- Verify tenancy isolation so students from other schools are not shown.

### Manual Verification
- Type an existing student's name in the "First Name" field and verify the dropdown appears with correct details.
- Ensure the dropdown closes when clicking away or selecting a result (or simply serves as a warning).
