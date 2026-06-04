"use client";

import { Settings, RefreshCw, Calendar, ShieldAlert, Sparkles } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 pb-6">
        <h2 className="text-xl font-black text-slate-800 tracking-tight">System Settings & Rollover</h2>
        <p className="text-slate-500 text-xs mt-1">Configure default bookstore modules, tax overrides, and perform academic year carry forwards</p>
      </div>

      <div className="max-w-2xl bg-white border border-slate-200 rounded-3xl p-8 shadow-sm text-center flex flex-col items-center justify-center space-y-6 mx-auto my-12">
        <div className="w-16 h-16 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-center shrink-0 shadow-inner">
          <Settings className="w-8 h-8 text-[#4DA8DA] animate-spin-slow" />
        </div>
        
        <div className="space-y-2">
          <h3 className="text-lg font-black text-slate-800">Phase 3: Settings & Rollover Wizard</h3>
          <p className="text-slate-500 text-xs max-w-md mx-auto leading-relaxed">
            This module is scheduled for implementation in **Phase 3: POS & Advanced Features**. Once completed, you will be able to lock historical ledgers, calculate closing valuations, and automatically carry forward opening stock to the next Academic Year.
          </p>
        </div>

        {/* Feature roadmap preview */}
        <div className="w-full border-t border-slate-100 pt-6 text-left space-y-3">
          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Planned Modules & Features</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex items-start gap-3">
              <Calendar className="w-5 h-5 text-sky-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-slate-800">Academic Year Rollover</p>
                <p className="text-[10px] text-slate-450 mt-0.5">Automated wizard to transition stock balances to the next term.</p>
              </div>
            </div>
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex items-start gap-3">
              <RefreshCw className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-slate-800">Tax & GST Profiles</p>
                <p className="text-[10px] text-slate-450 mt-0.5">Configure CGST, SGST, IGST codes, and barcode tax overrides.</p>
              </div>
            </div>
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-slate-800">Inventory Lockout Controls</p>
                <p className="text-[10px] text-slate-450 mt-0.5">Freeze item ledgers to prevent retroactive stock alterations.</p>
              </div>
            </div>
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-purple-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-slate-800">POS Default Settings</p>
                <p className="text-[10px] text-slate-450 mt-0.5">Configure default receipt printer and billing cashier terminals.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
