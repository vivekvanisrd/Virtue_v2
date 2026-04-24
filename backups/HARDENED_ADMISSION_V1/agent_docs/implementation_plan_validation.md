# Student Admission: Per-Step Validation Plan

To ensure data integrity, we will implement validation at each step of the 7-step admission form.

## Step-Field Mapping
- **Step 1 (Personal)**: `firstName`, `lastName`, `dateOfBirth`, `gender`, `category`, `phone`, `email`, `aadhaarNumber`
- **Step 2 (Academic)**: `admissionDate`, `academicYearId`, `branchId`, `classId`
- **Step 3 (Family)**: `fatherName`, `fatherPhone`, `motherName`, `motherPhone`, `emergencyContactName`, `emergencyContactPhone`
- **Step 4 (Address)**: `currentAddress`, `city`, `pinCode`, `state`, `country`
- **Step 5 (Financial)**: `paymentType`, `tuitionFee`
- **Step 6 (More)**: `admissionType`, `boardingType`
- **Step 7 (Review)**: No validation (final submit)

## Technical Implementation
1. Modify `StudentForm` to use `trigger` from `react-hook-form`.
2. Update `nextStep` function to validate specific fields based on `currentStep`.
3. Add a "Shake" animation or clear error summary when validation fails to prevent user from being stuck without feedback.
