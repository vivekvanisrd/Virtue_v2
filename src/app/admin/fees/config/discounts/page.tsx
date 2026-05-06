import { DiscountRegistry } from "@/components/finance/DiscountRegistry";
import { ArrowLeft, Zap } from "lucide-react";
import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Discount Registry | Institutional Governance",
  description: "Standardized Concession Management for Sovereign Education",
};

export default function DiscountRegistryPage() {
  return (
    <div className="min-h-screen bg-background p-8 space-y-10">
      {/* 🏛️ HEADER SECTION */}
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-emerald-600 font-black text-[10px] uppercase tracking-[0.3em]">
            <Zap className="w-4 h-4 fill-current" />
            Institutional Governance
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            Discount <span className="text-slate-300 font-light italic">Registry.</span>
          </h1>
          <p className="text-foreground opacity-60 font-medium max-w-2xl text-sm">
            Hardened concession policies. No manual overrides—only predefined, audit-safe institutional discounts.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <Link href="/admin/fees/config" className="flex items-center gap-2 px-6 py-3 bg-slate-50 text-slate-600 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-100 transition-all active:scale-95 border border-slate-100 shadow-sm">
            <ArrowLeft className="w-4 h-4" />
            Back to Config
          </Link>
        </div>
      </header>

      {/* 📊 MAIN REGISTRY INTERFACE */}
      <div className="animate-in fade-in slide-in-from-bottom-10 duration-1000">
        <DiscountRegistry />
      </div>
    </div>
  );
}
