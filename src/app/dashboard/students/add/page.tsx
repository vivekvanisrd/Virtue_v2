"use client";

import StudentAdmissionForm from "@/components/students/StudentAdmissionForm";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

// 🏛️ SOVEREIGN UI INLINE: Replacing missing UI components with native Tailwind standards
const Button = ({ children, className, variant, ...props }: any) => {
  const baseClass = "inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50";
  const variants: any = {
    default: "bg-primary text-primary-foreground shadow hover:bg-primary/90",
    ghost: "hover:bg-zinc-800 hover:text-white"
  };
  
  return (
    <button 
      className={cn(baseClass, variants[variant || "default"], className)} 
      {...props}
    >
      {children}
    </button>
  );
};

/**
 * 🎓 STUDENT ADMISSION PAGE (v2.3)
 * 
 * Mounting the next-generation admission engine.
 */
export default function AddStudentPage() {
    return (
        <div className="min-h-screen bg-zinc-950/20">
            {/* 🛠️ Context Header */}
            <div className="border-b border-zinc-800 bg-zinc-950/50 backdrop-blur-md sticky top-0 z-30">
                <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/dashboard/students">
                            <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-white">
                                <ArrowLeft className="w-5 h-5" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-sm font-bold text-white uppercase tracking-widest">New Admission</h1>
                            <p className="text-[10px] text-zinc-500 font-medium">SOVEREIGN ACADEMIC INTAKE 2026-27</p>
                        </div>
                    </div>
                </div>
            </div>

            <main className="py-12">
                <StudentAdmissionForm />
            </main>
        </div>
    );
}
