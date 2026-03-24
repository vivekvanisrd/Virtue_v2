"use client";

import React from "react";
import { Wallet } from "lucide-react";

export function FinanceContent() {
  return (
    <div className="space-y-12">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-bold text-foreground tracking-tight">Financial Hub</h2>
          <p className="text-foreground opacity-50 font-medium mt-1">Fee collections, invoices, and accounting</p>
        </div>
      </div>

      <div className="bg-background p-12 rounded-[40px] border border-border premium-shadow flex flex-col items-center justify-center text-center">
         <div className="w-24 h-24 bg-muted rounded-[32px] flex items-center justify-center mb-8 text-primary">
            <Wallet className="w-12 h-12" />
         </div>
         <h3 className="text-2xl font-bold text-foreground mb-4 tracking-tight">Revenue Dashboard Ready</h3>
         <p className="text-foreground opacity-40 max-w-md mx-auto font-medium">
            Your financial data is being synchronized. You can start processing fee receipts and managing teacher salaries here.
         </p>
         <div className="mt-10 flex gap-4">
             <button className="px-8 py-3 bg-primary text-white rounded-2xl font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all">Collect Fees</button>
             <button className="px-8 py-3 bg-muted text-foreground opacity-70 rounded-2xl font-bold hover:bg-muted/80 transition-all">View Ledger</button>
         </div>
      </div>
    </div>
  );
}
