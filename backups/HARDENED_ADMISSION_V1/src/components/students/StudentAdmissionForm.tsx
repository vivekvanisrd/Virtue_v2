"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { studentAdmissionSchema, StudentAdmissionData } from "@/types/student";
import { submitAdmissionAction } from "@/lib/actions/student-actions";
import { getClassesAction, getSectionsAction } from "@/lib/actions/academic-actions";
import { getFeeStructures } from "@/lib/actions/fee-actions";
import { 
  User, 
  Users, 
  BookOpen, 
  Wallet, 
  CheckCircle2, 
  ChevronRight, 
  ChevronLeft, 
  ShieldCheck,
  Zap,
  Phone,
  MessageSquare
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

// 🏛️ SOVEREIGN UI INLINE: Replacing missing UI components with native Tailwind standards
const Button = ({ children, className, ...props }: any) => (
  <button 
    className={cn("inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50", className)} 
    {...props}
  >
    {children}
  </button>
);

const Card = ({ children, className, ...props }: any) => (
  <div className={cn("rounded-xl border bg-card text-card-foreground shadow", className)} {...props}>
    {children}
  </div>
);

const Input = React.forwardRef<HTMLInputElement, any>(({ className, ...props }, ref) => (
  <input 
    ref={ref}
    className={cn("flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50", className)} 
    {...props} 
  />
));
Input.displayName = "Input";

const Label = ({ children, className, ...props }: any) => (
  <label className={cn("text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70", className)} {...props}>
    {children}
  </label>
);

const Separator = ({ className }: any) => (
  <div className={cn("shrink-0 bg-border h-[1px] w-full", className)} />
);

const STEPS = [
  { id: "identity", label: "Identity", icon: User },
  { id: "lineage", label: "Lineage", icon: Users },
  { id: "academic", label: "Academic", icon: BookOpen },
  { id: "financial", label: "Financial", icon: Wallet },
  { id: "review", label: "Review & Seal", icon: ShieldCheck },
];

/**
 * 🎓 SOVEREIGN STUDENT ADMISSION HUB (v2.3)
 * 
 * High-fidelity, multi-step intake engine with real-time financial math.
 */
export default function StudentAdmissionForm() {
    const [currentStep, setCurrentStep] = useState(0);
    const [classes, setClasses] = useState<any[]>([]);
    const [sections, setSections] = useState<any[]>([]);
    const [feeStructures, setFeeStructures] = useState<any[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const {
        register,
        handleSubmit,
        watch,
        setValue,
        formState: { errors },
        trigger
    } = useForm<StudentAdmissionData>({
        resolver: zodResolver(studentAdmissionSchema),
        defaultValues: {
            admissionDate: new Date().toISOString().split('T')[0],
            paymentType: "Term-wise",
            admissionType: "New",
            boardingType: "Day Scholar",
            tuitionFee: 0,
            admissionFee: 0,
            libraryFee: 0,
            labFee: 0,
            sportsFee: 0,
            developmentFee: 0,
            examFee: 0,
            computerFee: 0,
            miscellaneousFee: 0,
            cautionDeposit: 0,
            transportFee: 0,
            branchId: "MAIN", // Default for Genesis
            academicYearId: "2026-27"
        }
    });

    const watchedClassId = watch("classId");
    const watchedFees = watch([
        "tuitionFee", "admissionFee", "libraryFee", "labFee", "sportsFee",
        "developmentFee", "examFee", "computerFee", "miscellaneousFee", "cautionDeposit"
    ]);

    // 💰 Real-time Financial Calculation
    const totalPayable = useMemo(() => {
        return watchedFees.reduce((sum, fee) => sum + (Number(fee) || 0), 0);
    }, [watchedFees]);

    useEffect(() => {
        const loadFoundations = async () => {
            const cls = await getClassesAction();
            const fees = await getFeeStructures();
            if (cls.success) setClasses(cls.data);
            if (fees.success) setFeeStructures(fees.data);
        };
        loadFoundations();
    }, []);

    useEffect(() => {
        if (watchedClassId) {
            getSectionsAction(watchedClassId).then(res => {
                if (res.success) setSections(res.data);
            });
            // Smart Match: Try to find a fee structure for this class
            const matchingFee = feeStructures.find(f => f.classId === watchedClassId);
            if (matchingFee) {
                // Populate default tuition from template
                setValue("tuitionFee", Number(matchingFee.totalAmount));
                setValue("feeScheduleId", matchingFee.id);
            }
        }
    }, [watchedClassId, feeStructures, setValue]);

    const nextStep = async () => {
        const fields = getFieldsForStep(currentStep);
        const isValid = await trigger(fields as any);
            if (isValid) {
                setCurrentStep(s => Math.min(s + 1, STEPS.length - 1));
                window.scrollTo({ top: 0, behavior: "smooth" });
            }
    };

    const prevStep = () => setCurrentStep(s => Math.max(s - 1, 0));

    const onSubmit = async (data: StudentAdmissionData) => {
        setIsSubmitting(true);
        try {
            const res = await submitAdmissionAction(data);
            if (res.success) {
                alert(`Student Admitted Successfully! Admission #: ${res.data.admissionNumber}`);
                // Redirect or reset
            } else {
                alert(res.error || "Admission failed");
            }
        } catch (e: any) {
            alert("Admission System Error: " + e.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const getFieldsForStep = (stepIdx: number) => {
        switch (stepIdx) {
            case 0: return ["firstName", "lastName", "dateOfBirth", "gender", "aadhaarNumber"];
            case 1: return ["fatherName", "fatherPhone", "whatsappNumber"];
            case 2: return ["classId", "academicYearId", "admissionDate"];
            case 3: return ["tuitionFee"];
            default: return [];
        }
    };

    return (
        <div className="max-w-5xl mx-auto p-4 md:p-8">
            {/* 🏆 Stepper Header */}
            <div className="flex justify-between items-center mb-12 overflow-hidden px-4">
                {STEPS.map((step, idx) => {
                    const Icon = step.icon;
                    const isActive = idx === currentStep;
                    const isCompleted = idx < currentStep;
                    return (
                        <div key={step.id} className="flex flex-col items-center gap-2 relative z-10 w-full group">
                            <motion.div 
                                animate={{ 
                                    scale: isActive ? 1.2 : 1,
                                    backgroundColor: isCompleted ? "#22c55e" : isActive ? "#3b82f6" : "#27272a" 
                                }}
                                className="w-10 h-10 rounded-full flex items-center justify-center text-white shadow-xl"
                            >
                                {isCompleted ? <CheckCircle2 className="w-6 h-6" /> : <Icon className="w-5 h-5" />}
                            </motion.div>
                            <span className={`text-[10px] font-bold uppercase tracking-widest hidden md:block ${isActive ? "text-blue-500" : "text-zinc-500"}`}>
                                {step.label}
                            </span>
                        </div>
                    );
                })}
                <div className="absolute left-0 right-0 top-1/2 h-[2px] bg-zinc-800 -z-0 mx-16 hidden md:block" />
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentStep}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2 }}
                    >
                        <Card className="p-6 md:p-10 bg-zinc-950/40 border-zinc-800 backdrop-blur-2xl rounded-3xl overflow-hidden relative shadow-2xl">
                            {/* Visual Highlights */}
                            <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-500/10 blur-[120px] rounded-full" />
                            <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-emerald-500/5 blur-[120px] rounded-full" />

                            {/* Step Content */}
                            {currentStep === 0 && (
                                <div className="space-y-8">
                                    <header>
                                        <h2 className="text-3xl font-bold text-white mb-2">Student Identity</h2>
                                        <p className="text-zinc-400">Essential bio-data for the Primary Student Registry.</p>
                                    </header>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <Label className="text-zinc-300">First Name <span className="text-red-500">*</span></Label>
                                            <Input {...register("firstName")} className="bg-zinc-900/50 border-zinc-700 h-12" placeholder="e.g. John" />
                                            {errors.firstName && <p className="text-xs text-red-500">{errors.firstName.message}</p>}
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-zinc-300">Last Name <span className="text-red-500">*</span></Label>
                                            <Input {...register("lastName")} className="bg-zinc-900/50 border-zinc-700 h-12" placeholder="e.g. Doe" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-zinc-300">Date of Birth</Label>
                                            <Input {...register("dateOfBirth")} type="date" className="bg-zinc-900/50 border-zinc-700 h-12" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-zinc-300">Gender</Label>
                                            <select 
                                                className="w-full h-12 rounded-xl bg-zinc-900/50 border border-zinc-700 text-white px-4 outline-none focus:ring-2 focus:ring-blue-500/20 appearance-none"
                                                onChange={(e) => setValue("gender", e.target.value)}
                                            >
                                                <option value="">Select Gender</option>
                                                <option value="Male">Male</option>
                                                <option value="Female">Female</option>
                                                <option value="Other">Other</option>
                                            </select>
                                        </div>
                                        <div className="space-y-2 md:col-span-2">
                                            <Label className="text-zinc-300">Aadhaar Number (UIDAI)</Label>
                                            <Input {...register("aadhaarNumber")} className="bg-zinc-900/50 border-zinc-700 h-12 font-mono text-lg tracking-widest text-blue-400" placeholder="0000 0000 0000" />
                                            <p className="text-[10px] text-zinc-500 italic uppercase">System automatically validates uniqueness within the school.</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {currentStep === 1 && (
                                <div className="space-y-8">
                                    <header>
                                        <h2 className="text-3xl font-bold text-white mb-2">Parental Lineage</h2>
                                        <p className="text-zinc-400">Guardian details and the Sovereign Communication Bridge.</p>
                                    </header>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <Label className="text-zinc-300">Father's Name <span className="text-red-500">*</span></Label>
                                            <Input {...register("fatherName")} className="bg-zinc-900/50 border-zinc-700 h-12 text-white" />
                                            {errors.fatherName && <p className="text-xs text-red-500">{errors.fatherName.message}</p>}
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-zinc-300">Father's Phone <span className="text-red-500">*</span></Label>
                                            <div className="relative">
                                                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                                                <Input {...register("fatherPhone")} className="bg-zinc-900/50 border-zinc-700 h-12 pl-12 text-white" />
                                            </div>
                                        </div>
                                        <div className="space-y-2 md:col-span-2 p-6 rounded-2xl bg-emerald-500/5 border border-emerald-500/10">
                                            <div className="flex items-center gap-2 text-emerald-500 mb-2">
                                                <MessageSquare className="w-5 h-5 fill-current" />
                                                <Label className="text-sm font-bold uppercase tracking-wider">Preferred WhatsApp Number</Label>
                                            </div>
                                            <Input {...register("whatsappNumber")} className="bg-zinc-900 border-emerald-500/20 h-12 text-emerald-400 font-bold" placeholder="Primary notification number" />
                                            <p className="text-[10px] text-emerald-500/60 mt-2 italic">Standard: Digital receipts, absence alerts, and fee reminders will be directed here.</p>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-zinc-300">Mother's Name</Label>
                                            <Input {...register("motherName")} className="bg-zinc-900/50 border-zinc-700 h-12 text-white" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-zinc-300">Emergency Contact Phone</Label>
                                            <Input {...register("emergencyContactPhone")} className="bg-zinc-900/50 border-zinc-700 h-12 text-white" />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {currentStep === 2 && (
                                <div className="space-y-8">
                                    <header>
                                        <h2 className="text-3xl font-bold text-white mb-2">Academic Placement</h2>
                                        <p className="text-zinc-400">Defining the student's institutional position.</p>
                                    </header>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <Label className="text-zinc-300">Current Grade (Class) <span className="text-red-500">*</span></Label>
                                            <select 
                                                className="w-full h-12 rounded-xl bg-zinc-900/50 border border-zinc-700 text-white px-4 outline-none focus:ring-2 focus:ring-blue-500/20 appearance-none"
                                                onChange={(e) => setValue("classId", e.target.value)}
                                            >
                                                <option value="">Select Grade</option>
                                                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-zinc-300">Section</Label>
                                            <select 
                                                className="w-full h-12 rounded-xl bg-zinc-900/50 border border-zinc-700 text-white px-4 outline-none focus:ring-2 focus:ring-blue-500/20 appearance-none"
                                                onChange={(e) => setValue("sectionId", e.target.value)}
                                            >
                                                <option value="">Select Section</option>
                                                {sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-zinc-300">Admission Date <span className="text-red-500">*</span></Label>
                                            <Input {...register("admissionDate")} type="date" className="bg-zinc-900/50 border-zinc-700 h-12" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-zinc-300">Admission Type</Label>
                                            <select 
                                                className="w-full h-12 rounded-xl bg-zinc-900/50 border border-zinc-700 text-white px-4 outline-none focus:ring-2 focus:ring-blue-500/20 appearance-none"
                                                onChange={(e) => setValue("admissionType", e.target.value)}
                                                defaultValue="New"
                                            >
                                                <option value="New">New Admission</option>
                                                <option value="Re-Admission">Re-Admission</option>
                                                <option value="Transfer">Transfer</option>
                                            </select>
                                        </div>
                                        <div className="md:col-span-2 grid grid-cols-3 gap-4">
                                            <div className="space-y-2">
                                                <Label className="text-[10px] uppercase font-bold text-zinc-500">STS ID</Label>
                                                <Input {...register("stsId")} className="bg-zinc-900/50 border-zinc-700 h-10 font-mono" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-[10px] uppercase font-bold text-zinc-500">APAAR ID</Label>
                                                <Input {...register("apaarId")} className="bg-zinc-900/50 border-zinc-700 h-10 font-mono" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-[10px] uppercase font-bold text-zinc-500">PEN Number</Label>
                                                <Input {...register("penNumber")} className="bg-zinc-900/50 border-zinc-700 h-10 font-mono" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {currentStep === 3 && (
                                <div className="space-y-8">
                                    <header className="flex justify-between items-start">
                                        <div>
                                            <h2 className="text-3xl font-bold text-white mb-2">Financial Contract</h2>
                                            <p className="text-zinc-400">Institutional baseline fees and billing schedules.</p>
                                        </div>
                                        <div className="text-right p-4 rounded-2xl bg-blue-600/10 border border-blue-500/20">
                                            <p className="text-xs text-blue-400 font-bold uppercase tracking-widest mb-1">Total Payable</p>
                                            <p className="text-3xl font-black text-white">₹{totalPayable.toLocaleString()}</p>
                                        </div>
                                    </header>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        <div className="space-y-2 p-4 rounded-xl bg-zinc-900/30 border border-zinc-800 hover:border-blue-500/30 transition-colors">
                                            <Label className="text-zinc-400 text-xs font-bold uppercase">Tuition Fee <span className="text-blue-500">(Annual)</span></Label>
                                            <Input {...register("tuitionFee")} type="number" className="bg-zinc-950 border-zinc-800 h-12 text-xl font-bold text-white" />
                                        </div>
                                        <div className="space-y-2 p-4 rounded-xl bg-zinc-900/30 border border-zinc-800">
                                            <Label className="text-zinc-400 text-xs font-bold uppercase">Admission Fee</Label>
                                            <Input {...register("admissionFee")} type="number" className="bg-zinc-950 border-zinc-800 h-12 font-bold" />
                                        </div>
                                        <div className="space-y-2 p-4 rounded-xl bg-zinc-900/30 border border-zinc-800">
                                            <Label className="text-zinc-400 text-xs font-bold uppercase">Misc & Security</Label>
                                            <Input {...register("miscellaneousFee")} type="number" className="bg-zinc-950 border-zinc-800 h-12 font-bold" />
                                        </div>
                                        <div className="lg:col-span-3 p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800 flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
                                                    <Zap className="w-6 h-6 text-emerald-500" />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-white">Consolidated Fee Ledger</p>
                                                    <p className="text-xs text-zinc-500">System will automatically accrue income upon admission.</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-4">
                                                <Button size="sm" variant="ghost" className="text-zinc-500 font-bold" type="button">Apply Discount</Button>
                                                <Button size="sm" variant="ghost" className="text-zinc-500 font-bold" type="button">Scholarship Override</Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {currentStep === 4 && (
                                <div className="space-y-8">
                                    <header>
                                        <h2 className="text-3xl font-bold text-emerald-500 mb-2 underline decoration-emerald-500/20 underline-offset-8">Review & Seal Manifest</h2>
                                        <p className="text-zinc-400">Please certify the institutional record before atomic insertion.</p>
                                    </header>
                                    
                                    <div className="space-y-6">
                                        <div className="grid grid-cols-2 gap-8">
                                            <div className="space-y-4">
                                                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Student Identity</p>
                                                <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800">
                                                    <p className="text-2xl font-black text-white">{watch("firstName")} {watch("lastName")}</p>
                                                    <p className="text-sm text-zinc-400">DOB: {watch("dateOfBirth")}</p>
                                                    <p className="text-sm text-blue-400 font-mono mt-2">UID: {watch("aadhaarNumber")}</p>
                                                </div>
                                            </div>
                                            <div className="space-y-4">
                                                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Financial Contract</p>
                                                <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800">
                                                    <p className="text-2xl font-black text-emerald-400">₹{totalPayable.toLocaleString()}</p>
                                                    <p className="text-sm text-zinc-400">Schedule: Term-wise Accrual</p>
                                                    <p className="text-xs text-zinc-500 mt-2 font-mono">Status: Ready for Recognition</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800 space-y-4">
                                            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Institutional Placement</p>
                                            <div className="flex gap-8">
                                                <div>
                                                    <p className="text-xs text-zinc-500 uppercase">Grade Level</p>
                                                    <p className="text-lg font-bold text-white">{classes.find(c => c.id === watch("classId"))?.name || "Unassigned"}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-zinc-500 uppercase">Section</p>
                                                    <p className="text-lg font-bold text-white">{sections.find(s => s.id === watch("sectionId"))?.name || "A"}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-zinc-500 uppercase">Parent Link</p>
                                                    <p className="text-lg font-bold text-white">{watch("fatherName")}</p>
                                                    <p className="text-xs text-zinc-500">{watch("whatsappNumber")}</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-emerald-500/5 border border-emerald-500/10 p-4 rounded-xl">
                                            <p className="text-[10px] text-emerald-500 font-bold leading-relaxed">
                                                SYST-AUDIT: Submission will trigger atomic writes to Student, AcademicRecord, FamilyDetail, and FinancialLedger tables. This action is immutable once sealed.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Form Footer / Navigation */}
                            <Separator className="my-8 bg-zinc-800/50" />
                            <div className="flex justify-between items-center">
                                <Button 
                                    type="button"
                                    onClick={prevStep} 
                                    disabled={currentStep === 0 || isSubmitting}
                                    variant="ghost"
                                    className="text-zinc-500 font-bold hover:text-white"
                                >
                                    <ChevronLeft className="w-4 h-4 mr-2" /> Previous
                                </Button>

                                {currentStep === STEPS.length - 1 ? (
                                    <Button 
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-12 h-14 rounded-2xl shadow-xl shadow-emerald-500/20 active:scale-95 transition-all"
                                    >
                                        {isSubmitting ? "SEALING RECORD..." : "SEAL & ADMIT STUDENT"}
                                    </Button>
                                ) : (
                                    <Button 
                                        type="button"
                                        onClick={nextStep}
                                        className="bg-blue-600 hover:bg-blue-500 text-white font-black px-12 h-14 rounded-2xl shadow-xl shadow-blue-500/20 group transition-all"
                                    >
                                        Continue <ChevronRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                                    </Button>
                                )}
                            </div>
                        </Card>
                    </motion.div>
                </AnimatePresence>
            </form>
        </div>
    );
}
