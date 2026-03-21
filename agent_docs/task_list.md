# Task List: Virtue-V2 Testing & Validation

- [x] Move existing progress data to project root
- [x] Implement Per-Step Validation for Student Admission form
    - [x] Map step IDs to form field names
    - [x] Update `nextStep` in `student-form.tsx` to use `trigger()`
    - [x] Refine `studentAdmissionSchema` in `student.ts` to match UI requirements
    - [x] Map validation errors to all 7 form steps in the UI
- [x] Save Git and Vercel details in the project folder
- [x] Implement Dynamic Student Search and Duplicate Prevention
    - [x] Add `searchStudentsAction` with Aadhaar support in `student-actions.ts`
    - [x] Implement debounced search trigger in `student-form.tsx`
    - [x] Build search results UI dropdown
    - [x] Implement strict Aadhaar duplicate blocking logic
- [x] Fix Prisma `Decimal` serialization error for Next.js Client Components
- [ ] Test the full student admission flow with valid/invalid data
- [ ] Verify data persistence in the database
