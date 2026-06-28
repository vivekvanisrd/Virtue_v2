"use client";

import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  ShieldCheck,
  Eye,
  EyeOff,
  Lock,
  Loader2,
  CheckCircle2,
  User,
  Mail,
  Phone,
  Calendar,
  UserCircle,
  MapPin,
  CreditCard,
  Home,
  ArrowLeft,
  ArrowRight,
  Check,
  HelpCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  changePasswordAction,
  checkUsernameAvailabilityAction,
  getCurrentStaffOnboardingDetailsAction
} from "@/lib/actions/change-password-action";

// Helper for generating username suggestions
function generateSuggestions(first: string, last: string): string[] {
  const cleanFirst = first.toLowerCase().replace(/[^a-z0-9]/g, "");
  const cleanLast = last.toLowerCase().replace(/[^a-z0-9]/g, "");
  
  if (!cleanFirst) return [];
  
  const list = [
    cleanFirst,
    cleanLast ? `${cleanFirst}_${cleanLast}` : null,
    cleanLast ? `${cleanFirst}.${cleanLast}` : null,
    cleanLast ? `${cleanFirst.charAt(0)}${cleanLast}` : null,
  ].filter((s): s is string => !!s);
  
  return Array.from(new Set(list));
}

// Tooltip Component
const Tooltip = ({ text }: { text: string }) => {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative inline-flex items-center ml-1">
      <button
        type="button"
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        onClick={() => setVisible(!visible)}
        onFocus={() => setVisible(true)}
        onBlur={() => setVisible(false)}
        className="w-4 h-4 rounded-full bg-slate-100 hover:bg-indigo-100 text-slate-400 hover:text-indigo-600 flex items-center justify-center text-[10px] font-black transition-all cursor-help focus:outline-none shrink-0"
        aria-label="More Information"
      >
        <HelpCircle className="w-2.5 h-2.5" />
      </button>
      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 5 }}
            className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 p-3 bg-slate-800 text-white text-[10px] leading-relaxed rounded-xl shadow-xl font-semibold pointer-events-none text-center"
          >
            {text}
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-[5px] border-transparent border-t-slate-800" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Form values type
type FormData = {
  // Step 1
  username: string;
  newPassword?: string;
  confirmPassword?: string;
  // Step 2
  firstName: string;
  lastName: string;
  middleName: string;
  phone: string;
  email: string;
  dob: string;
  gender: string;
  address: string;
  // Step 3
  aadhaarNumber: string;
  panNumber: string;
  accountName: string;
  accountNumber: string;
  ifscCode: string;
  bankName: string;
};

export default function ChangePasswordPage() {
  const [step, setStep] = useState(1);
  const [isBypassed, setIsBypassed] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  // Suggestions state
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [availableSuggestions, setAvailableSuggestions] = useState<Record<string, boolean>>({});
  const [checkingSuggestions, setCheckingSuggestions] = useState(false);

  const router = useRouter();

  // Full validation schema
  const schema = useMemo(() => {
    if (isBypassed) {
      return z.object({
        newPassword: z.string().min(8, "Password must be at least 8 characters"),
        confirmPassword: z.string().min(8, "Please confirm your password"),
      }).refine((d) => d.newPassword === d.confirmPassword, {
        message: "Passwords do not match",
        path: ["confirmPassword"],
      });
    }
    return z.object({
      // Step 1
      username: z.string()
        .min(3, "Username must be at least 3 characters")
        .max(30, "Username must be under 30 characters")
        .regex(/^[a-zA-Z0-9_\-]+$/, "Only letters, numbers, underscores, and hyphens allowed (no spaces)")
        .transform(val => val.toLowerCase().trim()),
      newPassword: z.string().min(8, "Password must be at least 8 characters"),
      confirmPassword: z.string().min(8, "Please confirm your password"),

      // Step 2
      firstName: z.string().min(1, "First Name is required").trim(),
      lastName: z.string().min(1, "Last Name is required").trim(),
      middleName: z.string().optional().default(""),
      phone: z.string().regex(/^\d{10}$/, "Phone number must be exactly 10 digits"),
      email: z.string().email("Invalid email format").optional().or(z.literal("")),
      dob: z.string().min(1, "Date of Birth is required"),
      gender: z.string().min(1, "Gender selection is required"),
      address: z.string().min(1, "Residential Address is required").trim(),

      // Step 3
      aadhaarNumber: z.string().regex(/^\d{12}$/, "Aadhaar number must be exactly 12 digits"),
      panNumber: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i, "Invalid PAN format (e.g. ABCDE1234F)").optional().or(z.literal("")),
      accountName: z.string().min(1, "Account Holder Name is required").trim(),
      accountNumber: z.string().min(5, "Account number must be at least 5 digits"),
      ifscCode: z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/i, "Invalid IFSC format (e.g. SBIN0001234)"),
      bankName: z.string().min(1, "Bank Name is required").trim(),
    }).refine((d) => d.newPassword === d.confirmPassword, {
      message: "Passwords do not match",
      path: ["confirmPassword"],
    });
  }, [isBypassed]);

  const {
    register,
    handleSubmit,
    trigger,
    setValue,
    getValues,
    formState: { errors, isValid }
  } = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    mode: "onChange",
    defaultValues: {
      username: "",
      newPassword: "",
      confirmPassword: "",
      firstName: "",
      lastName: "",
      middleName: "",
      phone: "",
      email: "",
      dob: "",
      gender: "",
      address: "",
      aadhaarNumber: "",
      panNumber: "",
      accountName: "",
      accountNumber: "",
      ifscCode: "",
      bankName: "",
    }
  });

  // Generate and check suggestions availability
  const handleGenerateSuggestions = async (first: string, last: string) => {
    if (!first) return;
    setCheckingSuggestions(true);
    const list = generateSuggestions(first, last);
    setSuggestions(list);

    const res = await checkUsernameAvailabilityAction(list);
    if (res.success && res.results) {
      const mapping: Record<string, boolean> = {};
      res.results.forEach((r: any) => {
        mapping[r.username] = r.available;
      });
      setAvailableSuggestions(mapping);
    }
    setCheckingSuggestions(false);
  };

  // Load current details
  useEffect(() => {
    async function init() {
      const res = await getCurrentStaffOnboardingDetailsAction();
      if (res.success && res.data) {
        const d = res.data;
        setValue("firstName", d.firstName);
        setValue("lastName", d.lastName);
        setValue("middleName", d.middleName);
        setValue("phone", d.phone);
        setValue("email", d.email);
        setValue("dob", d.dob);
        setValue("gender", d.gender);
        setValue("address", d.address);
        setValue("username", d.username);
        setValue("aadhaarNumber", d.statutory.aadhaarNumber);
        setValue("panNumber", d.statutory.panNumber);
        setValue("accountName", d.bank.accountName || d.firstName + " " + d.lastName);
        setValue("accountNumber", d.bank.accountNumber);
        setValue("ifscCode", d.bank.ifscCode);
        setValue("bankName", d.bank.bankName);

        if (d.firstName) {
          handleGenerateSuggestions(d.firstName, d.lastName);
        }
      } else {
        // Platform admin or Developer bypasses full profile setup
        setIsBypassed(true);
      }
      setInitialLoading(false);
    }
    init();
  }, [setValue]);

  // Handle name input blurs to update username suggestions dynamically
  const handleNameBlur = () => {
    const first = getValues("firstName");
    const last = getValues("lastName");
    if (first) {
      handleGenerateSuggestions(first, last);
    }
  };

  const nextStep = async () => {
    if (step === 1) {
      const valid = await trigger(["username", "newPassword", "confirmPassword"]);
      if (valid) setStep(2);
    } else if (step === 2) {
      const valid = await trigger(["firstName", "lastName", "middleName", "phone", "email", "dob", "gender", "address"]);
      if (valid) setStep(3);
    }
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    setErrorText(null);

    const payload = isBypassed ? {
      newPassword: data.newPassword,
      confirmPassword: data.confirmPassword,
    } : {
      username: data.username,
      newPassword: data.newPassword,
      confirmPassword: data.confirmPassword,
      onboarding: {
        firstName: data.firstName,
        lastName: data.lastName,
        middleName: data.middleName || undefined,
        phone: data.phone,
        email: data.email || undefined,
        dob: data.dob,
        gender: data.gender,
        address: data.address,
        aadhaarNumber: data.aadhaarNumber,
        panNumber: data.panNumber || undefined,
        accountName: data.accountName,
        accountNumber: data.accountNumber,
        ifscCode: data.ifscCode,
        bankName: data.bankName,
      }
    };

    const res = await changePasswordAction(payload);
    if (res.success) {
      setDone(true);
      setTimeout(() => router.push("/dashboard"), 2000);
    } else {
      setErrorText(res.error || "Onboarding failed. Please review your details and try again.");
    }
    setIsLoading(false);
  };

  if (initialLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mx-auto" />
          <p className="text-sm font-black text-slate-600 uppercase tracking-widest">Loading Security Settings...</p>
        </div>
      </main>
    );
  }

  if (done) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#f8fafc] p-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-[32px] p-12 shadow-2xl text-center max-w-md w-full border border-slate-100"
        >
          <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-black text-slate-800 mb-2">Onboarding Completed!</h2>
          <p className="text-slate-500 text-sm">Your security details have been saved. Taking you to your dashboard...</p>
        </motion.div>
      </main>
    );
  }

  const steps = [
    { id: 1, name: "Account Details", desc: "Username & Password" },
    { id: 2, name: "Personal Profile", desc: "Contact & Bio details" },
    { id: 3, name: "Statutory & Bank", desc: "KYC & Salary Account" },
  ];

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#f8fafc] p-4 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-100 rounded-full blur-[120px] opacity-60 pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-200 rounded-full blur-[120px] opacity-40 pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className={cn(
          "relative z-10 bg-white rounded-[32px] shadow-2xl border border-slate-100 w-full overflow-hidden transition-all duration-300",
          isBypassed ? "max-w-md" : "max-w-2xl"
        )}
      >
        {/* Top Header Card */}
        <div className="bg-indigo-600 px-10 py-8 text-white">
          <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mb-4 backdrop-blur-md">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-black tracking-tight leading-tight">Activate Your Account</h1>
          <p className="text-indigo-200 text-sm mt-1">
            {isBypassed
              ? "Update your developer/platform admin security password to complete account activation."
              : "Please complete your security profile and verify your payroll records to access your portal."}
          </p>
        </div>

        {/* Wizard Progress Steps Indicator */}
        {!isBypassed && (
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-10 py-6">
            {steps.map((s, idx) => (
              <React.Fragment key={s.id}>
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300",
                      step === s.id
                        ? "bg-indigo-600 text-white ring-4 ring-indigo-100"
                        : step > s.id
                        ? "bg-emerald-500 text-white"
                        : "bg-slate-200 text-slate-500"
                    )}
                  >
                    {step > s.id ? <Check className="w-4 h-4" /> : s.id}
                  </div>
                  <div className="hidden sm:block">
                    <p
                      className={cn(
                        "text-xs font-bold transition-all",
                        step === s.id ? "text-indigo-900" : "text-slate-500"
                      )}
                    >
                      {s.name}
                    </p>
                    <p className="text-[10px] text-slate-400 font-medium">{s.desc}</p>
                  </div>
                </div>
                {idx < steps.length - 1 && (
                  <div
                    className={cn(
                      "flex-1 h-0.5 mx-4 transition-all duration-500",
                      step > s.id ? "bg-emerald-500" : "bg-slate-200"
                    )}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        )}

        <div className="px-10 py-8 space-y-6">
          {errorText && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="text-sm text-red-600 font-semibold">{errorText}</p>
            </div>
          )}

          {/* Form Step Contents */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" autoComplete="off">
            <AnimatePresence mode="wait">
              {/* STEP 1: SECURITY & USERNAME */}
              {step === 1 && (
                <motion.div
                  key="step-1"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  {!isBypassed && (
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                        <User className="w-3.5 h-3.5" /> System Username
                        <span className="text-red-500">*</span>
                        <Tooltip text="Your unique login ID. Click a suggestion below to auto-fill, or enter your own custom username." />
                      </label>
                      <input
                        {...register("username")}
                        type="text"
                        autoComplete="new-username"
                        placeholder="e.g. naga_mani"
                        className={cn(
                          "w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-xl outline-none focus:border-indigo-500 focus:bg-white transition-all font-semibold text-slate-800",
                          errors.username && "border-red-400"
                        )}
                      />
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                        Choose a custom login username (letters, numbers, underscores, and hyphens only).
                      </p>

                      {/* Suggestions list */}
                      {suggestions.length > 0 && (
                        <div className="mt-3 bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-2">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
                            Available suggestions
                            <Tooltip text="Dynamic options generated based on your name. Click one to fill the username field. You can edit it as you like!" />
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {checkingSuggestions ? (
                              <div className="flex items-center gap-1.5 py-1 text-slate-400 text-xs font-semibold">
                                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Checking availability...
                              </div>
                            ) : (
                              suggestions.map((sug) => {
                                const avail = availableSuggestions[sug] ?? false;
                                return (
                                  <button
                                    key={sug}
                                    type="button"
                                    disabled={!avail}
                                    onClick={() => setValue("username", sug, { shouldValidate: true })}
                                    className={cn(
                                      "px-3.5 py-1.5 rounded-full text-xs font-bold transition-all border",
                                      avail
                                        ? "bg-white border-slate-200 text-slate-700 hover:border-indigo-500 hover:text-indigo-600 hover:shadow-sm active:scale-95"
                                        : "bg-red-50/50 border-red-100 text-red-300 cursor-not-allowed"
                                    )}
                                  >
                                    {sug} {avail ? "✓" : "❌"}
                                  </button>
                                );
                              })
                            )}
                          </div>
                        </div>
                      )}

                      {errors.username && (
                        <p className="text-xs text-red-500 font-bold mt-1">{errors.username.message}</p>
                      )}
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                      <Lock className="w-3.5 h-3.5" /> New Password
                      <span className="text-red-500">*</span>
                      <Tooltip text="Create a strong account password. Must contain at least 8 characters." />
                    </label>
                    <div className="relative">
                      <input
                        {...register("newPassword")}
                        type={showNew ? "text" : "password"}
                        placeholder="Minimum 8 characters"
                        className={cn(
                          "w-full px-5 py-4 pr-12 bg-slate-50 border-2 border-slate-100 rounded-xl outline-none focus:border-indigo-500 focus:bg-white transition-all font-semibold text-slate-800",
                          errors.newPassword && "border-red-400"
                        )}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNew(!showNew)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {errors.newPassword && (
                      <p className="text-xs text-red-500 font-bold">{errors.newPassword.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                      <Lock className="w-3.5 h-3.5" /> Confirm Password
                      <span className="text-red-500">*</span>
                      <Tooltip text="Verify your new password. Must match the new password field exactly." />
                    </label>
                    <div className="relative">
                      <input
                        {...register("confirmPassword")}
                        type={showConfirm ? "text" : "password"}
                        placeholder="Repeat your password"
                        className={cn(
                          "w-full px-5 py-4 pr-12 bg-slate-50 border-2 border-slate-100 rounded-xl outline-none focus:border-indigo-500 focus:bg-white transition-all font-semibold text-slate-800",
                          errors.confirmPassword && "border-red-400"
                        )}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm(!showConfirm)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {errors.confirmPassword && (
                      <p className="text-xs text-red-500 font-bold">{errors.confirmPassword.message}</p>
                    )}
                  </div>
                </motion.div>
              )}

              {/* STEP 2: PERSONAL PROFILE */}
              {step === 2 && !isBypassed && (
                <motion.div
                  key="step-2"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-5"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                        First Name
                        <span className="text-red-500">*</span>
                        <Tooltip text="Your official legal first name as listed on governmental and employment records." />
                      </label>
                      <input
                        {...register("firstName")}
                        type="text"
                        onBlur={handleNameBlur}
                        placeholder="First Name"
                        className={cn(
                          "w-full px-4 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-xl outline-none focus:border-indigo-500 focus:bg-white transition-all font-semibold text-slate-800",
                          errors.firstName && "border-red-400"
                        )}
                      />
                      {errors.firstName && (
                        <p className="text-xs text-red-500 font-bold">{errors.firstName.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                        Middle Name
                        <Tooltip text="Optional. Your legal middle name, if applicable." />
                      </label>
                      <input
                        {...register("middleName")}
                        type="text"
                        placeholder="Middle Name"
                        className="w-full px-4 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-xl outline-none focus:border-indigo-500 focus:bg-white transition-all font-semibold text-slate-800"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                        Last Name
                        <span className="text-red-500">*</span>
                        <Tooltip text="Your official legal last name or family surname." />
                      </label>
                      <input
                        {...register("lastName")}
                        type="text"
                        onBlur={handleNameBlur}
                        placeholder="Last Name"
                        className={cn(
                          "w-full px-4 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-xl outline-none focus:border-indigo-500 focus:bg-white transition-all font-semibold text-slate-800",
                          errors.lastName && "border-red-400"
                        )}
                      />
                      {errors.lastName && (
                        <p className="text-xs text-red-500 font-bold">{errors.lastName.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5" /> Mobile Number
                        <span className="text-red-500">*</span>
                        <Tooltip text="Active 10-digit mobile number. Required to replace your placeholder account phone." />
                      </label>
                      <input
                        {...register("phone")}
                        type="tel"
                        maxLength={10}
                        placeholder="10-digit mobile number"
                        className={cn(
                          "w-full px-4 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-xl outline-none focus:border-indigo-500 focus:bg-white transition-all font-semibold text-slate-800",
                          errors.phone && "border-red-400"
                        )}
                      />
                      {errors.phone && (
                        <p className="text-xs text-red-500 font-bold">{errors.phone.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5" /> Email Address
                        <Tooltip text="Optional. Used for announcements, reporting, and secure password recovery." />
                      </label>
                      <input
                        {...register("email")}
                        type="email"
                        placeholder="name@virtueschool.in"
                        className={cn(
                          "w-full px-4 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-xl outline-none focus:border-indigo-500 focus:bg-white transition-all font-semibold text-slate-800",
                          errors.email && "border-red-400"
                        )}
                      />
                      {errors.email && (
                        <p className="text-xs text-red-500 font-bold">{errors.email.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" /> Date of Birth
                        <span className="text-red-500">*</span>
                        <Tooltip text="Your official date of birth. Required for school records, payroll setup, and statutory reporting." />
                      </label>
                      <input
                        {...register("dob")}
                        type="date"
                        className={cn(
                          "w-full px-4 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-xl outline-none focus:border-indigo-500 focus:bg-white transition-all font-semibold text-slate-800",
                          errors.dob && "border-red-400"
                        )}
                      />
                      {errors.dob && (
                        <p className="text-xs text-red-500 font-bold">{errors.dob.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                        <UserCircle className="w-3.5 h-3.5" /> Gender
                        <span className="text-red-500">*</span>
                        <Tooltip text="Select your official gender identity for school registry profiles." />
                      </label>
                      <select
                        {...register("gender")}
                        className={cn(
                          "w-full px-4 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-xl outline-none focus:border-indigo-500 focus:bg-white transition-all font-semibold text-slate-800",
                          errors.gender && "border-red-400"
                        )}
                      >
                        <option value="">Choose Gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                      {errors.gender && (
                        <p className="text-xs text-red-500 font-bold">{errors.gender.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" /> Residential Address
                      <span className="text-red-500">*</span>
                      <Tooltip text="Your current physical residential address for communication and administrative records." />
                    </label>
                    <textarea
                      {...register("address")}
                      rows={3}
                      placeholder="Street name, Building/House No, City, Pincode"
                      className={cn(
                        "w-full px-4 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-xl outline-none focus:border-indigo-500 focus:bg-white transition-all font-semibold text-slate-800 resize-none",
                        errors.address && "border-red-400"
                      )}
                    />
                    {errors.address && (
                      <p className="text-xs text-red-500 font-bold">{errors.address.message}</p>
                    )}
                  </div>
                </motion.div>
              )}

              {/* STEP 3: STATUTORY & BANK DETAILS */}
              {step === 3 && !isBypassed && (
                <motion.div
                  key="step-3"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-5"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                        <CreditCard className="w-3.5 h-3.5" /> Aadhaar Card Number
                        <span className="text-red-500">*</span>
                        <Tooltip text="12-digit Unique Identification Number (UIDAI) for KYC and statutory verification." />
                      </label>
                      <input
                        {...register("aadhaarNumber")}
                        type="text"
                        maxLength={12}
                        placeholder="12-digit Aadhaar"
                        className={cn(
                          "w-full px-4 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-xl outline-none focus:border-indigo-500 focus:bg-white transition-all font-semibold text-slate-800",
                          errors.aadhaarNumber && "border-red-400"
                        )}
                      />
                      {errors.aadhaarNumber && (
                        <p className="text-xs text-red-500 font-bold">{errors.aadhaarNumber.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                        <CreditCard className="w-3.5 h-3.5" /> PAN Card Number
                        <Tooltip text="Optional. 10-character alphanumeric Permanent Account Number (PAN) issued by IT Department." />
                      </label>
                      <input
                        {...register("panNumber")}
                        type="text"
                        maxLength={10}
                        placeholder="e.g. ABCDE1234F"
                        className={cn(
                          "w-full px-4 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-xl outline-none focus:border-indigo-500 focus:bg-white transition-all font-semibold text-slate-800 uppercase",
                          errors.panNumber && "border-red-400"
                        )}
                      />
                      {errors.panNumber && (
                        <p className="text-xs text-red-500 font-bold">{errors.panNumber.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-4 space-y-4">
                    <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                      <Home className="w-4 h-4 text-indigo-500" /> Bank Account Credentials
                      <Tooltip text="All salary deposits and payroll advances will be routed through this verified bank account." />
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                          Bank Name
                          <span className="text-red-500">*</span>
                          <Tooltip text="Official full name of the banking institution (e.g. State Bank of India, HDFC Bank)." />
                        </label>
                        <input
                          {...register("bankName")}
                          type="text"
                          placeholder="e.g. State Bank of India"
                          className={cn(
                            "w-full px-4 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-xl outline-none focus:border-indigo-500 focus:bg-white transition-all font-semibold text-slate-800",
                            errors.bankName && "border-red-400"
                          )}
                        />
                        {errors.bankName && (
                          <p className="text-xs text-red-500 font-bold">{errors.bankName.message}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                          Account Holder Name
                          <span className="text-red-500">*</span>
                          <Tooltip text="The beneficiary name associated with this bank account. Must match official records." />
                        </label>
                        <input
                          {...register("accountName")}
                          type="text"
                          placeholder="Beneficiary Name"
                          className={cn(
                            "w-full px-4 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-xl outline-none focus:border-indigo-500 focus:bg-white transition-all font-semibold text-slate-800",
                            errors.accountName && "border-red-400"
                          )}
                        />
                        {errors.accountName && (
                          <p className="text-xs text-red-500 font-bold">{errors.accountName.message}</p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                          Account Number
                          <span className="text-red-500">*</span>
                          <Tooltip text="Verified bank savings or current account number where transactions will be deposited." />
                        </label>
                        <input
                          {...register("accountNumber")}
                          type="password"
                          autoComplete="new-password"
                          placeholder="Bank Account Number"
                          className={cn(
                            "w-full px-4 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-xl outline-none focus:border-indigo-500 focus:bg-white transition-all font-semibold text-slate-800",
                            errors.accountNumber && "border-red-400"
                          )}
                        />
                        {errors.accountNumber && (
                          <p className="text-xs text-red-500 font-bold">{errors.accountNumber.message}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                          IFSC Code
                          <span className="text-red-500">*</span>
                          <Tooltip text="11-character Indian Financial System Code (IFSC) unique to your bank branch." />
                        </label>
                        <input
                          {...register("ifscCode")}
                          type="text"
                          maxLength={11}
                          placeholder="e.g. SBIN0001234"
                          className={cn(
                            "w-full px-4 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-xl outline-none focus:border-indigo-500 focus:bg-white transition-all font-semibold text-slate-800 uppercase",
                            errors.ifscCode && "border-red-400"
                          )}
                        />
                        {errors.ifscCode && (
                          <p className="text-xs text-red-500 font-bold">{errors.ifscCode.message}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Navigation Buttons Row */}
            <div className="flex gap-4 pt-4">
              {step > 1 && !isBypassed && (
                <button
                  type="button"
                  onClick={prevStep}
                  className="w-1/3 py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] uppercase tracking-wide"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
              )}

              {step < 3 && !isBypassed ? (
                <button
                  type="button"
                  onClick={nextStep}
                  className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] uppercase tracking-wide shadow-lg shadow-indigo-100"
                >
                  Next Section <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isLoading || !isValid}
                  className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-base shadow-lg shadow-emerald-100 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-30 disabled:grayscale uppercase tracking-wide"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : isBypassed ? (
                    "Activate Account"
                  ) : (
                    "Complete Onboarding"
                  )}
                </button>
              )}
            </div>
          </form>

          <p className="text-center text-[10px] text-slate-400 font-black uppercase tracking-widest mt-6">
            PaVa-EDUX · Secure Onboarding Protocol
          </p>
        </div>
      </motion.div>
    </main>
  );
}
