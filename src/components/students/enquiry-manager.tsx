"use client";

import React, { useEffect, useState } from "react";
import { getEnquiriesAction, updateEnquiryStatusAction } from "@/lib/actions/enquiry-actions";
import { Search, Filter, Phone, Mail, CheckCircle, XCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export function EnquiryManager() {
  const [enquiries, setEnquiries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"All" | "Pending" | "Converted" | "Rejected">("All");

  useEffect(() => {
    loadEnquiries();
  }, [statusFilter]);

  async function loadEnquiries() {
    setLoading(true);
    const filter = statusFilter === "All" ? undefined : statusFilter;
    const res = await getEnquiriesAction(filter);
    if (res.success && res.data) setEnquiries(res.data);
    setLoading(false);
  }

  const handleUpdateStatus = async (id: string, newStatus: "Pending" | "Converted" | "Rejected") => {
    await updateEnquiryStatusAction(id, newStatus);
    loadEnquiries();
    
    // If Converted, we want to pop up the Admission form prepopulated
    // In actual implementation, we'd trigger a global state or search params
    // For now it just updates the DB state.
    if (newStatus === "Converted") {
      alert("Enquiry Converted. Please navigate to New Admission to enter this student.");
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden h-[calc(100vh-140px)] flex flex-col">
      {/* Header & Controls */}
      <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
        <div className="flex bg-white rounded-xl border border-slate-200 p-1 shadow-sm">
          {["All", "Pending", "Converted", "Rejected"].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s as any)}
              className={cn(
                "px-4 py-1.5 text-xs font-black uppercase tracking-wider rounded-lg transition-all",
                statusFilter === s ? "bg-slate-900 text-white shadow-md relative z-10" : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
              )}
            >
              {s}
            </button>
          ))}
        </div>
        
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input 
            type="text" 
            placeholder="Search enquiries..." 
            className="pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs font-bold w-64 focus:outline-none focus:border-primary shadow-sm"
          />
        </div>
      </div>

      {/* Data Table */}
      <div className="flex-1 overflow-auto custom-scrollbar relative">
        {loading && (
          <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-50 flex items-center justify-center">
             <div className="flex gap-1"><span className="w-2 h-2 rounded-full bg-primary animate-bounce"></span><span className="w-2 h-2 rounded-full bg-primary animate-bounce delay-75"></span><span className="w-2 h-2 rounded-full bg-primary animate-bounce delay-150"></span></div>
          </div>
        )}
        
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 z-10 shadow-sm">
            <tr>
              <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-[25%]">Student Profile</th>
              <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-[25%]">Parent Contact</th>
              <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-[15%] text-center">Class / Year</th>
              <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-[10%] text-center">Status</th>
              <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-[25%] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100/80">
            {enquiries.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-10 text-center text-slate-400 font-bold text-xs uppercase tracking-widest">No enquiries found</td>
              </tr>
            ) : (
              enquiries.map((enq) => (
                <tr key={enq.id} className="hover:bg-slate-50/80 transition-colors group">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-violet-100 text-violet-700 font-black flex items-center justify-center text-xs">
                        {enq.studentFirstName[0]}
                      </div>
                      <div>
                        <p className="text-xs font-black text-slate-900 group-hover:text-primary transition-colors">{enq.studentFirstName} {enq.studentLastName}</p>
                        <p className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1 mt-0.5">
                           From: {enq.previousSchool || 'New Admission'}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div>
                      <p className="text-xs font-black text-slate-700">{enq.parentName}</p>
                      <div className="flex flex-col gap-0.5 mt-0.5">
                        <p className="text-[10px] font-bold text-slate-500 flex items-center gap-1"><Phone className="w-3 h-3 text-emerald-500" /> {enq.parentPhone}</p>
                        {enq.parentEmail && <p className="text-[10px] font-bold text-slate-400 flex items-center gap-1"><Mail className="w-3 h-3 text-indigo-400" /> {enq.parentEmail}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-center">
                    <span className="text-[11px] font-black bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-lg whitespace-nowrap">Class {enq.requestedClass}</span>
                    <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-wider">{enq.academicYear}</p>
                  </td>
                  <td className="p-4 text-center">
                    <span className={cn(
                      "text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded inline-block",
                      enq.status === "Pending" ? "bg-orange-100 text-orange-600" :
                      enq.status === "Converted" ? "bg-emerald-100 text-emerald-600" :
                      "bg-rose-100 text-rose-600"
                    )}>
                      {enq.status}
                    </span>
                  </td>
                  <td className="p-4 text-right align-middle">
                    <div className="flex items-center justify-end gap-2 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity">
                      {enq.status === "Pending" && (
                        <>
                          <button 
                            onClick={() => handleUpdateStatus(enq.id, "Converted")}
                            className="bg-emerald-500 hover:bg-emerald-400 text-white rounded-lg p-1.5 shadow-sm transition-colors text-xs font-black flex items-center gap-1 pr-2"
                            title="Convert to Admission"
                          >
                            <CheckCircle className="w-3.5 h-3.5" /> Convert
                          </button>
                          <button 
                            onClick={() => handleUpdateStatus(enq.id, "Rejected")}
                            className="bg-rose-50 hover:bg-rose-500 text-rose-500 hover:text-white border border-rose-200 hover:border-transparent rounded-lg p-1.5 transition-colors text-xs font-black flex items-center gap-1 pr-2"
                            title="Reject"
                          >
                            <XCircle className="w-3.5 h-3.5" /> Reject
                          </button>
                        </>
                      )}
                      {enq.status !== "Pending" && (
                        <button 
                          onClick={() => handleUpdateStatus(enq.id, "Pending")}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-lg p-1.5 transition-colors text-xs font-black flex items-center gap-1 pr-2"
                        >
                          <Clock className="w-3.5 h-3.5" /> Revert
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
