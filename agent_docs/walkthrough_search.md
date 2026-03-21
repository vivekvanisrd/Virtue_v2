# Walkthrough: Dynamic Student Search & Duplicate Prevention

I have implemented a high-end, real-time student search system to prevent duplicate admissions and improve office efficiency.

## Features Implemented

### 1. Live Debounced Search
- Triggers after typing 3 characters in **First Name** or **Aadhaar Number**.
- Uses a 600ms debounce to minimize server load.
- Displays a search spinner icon in the input field while fetching.

### 2. Rich Result Card
- Shows **Student Full Name**.
- Shows **Parent Name** (Father/Mother) and **Mobile Number**.
- Shows current **Class** placement.
- Highlights the **Aadhaar Number** for easy comparison.

### 3. Strict Aadhaar Blocking
- **Real-time Match**: If the entered Aadhaar matches an existing student precisely, a **Rose-colored Warning Banner** appears at the top of the form.
- **Progress Lock**: The "Next" and "Submit" buttons are visually transformed and disabled (Locked). Navigation to Step 2 is blocked until the Aadhaar is corrected.
- **Backend Guard**: An additional check is added to the server-side `submitAdmissionAction` to ensure no two students can have the same Aadhaar within the same school.

## Technical Details
- **Action**: `searchStudentsAction` in `student-actions.ts`.
- **UI Component**: Logic and custom dropdown in `student-form.tsx`.
- **Iconography**: Integrated `Search` and `ShieldAlert` from Lucide-React.

## Verification
- [x] Verified case-insensitive fuzzy matching for names.
- [x] Verified strict equality matching for Aadhaar blocking.
- [x] Verified tenancy isolation (cannot see students from other schools).
