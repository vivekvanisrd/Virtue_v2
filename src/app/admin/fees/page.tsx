import { FeeCollectionForm } from "@/components/finance/FeeCollectionForm";
import { WalletCards, TrendingUp, Users, Clock } from "lucide-react";

/**
 * FeesPage
 * 
 * The main administrative entry point for fee management.
 * Provides high-level KPIs and the primary collection form.
 */
export default function FeesPage() {
  return (
    <div className="max-w-[1600px] mx-auto p-4 sm:p-8 space-y-10 min-h-screen bg-slate-50/30">
      {/* Dynamic Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-primary font-black text-[10px] uppercase tracking-[0.3em] mb-2 animate-in slide-in-from-left duration-500">
            <WalletCards className="w-3.5 h-3.5" />
            Financial Management Engine
          </div>
          <h1 className="text-5xl font-black text-slate-900 tracking-tighter leading-tight sm:text-6xl animate-in slide-in-from-left duration-700">
            Fee Collection <span className="text-primary italic font-serif">Portal.</span>
          </h1>
          <p className="text-slate-500 font-medium max-w-2xl text-lg animate-in slide-in-from-left duration-1000">
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
    <div className="bg-white px-6 py-4 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4 min-w-[180px]">
      <div className="w-10 h-10 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400">
        {icon}
      </div>
      <div>
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
        <div className="flex items-baseline gap-2">
          <p className="text-lg font-black text-slate-900 tracking-tight">{value}</p>
          {trend && <span className="text-[10px] font-bold text-green-500">{trend}</span>}
          {sub && <span className="text-[10px] font-bold text-slate-300">{sub}</span>}
        </div>
      </div>
    </div>
  );
}
