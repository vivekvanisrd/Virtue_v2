import { FeeCollectionForm } from "@/components/finance/FeeCollectionForm";
import { WalletCards, TrendingUp, Users, Clock, Settings2 } from "lucide-react";
import Link from "next/link";

/**
 * FeesPage
 * 
 * The main administrative entry point for fee management.
 * Provides high-level KPIs and the primary collection form.
 */
export default function FeesPage() {
  return (
    <div className="max-w-[1600px] mx-auto p-4 sm:p-8 space-y-10 min-h-screen bg-background">
      {/* Dynamic Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-primary font-black text-[10px] uppercase tracking-[0.3em] mb-2 animate-in slide-in-from-left duration-500">
            <WalletCards className="w-3.5 h-3.5" />
            Financial Management Engine
          </div>
          <h1 className="text-5xl font-black text-foreground font-black tracking-tighter leading-tight sm:text-6xl animate-in slide-in-from-left duration-700">
            Fee Collection <span className="text-primary italic font-serif">Portal.</span>
          </h1>
          <p className="text-foreground opacity-60 font-medium max-w-2xl text-lg animate-in slide-in-from-left duration-1000">
            Atomic ledger entries, automated discount realization (Term 3), and parent-facing roadmap visualizers for zero-friction collections.
          </p>
        </div>

        {/* Real-time KPI Cards */}
        <div className="flex flex-wrap items-center gap-4 animate-in fade-in zoom-in duration-1000">
          <KPICard 
            icon={<TrendingUp className="w-4 h-4" />} 
            label="Daily Revenue" 
            value="₹1,42,850" 
            trend="+12%" 
          />
          <KPICard 
            icon={<Users className="w-4 h-4" />} 
            label="Collections" 
            value="24" 
            sub="Today" 
          />
          <KPICard 
            icon={<Clock className="w-4 h-4" />} 
            label="Fiscal Year" 
            value="2024-25" 
            sub="Active" 
          />
          <Link href="/admin/fees/config" className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-4 rounded-3xl flex items-center gap-3 transition-all active:scale-95 group shadow-lg shadow-slate-900/10">
            <Settings2 className="w-4 h-4 text-foreground opacity-50 group-hover:text-white transition-colors" />
            <div className="text-left">
                <p className="text-[9px] font-black text-foreground opacity-50 uppercase tracking-widest">Advanced Setup</p>
                <p className="text-xs font-black uppercase tracking-widest">Fee Configuration</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Main Interactive Form */}
      <section className="animate-in fade-in slide-in-from-bottom-10 duration-1000">
        <FeeCollectionForm />
      </section>
    </div>
  );
}

function KPICard({ icon, label, value, trend, sub }: any) {
  return (
    <div className="bg-background px-6 py-4 rounded-3xl border border-border shadow-sm flex items-center gap-4 min-w-[180px]">
      <div className="w-10 h-10 bg-slate-50 rounded-2xl flex items-center justify-center text-foreground opacity-50">
        {icon}
      </div>
      <div>
        <p className="text-[9px] font-black text-foreground opacity-50 uppercase tracking-widest">{label}</p>
        <div className="flex items-baseline gap-2">
          <p className="text-lg font-black text-slate-900 tracking-tight">{value}</p>
          {trend && <span className="text-[10px] font-bold text-green-500">{trend}</span>}
          {sub && <span className="text-[10px] font-bold text-slate-300">{sub}</span>}
        </div>
      </div>
    </div>
  );
}
