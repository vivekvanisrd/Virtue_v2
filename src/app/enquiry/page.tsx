import React from "react";
import { EnquiryForm } from "@/components/students/enquiry-form";

export const metadata = {
  title: "Admissions Enquiry | Virtue Modern School",
  description: "Register your interest for the upcoming academic year.",
};

export default function EnquiryPage() {
  return (
    <div className="min-h-screen bg-background py-20 px-4 relative overflow-hidden">
      {/* Abstract Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent/5 blur-[150px] rounded-full pointer-events-none" />
      
      {/* Navbar Minimal */}
      <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-primary/20">V</div>
          <span className="text-foreground font-black tracking-tighter text-lg hidden sm:block">Virtue Modern School</span>
        </div>
        <a href="/" className="text-foreground opacity-60 hover:text-foreground text-xs font-bold transition-colors">Return to Home</a>
      </div>

      <div className="relative z-10 pt-10">
        <EnquiryForm />
      </div>
    </div>
  );
}
