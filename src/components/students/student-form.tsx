"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
import {
  User, Users, CreditCard, CheckCircle2, ArrowRight, ArrowLeft,
  MapPin, Bus, School, Heart, Building, Info, ChevronDown, Search, ShieldAlert, AlertCircle, Sparkles, Wand2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTabs } from "@/context/tab-context";
import { studentAdmissionSchema, type StudentAdmissionData } from "@/types/student";
import { submitStandardizedAdmissionAction, searchStudentsAction } from "@/lib/actions/student-actions";
import { getAdmissionReferenceData, getSectionsByClass } from "@/lib/actions/reference-actions";
import { StudentAdmissionSummary } from "./student-admission-summary";
import { useTenant } from "@/context/tenant-context";

const steps = [
  { id: 1, title: "Personal",  icon: User },
  { id: 2, title: "Academic",  icon: School },
  { id: 3, title: "Family",    icon: Users },
  { id: 4, title: "Address",   icon: MapPin },
  { id: 5, title: "Financial", icon: CreditCard },
  { id: 6, title: "More",      icon: Info },
  { id: 7, title: "Review",    icon: CheckCircle2 },
];

function Field({ label, error, children, className }: { label: string; error?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex justify-between items-center px-1">
        <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.15em]">{label}</label>
        {error && <span className="text-[10px] text-rose-500 font-bold animate-pulse">{error}</span>}
      </div>
      {children}
    </div>
  );
}

const inputCls = "bg-white/50 backdrop-blur-md border border-slate-200 rounded-[24px] px-6 py-4 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary/30 transition-all w-full shadow-sm";
const selectCls = "bg-white/50 backdrop-blur-md border border-slate-200 rounded-[24px] px-6 py-4 text-sm text-slate-900 focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary/30 transition-all w-full shadow-sm";

export function StudentForm() {
  const { setTabDirty } = useTabs();
  const context = useTenant();
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submittedData, setSubmittedData] = useState<any>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [admissionId, setAdmissionId] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [duplicateAadhaar, setDuplicateAadhaar] = useState<string | null>(null);
  const [selectedFeeIds, setSelectedFeeIds] = useState<Set<string>>(new Set());
  const [reviewConfirmed, setReviewConfirmed] = useState(false);
  const [refData, setRefData] = useState<{
    branches: any[],
    academicYears: any[],
    classes: any[],
    feeSchedules: any[],
    feeMasters: any[],
    schoolName: string
  }>({
    branches: [],
    academicYears: [],
    classes: [],
    feeSchedules: [],
    feeMasters: [],
    schoolName: ""
  });
  const [sections, setSections] = useState<any[]>([]);
  const [isLoadingRef, setIsLoadingRef] = useState(true);

  // Fetch Reference Data
  useEffect(() => {
    async function fetchRefData() {
        setIsLoadingRef(true);
        const res = await getAdmissionReferenceData();
        if (res.success && res.data) {
            setRefData(res.data);
        }
        setIsLoadingRef(false);
    }
    fetchRefData();
  }, []);

  const { register, handleSubmit, formState: { errors, isDirty }, watch, reset, trigger, setValue } = useForm<StudentAdmissionData>({
    resolver: zodResolver(studentAdmissionSchema) as any,
    mode: "onBlur",
    defaultValues: {
      gender: "Male",
      paymentType: "Term-wise",
      admissionDate: new Date().toISOString().split("T")[0],
      admissionType: "New",
      boardingType: "Day Scholar",
      country: "India",
      state: "Telangana",
      transportRequired: false,
      admissionFee: "0",
      cautionDeposit: "0",
      libraryFee: "0",
      labFee: "0",
      sportsFee: "0",
      developmentFee: "0",
      examFee: "0",
    },
  });

  // 🏢 Identity Auto-Pulse + Dirty Tracker (ORIGINAL — restored from Vercel commit 7ebe29c)
  // KEY: isDirty in deps guarantees this re-fires after refData populates the form,
  // ensuring Branch and Academic Year are ALWAYS pre-selected on load.
  useEffect(() => {
    setTabDirty("students-add", isDirty);

    // 🏢 Pre-select Branch from session context
    if (context?.branchId) {
      setValue("branchId", context.branchId, { shouldValidate: true });
    }

    // 📅 Pre-select current Academic Year
    if (refData.academicYears.length > 0) {
      const currentAY = refData.academicYears.find(y => y.isCurrent);
      if (currentAY) setValue("academicYearId", currentAY.id, { shouldValidate: true });
    }

    return () => {
      setTabDirty("students-add", false);
    };
  }, [isDirty, setTabDirty, context, refData.academicYears, setValue]);

  const onSubmit = async (data: StudentAdmissionData) => {
    console.log("Admission Submission Requested:", data);
    setIsSubmitting(true);
    setFormError(null);
    try {
      const result = await submitStandardizedAdmissionAction(data);
      console.log("Admission Submission Result:", result);
      
      if (result.success && result.data) {
        // Use admissionNumber if available, otherwise fallback to registrationId
        const finalId = result.data.admissionNumber || result.data.registrationId;
        setAdmissionId(finalId);
        
        console.log("Setting Admission ID for Summary:", finalId);
        // Find names for IDs to show in summary
        const className = refData.classes.find(c => c.id === data.classId)?.name;
        const sectionName = sections.find(s => s.id === data.sectionId)?.name;
        const branchName = refData.branches.find(b => b.id === (data.branchId || result.data.academic?.branchId))?.name;
        
        setSubmittedData({
          ...data,
          id: result.data.id, // Pass DB ID for summary/redirection
          className,
          sectionName,
          branchName
        });
        setSubmitted(true);
      } else {
        setFormError(result.error);
        console.error("Submission Error:", result.error);
        
        // If the error is likely a Prisma or server error, focus top
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (err) {
      console.error("Unexpected Admission Error:", err);
      setFormError("An unexpected error occurred. Please check your connection.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const onError = (errors: any) => {
    console.warn("Validation Failure:", errors);
    
    // 1. Identify which fields are in error
    const errorFields = Object.keys(errors);
    if (errorFields.length === 0) return;

    // 2. Mapping of ALL fields to steps for the 2026-27 CRM
    const stepMapping: Record<string, number> = {
      // Step 1: Personal
      firstName: 1, lastName: 1, middleName: 1, dateOfBirth: 1, gender: 1, bloodGroup: 1, category: 1, phone: 1, email: 1, aadhaarNumber: 1, usnSrnNumber: 1, motherTongue: 1, placeOfBirth: 1, birthCertNo: 1,
      // Step 2: Academic
      admissionDate: 2, academicYearId: 2, branchId: 2, classId: 2, sectionId: 2, rollNumber: 2, feeScheduleId: 2, penNumber: 2, apaarId: 2, samagraId: 2, stsId: 2, biometricId: 2, tcNumber: 2,
      // Step 3: Family
      fatherName: 3, fatherPhone: 3, fatherAlternatePhone: 3, fatherEmail: 3, fatherOccupation: 3, fatherQualification: 3, motherName: 3, motherPhone: 3, motherAlternatePhone: 3, motherEmail: 3, motherOccupation: 3, motherQualification: 3, emergencyContactName: 3, emergencyContactPhone: 3, emergencyContactRelation: 3, whatsappNumber: 3,
      // Step 4: Address / Transport / Previous School
      currentAddress: 4, permanentAddress: 4, city: 4, pinCode: 4, state: 4, country: 4, transportRequired: 4, transportRouteId: 4, pickupStop: 4, dropStop: 4, transportMonthlyFee: 4, previousSchool: 4, previousClass: 4, previousTcNumber: 4, dateOfLeaving: 4,
      // Step 5: Financial
      paymentType: 5, tuitionFee: 5, admissionFee: 5, cautionDeposit: 5, libraryFee: 5, labFee: 5, sportsFee: 5, developmentFee: 5, examFee: 5, discountId1: 5, discountReason1: 5,
      // Step 6: More Info
      admissionType: 6, boardingType: 6, medicalConditions: 6, allergies: 6, bankAccountName: 6, bankAccountNumber: 6, bankIfscCode: 6, reference: 6
    };

    // 3. Find the first field with an error and determine its step
    let targetStep = 7; // Default to current (Review)
    errorFields.forEach(field => {
      const step = stepMapping[field];
      if (step && step < targetStep) {
        targetStep = step;
      }
    });

    // 4. Switch tab and notify user
    if (targetStep < 7) {
      setCurrentStep(targetStep);
      setFormError(`Required fields missing in ${steps[targetStep - 1].title} Details.`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleReset = () => {
    setSubmitted(false);
    setSubmittedData(null);
    setAdmissionId(null);
    setCurrentStep(1);
    reset();
  };

  const nextStep = async () => {
    if (duplicateAadhaar) return;

    const fieldsByStep: Record<number, (keyof StudentAdmissionData)[]> = {
      1: ["firstName", "lastName", "middleName", "dateOfBirth", "gender", "bloodGroup", "category", "phone", "email", "aadhaarNumber", "usnSrnNumber", "motherTongue", "placeOfBirth", "birthCertNo"],
      2: ["admissionDate", "academicYearId", "branchId", "classId", "sectionId", "rollNumber", "feeScheduleId", "penNumber", "apaarId", "samagraId", "stsId", "biometricId", "tcNumber"],
      3: ["fatherName", "fatherPhone", "fatherAlternatePhone", "fatherEmail", "fatherOccupation", "fatherQualification", "motherName", "motherPhone", "motherAlternatePhone", "motherEmail", "motherOccupation", "motherQualification", "emergencyContactName", "emergencyContactPhone", "emergencyContactRelation", "whatsappNumber"],
      4: ["currentAddress", "city", "pinCode", "state", "country", "transportRequired", "transportRouteId", "pickupStop", "dropStop", "transportMonthlyFee"],
      5: ["paymentType", "tuitionFee", "admissionFee", "cautionDeposit", "libraryFee", "labFee", "sportsFee", "developmentFee", "examFee", "discountId1", "discountReason1"],
      6: ["admissionType", "boardingType", "medicalConditions", "allergies", "bankAccountName", "bankAccountNumber", "bankIfscCode", "reference"],
    };

    const fieldsToValidate = fieldsByStep[currentStep];
    if (fieldsToValidate) {
      const isValid = await trigger(fieldsToValidate);
      if (!isValid) return;
    }
    
    setReviewConfirmed(false);
    setCurrentStep(Math.min(currentStep + 1, steps.length));
  };

  const prevStep = () => {
    setReviewConfirmed(false);
    setCurrentStep(Math.max(currentStep - 1, 1));
  };
  const transportRequired = watch("transportRequired");
  const firstName = watch("firstName");
  const aadhaarNumber = watch("aadhaarNumber");
  const feeScheduleId = watch("feeScheduleId");

  // 💰 Phase 1: Sovereign Registry Auto-Population
  // Loads values directly from the Institutional Fee Registry (feeMasters.amount)
  // when the registry data first arrives. This is the DEFAULT state before any template is selected.
  useEffect(() => {
    if (refData.feeMasters.length === 0) return;

    // ⚠️ STRICT matching: only exact standard names map to hardcoded form fields.
    // Custom names (e.g. "Activity & Lab Fee") go to auxiliaryFields with their exact label.
    const EXACT_NAMED: { names: string[], field: keyof StudentAdmissionData }[] = [
      { names: ["admission fee", "admission"],             field: "admissionFee" },
      { names: ["caution deposit", "security deposit", "caution"], field: "cautionDeposit" },
      { names: ["library fee", "library"],                field: "libraryFee" },
      { names: ["lab fee", "laboratory fee", "lab"],       field: "labFee" },
      { names: ["sports fee", "sports"],                  field: "sportsFee" },
      { names: ["development fee", "development"],        field: "developmentFee" },
      { names: ["exam fee", "examination fee", "exam"],   field: "examFee" },
    ];

    // Track which masters were claimed by a named slot
    const claimedIds = new Set<string>();

    EXACT_NAMED.forEach(({ names, field }) => {
      const master = refData.feeMasters.find(
        m => names.includes(m.name.toLowerCase().trim()) && m.isActive !== false
      );
      if (master) {
        claimedIds.add(master.id);
        setValue(field, Number(master.amount || 0));
      }
    });

    // All unclaimed, active, non-tuition masters → auxiliaryFields with exact name
    const auxiliary: Record<string, number> = {};
    const tuitionNames = ["tuition fee", "tuition", "standard tuition fee"];
    refData.feeMasters.forEach(m => {
      if (claimedIds.has(m.id)) return;
      if (tuitionNames.includes(m.name.toLowerCase().trim())) return;
      if (m.isActive === false) return;
      auxiliary[m.id] = Number(m.amount || 0);
    });
    setValue("auxiliaryFields", auxiliary);

    // Auto-select all active fees with amount > 0
    const autoSelected = new Set<string>();
    refData.feeMasters.forEach(m => {
      if (m.isActive !== false && Number(m.amount || 0) > 0) {
        autoSelected.add(m.id);
      }
    });
    setSelectedFeeIds(autoSelected);

  }, [refData.feeMasters, setValue]);


  // 💰 Phase 2: Fee Structure Template Override
  // When a specific Fee Structure Template is selected (Academic step),
  // its amounts override the registry defaults for this student.
  useEffect(() => {
    if (!feeScheduleId || refData.feeSchedules.length === 0) return;

    const selectedStructure = refData.feeSchedules.find(s => s.id === feeScheduleId);
    if (!selectedStructure) return;

    setValue("tuitionFee", Number(selectedStructure.totalAmount || 0));
    
    const comps = selectedStructure.components || [];
    const findAmount = (keywords: string[]) => {
      const match = comps.find(c => keywords.some(k => c.masterComponent.name.toLowerCase().includes(k.toLowerCase())));
      return Number(match?.amount || 0);
    };

    setValue("admissionFee", findAmount(["admission"]));
    setValue("cautionDeposit", findAmount(["caution", "security"]));
    setValue("libraryFee", findAmount(["library"]));
    setValue("labFee", findAmount(["lab"]));
    setValue("sportsFee", findAmount(["sports"]));
    setValue("developmentFee", findAmount(["development"]));
    setValue("examFee", findAmount(["exam"]));

    if (refData.feeMasters.length > 0) {
      const auxiliary: Record<string, number> = {};
      refData.feeMasters.forEach(master => {
        const match = comps.find(c => c.masterComponent.name === master.name);
        if (match) auxiliary[master.id] = Number(match.amount);
      });
      setValue("auxiliaryFields", auxiliary);
    }

  }, [feeScheduleId, refData.feeSchedules, refData.feeMasters, setValue]);

  const performSearch = useCallback(async (q: string) => {
    if (!q || q.length < 3) {
      setSearchResults([]);
      setDuplicateAadhaar(null);
      return;
    }
    setIsSearching(true);
    try {
      const res = await searchStudentsAction(q);
      if (res.success && res.data) {
        setSearchResults(res.data);
        // Check for exact Aadhaar match to block admission
        const match = res.data.find((s: any) => s.aadhaarNumber === aadhaarNumber && (aadhaarNumber?.length ?? 0) > 5);
        setDuplicateAadhaar(match ? match.aadhaarNumber : null);
      } else {
        setSearchResults([]);
      }
    } finally {
      setIsSearching(false);
    }
  }, [aadhaarNumber]);

  useEffect(() => {
    const term = firstName || aadhaarNumber;
    const skip = !term || term.length < 3;
    
    const timer = setTimeout(() => {
      if (!skip) performSearch(term);
      else {
        setSearchResults([]);
        setDuplicateAadhaar(null);
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [firstName, aadhaarNumber, performSearch]);

  const selectedFeeId = watch("feeScheduleId");

  // 💎 The Financial Pulse: Auto-populate fees from structure
  useEffect(() => {
    if (!selectedFeeId) return;
    const schedule = refData.feeSchedules.find((s) => s.id === selectedFeeId);
    if (schedule && schedule.components) {
      // Primary components mapping
      schedule.components.forEach((comp: any) => {
        const name = comp.masterComponent.name.toLowerCase();
        const amt = Number(comp.amount);
        if (name.includes("tuition")) setValue("tuitionFee", amt);
        if (name.includes("admission")) setValue("admissionFee", amt);
        if (name.includes("caution")) setValue("cautionDeposit", amt);
        if (name.includes("library")) setValue("libraryFee", amt);
        if (name.includes("lab")) setValue("labFee", amt);
        if (name.includes("sports")) setValue("sportsFee", amt);
        if (name.includes("development")) setValue("developmentFee", amt);
        if (name.includes("exam")) setValue("examFee", amt);
      });
    } else if (!selectedFeeId) {
       // Reset if cleared
       const fields: (keyof StudentAdmissionData)[] = ["tuitionFee", "admissionFee", "cautionDeposit", "libraryFee", "labFee", "sportsFee", "developmentFee", "examFee"];
       fields.forEach(f => setValue(f, 0));
    }
  }, [selectedFeeId, refData.feeSchedules, setValue]);

  const handleDevAutofill = () => {
    const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
    const randomString = (length: number) => Math.random().toString(36).substring(2, 2 + length).toUpperCase();
    const randomName = () => ["Arjun", "Sneha", "Vikram", "Priya", "Rahul", "Anjali", "Kiran"][randomInt(0, 6)] + "_" + Math.random().toString(36).slice(-3);
    const randomSurname = () => ["Sharma", "Verma", "Reddy", "Patel", "Goud", "Khan", "Nair"][randomInt(0, 6)];

    // ─── STEP 1: PERSONAL ───
    if (currentStep === 1) {
      setValue("firstName", randomName());
      setValue("lastName", randomSurname());
      setValue("middleName", "Kumar");
      setValue("gender", randomInt(0, 1) ? "Male" : "Female");
      setValue("dateOfBirth", `2015-05-${randomInt(10, 25)}`);
      setValue("bloodGroup", ["A+", "B+", "O+", "AB+"][randomInt(0, 3)]);
      setValue("category", ["General", "OBC", "SC", "ST"][randomInt(0, 3)]);
      setValue("aadhaarNumber", "5" + Math.random().toString().slice(2, 13));
      setValue("motherTongue", "Telugu");
      setValue("placeOfBirth", "Hyderabad");
      setValue("birthCertNo", "BC-" + randomString(8));
      setValue("usnSrnNumber", "USN-" + randomString(6));
      setValue("email", `test_student_${Date.now()}@pava-edux.com`);
      setValue("phone", "98480" + randomInt(11111, 99999));
    } 
    // ─── STEP 2: ACADEMIC ───
    else if (currentStep === 2) {
      if (refData.branches.length > 0) setValue("branchId", refData.branches[0].id);
      if (refData.academicYears.length > 0) setValue("academicYearId", refData.academicYears[0].id);
      if (refData.classes.length > 0) setValue("classId", refData.classes[0].id);
      if (sections.length > 0) setValue("sectionId", sections[0].id);
      
      setValue("admissionDate", new Date().toISOString().split("T")[0]);
      setValue("admissionNumber", "ADM-" + randomString(5));
      setValue("rollNumber", randomInt(1, 60).toString());
      setValue("penNumber", "PEN" + randomString(8));
      setValue("apaarId", "AP-" + randomString(10));
      setValue("samagraId", "SAM-" + randomString(10));
      setValue("stsId", "STS-" + randomString(10));
      setValue("biometricId", "BIO-" + randomString(6));
      setValue("tcNumber", "TC-" + randomString(6));
    } 
    // ─── STEP 3: FAMILY ───
    else if (currentStep === 3) {
      setValue("fatherName", "Senior " + randomName() + " " + randomSurname());
      setValue("fatherPhone", "99" + randomInt(11111111, 99999999));
      setValue("fatherAlternatePhone", "88" + randomInt(11111111, 99999999));
      setValue("fatherEmail", `father_${Date.now()}@gmail.com`);
      setValue("fatherOccupation", "Engineer");
      setValue("fatherQualification", "M.Tech");
      setValue("fatherAadhaar", "4" + Math.random().toString().slice(2, 13));
      
      setValue("motherName", "Mrs. " + randomName());
      setValue("motherPhone", "77" + randomInt(11111111, 99999999));
      setValue("motherEmail", `mother_${Date.now()}@gmail.com`);
      setValue("motherOccupation", "Homemaker");
      setValue("motherQualification", "B.Sc");
      
      setValue("whatsappNumber", "9848" + randomInt(111111, 999999));
      setValue("emergencyContactName", "Uncle Joe");
      setValue("emergencyContactPhone", "9110" + randomInt(111111, 999999));
      setValue("emergencyContactRelation", "Uncle");
    } 
    // ─── STEP 4: ADDRESS / TRANSPORT / PREV SCHOOL ───
    else if (currentStep === 4) {
      const addr = randomInt(10, 999) + ", Cyber Towers Loop, Phase " + randomInt(1, 5);
      setValue("currentAddress", addr);
      setValue("permanentAddress", addr);
      setValue("city", "Hyderabad");
      setValue("state", "Telangana");
      setValue("pinCode", "5000" + randomInt(10, 99));
      setValue("country", "India");
      
      setValue("transportRequired", true);
      setValue("pickupStop", "Main Gate");
      setValue("dropStop", "Main Gate");
      setValue("transportMonthlyFee", 2500);
      
      setValue("previousSchool", "Sparkle International School");
      setValue("previousClass", "Grade " + randomInt(1, 5));
      setValue("previousTcNumber", "PREV-TC-" + randomString(4));
    } 
    // ─── STEP 5: FINANCIAL ───
    else if (currentStep === 5) {
      setValue("paymentType", "Term-wise");
      if (refData.feeSchedules.length > 0) {
          setValue("feeScheduleId", refData.feeSchedules[0].id);
          // Force values for testing
          setValue("tuitionFee", 45000);
          setValue("admissionFee", 5000);
          setValue("cautionDeposit", 2000);
          setValue("libraryFee", 500);
          setValue("labFee", 1000);
          setValue("sportsFee", 500);
          setValue("developmentFee", 1000);
          setValue("examFee", 1500);
      }
    } 
    // ─── STEP 6: MORE INFO ───
    else if (currentStep === 6) {
      setValue("admissionType", "New");
      setValue("boardingType", "Day Scholar");
      setValue("medicalConditions", "None");
      setValue("allergies", "Dust");
      setValue("bankAccountName", randomName() + " " + randomSurname());
      setValue("bankAccountNumber", "99" + randomInt(111111111, 999999999));
      setValue("bankIfscCode", "SBIN000" + randomInt(1000, 9999));
      setValue("reference", "Referral-Program-2026");
    }
  };

  if (submitted && submittedData && admissionId) {
    return (
      <StudentAdmissionSummary 
        studentData={submittedData} 
        admissionId={admissionId} 
        dbStudentId={submittedData.id} // Actual Student ID from DB
        schoolName={refData.schoolName}
        onReset={handleReset} 
      />
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-wrap items-center gap-3 mb-10 bg-white/40 backdrop-blur-xl p-3 rounded-[32px] border border-white/40 shadow-xl shadow-slate-200/50">
        {steps.map((step) => {
          const isActive = currentStep === step.id;
          const isCompleted = currentStep > step.id;
          return (
            <button
              key={step.id}
              type="button"
              onClick={() => {
                setReviewConfirmed(false);
                setCurrentStep(step.id);
              }}
              className={cn(
                "px-6 py-3 rounded-[20px] text-[10px] font-black uppercase tracking-widest transition-all duration-500 relative overflow-hidden",
                isActive 
                  ? "bg-primary text-white shadow-[0_10px_25px_rgba(var(--primary-rgb),0.3)] scale-105" 
                  : isCompleted 
                    ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20" 
                    : "bg-white/60 text-slate-400 hover:bg-white hover:text-slate-600"
              )}
            >
              {step.title}
              {isActive && (
                 <motion.div 
                    layoutId="step-glow"
                    className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] animate-shimmer"
                 />
              )}
            </button>
          );
        })}
      </div>

      {/* ─── Form ─── */}
      <form 
        onSubmit={handleSubmit(onSubmit, onError)} 
        className="space-y-3"
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
            e.preventDefault(); // Prevent accidental form submission on Enter
          }
        }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
            className="bg-white/70 backdrop-blur-3xl border border-white/50 rounded-[48px] p-10 lg:p-14 shadow-[0_40px_100px_rgba(0,0,0,0.03)] ring-1 ring-slate-200/50 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 blur-[120px] -z-10 rounded-full animate-pulse" />
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-emerald-500/5 blur-[120px] -z-10 rounded-full animate-pulse delay-700" />
            
            {/* Global Error Alert */}
            <AnimatePresence>
              {formError && (
                <motion.div 
                  initial={{ height: 0, opacity: 0, scale: 0.95 }}
                  animate={{ height: "auto", opacity: 1, scale: 1 }}
                  exit={{ height: 0, opacity: 0, scale: 0.95 }}
                  className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4 flex items-start gap-4 mb-8 overflow-hidden shadow-sm"
                >
                  <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-bold text-rose-500 tracking-tight">Registration Blocked</p>
                    <p className="text-[12px] text-rose-500/80 font-medium mt-1 leading-relaxed">{formError}</p>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => setFormError(null)}
                    className="text-rose-400 hover:text-rose-500 transition-colors p-1"
                  >
                    <ChevronDown className="w-4 h-4 rotate-180" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ─── STEP 1: Personal ─── */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 tracking-tight">Personal Details</h3>
                    <p className="text-slate-500 text-sm font-medium">Basic student identity and contact information</p>
                  </div>
                </div>

                {/* Duplicate Alert */}
                <AnimatePresence>
                  {duplicateAadhaar && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="bg-rose-500/20 border border-rose-500/50 rounded-xl p-3 flex items-start gap-3 mb-2"
                    >
                      <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-black text-rose-300 uppercase leading-none">Duplicate Prevention Active</p>
                        <p className="text-[10px] text-rose-200/70 font-medium mt-1">
                          A student with Aadhaar <span className="text-rose-400 font-bold">{duplicateAadhaar}</span> is already admitted to this school. 
                          <span className="block mt-1 font-bold text-rose-300 underline">Admission for this Aadhaar is blocked.</span>
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  <Field label="First Name *" error={errors.firstName?.message} className="lg:col-span-2 relative">
                    <div className="relative group">
                      <input {...register("firstName")} placeholder="First Name" className={cn(inputCls, "pr-8")} />
                      {isSearching && <Search className="w-3 h-3 absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-violet-400" />}
                    </div>

                    {/* Live Search Dropdown */}
                    <AnimatePresence>
                      {searchResults.length > 0 && (
                        <motion.div 
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -5 }}
                          className="absolute z-[100] left-0 right-0 top-full mt-1 bg-background shadow-xl border border-border border border-border rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden backdrop-blur-2xl ring-1 ring-white/10"
                        >
                          <div className="px-2 py-1.5 border-b border-white/5 bg-muted/50">
                            <p className="text-[9px] font-black text-foreground/40 uppercase tracking-widest">Similar Students Found</p>
                          </div>
                          <div className="max-h-[240px] overflow-y-auto custom-scrollbar">
                            {searchResults.map((student) => (
                              <div key={student.id} className="p-2.5 border-b border-white/5 last:border-0 hover:bg-muted/50 transition-colors cursor-default">
                                <div className="flex justify-between items-start gap-2">
                                  <div className="flex-1 min-w-0">
                                    <p className="text-[11px] font-black text-foreground truncate">{student.firstName} {student.lastName}</p>
                                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                                      <p className="text-[9px] text-foreground/50 font-bold uppercase truncate">
                                        P: {student.family?.fatherName || 'N/A'}
                                      </p>
                                      <p className="text-[9px] text-violet-400/80 font-bold uppercase">
                                        {student.family?.fatherPhone || 'No Phone'}
                                      </p>
                                    </div>
                                    {student.aadhaarNumber && (
                                      <p className={cn(
                                        "text-[8px] font-black px-1.5 py-0.5 rounded mt-1 inline-block uppercase tracking-tighter",
                                        student.aadhaarNumber === aadhaarNumber ? "bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse" : "bg-muted/50 text-foreground/40 border border-border"
                                      )}>
                                        Aadhaar: {student.aadhaarNumber}
                                      </p>
                                    )}
                                  </div>
                                  <div className="text-right shrink-0">
                                    <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-violet-500/20 text-violet-300 border border-violet-500/30 uppercase tracking-tighter">
                                      {student.academic?.class?.name || 'Class N/A'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Field>
                  <Field label="Middle Name" error={errors.middleName?.message}>
                    <input {...register("middleName")} placeholder="Middle" className={inputCls} />
                  </Field>
                  <Field label="Last Name *" error={errors.lastName?.message} className="lg:col-span-2">
                    <input {...register("lastName")} placeholder="Last Name" className={inputCls} />
                  </Field>
                  <Field label="Date of Birth" error={errors.dateOfBirth?.message}>
                    <input {...register("dateOfBirth")} type="date" className={inputCls} />
                  </Field>
                  <Field label="Gender" error={errors.gender?.message}>
                    <select {...register("gender")} className={selectCls}>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </Field>
                  <Field label="Blood Group" error={errors.bloodGroup?.message}>
                    <select {...register("bloodGroup")} className={selectCls}>
                      <option value="">Select</option>
                      {["A+","A-","B+","B-","AB+","AB-","O+","O-"].map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </Field>
                  <Field label="Category" error={errors.category?.message}>
                    <select {...register("category")} className={selectCls}>
                      <option value="">Select</option>
                      {["General","OBC","SC","ST","EWS"].map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </Field>
                  <Field label="Email" error={errors.email?.message} className="lg:col-span-2">
                    <input {...register("email")} type="email" placeholder="student@email.com" className={inputCls} />
                  </Field>
                  <Field label="Aadhaar Number *" error={errors.aadhaarNumber?.message}>
                    <input {...register("aadhaarNumber")} placeholder="XXXX XXXX XXXX" className={inputCls} />
                  </Field>
                  <Field label="USN / SRN Number" error={errors.usnSrnNumber?.message}>
                    <input {...register("usnSrnNumber")} placeholder="USN" className={inputCls} />
                  </Field>
                  <Field label="Mother Tongue" error={errors.motherTongue?.message}>
                    <input {...register("motherTongue")} placeholder="e.g. Telugu" className={inputCls} />
                  </Field>
                  <Field label="Place of Birth" error={errors.placeOfBirth?.message}>
                    <input {...register("placeOfBirth")} placeholder="City" className={inputCls} />
                  </Field>
                  <Field label="Birth Certificate No" error={errors.birthCertNo?.message}>
                    <input {...register("birthCertNo")} placeholder="BC-XXXXX" className={inputCls} />
                  </Field>
                </div>
              </div>
            )}

            {/* ─── STEP 2: Academic ─── */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <School className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 tracking-tight">Academic & Fee Schedule</h3>
                    <p className="text-slate-500 text-sm font-medium">Class placement, academic year, and fee structure</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  <Field label="Admission Date *" error={errors.admissionDate?.message}>
                    <input {...register("admissionDate")} type="date" className={inputCls} />
                  </Field>
                  <Field label="Academic Year *" error={errors.academicYearId?.message}>
                    <select {...register("academicYearId")} className={selectCls} disabled={isLoadingRef}>
                      <option value="">Select Year</option>
                      {refData.academicYears.map(y => (
                        <option key={y.id} value={y.id}>{y.name} {y.isCurrent ? '(Current)' : ''}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Branch *" error={errors.branchId?.message}>
                    <select {...register("branchId")} className={selectCls} disabled={isLoadingRef}>
                      <option value="">Select Branch</option>
                      {refData.branches.map(b => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Class *" error={errors.classId?.message}>
                    <select 
                      {...register("classId", { 
                        onChange: async (e) => {
                          const cid = e.target.value;
                          const res = await getSectionsByClass(cid);
                          if (res.success && res.data) {
                            setSections(res.data);
                            // 🏁 Auto-Section: Select first available section with a slight delay for DOM sync
                            if (res.data.length > 0) {
                              setTimeout(() => {
                                setValue("sectionId", res.data[0].id, { shouldValidate: true, shouldDirty: true });
                              }, 50);
                            } else {
                              setValue("sectionId", "");
                            }
                          }

                          // 🎯 The Fee Schedule Pulse: Auto-filter by Class
                          const schedules = refData.feeSchedules.filter(fs => fs.classId === cid);
                          if (schedules.length > 0) {
                            setTimeout(() => {
                              setValue("feeScheduleId", schedules[0].id, { shouldValidate: true, shouldDirty: true });
                            }, 50);
                          } else {
                            setValue("feeScheduleId", "");
                          }
                        }
                      })} 
                      className={selectCls} 
                      disabled={isLoadingRef}
                    >
                      <option value="">Select Class</option>
                      {refData.classes.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Section" error={errors.sectionId?.message}>
                    <select {...register("sectionId")} className={selectCls} disabled={sections.length === 0}>
                      <option value="">Select Section</option>
                      {sections.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Roll Number" error={errors.rollNumber?.message}>
                    <input {...register("rollNumber")} placeholder="Roll No" className={inputCls} />
                  </Field>
                  <Field label="Fee Schedule" error={errors.feeScheduleId?.message}>
                    <select 
                      {...register("feeScheduleId")} 
                      className={cn(selectCls, watch("classId") && "bg-slate-50/50 cursor-not-allowed opacity-80 font-bold")} 
                      disabled={isLoadingRef || (watch("classId") !==undefined && watch("classId") !== "")}
                    >
                      <option value="">Select Schedule</option>
                      {refData.feeSchedules
                        .filter(fs => !watch("classId") || fs.classId === watch("classId"))
                        .map(fs => (
                          <option key={fs.id} value={fs.id}>{fs.name} (₹{fs.totalAmount?.toLocaleString()})</option>
                        ))
                      }
                    </select>
                    {watch("classId") && (
                      <p className="px-3 mt-1 text-[8px] font-black text-primary/60 uppercase tracking-widest italic">✓ Locked to Class Template</p>
                    )}
                  </Field>
                  <Field label="PEN Number" error={errors.penNumber?.message}>
                    <input {...register("penNumber")} placeholder="PEN" className={inputCls} />
                  </Field>
                  <Field label="Apaar ID" error={errors.apaarId?.message}>
                    <input {...register("apaarId")} placeholder="Apaar ID" className={inputCls} />
                  </Field>
                  <Field label="Samagra ID" error={errors.samagraId?.message}>
                    <input {...register("samagraId")} placeholder="Samagra" className={inputCls} />
                  </Field>
                  <Field label="STS / SATS ID" error={errors.stsId?.message}>
                    <input {...register("stsId")} placeholder="STS ID" className={inputCls} />
                  </Field>
                  <Field label="Biometric ID" error={errors.biometricId?.message}>
                    <input {...register("biometricId")} placeholder="Bio ID" className={inputCls} />
                  </Field>
                </div>
              </div>
            )}

            {/* ─── STEP 3: Family ─── */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 tracking-tight">Family Details</h3>
                    <p className="text-slate-500 text-sm font-medium">Parental information and emergency contacts</p>
                  </div>
                </div>
                <p className="text-[10px] font-bold text-violet-400/70 uppercase tracking-wider">Father</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  <Field label="Father Name *" error={errors.fatherName?.message} className="lg:col-span-2">
                    <input {...register("fatherName")} placeholder="Full Name" className={inputCls} />
                  </Field>
                  <Field label="Father Phone *" error={errors.fatherPhone?.message}>
                    <div className="relative flex items-center">
                      <span className="absolute left-2.5 text-foreground/50 text-sm font-medium">+91</span>
                      <input {...register("fatherPhone")} placeholder="Phone" className={`${inputCls} pl-10`} />
                    </div>
                  </Field>
                  <Field label="Alternate Phone" error={errors.fatherAlternatePhone?.message}>
                    <div className="relative flex items-center">
                      <span className="absolute left-2.5 text-foreground/50 text-sm font-medium">+91</span>
                      <input {...register("fatherAlternatePhone")} placeholder="Phone" className={`${inputCls} pl-10`} />
                    </div>
                  </Field>
                  <Field label="Father Email" error={errors.fatherEmail?.message}>
                    <input {...register("fatherEmail")} type="email" placeholder="email" className={inputCls} />
                  </Field>
                  <Field label="Occupation" error={errors.fatherOccupation?.message}>
                    <input {...register("fatherOccupation")} placeholder="Occupation" className={inputCls} />
                  </Field>
                  <Field label="Qualification" error={errors.fatherQualification?.message}>
                    <input {...register("fatherQualification")} placeholder="Qualification" className={inputCls} />
                  </Field>
                  <Field label="Aadhaar Number *" error={errors.fatherAadhaar?.message}>
                    <input {...register("fatherAadhaar")} placeholder="XXXX XXXX XXXX" className={inputCls} />
                  </Field>
                </div>
                <p className="text-[10px] font-bold text-pink-400/70 uppercase tracking-wider mt-2">Mother</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  <Field label="Mother Name" error={errors.motherName?.message} className="lg:col-span-2">
                    <input {...register("motherName")} placeholder="Full Name" className={inputCls} />
                  </Field>
                  <Field label="Mother Phone" error={errors.motherPhone?.message}>
                    <div className="relative flex items-center">
                      <span className="absolute left-2.5 text-foreground/50 text-sm font-medium">+91</span>
                      <input {...register("motherPhone")} placeholder="Phone" className={`${inputCls} pl-10`} />
                    </div>
                  </Field>
                  <Field label="Alternate Phone" error={errors.motherAlternatePhone?.message}>
                    <div className="relative flex items-center">
                      <span className="absolute left-2.5 text-foreground/50 text-sm font-medium">+91</span>
                      <input {...register("motherAlternatePhone")} placeholder="Phone" className={`${inputCls} pl-10`} />
                    </div>
                  </Field>
                  <Field label="Mother Email" error={errors.motherEmail?.message}>
                    <input {...register("motherEmail")} type="email" placeholder="email" className={inputCls} />
                  </Field>
                  <Field label="Occupation" error={errors.motherOccupation?.message}>
                    <input {...register("motherOccupation")} placeholder="Occupation" className={inputCls} />
                  </Field>
                  <Field label="Qualification" error={errors.motherQualification?.message}>
                    <input {...register("motherQualification")} placeholder="Qualification" className={inputCls} />
                  </Field>
                  <Field label="Aadhaar Number *" error={errors.motherAadhaar?.message}>
                    <input {...register("motherAadhaar")} placeholder="XXXX XXXX XXXX" className={inputCls} />
                  </Field>
                </div>
                <p className="text-[10px] font-bold text-orange-400/70 uppercase tracking-wider mt-2">Emergency Contact</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  <Field label="Contact Name" error={errors.emergencyContactName?.message}>
                    <input {...register("emergencyContactName")} placeholder="Name" className={inputCls} />
                  </Field>
                  <Field label="Contact Phone" error={errors.emergencyContactPhone?.message}>
                    <div className="relative flex items-center">
                      <span className="absolute left-2.5 text-foreground/50 text-sm font-medium">+91</span>
                      <input {...register("emergencyContactPhone")} placeholder="Phone" className={`${inputCls} pl-10`} />
                    </div>
                  </Field>
                  <Field label="Relation" error={errors.emergencyContactRelation?.message}>
                    <input {...register("emergencyContactRelation")} placeholder="e.g. Uncle" className={inputCls} />
                  </Field>
                  <Field label="WhatsApp Number" error={errors.whatsappNumber?.message}>
                    <div className="relative flex items-center">
                      <span className="absolute left-2.5 text-foreground/50 text-sm font-medium">+91</span>
                      <input {...register("whatsappNumber")} placeholder="Phone" className={`${inputCls} pl-10`} />
                    </div>
                  </Field>
                </div>
              </div>
            )}

            {/* ─── STEP 4: Address ─── */}
            {currentStep === 4 && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 tracking-tight">Address Details</h3>
                    <p className="text-slate-500 text-sm font-medium">Residential address and transport requirements</p>
                  </div>
                </div>
                <p className="text-[10px] font-bold text-green-400/70 uppercase tracking-wider">Current Address</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  <Field label="Address" error={errors.currentAddress?.message} className="lg:col-span-3">
                    <input {...register("currentAddress")} placeholder="Street Address" className={inputCls} />
                  </Field>
                  <Field label="City" error={errors.city?.message}>
                    <input {...register("city")} placeholder="City" className={inputCls} />
                  </Field>
                  <Field label="Pin Code" error={errors.pinCode?.message}>
                    <input {...register("pinCode")} placeholder="PIN" className={inputCls} />
                  </Field>
                  <Field label="State *" error={errors.state?.message}>
                    <select {...register("state")} className={selectCls}>
                      <option value="">Select State</option>
                      {[
                        "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", 
                        "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", 
                        "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", 
                        "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", 
                        "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", 
                        "Uttarakhand", "West Bengal", "Andaman and Nicobar Islands", 
                        "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu", 
                        "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"
                      ].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </Field>
                  <Field label="Country" error={errors.country?.message}>
                    <input {...register("country")} placeholder="Country" className={inputCls} />
                  </Field>
                </div>

                <div className="border-t border-border my-4" />
                <div className="flex items-center gap-3">
                  <input {...register("transportRequired")} type="checkbox" id="transport" className="w-4 h-4 accent-violet-500" />
                  <label htmlFor="transport" className="text-xs font-bold text-foreground/70 flex items-center gap-2">
                    <Bus className="w-4 h-4 text-yellow-400" /> Transport Required
                  </label>
                </div>
                {transportRequired && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mt-2">
                    <Field label="Route" error={errors.transportRouteId?.message}>
                      <select {...register("transportRouteId")} className={selectCls}>
                        <option value="">Select Route</option>
                        <option value="r1">Route 1 - East</option>
                        <option value="r2">Route 2 - West</option>
                      </select>
                    </Field>
                    <Field label="Pickup Stop" error={errors.pickupStop?.message}>
                      <input {...register("pickupStop")} placeholder="Stop name" className={inputCls} />
                    </Field>
                    <Field label="Drop Stop" error={errors.dropStop?.message}>
                      <input {...register("dropStop")} placeholder="Stop name" className={inputCls} />
                    </Field>
                    <Field label="Monthly Fee (₹)" error={errors.transportMonthlyFee?.message}>
                      <input {...register("transportMonthlyFee", { valueAsNumber: true })} type="number" placeholder="0" className={inputCls} />
                    </Field>
                  </div>
                )}
                <div className="border-t border-border my-4" />
                <p className="text-[10px] font-bold text-orange-400/70 uppercase tracking-wider">Previous School</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-1">
                  <Field label="School Name" className="lg:col-span-2">
                    <input {...register("previousSchool")} placeholder="Previous School" className={inputCls} />
                  </Field>
                  <Field label="Class">
                    <input {...register("previousClass")} placeholder="e.g. Class 5" className={inputCls} />
                  </Field>
                  <Field label="TC Number">
                    <input {...register("previousTcNumber")} placeholder="TC No" className={inputCls} />
                  </Field>
                  <Field label="Date of Leaving">
                    <input {...register("dateOfLeaving")} type="date" className={inputCls} />
                  </Field>
                </div>
              </div>
            )}

            {/* ─── STEP 5: Financial ─── */}
            {currentStep === 5 && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <CreditCard className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 tracking-tight">Financial & Fee Breakdown</h3>
                    <p className="text-slate-500 text-sm font-medium">Select applicable fees from the Institutional Registry</p>
                  </div>
                </div>

                {/* Payment Type */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <Field label="Payment Type *" error={errors.paymentType?.message} className="sm:col-span-2">
                    <select {...register("paymentType")} className={selectCls}>
                      <option value="Term-wise">Term-wise (50/25/25)</option>
                      <option value="One-time">One-time (Annual)</option>
                    </select>
                  </Field>
                </div>

                {/* Fee Selection Grid */}
                {(() => {
                  const EXACT_NAMED: { names: string[], field: keyof StudentAdmissionData }[] = [
                    { names: ["admission fee", "admission"],                         field: "admissionFee" },
                    { names: ["caution deposit", "security deposit", "caution"],     field: "cautionDeposit" },
                    { names: ["library fee", "library"],                             field: "libraryFee" },
                    { names: ["lab fee", "laboratory fee", "lab"],                   field: "labFee" },
                    { names: ["sports fee", "sports"],                               field: "sportsFee" },
                    { names: ["development fee", "development"],                     field: "developmentFee" },
                    { names: ["exam fee", "examination fee", "exam"],               field: "examFee" },
                  ];
                  const tuitionNames = ["tuition fee", "tuition", "standard tuition fee"];

                  const tuitionMaster = refData.feeMasters.find(m => tuitionNames.includes(m.name.toLowerCase().trim()));
                  const claimedIds = new Set<string>();
                  if (tuitionMaster) claimedIds.add(tuitionMaster.id);

                  // Build the list of toggleable fee cards
                  const feeCards = refData.feeMasters
                    .filter(m => !tuitionNames.includes(m.name.toLowerCase().trim()) && m.isActive !== false)
                    .map(m => {
                      const namedSlot = EXACT_NAMED.find(s => s.names.includes(m.name.toLowerCase().trim()));
                      claimedIds.add(m.id);
                      return { master: m, formField: namedSlot?.field ?? null };
                    });

                  const toggleFee = (id: string, formField: keyof StudentAdmissionData | null, amount: number) => {
                    setSelectedFeeIds(prev => {
                      const next = new Set(prev);
                      const nowSelected = next.has(id);
                      if (nowSelected) {
                        next.delete(id);
                        if (formField) setValue(formField, 0 as any);
                        else {
                          const cur: any = watch("auxiliaryFields") || {};
                          setValue("auxiliaryFields", { ...cur, [id]: 0 });
                        }
                      } else {
                        next.add(id);
                        if (formField) setValue(formField, amount as any);
                        else {
                          const cur: any = watch("auxiliaryFields") || {};
                          setValue("auxiliaryFields", { ...cur, [id]: amount });
                        }
                      }
                      return next;
                    });
                  };

                  const totalSelected = feeCards
                    .filter(({ master }) => selectedFeeIds.has(master.id))
                    .reduce((sum, { master }) => sum + Number(master.amount || 0), 0)
                    + Number(watch("tuitionFee") || 0);

                  const typeColor: Record<string, string> = {
                    CORE: "bg-blue-100 text-blue-600",
                    ANCILLARY: "bg-violet-100 text-violet-600",
                    DEPOSIT: "bg-amber-100 text-amber-600",
                    PENALTY: "bg-rose-100 text-rose-600",
                  };

                  if (refData.feeMasters.length === 0) {
                    return (
                      <div className="py-8 rounded-2xl border-2 border-dashed border-slate-200 text-center">
                        <p className="text-sm text-slate-400 font-medium">No fees found in the Institutional Registry.</p>
                        <p className="text-xs text-slate-300 mt-1">Configure fees in the Fee Registry to see them here.</p>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-3">
                      {/* Tuition — always selected, non-toggleable */}
                      {/* Tuition — always selected, non-toggleable */}
                      {tuitionMaster && (
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Core Tuition</p>
                          <div className="p-5 rounded-2xl border-2 border-primary bg-primary/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                              <p className="text-sm font-bold text-slate-800">{tuitionMaster.name}</p>
                              <span className={cn("text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-wide mt-1 inline-block", typeColor[tuitionMaster.type] || "bg-slate-100 text-slate-500")}>{tuitionMaster.type}</span>
                              
                              {/* Term-wise Logic Bridge */}
                              {watch("paymentType") === "Term-wise" && (
                                <div className="mt-3 flex items-center gap-3">
                                  <div className="px-2 py-1 bg-white/50 rounded-lg border border-primary/10">
                                    <p className="text-[8px] font-black text-slate-400 uppercase leading-none">Term 1 (50%)</p>
                                    <p className="text-[11px] font-bold text-primary mt-0.5">₹{(Number(watch("tuitionFee") || 0) * 0.5).toLocaleString()}</p>
                                  </div>
                                  <div className="px-2 py-1 bg-white/50 rounded-lg border border-primary/10">
                                    <p className="text-[8px] font-black text-slate-400 uppercase leading-none">Term 2 (25%)</p>
                                    <p className="text-[11px] font-bold text-primary mt-0.5">₹{(Number(watch("tuitionFee") || 0) * 0.25).toLocaleString()}</p>
                                  </div>
                                  <div className="px-2 py-1 bg-white/50 rounded-lg border border-primary/10">
                                    <p className="text-[8px] font-black text-slate-400 uppercase leading-none">Term 3 (25%)</p>
                                    <p className="text-[11px] font-bold text-primary mt-0.5">₹{(Number(watch("tuitionFee") || 0) * 0.25).toLocaleString()}</p>
                                  </div>
                                </div>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="text-3xl font-black text-slate-900 tracking-tighter">₹{Number(watch("tuitionFee") || 0).toLocaleString()}</p>
                              <p className="text-[10px] text-primary font-black uppercase tracking-widest italic">✓ {watch("paymentType") === "Term-wise" ? "Sovereign Term Split" : "Lump Sum Payment"}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Toggleable fee cards */}
                      {feeCards.length > 0 && (
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Additional Fees — click to select</p>
                          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                            {feeCards.map(({ master, formField }) => {
                              const isSelected = selectedFeeIds.has(master.id);
                              const amount = Number(master.amount || 0);
                              return (
                                <button
                                  key={master.id}
                                  type="button"
                                  onClick={() => toggleFee(master.id, formField, amount)}
                                  className={cn(
                                    "relative p-4 rounded-2xl border-2 text-left transition-all duration-200 w-full",
                                    isSelected
                                      ? "border-primary bg-primary/5 shadow-sm"
                                      : "border-dashed border-slate-200 bg-white hover:border-slate-300 opacity-60 hover:opacity-80"
                                  )}
                                >
                                  {isSelected && (
                                    <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                                      <CheckCircle2 className="w-3 h-3 text-white" />
                                    </div>
                                  )}
                                  <p className="text-[13px] font-bold text-slate-800 leading-tight pr-6">{master.name}</p>
                                  <div className="flex items-center gap-1.5 mt-1.5">
                                    <span className={cn("text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-wide", typeColor[master.type] || "bg-slate-100 text-slate-500")}>{master.type}</span>
                                    {master.isOneTime && <span className="text-[9px] bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full font-black uppercase">1×</span>}
                                    {master.isRefundable && <span className="text-[9px] bg-green-100 text-green-600 px-2 py-0.5 rounded-full font-black uppercase">Refund</span>}
                                  </div>
                                  <p className={cn("text-xl font-black mt-2", isSelected ? "text-primary" : "text-slate-400")}>₹{amount.toLocaleString()}</p>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Running Total */}
                      <div className="mt-4 p-4 rounded-2xl bg-slate-900 flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Selected Total</p>
                          <p className="text-[11px] text-slate-500 mt-0.5">{selectedFeeIds.size + (tuitionMaster ? 1 : 0)} fee{selectedFeeIds.size !== 0 ? 's' : ''} selected</p>
                        </div>
                        <p className="text-3xl font-black text-white">₹{totalSelected.toLocaleString()}</p>
                      </div>
                    </div>
                  );
                })()}

                {/* Discounts */}
                <div>
                  <p className="text-[10px] font-bold text-emerald-400/70 uppercase tracking-wider mb-2">Discounts</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <Field label="Discount 1" error={errors.discountId1?.message}>
                      <select {...register("discountId1")} className={selectCls}>
                        <option value="">No Discount</option>
                        <option value="d_scholar">Merit Scholar 25%</option>
                        <option value="d_staff">Staff Ward 50%</option>
                        <option value="d_sibling">Sibling Discount 10%</option>
                      </select>
                    </Field>
                    <Field label="Reason" error={errors.discountReason1?.message} className="sm:col-span-2">
                      <input {...register("discountReason1")} placeholder="Reason" className={inputCls} />
                    </Field>
                  </div>
                </div>
              </div>
            )}

            {/* ─── STEP 6: More Info ─── */}
            {currentStep === 6 && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <Info className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 tracking-tight">More Information</h3>
                    <p className="text-slate-500 text-sm font-medium">Health records, bank details, and references</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  <Field label="Admission Type *" error={errors.admissionType?.message}>
                    <select {...register("admissionType")} className={selectCls}>
                      <option value="New">New Admission</option>
                      <option value="Transfer">Transfer</option>
                    </select>
                  </Field>
                  <Field label="Boarding Type *" error={errors.boardingType?.message}>
                    <select {...register("boardingType")} className={selectCls}>
                      <option value="Day Scholar">Day Scholar</option>
                      <option value="Hostel">Hostel</option>
                    </select>
                  </Field>
                  <Field label="Medical Record" error={errors.medicalConditions?.message} className="lg:col-span-2">
                    <input {...register("medicalConditions")} placeholder="Medical Conditions" className={inputCls} />
                  </Field>
                  <Field label="Allergies" error={errors.allergies?.message}>
                    <input {...register("allergies")} placeholder="Allergies" className={inputCls} />
                  </Field>
                  <Field label="Bank Account" error={errors.bankAccountName?.message} className="lg:col-span-2">
                    <input {...register("bankAccountName")} placeholder="Account Name" className={inputCls} />
                  </Field>
                  <Field label="Account Number" error={errors.bankAccountNumber?.message} className="lg:col-span-2">
                    <input {...register("bankAccountNumber")} placeholder="Account Number" className={inputCls} />
                  </Field>
                  <Field label="IFSC Code" error={errors.bankIfscCode?.message}>
                    <input {...register("bankIfscCode")} placeholder="IFSC" className={inputCls} />
                  </Field>
                  <Field label="Referred By" error={errors.reference?.message} className="lg:col-span-2">
                    <input {...register("reference")} placeholder="Name" className={inputCls} />
                  </Field>
                </div>
              </div>
            )}

            {/* ─── STEP 7: Review ─── */}
            {currentStep === 7 && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 tracking-tight">Final Review</h3>
                    <p className="text-slate-500 text-sm font-medium">Verify all information before completing admission</p>
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
                  <p className="text-xs text-amber-800 font-bold flex items-center gap-2">
                    <Info className="w-4 h-4" /> 
                    PRO TIP: See a mistake? Just click on any detail below to jump back and fix it!
                  </p>
                </div>

                <StudentAdmissionSummary 
                  studentData={watch()} 
                  isReviewMode={true}
                  onEditStep={(stepId) => setCurrentStep(stepId)}
                />

                {/* 🔒 Institutional Safety Lock */}
                <div className="p-6 rounded-3xl border-2 border-primary/20 bg-primary/5 flex items-start gap-4">
                  <div className="pt-1">
                    <input 
                      type="checkbox" 
                      id="confirm-review"
                      checked={reviewConfirmed}
                      onChange={(e) => setReviewConfirmed(e.target.checked)}
                      className="w-5 h-5 rounded-lg border-2 border-primary/30 text-primary focus:ring-primary/20 transition-all cursor-pointer"
                    />
                  </div>
                  <label htmlFor="confirm-review" className="cursor-pointer">
                    <p className="text-sm font-black text-slate-800 tracking-tight">I have verified all student information</p>
                    <p className="text-[11px] text-slate-500 font-medium leading-relaxed mt-1">
                      By checking this, I confirm that the Aadhaar details, Academic Year, and Financial Ledger have been cross-verified with official documents.
                    </p>
                  </label>
                </div>

                <div className="bg-violet-500/10 border border-violet-500/30 rounded-xl p-4">
                  <p className="text-xs text-violet-700 font-bold">
                    ✓ By submitting, a Student ID (VR-[BRANCH]-STU-XXXXX) and Ledger will be created.
                  </p>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* ─── Navigation & Actions ─── */}
        <div className="mt-12 flex justify-between items-center py-6">
          {formError && (
            <div className="flex items-center gap-2 text-rose-500 bg-rose-50 px-4 py-2 rounded-xl border border-rose-100 text-xs font-bold animate-shake">
              <AlertCircle className="w-4 h-4" />
              <span>{formError}</span>
            </div>
          )}

          <div className="flex items-center gap-4 ml-auto">
            {currentStep > 1 && (
              <button
                type="button"
                onClick={prevStep}
                disabled={isSubmitting}
                className="flex items-center gap-2 px-6 py-3 text-sm font-bold rounded-2xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all disabled:opacity-30"
              >
                Previous
              </button>
            )}

            {currentStep < steps.length ? (
              <button
                type="button"
                onClick={nextStep}
                disabled={!!duplicateAadhaar}
                className={cn(
                  "flex items-center gap-2 px-8 py-3 text-sm font-bold rounded-2xl bg-primary text-white shadow-lg shadow-primary/25 hover:translate-x-1 transition-all disabled:opacity-30",
                  duplicateAadhaar && "bg-rose-500 shadow-rose-500/25"
                )}
              >
                {duplicateAadhaar ? "Aadhaar Found" : "Next"} <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={isSubmitting || !!duplicateAadhaar || !reviewConfirmed}
                className="flex items-center gap-2 px-10 py-3 text-sm font-bold rounded-2xl bg-primary text-white shadow-lg shadow-primary/25 hover:scale-105 transition-all disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed"
              >
                {isSubmitting ? "Processing..." : "Finish & Admission"} <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* 🪄 PRO MAGIC: Autofill (Dev Only) */}
          {process.env.NODE_ENV === "development" && (
            <div className="absolute left-1/2 -translate-x-1/2 bottom-8">
               <button
                 type="button"
                 onClick={handleDevAutofill}
                 className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-500/20 hover:scale-110 active:scale-95 transition-all border border-white/20 whitespace-nowrap"
               >
                 <Sparkles className="w-3 h-3" />
                 Magic Autofill
               </button>
            </div>
          )}
        </div>
      </form>

      {/* Extreme Debug View: Only visible in Dev / When errors exist */}
      {Object.keys(errors).length > 0 && (
        <div className="mt-8 bg-rose-500/5 border border-rose-500/20 rounded-2xl p-6 shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4 text-rose-500" />
            </div>
            <div>
              <p className="text-xs font-black text-rose-500 uppercase tracking-widest">Elite Debug Tracker</p>
              <p className="text-[10px] text-rose-400 font-medium">The following {Object.keys(errors).length} fields are blocking your 2026-27 admission:</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.keys(errors).map((field) => (
              <span key={field} className="px-3 py-1 bg-rose-500/10 text-rose-500 rounded-lg text-[10px] font-bold border border-rose-500/20 shadow-sm animate-pulse">
                {field}
              </span>
            ))}
          </div>
          <p className="mt-4 text-[10px] text-slate-400 font-medium italic">
            Note: If you click "Finish" and nothing happens, check the console (F12) for server errors.
          </p>
        </div>
      )}
    </div>
  );
}
