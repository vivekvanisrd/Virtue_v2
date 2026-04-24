"use client";

import React, { useRef } from "react";
import { 
  Printer, 
  Download, 
  X, 
  CheckCircle2, 
  Building, 
  User, 
  Calendar,
  Wallet,
  ShieldCheck,
  Zap
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface PayslipGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  data: any; // Single payroll record
  month: string;
  year: number;
}

export function PayslipGenerator({ isOpen, onClose, data, month, year }: PayslipGeneratorProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const printContent = printRef.current;
    const windowUrl = "about:blank";
    const uniqueName = new Date().getTime();
    const windowName = "Print" + uniqueName;
    const printWindow = window.open(windowUrl, windowName, "left=50,top=50,width=800,height=900");

    if (printWindow && printContent) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Payslip - ${data.name}</title>
            <style>
              @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
              body { font-family: 'Inter', sans-serif; padding: 40px; color: #1e293b; }
              .header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #f1f5f9; padding-bottom: 20px; }
              .school-name { font-size: 24px; font-weight: 900; text-transform: uppercase; letter-spacing: -0.02em; }
              .payslip-title { font-size: 14px; font-weight: 700; color: #64748b; margin-top: 5px; }
              .info-grid { display: grid; grid-template-cols: 1fr 1fr; gap: 20px; margin-bottom: 40px; }
              .info-item { font-size: 12px; }
              .info-label { font-weight: 700; color: #94a3b8; text-transform: uppercase; font-size: 10px; margin-bottom: 2px; }
              .info-value { font-weight: 700; }
              .table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
              .table th { text-align: left; background: #f8fafc; padding: 12px; font-size: 10px; text-transform: uppercase; color: #64748b; }
              .table td { padding: 12px; border-bottom: 1px solid #f1f5f9; font-size: 12px; }
              .earnings-total { background: #f0fdf4; font-weight: 900; }
              .deductions-total { background: #fef2f2; font-weight: 900; }
              .net-pay-box { background: #1e293b; color: white; padding: 20px; border-radius: 12px; display: flex; justify-content: space-between; align-items: center; }
              .net-label { font-size: 14px; font-weight: 400; opacity: 0.7; }
              .net-value { font-size: 24px; font-weight: 900; }
              .footer { margin-top: 60px; font-size: 10px; text-align: center; color: #94a3b8; }
              @media print { .no-print { display: none; } }
            </style>
          </head>
          <body>
            ${printContent.innerHTML}
            <script>window.print(); setTimeout(() => window.close(), 500);</script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  const formatINR = (val: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-10">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
          onClick={onClose}
        />
        
        <motion.div 
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          className="relative w-full max-w-4xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Controls */}
          <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
             <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600 rounded-xl text-white">
                   <Zap className="w-5 h-5" />
                </div>
                <div>
                   <h3 className="font-black text-sm uppercase tracking-widest">Document Preview</h3>
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Branded Employee Payslip</p>
                </div>
             </div>
             <div className="flex items-center gap-2">
                <button 
                  onClick={handlePrint}
                  className="px-6 py-2 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-lg shadow-slate-200"
                >
                   <Printer className="w-3 h-3" /> Print / Save PDF
                </button>
                <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-xl transition-colors">
                   <X className="w-5 h-5 text-slate-400" />
                </button>
             </div>
          </div>

          {/* Payslip Content (Scrollable Preview) */}
          <div className="flex-1 overflow-y-auto p-12 bg-slate-10 border-x-8 border-slate-50">
             <div ref={printRef} className="bg-white mx-auto shadow-sm p-10 min-h-[600px] border border-slate-100 rounded-xl">
                {/* Header */}
                <div className="header text-center mb-10 border-b-2 border-slate-100 pb-8">
                   <h1 className="school-name text-3xl font-black tracking-tighter uppercase italic">VIRTUE INTERNATIONAL SCHOOL</h1>
                   <p className="payslip-title font-bold text-slate-400 uppercase tracking-[0.2em] text-[10px]">Salary Statement for ${month} ${year}</p>
                </div>

                {/* Staff Info */}
                <div className="grid grid-cols-2 gap-y-8 gap-x-12 mb-10">
                   <div className="space-y-4">
                      <div>
                         <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Employee Name</p>
                         <p className="text-sm font-black text-slate-900 uppercase tracking-tight">{data.name}</p>
                      </div>
                      <div>
                         <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Employee ID</p>
                         <p className="text-sm font-black text-slate-900">{data.code}</p>
                      </div>
                   </div>
                   <div className="space-y-4 text-right">
                      <div>
                         <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Bank Account</p>
                         <p className="text-sm font-black text-slate-900">{data.bankAccount}</p>
                      </div>
                      <div>
                         <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Payment Status</p>
                         <div className="flex items-center justify-end gap-1.5">
                            <span className="text-sm font-black text-emerald-600 uppercase tracking-widest">Disbursed</span>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                         </div>
                      </div>
                   </div>
                </div>

                {/* Earnings & Deductions Tables */}
                <div className="grid grid-cols-2 gap-10">
                   <div>
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-4 flex items-center gap-2">
                         <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full" /> Earnings Breakdown
                      </h4>
                      <table className="w-full text-xs font-bold border-t border-slate-100">
                         <tbody>
                            <tr><td className="py-3 text-slate-500">Basic Salary</td><td className="py-3 text-right">{formatINR(data.basic)}</td></tr>
                            <tr><td className="py-3 text-slate-500">Dearness Allowance (DA)</td><td className="py-3 text-right">{formatINR(data.da)}</td></tr>
                            <tr><td className="py-3 text-slate-500">House Rent (HRA)</td><td className="py-3 text-right">{formatINR(data.hra)}</td></tr>
                            <tr><td className="py-3 text-slate-500">Special Allowance</td><td className="py-3 text-right">{formatINR(data.special)}</td></tr>
                            <tr className="bg-emerald-50/50"><td className="py-3 text-emerald-700 font-black">Gross Earnings</td><td className="py-3 text-right text-emerald-700 font-black">{formatINR(data.gross)}</td></tr>
                         </tbody>
                      </table>
                   </div>
                   <div>
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-rose-600 mb-4 flex items-center gap-2">
                         <span className="w-1.5 h-1.5 bg-rose-600 rounded-full" /> Deductions
                      </h4>
                      <table className="w-full text-xs font-bold border-t border-slate-100">
                         <tbody>
                            <tr><td className="py-3 text-slate-500">Provident Fund (PF)</td><td className="py-3 text-right">-{formatINR(data.pfDeduction)}</td></tr>
                            <tr><td className="py-3 text-slate-500">ESIC Medical</td><td className="py-3 text-right">-{formatINR(data.esiDeduction)}</td></tr>
                            <tr><td className="py-3 text-slate-500">Professional Tax (PT)</td><td className="py-3 text-right">-{formatINR(data.ptDeduction)}</td></tr>
                            <tr><td className="py-3 text-slate-500">LOP / Absent Fine</td><td className="py-3 text-right">-{formatINR(data.lopDeduction)}</td></tr>
                            <tr><td className="py-3 text-slate-500">Advance/Loan EMI</td><td className="py-3 text-right">-{formatINR(data.loanDeduction)}</td></tr>
                            <tr className="bg-rose-50/50"><td className="py-3 text-rose-700 font-black">Total Deductions</td><td className="py-3 text-right text-rose-700 font-black">-{formatINR(data.gross - data.netPay)}</td></tr>
                         </tbody>
                      </table>
                   </div>
                </div>

                {/* Net Pay Box */}
                <div className="mt-12 bg-slate-900 text-white rounded-2xl p-8 flex items-center justify-between shadow-2xl shadow-slate-200">
                   <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 mb-1">Net Amount Payable</p>
                      <h2 className="text-4xl font-black tracking-tighter italic">{formatINR(data.netPay)}</h2>
                   </div>
                   <div className="text-right">
                      <p className="text-[9px] font-black uppercase tracking-widest opacity-40 mb-1">Leaves Consumption</p>
                      <p className="text-sm font-black text-blue-400">-{data.paidLeaves} Paid Leaves</p>
                   </div>
                </div>

                <div className="footer text-center mt-12 pt-8 border-t border-slate-100">
                   <p className="text-xs font-black uppercase tracking-widest text-slate-300">Computer Generated Statement • No Signature Required</p>
                </div>
             </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
