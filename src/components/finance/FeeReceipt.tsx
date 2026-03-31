"use client";

import React from "react";
import { CheckCircle2, ShieldCheck, Printer, Download } from "lucide-react";
import { formatCurrency } from "@/lib/utils/fee-utils";
import { cn } from "@/lib/utils";

interface FeeReceiptProps {
  student: any;
  receipt: {
    receiptNumber: string;
    paymentDate: Date | string;
    amountPaid: number;
    lateFeePaid: number;
    totalPaid: number;
    paymentMode: string;
    paymentReference?: string;
    allocatedTo: any;
  };
  schoolInfo?: {
    name: string;
    address: string;
    phone: string;
    email: string;
    logo?: string;
  };
}

/**
 * FeeReceipt Component
 * 
 * A professional, print-optimized document for fee settlements.
 * Designed with high-end aesthetics and audit-safe data presentation.
 */
export function FeeReceipt({ student, receipt, schoolInfo }: FeeReceiptProps) {
  const defaultSchool = {
    name: "Virtue Global Academy",
    address: "71, Knowledge Park III, Greater Noida, UP - 201306",
    phone: "+91 98765 43210",
    email: "accounts@virtue.edu.in",
  };

  const school = schoolInfo || defaultSchool;
  const date = new Date(receipt.paymentDate).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="bg-white p-12 rounded-[3.5rem] border shadow-2xl max-w-4xl mx-auto print:shadow-none print:border-none print:p-0">
      {/* Receipt Header */}
      <div className="flex justify-between items-start border-b-2 border-slate-100 pb-10 mb-10">
        <div className="space-y-4">
          <div className="flex flex-col items-center gap-4 mb-2">
          <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center overflow-hidden border-2 border-slate-100 shadow-sm">
            <img src="/school-logo.png" alt="School Logo" className="w-full h-full object-contain p-1" />
          </div>
          <div className="text-center">
            <h1 className="text-3xl font-black text-slate-900 tracking-tighter italic leading-none mb-1">VIRTUE INTERNATIONAL</h1>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Official Fee Settlement Receipt</p>
          </div>
        </div>
          <div className="text-xs text-slate-400 font-medium leading-relaxed max-w-xs">
            {school.address}<br />
            Ph: {school.phone} • {school.email}
          </div>
        </div>

        <div className="text-right space-y-2">
          <div className="inline-block px-4 py-2 bg-slate-50 border border-slate-100 rounded-2xl text-right">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Receipt Number</p>
            <p className="text-xl font-black text-slate-900">{receipt.receiptNumber}</p>
          </div>
          <p className="text-xs font-bold text-slate-400 italic">Issued on {date}</p>
        </div>
      </div>

      {/* Student & Payment Summary */}
      <div className="grid grid-cols-2 gap-12 mb-12">
        <div className="space-y-6">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-50 pb-2">Student Information</h3>
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-2xl font-black text-slate-300">
              {student.firstName[0]}
            </div>
            <div>
              <h4 className="text-xl font-black text-slate-900">{student.firstName} {student.lastName}</h4>
              <p className="text-sm font-bold text-slate-500">#{student.admissionNumber} • {student.academic?.class?.name}-{student.academic?.section?.name}</p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-50 pb-2">Payment Details</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Method</p>
              <p className="text-sm font-black text-slate-900">{receipt.paymentMode}</p>
            </div>
            {receipt.paymentReference && (
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Reference</p>
                <p className="text-sm font-black text-slate-900 truncate">{receipt.paymentReference}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="mb-12">
        <table className="w-full">
          <thead>
            <tr className="border-b-2 border-slate-900 text-[10px] font-black uppercase tracking-widest text-slate-400 text-left">
              <th className="py-4 px-2">Description</th>
              <th className="py-4 px-2 text-right">Period</th>
              <th className="py-4 px-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            <tr className="text-sm font-bold text-slate-700">
              <td className="py-6 px-2">
                Tuition Fee Settlement
                <p className="text-[10px] text-slate-400 font-medium">Academic Session 2024-25</p>
              </td>
              <td className="py-6 px-2 text-right uppercase tracking-tighter">
                {receipt.allocatedTo?.terms?.map((t: string) => t.toUpperCase()).join(", ") || "N/A"}
              </td>
              <td className="py-6 px-2 text-right font-black">
                {formatCurrency(receipt.amountPaid || 0)}
              </td>
            </tr>
            {receipt.lateFeePaid > 0 && (
              <tr className="text-sm font-bold text-rose-600 bg-rose-50/30">
                <td className="py-4 px-2">Late Payment Surcharge</td>
                <td className="py-4 px-2 text-right">-</td>
                <td className="py-4 px-2 text-right font-black">{formatCurrency(receipt.lateFeePaid || 0)}</td>
              </tr>
            )}
            {receipt.allocatedTo?.lateFeeWaived && (
              <tr className="text-xs font-bold text-emerald-600 bg-emerald-50/30 italic">
                <td className="py-4 px-2" colSpan={2}>Late Fee Waiver Applied (Reason: {receipt.allocatedTo.waiverReason})</td>
                <td className="py-4 px-2 text-right font-black">₹0</td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-900">
              <td className="py-8 px-2" colSpan={2}>
                <div className="flex items-center gap-2 text-emerald-600">
                  <CheckCircle2 className="w-5 h-5" />
                  <p className="text-sm font-black uppercase tracking-widest">Transaction Verified & Sealed</p>
                </div>
              </td>
              <td className="py-8 px-2 text-right">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Received</p>
                <p className="text-4xl font-black text-slate-900 tracking-tighter">{formatCurrency(receipt.totalPaid || 0)}</p>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Receipt Footer */}
      <div className="grid grid-cols-2 gap-12 pt-12 border-t border-dashed border-slate-200">
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Terms & Conditions</p>
          <ul className="text-[9px] text-slate-400 space-y-1 font-medium leading-relaxed">
            <li>1. This is a computer-generated receipt and does not require a physical signature.</li>
            <li>2. Fees once paid are non-refundable except as per school policy rules.</li>
            <li>3. Please keep this receipt safely for future academic references.</li>
            <li>4. All disputes are subject to local jurisdiction only.</li>
          </ul>
        </div>
        <div className="flex flex-col items-center justify-center border-l border-slate-50">
          <div className="w-24 h-24 border-4 border-slate-100 rounded-3xl flex items-center justify-center mb-4 opacity-20">
             <ShieldCheck className="w-12 h-12" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-300">Authorized Signature</p>
        </div>
      </div>

      {/* Quick Actions (Dashboard Only) */}
      <div className="mt-12 flex gap-4 print:hidden">
        <button 
          onClick={() => window.print()}
          className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-slate-800 transition-all active:scale-[0.98]"
        >
          <Printer className="w-4 h-4" /> Print Document
        </button>
        <button 
          className="flex-1 py-4 bg-white border border-slate-200 text-slate-900 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-slate-50 transition-all active:scale-[0.98]"
        >
          <Download className="w-4 h-4" /> Save as PDF
        </button>
      </div>
    </div>
  );
}
