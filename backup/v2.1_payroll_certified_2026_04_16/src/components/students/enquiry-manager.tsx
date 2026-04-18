"use client";

import React, { useEffect, useState } from "react";
import { 
  getEnquiriesAction, 
  updateEnquiryStatusAction, 
  convertEnquiryToStudentAction,
  recordManualEnquiryPaymentAction,
  getEnquiryPaymentReviewAction,
  updateEnquiryFinancialsAction,
  getStaffContextAction
} from "@/lib/actions/enquiry-actions";
import { getTransportHubAction } from "@/lib/actions/transport-actions";
import { createPaymentLinkAction } from "@/lib/actions/payment-actions";
import { checkUnlockStatusAction, requestUnlockAction } from "@/lib/actions/lock-actions";
import { logFinancialAction } from "@/lib/actions/audit-actions";

import { 
  Search, Filter, Phone, Mail, CheckCircle, XCircle, Users,
  Clock, CreditCard, AlertTriangle, BadgeCheck, Share2, Sparkles,
  Eye, User as UserIcon, Calendar, Fingerprint, MapPin, 
  Trash2, X, ChevronRight, GraduationCapIcon
} from "lucide-react";
import { cn } from "@/lib/utils";

const SCHOLARSHIP_TIERS = [
  { label: "Standard / No Scholarship", amount: 0, reason: "None" },
  { label: "Early Bird Admission Reward", amount: 2500, reason: "Early Bird (Batch 1)" },
  { label: "Sibling / Alumni Discount", amount: 5000, reason: "School Community Loyalty" },
  { label: "Academic / Sports Merit", amount: 10000, reason: "Merit Excellence" },
  { label: "Management Discretionary", amount: 15000, reason: "Mgmt Special Approval" },
];

export function EnquiryManager() {
  const [enquiries, setEnquiries] = useState<any[]>([]);
  const [branding, setBranding] = useState<{ schoolName: string; branchName: string } | null>(null);
  const [selectedEnquiry, setSelectedEnquiry] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("All");


  useEffect(() => {
    loadEnquiries();
    
    // LIVE POLL: Refresh every 20 seconds to catch remote payments automatically
    const timer = setInterval(() => {
        loadEnquiries(true); // silent load
    }, 20000);
    
    return () => clearInterval(timer);
  }, [statusFilter]);

  async function loadEnquiries(silent = false) {
    if (!silent) setLoading(true);
    const filter = statusFilter === "All" ? undefined : statusFilter;
    const res = await getEnquiriesAction(filter);
    if (res.success) {
      setEnquiries(res.data || []);
      if (res.branding) setBranding(res.branding);
    }
    setLoading(false);
  }

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    if (newStatus === "Converted") {
      const confirm = window.confirm("Are you sure you want to convert this lead to a formal Student record? This will generate a Student ID and admission profile.");
      if (!confirm) return;

      setLoading(true);
      const res = await convertEnquiryToStudentAction(id);
      if (res.success) {
        alert(`🎉 Successfully converted! Student Registration ID: ${res.data.registrationId}`);
      } else {
        // More professional error display for the strict payment gate
        alert(`⚠️ Conversion Blocked: ${res.error}`);
      }
      setLoading(false);
    } else {
      await updateEnquiryStatusAction(id, newStatus as any);
    }
    loadEnquiries();
  };

  const handleRecordPayment = async (id: string) => {
    const amountStr = window.prompt("Enter the Cash Payment amount (Partial or Full) to record for this lead:", "25000");
    if (!amountStr) return;
    
    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) {
      alert("Please enter a valid amount.");
      return;
    }

    const confirm = window.confirm(`Confirm: Record a Cash Payment of ₹${amount.toLocaleString()}? This will update the ledger and receipt numbers.`);
    if (!confirm) return;

    setLoading(true);
    const res = await recordManualEnquiryPaymentAction(id, amount);
    if (res.success) {
      alert(`✅ Cash Payment Recorded! Receipt Number: ${res.data.receiptNumber}`);
    } else {
      alert(`❌ Error Recording Payment: ${res.error}`);
    }
    loadEnquiries();
    setLoading(false);
  };

  const handleWhatsAppShare = (enquiry: any) => {
    const phone = enquiry.parentPhone.replace(/\D/g, "");
    if (!phone) {
      alert("Invalid phone number.");
      return;
    }
    const url = `${window.location.origin}/public/admission/pay/${enquiry.id}`;
    const message = `Hello! This is from PaVa-EDUX. Please complete the admission review for ${enquiry.studentFirstName} here: ${url}`;
    
    // Using wa.me for universal desktop/app compatibility
    window.open(`https://wa.me/91${phone}?text=${encodeURIComponent(message)}`, "_blank");
  };

  const handleQuickRegisterShare = () => {
    const phone = window.prompt("Enter Parent Phone Number (10 digits) to send Registration Link:", "");
    if (!phone || phone.length < 10) return;
    
    const branchCode = branding?.branchName === "Global View" ? "VIVA-MAIN" : "VIVA-BR-01"; // Fallback logic
    const url = `${window.location.origin}/public/enquiry/${branchCode}`;
    const message = `Hello! Welcome to PaVa-EDUX. Please fill in your child's registration details here to start the admission process: ${url}`;
    
    window.open(`https://wa.me/91${phone.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`, "_blank");
  };

    const [isUpdatingScholarship, setIsUpdatingScholarship] = useState(false);
    const [reviewData, setReviewData] = useState<any>(null);
    const [transportHub, setTransportHub] = useState<any[]>([]);
    
    // V3 Form State
    const [tuitionDiscount, setTuitionDiscount] = useState(0);
    const [admissionWaiver, setAdmissionWaiver] = useState(0);
    const [scholarshipReason, setScholarshipReason] = useState("");
    const [waiverReason, setWaiverReason] = useState("");
    const [selectedRouteId, setSelectedRouteId] = useState("");
    const [selectedStopId, setSelectedStopId] = useState("");
    
    // Elite V3: Lock & Audit State
    const [isUnlocked, setIsUnlocked] = useState(false);
    const [unlockReason, setUnlockReason] = useState("");
    const [staffId, setStaffId] = useState("");

    // Load Transport Data once
    useEffect(() => {
        async function fetchTransport() {
            setLoading(true);
            const [tRes, sRes] = await Promise.all([
                getTransportHubAction(),
                getStaffContextAction()
            ]);
            if (tRes.success) setTransportHub(tRes.data);
            if (sRes.success) setStaffId(sRes.data.id);
            setLoading(false);
        }
        fetchTransport();
    }, []);

    // Load Review Data when modal opens
    useEffect(() => {
        if (selectedEnquiry) {
            loadReviewData(selectedEnquiry.id);
            setTuitionDiscount(Number(selectedEnquiry.tuitionDiscount || 0));
            setAdmissionWaiver(Number(selectedEnquiry.admissionWaiver || 0));
            setScholarshipReason(selectedEnquiry.scholarshipReason || "");
            setWaiverReason(selectedEnquiry.waiverReason || "");
            setSelectedRouteId(selectedEnquiry.requestedRouteId || "");
            setSelectedStopId(selectedEnquiry.requestedStopId || "");
        }
    }, [selectedEnquiry]);

    async function loadReviewData(enquiryId: string) {
        const [rRes, uRes] = await Promise.all([
            getEnquiryPaymentReviewAction(enquiryId),
            checkUnlockStatusAction(enquiryId)
        ]);
        if (rRes.success) setReviewData(rRes.data);
        if (uRes.success) setIsUnlocked(uRes.isUnlocked);
    }

    const handleSaveFinancials = async () => {
        if (!selectedEnquiry) return;
        
        // Elite V3 Lockdown Rule: Cannot save if paid AND NOT unlocked
        if (reviewData?.totalPaid > 0 && !isUnlocked) {
            alert("🔒 Record Locked: This lead has already recorded payments. Please 'Request Unlock' from management to make corrections.");
            return;
        }

        setLoading(true);

        // Capture Before State for Audit
        const oldState = {
            tuitionDiscount: selectedEnquiry.tuitionDiscount,
            admissionWaiver: selectedEnquiry.admissionWaiver,
            routeId: selectedEnquiry.requestedRouteId,
            stopId: selectedEnquiry.requestedStopId
        };

        const res = await updateEnquiryFinancialsAction({
            enquiryId: selectedEnquiry.id,
            tuitionDiscount,
            admissionWaiver,
            scholarshipReason,
            waiverReason,
            routeId: selectedRouteId,
            stopId: selectedStopId
        });
        
        if (res.success) {
            // Log the Financial Action (Audit V3)
            await logFinancialAction({
                action: reviewData?.totalPaid > 0 ? "FEE_ADJUSTMENT_POST_PAYMENT" : "INITIAL_DISCOUNT_APPLIED",
                entityType: "Enquiry",
                entityId: selectedEnquiry.id,
                oldValue: oldState,
                newValue: { tuitionDiscount, admissionWaiver, routeId: selectedRouteId, stopId: selectedStopId },
                performedBy: staffId,
                reason: scholarshipReason || waiverReason || "General Financial Update",
                riskFlag: tuitionDiscount > 10000 || admissionWaiver > 5000 // Flag high-value changes
            });

            await loadReviewData(selectedEnquiry.id);
            loadEnquiries(true);
            setIsUpdatingScholarship(false);
            alert("✅ Financial Hub Updated & Audited Successfully.");
        } else {
            alert("❌ Save Failed: " + res.error);
        }
        setLoading(false);
    };

    const handleRequestUnlock = async () => {
        const reason = window.prompt("⚠️ REASON MANDATORY: Why are you requesting an unlock for this paid record?", "");
        if (!reason || reason.length < 5) {
            alert("Lockdown Policy: You must provide a valid reason (min 5 chars).");
            return;
        }

        setLoading(true);
        const res = await requestUnlockAction({
            studentId: selectedEnquiry.id,
            requestedBy: staffId,
            reason
        });

        if (res.success) {
            alert("📩 Unlock Request Sent! Please ask your Admin to approve the 15-minute window.");
        } else {
            alert("❌ Request Failed: " + res.error);
        }
        setLoading(false);
    };

  return (
    <div className="bg-background rounded-2xl border border-border shadow-sm overflow-hidden h-[calc(100vh-140px)] flex flex-col">
      {/* Header & Controls */}
      <div className="p-6 border-b border-border bg-muted/30">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 rounded-xl">
              <Search className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-black text-foreground tracking-tight flex items-center gap-2">
                Admission Enquiries
                {branding && (
                  <span className="text-xs font-medium px-2 py-0.5 bg-primary/10 text-primary rounded-full border border-primary/20">
                    {branding.schoolName} — {branding.branchName}
                  </span>
                )}
              </h2>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-0.5">
                Manage incoming leads from website
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button 
              onClick={handleQuickRegisterShare}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
            >
              <div className="bg-white/20 p-1 rounded-lg">
                <Share2 className="w-3 h-3" />
              </div>
              WhatsApp Registration Link
            </button>
            <div className="h-8 w-px bg-border mx-2" />
            <div className="flex bg-background rounded-xl border border-border p-1 shadow-sm overflow-x-auto max-w-full">
              {["All", "New", "Contacted", "Interested", "Converted", "Rejected"].map(s => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s as any)}
                  className={cn(
                    "px-4 py-1.5 text-xs font-black uppercase tracking-wider rounded-lg transition-all",
                    statusFilter === s ? "bg-primary text-white shadow-md relative z-10" : "text-foreground opacity-60 hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-foreground opacity-50 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search enquiries..." 
              className="pl-9 pr-4 py-2 border border-border rounded-xl text-xs font-bold w-64 focus:outline-none focus:border-primary shadow-sm"
            />
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="flex-1 overflow-auto custom-scrollbar relative">
        {loading && (
          <div className="absolute inset-0 bg-background/50 backdrop-blur-sm z-50 flex items-center justify-center">
             <div className="flex gap-1"><span className="w-2 h-2 rounded-full bg-primary animate-bounce"></span><span className="w-2 h-2 rounded-full bg-primary animate-bounce delay-75"></span><span className="w-2 h-2 rounded-full bg-primary animate-bounce delay-150"></span></div>
          </div>
        )}
        
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead className="sticky top-0 bg-muted/50 border-b border-border z-10 shadow-sm">
            <tr>
              <th className="p-4 text-[10px] font-black text-foreground opacity-50 uppercase tracking-widest w-[25%]">Student Profile</th>
              <th className="p-4 text-[10px] font-black text-foreground opacity-50 uppercase tracking-widest w-[25%]">Parent Contact</th>
              <th className="p-4 text-[10px] font-black text-foreground opacity-50 uppercase tracking-widest w-[15%] text-center">Class / Year</th>
              <th className="p-4 text-[10px] font-black text-foreground opacity-50 uppercase tracking-widest w-[10%] text-center">Status</th>
              <th className="p-4 text-[10px] font-black text-foreground opacity-50 uppercase tracking-widest w-[25%] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {enquiries.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-10 text-center text-foreground opacity-50 font-bold text-xs uppercase tracking-widest">No enquiries found</td>
              </tr>
            ) : (
              enquiries.map((enq) => (
                <tr key={enq.id} className="hover:bg-muted/50/80 transition-colors group">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-violet-100 text-violet-700 font-black flex items-center justify-center text-xs">
                        {enq.studentFirstName[0]}
                      </div>
                      <div>
                        <p className="text-xs font-black text-foreground group-hover:text-primary transition-colors">{enq.studentName || `${enq.studentFirstName} ${enq.studentLastName || ""}`}</p>
                        <p className="text-[10px] font-bold text-foreground opacity-60 uppercase flex items-center gap-1 mt-0.5">
                           From: {enq.previousSchool || 'New Admission'}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div>
                      <p className="text-xs font-black text-foreground font-bold">{enq.parentName}</p>
                      <div className="flex flex-col gap-0.5 mt-0.5">
                        <p className="text-[10px] font-bold text-foreground opacity-60 flex items-center gap-1"><Phone className="w-3 h-3 text-emerald-500" /> {enq.parentPhone}</p>
                        {enq.parentEmail && <p className="text-[10px] font-bold text-foreground opacity-50 flex items-center gap-1"><Mail className="w-3 h-3 text-indigo-400" /> {enq.parentEmail}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-center">
                    <span className="text-[11px] font-black bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-lg whitespace-nowrap">Class {enq.requestedClass}</span>
                    <p className="text-[9px] font-bold text-foreground opacity-50 mt-1 uppercase tracking-wider">{enq.academicYear}</p>
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex flex-col items-center gap-1.5">
                      <span className={cn(
                        "text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded inline-block",
                        enq.status === "Pending" ? "bg-orange-100 text-orange-600" :
                        enq.status === "Converted" ? "bg-emerald-100 text-emerald-600" :
                        "bg-rose-100 text-rose-600"
                      )}>
                        {enq.status}
                      </span>
                      
                      {enq.milestoneMet ? (
                        <span className="text-[8px] font-black flex items-center gap-1 text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-100 italic">
                           <BadgeCheck className="w-2.5 h-2.5" /> PAID
                        </span>
                      ) : enq.isPartial ? (
                        <span className="text-[8px] font-black flex items-center gap-1 text-orange-500 bg-orange-50 px-1.5 py-0.5 rounded-full border border-orange-100 italic">
                           <AlertTriangle className="w-2.5 h-2.5" /> PARTIAL
                        </span>
                      ) : (
                        <span className="text-[8px] font-black flex items-center gap-1 text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded-full border border-rose-100 italic">
                           <AlertTriangle className="w-2.5 h-2.5" /> UNPAID
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-4 text-right align-middle">
                    <div className="flex items-center justify-end gap-2 transition-all">
                      <button 
                        onClick={() => setSelectedEnquiry(enq)}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg p-1.5 shadow-sm transition-colors text-xs font-black flex items-center gap-1 pr-2"
                        title="View Full Form Details"
                      >
                        <Eye className="w-3.5 h-3.5" /> View Details
                      </button>

                      {enq.status !== "Converted" && enq.status !== "Rejected" && (
                        <>
                          {!enq.milestoneMet && (
                            <>
                              <button 
                                onClick={() => handleRecordPayment(enq.id)}
                                className="bg-amber-500 hover:bg-amber-400 text-white rounded-lg p-1.5 shadow-sm transition-colors text-xs font-black flex items-center gap-1 pr-2"
                                title="Record Cash Payment at Office"
                              >
                                <CreditCard className="w-3.5 h-3.5" /> Cash Pay
                              </button>

                              <button 
                                onClick={() => handleWhatsAppShare(enq)}
                                className="bg-emerald-500 hover:bg-emerald-400 text-white rounded-lg p-1.5 shadow-sm transition-colors text-xs font-black flex items-center gap-1 pr-2"
                                title="Share Review & Pay Link on WhatsApp"
                              >
                                <div className="bg-white/20 p-1 rounded">
                                  <svg className="w-3 h-3 fill-white" viewBox="0 0 24 24"><path d="M17.472 14.382c-.3-.149-1.777-.878-2.043-.974-.267-.1-.462-.149-.655.15-.192.3-.744.974-.91 1.16-.166.187-.333.21-.632.062-.303-.15-1.279-.47-2.435-1.503-.9-.8-1.507-1.79-1.685-2.09-.177-.3-.02-.46.13-.608.135-.133.303-.347.455-.52.152-.172.203-.295.303-.49.1-.197.05-.368-.025-.516-.075-.148-.655-1.577-.9-2.17-.238-.574-.48-.495-.655-.504-.17-.008-.364-.01-.557-.01-.193 0-.51.072-.776.362-.266.29-1.015 1.012-1.015 2.47 0 1.457 1.06 2.865 1.208 3.06.15.195 2.08 3.18 5.04 4.468.703.307 1.25.49 1.677.627.705.225 1.346.193 1.854.117.568-.084 1.777-.727 2.028-1.43.25-.702.25-1.305.176-1.43-.075-.124-.266-.197-.566-.347zm-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                                </div>
                                WhatsApp Share
                              </button>
                            </>
                          )}

                          {enq.status === "New" && !enq.milestoneMet && (
                            <button 
                              onClick={() => handleUpdateStatus(enq.id, "Contacted")}
                              className="bg-indigo-500 hover:bg-indigo-400 text-white rounded-lg p-1.5 shadow-sm transition-colors text-xs font-black flex items-center gap-1 pr-2"
                            >
                              <Phone className="w-3.5 h-3.5" /> Call
                            </button>
                          )}
                          
                          <button 
                            onClick={() => handleUpdateStatus(enq.id, "Converted")}
                            disabled={!enq.milestoneMet}
                            className={cn(
                                "rounded-lg p-1.5 shadow-sm transition-colors text-xs font-black flex items-center gap-1 pr-2",
                                enq.milestoneMet 
                                  ? "bg-emerald-500 hover:bg-emerald-400 text-white" 
                                  : "bg-slate-100 text-slate-400 cursor-not-allowed opacity-50"
                            )}
                            title={enq.milestoneMet ? "Convert to Admission" : "50% Term Payment required to promote"}
                          >
                            <CheckCircle className="w-3.5 h-3.5" /> Promote
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
                      
                      {enq.status === "Converted" && (
                        <span className="text-[10px] font-black text-emerald-600 uppercase italic">Successfully Admitted</span>
                      )}

                      {enq.status !== "Pending" && (
                        <button 
                          onClick={() => handleUpdateStatus(enq.id, "Pending")}
                          className="bg-muted hover:bg-muted/80 text-foreground opacity-60 rounded-lg p-1.5 transition-colors text-xs font-black flex items-center gap-1 pr-2"
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

      {/* ─── FULL ENQUIRY DETAIL MODAL ─── */}
      {selectedEnquiry && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 lg:p-12 overflow-hidden">
            <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-md" onClick={() => setSelectedEnquiry(null)} />
            
            <div className="relative bg-white w-full max-w-4xl h-full lg:h-[90vh] rounded-[40px] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
                
                {/* Modal Header */}
                <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-3xl bg-indigo-600 text-white flex items-center justify-center text-xl font-black shadow-lg">
                            {selectedEnquiry.studentFirstName[0]}
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-slate-950 tracking-tight leading-none">
                                {selectedEnquiry.studentFirstName} {selectedEnquiry.studentLastName}
                            </h3>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">
                                Reviewing Application &bull; {selectedEnquiry.academicYear}
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={() => setSelectedEnquiry(null)}
                        className="w-12 h-12 bg-white hover:bg-slate-100 rounded-2xl flex items-center justify-center transition-colors border border-slate-100 text-slate-400 hover:text-slate-950"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Modal Body (Scrollable) */}
                <div className="flex-1 overflow-auto p-10 space-y-12 bg-white custom-scrollbar">
                    
                    {/* ELITE V3: FINANCIAL HUB & HUB CONTROL */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sticky top-0 z-20">
                        {/* THE CALCULATOR CARD */}
                        <div className="bg-slate-950 rounded-[32px] p-8 text-white shadow-2xl flex flex-col justify-between">
                            <div>
                                <div className="flex items-center gap-3 mb-8">
                                    <div className="w-10 h-10 bg-indigo-500 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                                        <Sparkles className="w-5 h-5 text-white" />
                                    </div>
                                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Financial Hub Real-Time</h4>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-6 mb-8">
                                    <div>
                                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Academic Net</p>
                                        <p className="text-2xl font-black tracking-tight">₹{reviewData?.academicNetAnnual?.toLocaleString() || '0'}</p>
                                    </div>
                                    <div className="border-l border-white/10 pl-6">
                                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Transport Est.</p>
                                        <p className="text-2xl font-black tracking-tight text-emerald-400">₹{reviewData?.transportEstimate?.toLocaleString() || '0'}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-6 border-t border-white/10 flex items-center justify-between">
                                 <div>
                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Grand Portfolio Total</p>
                                    <p className="text-3xl font-black text-indigo-400 tracking-tighter">₹{reviewData?.grandTotalNet?.toLocaleString() || '0'}</p>
                                 </div>
                                 {reviewData?.milestoneMet ? (
                                     <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                                         <BadgeCheck className="w-4 h-4" /> Milestone Met
                                     </div>
                                 ) : (
                                     <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                                         <AlertTriangle className="w-4 h-4" /> Pending Pay
                                     </div>
                                 )}
                            </div>
                        </div>

                        {/* THE INDEPENDENT ENGINE CONTROLS */}
                        <div className="bg-white border-2 border-slate-100 rounded-[32px] p-8 space-y-6 shadow-sm overflow-hidden flex flex-col">
                            <div className="flex items-center justify-between">
                                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-900 flex items-center gap-2">
                                    <MapPin className="w-4 h-4 text-emerald-500" />
                                    Independent Transport Engine
                                </h4>
                                <div className="flex items-center gap-2">
                                    {reviewData?.totalPaid > 0 && !isUnlocked && (
                                        <div className="bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border border-amber-200 animate-pulse">
                                            Locked
                                        </div>
                                    )}
                                    {isUnlocked && (
                                        <div className="bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border border-emerald-200">
                                            Unlocked (15m)
                                        </div>
                                    )}
                                    <span className="text-[9px] font-black bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full uppercase italic">V3 Detached</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Assigned Route</label>
                                    <select 
                                        className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-4 text-[11px] font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                                        value={selectedRouteId}
                                        onChange={(e) => {
                                            setSelectedRouteId(e.target.value);
                                            setSelectedStopId(""); // Reset stop when route changes
                                        }}
                                    >
                                        <option value="">No Transport</option>
                                        {transportHub.map(route => (
                                            <option key={route.id} value={route.id}>{route.name} ({route.vehicleNo})</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Assigned Stop</label>
                                    <select 
                                        className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-4 text-[11px] font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all disabled:opacity-50"
                                        value={selectedStopId}
                                        disabled={!selectedRouteId}
                                        onChange={(e) => setSelectedStopId(e.target.value)}
                                    >
                                        <option value="">Select Stop / Fair</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div className="flex gap-3">
                                {reviewData?.totalPaid > 0 && !isUnlocked ? (
                                    <button 
                                        onClick={handleRequestUnlock}
                                        className="flex-1 h-11 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 shadow-lg active:scale-95"
                                    >
                                        <AlertTriangle className="w-4 h-4 text-amber-400" /> Request Unlock
                                    </button>
                                ) : (
                                    <button 
                                        onClick={handleSaveFinancials}
                                        disabled={loading}
                                        className={cn(
                                            "flex-1 h-11 bg-indigo-600 hover:bg-slate-900 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/10 active:scale-95",
                                            isUnlocked && "bg-emerald-600 hover:bg-emerald-700"
                                        )}
                                    >
                                        <BadgeCheck className="w-4 h-4" /> {isUnlocked ? "Save Correction" : "Save Financial Audit"}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* MODULAR SCHOLARSHIP SPLITTING SECTION */}
                    <div className="bg-slate-50 rounded-[32px] p-8 space-y-8 border border-slate-100">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-indigo-100 rounded-2xl flex items-center justify-center">
                                    <Fingerprint className="w-5 h-5 text-indigo-600" />
                                </div>
                                <div>
                                    <h4 className="text-xs font-black uppercase tracking-[0.2em] text-slate-900">Modular Scholarship & Waiver Engine</h4>
                                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Strict Dual-Control Authorization Policy</p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* TUITION DISCOUNT */}
                            <div className="space-y-4 p-6 bg-white rounded-3xl border border-slate-100 shadow-sm transition-all hover:border-indigo-200 group">
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">Gift / Tuition Discount</p>
                                    <span className="text-[8px] font-black bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full uppercase italic">Eligible: Tuition Only</span>
                                </div>
                                <div className="space-y-4">
                                    <input 
                                        type="number"
                                        placeholder="Flat ₹ Amount"
                                        className="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 text-sm font-black focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                        value={tuitionDiscount}
                                        onChange={(e) => setTuitionDiscount(Number(e.target.value))}
                                    />
                                    <textarea 
                                        placeholder="Mandatory Scholarship Justification (Merit, Sibling, etc.)"
                                        className="w-full min-h-[80px] bg-slate-50 border border-slate-200 rounded-xl p-4 text-[11px] font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                        value={scholarshipReason}
                                        onChange={(e) => setScholarshipReason(e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* ADMISSION WAIVER */}
                            <div className="space-y-4 p-6 bg-white rounded-3xl border border-slate-100 shadow-sm transition-all hover:border-emerald-200 group">
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Admission Fee Waiver</p>
                                    <span className="text-[8px] font-black bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full uppercase italic">Eligible: Admission ONLY</span>
                                </div>
                                <div className="space-y-4">
                                    <input 
                                        type="number"
                                        placeholder="Flat ₹ Amount"
                                        className="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 text-sm font-black focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                                        value={admissionWaiver}
                                        onChange={(e) => setAdmissionWaiver(Number(e.target.value))}
                                    />
                                    <textarea 
                                        placeholder="Mandatory Admission Waiver Reason (MGMT, Referral, etc.)"
                                        className="w-full min-h-[80px] bg-slate-50 border border-slate-200 rounded-xl p-4 text-[11px] font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                                        value={waiverReason}
                                        onChange={(e) => setWaiverReason(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Section: Student Identity */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                            <UserIcon className="w-4 h-4 text-indigo-500" />
                            <h4 className="text-xs font-black uppercase tracking-[0.2em] text-slate-900">Student Identity</h4>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                            <div className="space-y-1">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Date of Birth</p>
                                <p className="text-sm font-bold text-slate-900">{selectedEnquiry.dateOfBirth?.split('T')[0] || 'Not provided'}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Gender</p>
                                <p className="text-sm font-bold text-slate-900">{selectedEnquiry.gender}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Class Requested</p>
                                <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-[10px] font-black uppercase border border-blue-100">
                                    Class {selectedEnquiry.requestedClass}
                                </span>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Aadhaar / ID</p>
                                <div className="flex items-center gap-1.5 font-bold text-sm text-slate-900">
                                    <Fingerprint className="w-3.5 h-3.5 text-slate-400" />
                                    {selectedEnquiry.aadhaarNumber || 'XXX-NONE-XXX'}
                                </div>
                            </div>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-2xl flex items-center gap-3">
                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-slate-100">
                                <GraduationCapIcon className="w-5 h-5 text-indigo-500" />
                            </div>
                            <div className="flex-1">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Previous Schooling</p>
                                <p className="text-sm font-bold text-slate-900">{selectedEnquiry.previousSchool || 'New Admission / Fresher'}</p>
                            </div>
                        </div>
                    </div>

                    {/* Section: Parent / Contact */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                            <Users className="w-4 h-4 text-emerald-500" />
                            <h4 className="text-xs font-black uppercase tracking-[0.2em] text-slate-900">Parental Oversight</h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                            <div className="space-y-4">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-l-4 border-emerald-500 pl-2">Father's Profile</p>
                                <div className="space-y-3">
                                    <p className="text-lg font-black text-slate-900">{selectedEnquiry.parentName || selectedEnquiry.fatherName}</p>
                                    <div className="flex flex-col gap-2">
                                        <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
                                            <Phone className="w-4 h-4 text-emerald-500" /> {selectedEnquiry.parentPhone || selectedEnquiry.fatherPhone}
                                        </div>
                                        <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
                                            <Mail className="w-4 h-4 text-indigo-400" /> {selectedEnquiry.parentEmail || selectedEnquiry.fatherEmail || 'No Email Provided'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-4 p-6 bg-slate-50/50 rounded-[32px] border border-slate-100">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-l-4 border-rose-400 pl-2">Mother's Profile</p>
                                <div className="space-y-3">
                                    <p className="text-lg font-black text-slate-900">{selectedEnquiry.motherName || 'Not recorded in brief form'}</p>
                                    {selectedEnquiry.motherPhone && (
                                        <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
                                            <Phone className="w-4 h-4 text-rose-400" /> {selectedEnquiry.motherPhone}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Section: Office Metadata */}
                    <div className="pt-8 border-t border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-8 text-[10px] font-black uppercase tracking-[0.1em] text-slate-400">
                            <div>Branch: <span className="text-slate-900 ml-1">{branding?.branchName}</span></div>
                            <div>Source: <span className="text-indigo-600 ml-1">WEB PORTAL</span></div>
                            <div>Submitted: <span className="text-slate-950 ml-1">{new Date(selectedEnquiry.createdAt).toLocaleString()}</span></div>
                        </div>
                        <div className="flex items-center gap-3">
                            {selectedEnquiry.milestoneMet ? (
                                <BadgeCheck className="w-6 h-6 text-emerald-500" />
                            ) : (
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 rounded-full border border-amber-100">
                                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                                    <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Financial Milestone Pending</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Modal Actions handled via real-time selectors above */}
                <div className="p-8 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-4">
                    <button 
                        onClick={() => setSelectedEnquiry(null)}
                        className="h-14 px-8 bg-white border border-slate-200 hover:bg-slate-400 transition-colors rounded-2xl flex items-center gap-2 text-sm font-black text-slate-700 transition-all shadow-sm"
                    >
                        Close Review
                    </button>
                    {!selectedEnquiry.milestoneMet && (
                        <button 
                            onClick={() => { setSelectedEnquiry(null); handleWhatsAppShare(selectedEnquiry); }}
                            className="h-14 px-8 bg-emerald-600 hover:bg-emerald-500 rounded-2xl flex items-center gap-2 text-sm font-black text-white transition-all shadow-xl shadow-emerald-500/20"
                        >
                            <Share2 className="w-4 h-4" /> Approve & WhatsApp Link
                        </button>
                    )}
                    {selectedEnquiry.milestoneMet && selectedEnquiry.status !== "Converted" && (
                        <button 
                            onClick={() => { setSelectedEnquiry(null); handleUpdateStatus(selectedEnquiry.id, "Converted"); }}
                            className="h-14 px-8 bg-black hover:bg-slate-800 rounded-2xl flex items-center gap-2 text-sm font-black text-white transition-all shadow-xl shadow-slate-900/20"
                        >
                            <CheckCircle className="w-4 h-4 text-emerald-400" /> Promote to Student
                        </button>
                    )}
                </div>
            </div>
        </div>
      )}
    </div>
  );
}
