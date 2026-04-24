"use client";

import React, { useRef } from "react";
import { 
  CheckCircle2, Printer, PlusCircle, ArrowLeft, 
  User, School, Users, MapPin, CreditCard, Shield, Download, ArrowRight, Wallet
} from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import jsPDF from "jspdf";
import { toPng } from "html-to-image";
import { useTabs } from "@/context/tab-context";

interface SummaryProps {
  studentData: any;
  admissionId?: string;
  schoolName?: string;
  onReset?: () => void;
  isReviewMode?: boolean;
  onEditStep?: (stepId: number) => void;
  dbStudentId?: string; // The Actual DB ID for redirection
}

export function StudentAdmissionSummary({ studentData, admissionId, schoolName, onReset, isReviewMode, onEditStep, dbStudentId }: SummaryProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const { openTab } = useTabs();
  const router = useRouter();

  const handleProceedToPayment = () => {
    console.log("[ADMISSION_SUMMARY] Proceeding to Payment Hub. StudentID:", dbStudentId);
    if (dbStudentId) {
      openTab({ 
        id: "fee-collection", 
        title: "Fee Collection", 
        icon: Wallet, 
        component: "Finance", 
        params: { studentId: dbStudentId } 
      });
    } else {
      console.error("[ADMISSION_SUMMARY] Redirection blocked: dbStudentId is missing.");
      alert("System Error: Student identity context lost. Please return to the directory.");
    }
  };

  const handlePrint = () => {
    if (!printRef.current) return;

    // Create a hidden iframe for print isolation
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    // Extract all styles to inject into the iframe
    const styles = Array.from(document.querySelectorAll("style, link[rel='stylesheet']"))
      .map(style => style.outerHTML)
      .join("");

    doc.open();
    doc.write(`
      <html>
        <head>
          <title>Admission Receipt - ${admissionId}</title>
          ${styles}
          <style>
            @page { size: A4; margin: 0; }
            body { margin: 0; padding: 15mm; background: white !important; -webkit-print-color-adjust: exact; }
            .print-container { width: 100% !important; border: none !important; box-shadow: none !important; }
            /* Force light theme variables for the iframe */
            :root {
              --background: 0 0% 100%;
              --foreground: 222.2 84% 4.9%;
              --slate-50: #f8fafc;
              --slate-100: #f1f5f9;
              --slate-200: #e2e8f0;
              --slate-300: #cbd5e1;
              --slate-400: #94a3b8;
              --slate-500: #64748b;
              --slate-700: #334155;
              --slate-800: #1e293b;
              --slate-900: #0f172a;
            }
          </style>
        </head>
        <body>
          <div class="print-container">${printRef.current.innerHTML}</div>
          <script>
            window.onload = () => {
              window.print();
              setTimeout(() => {
                window.frameElement?.remove();
              }, 1000);
            };
          </script>
        </body>
      </html>
    `);
    doc.close();
  };

  const handleDownloadPDF = async () => {
    if (!printRef.current) return;
    
    try {
      const element = printRef.current;
      
      // Temporarily force dimensions to prevent clipping
      const originalStyle = element.getAttribute("style") || "";
      element.style.width = "794px"; // A4 Width at 96 DPI
      element.style.height = "1123px"; // A4 Height at 96 DPI
      element.style.position = "relative";
      element.style.overflow = "hidden";
      element.style.margin = "0";
      
      // html-to-image is much more robust for modern CSS (oklch, lab, etc)
      const dataUrl = await toPng(element, {
        quality: 1.0,
        pixelRatio: 2,
        width: 794,
        height: 1123,
        backgroundColor: "#ffffff",
        style: {
          transform: "none",
          borderRadius: "0",
          boxShadow: "none",
        }
      });
      
      // Restore styles
      element.setAttribute("style", originalStyle);
      
      const pdf = new jsPDF({
        orientation: "p",
        unit: "mm",
        format: "a4",
      });
      
      pdf.addImage(dataUrl, "PNG", 0, 0, 210, 297);
      pdf.save(`Admission_${admissionId}_${studentData.firstName}.pdf`);
    } catch (error) {
      console.error("PDF Generation Error:", error);
      alert("Failed to generate PDF. Please try the Print option instead.");
    }
  };

  const InfoRow = ({ label, value, className, targetStep }: { label: string; value: string | number | null | undefined; className?: string; targetStep?: number }) => {
    const isClickable = isReviewMode && targetStep;
    
    return (
      <div 
        onClick={() => isClickable && onEditStep?.(targetStep)}
        className={cn(
          "grid grid-cols-2 py-1.5 border-b border-border last:border-0", 
          isClickable && "cursor-pointer hover:bg-primary/5 px-2 rounded-lg transition-all group",
          className
        )}
      >
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold text-foreground opacity-50 uppercase tracking-tight">{label}</span>
          {isClickable && <div className="w-1 h-1 rounded-full bg-primary opacity-0 group-hover:opacity-100 transition-opacity" />}
        </div>
        <span className={cn(
          "text-[12px] font-semibold text-foreground opacity-80",
          isClickable && "group-hover:text-primary transition-colors"
        )}>
          {value || "N/A"}
        </span>
      </div>
    );
  };

  const SectionHeader = ({ icon: Icon, title }: { icon: any; title: string }) => (
    <div className="flex items-center gap-2 mb-3 mt-4 first:mt-0">
      <div className="p-1.5 bg-primary/5 rounded-lg border border-primary/10">
        <Icon className="w-3.5 h-3.5 text-primary" />
      </div>
      <h3 className="text-xs font-black text-foreground uppercase tracking-wider">{title}</h3>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* ─── Header Actions (Hidden in Review Mode) ─── */}
      {!isReviewMode && (
        <div className="flex items-center justify-between no-print">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-emerald-500" />
            </div>
            <div>
              <h2 className="text-xl font-black text-foreground leading-none">Provisional Admission Successful</h2>
              <p className="text-xs text-foreground opacity-60 mt-1 uppercase font-bold tracking-tight">Student saved as provisional • Redirect to Payment Hub to confirm</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
               onClick={handleProceedToPayment}
               disabled={!dbStudentId}
               className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl transition-all shadow-lg shadow-emerald-500/20 active:scale-95 group"
            >
               <Wallet className="w-4 h-4" />
               Proceed to Payment Hub
               <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-muted hover:bg-muted/80 text-foreground opacity-70 text-xs font-bold rounded-xl transition-all border border-border"
            >
              <Printer className="w-3.5 h-3.5" />
              Print
            </button>
            <button
              onClick={onReset}
              className="flex items-center gap-2 px-4 py-2 bg-background border border-border hover:border-primary/50 text-foreground opacity-60 text-xs font-bold rounded-xl transition-all"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              New Admission
            </button>
          </div>
        </div>
      )}

      {/* ─── Printable Document ─── */}
      <div 
        ref={printRef}
        className="bg-background rounded-2xl border border-border shadow-xl print:shadow-none print:border-0 overflow-hidden print-container"
      >
        {/* Document Header (Fixed Layout for Print) */}
        <div className="p-8 print:p-6 bg-muted/50 border-b border-border flex justify-between items-start print:bg-background">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center font-black text-white text-sm uppercase">P</div>
              <h1 className="text-2xl font-black tracking-tighter text-foreground uppercase">{schoolName || "PaVa-EDUX Academy"}</h1>
            </div>
            <p className="text-xs text-foreground opacity-60 max-w-[300px] font-medium leading-relaxed uppercase">
              {isReviewMode ? "Verification Ledger - Reviewing Entry" : "Official Student Registration Form"} <br />
              Generated on {new Date().toLocaleDateString()}
            </p>
          </div>
          <div className="text-right">
            <span className="block text-[10px] font-black text-foreground opacity-50 uppercase tracking-widest mb-1">
              {(admissionId?.includes("PROV") || !studentData.admissionNumber) ? "Provisional Tracking ID" : "Official Admission No"}
            </span>
            <span className="block text-2xl font-black text-emerald-600 font-mono">{admissionId || "DRAFT_SCOPE"}</span>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-8 print:p-6 grid grid-cols-2 gap-x-12 gap-y-2">
          {/* Left Column: Personal & Academic */}
          <div className="space-y-4 print:space-y-2">
            <div>
              <SectionHeader icon={User} title="Student Information" />
              <div className="bg-muted/50/50 p-4 print:p-3 rounded-xl border border-border/50">
                <InfoRow label="Full Name" value={`${studentData.firstName} ${studentData.lastName || ""}`} targetStep={1} />
                <InfoRow label="Gender" value={studentData.gender} targetStep={1} />
                <InfoRow label="DOB" value={studentData.dateOfBirth} targetStep={1} />
                <InfoRow label="Aadhaar No" value={studentData.aadhaarNumber} targetStep={1} />
                <InfoRow label="Category" value={studentData.category} targetStep={1} />
                <InfoRow label="Blood Group" value={studentData.bloodGroup} targetStep={1} />
              </div>
            </div>

            <div>
              <SectionHeader icon={School} title="Academic Placement" />
              <div className="bg-muted/50/50 p-4 print:p-3 rounded-xl border border-border/50">
                <InfoRow label="Class" value={studentData.className || studentData.classId} targetStep={2} />
                <InfoRow label="Section" value={studentData.sectionName || studentData.sectionId} targetStep={2} />
                <InfoRow label="Academic Year" value={studentData.academicYearId} targetStep={2} />
                <InfoRow label="Admission Date" value={studentData.admissionDate} targetStep={2} />
                <InfoRow label="Branch" value={studentData.branchName || studentData.branchId} targetStep={2} />
                <InfoRow label="PEN Number" value={studentData.penNumber} targetStep={2} />
              </div>
            </div>
          </div>

          {/* Right Column: Family & Financial */}
          <div className="space-y-4 print:space-y-2">
            <div>
              <SectionHeader icon={Users} title="Family Details" />
              <div className="bg-muted/50/50 p-4 print:p-3 rounded-xl border border-border/50">
                <InfoRow label="Father Name" value={studentData.fatherName} targetStep={3} />
                <InfoRow label="Father Phone" value={studentData.fatherPhone} targetStep={3} />
                <InfoRow label="Father Aadhaar" value={studentData.fatherAadhaar} targetStep={3} />
                <hr className="my-2 border-border/30" />
                <InfoRow label="Mother Name" value={studentData.motherName} targetStep={3} />
                <InfoRow label="Mother Phone" value={studentData.motherPhone} targetStep={3} />
                <InfoRow label="Mother Aadhaar" value={studentData.motherAadhaar} targetStep={3} />
                <InfoRow label="Emergency Contact" value={studentData.emergencyContactPhone} targetStep={3} />
              </div>
            </div>

            <div>
              <SectionHeader icon={CreditCard} title="Ledger Inception Preview" />
              <div className="bg-slate-900/[0.02] p-4 print:p-3 rounded-xl border border-slate-200 shadow-inner">
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-[11px] font-bold">
                    <span className="text-slate-400 uppercase tracking-tighter">Initial Charges (Accrual)</span>
                    <span className="text-slate-400">Amount (₹)</span>
                  </div>
                  <hr className="border-slate-200" />
                  <InfoRow label="Tuition Fee Charge" value={`+${studentData.tuitionFee}`} className="border-0 !py-0.5" targetStep={5} />
                  <InfoRow label="Admission Fee Charge" value={`+${studentData.admissionFee}`} className="border-0 !py-0.5" targetStep={5} />
                  {Number(studentData.cautionDeposit || 0) > 0 && <InfoRow label="Caution Deposit" value={`+${studentData.cautionDeposit}`} className="border-0 !py-0.5" targetStep={5} />}
                  {Number(studentData.libraryFee || 0) > 0 && <InfoRow label="Library Fee" value={`+${studentData.libraryFee}`} className="border-0 !py-0.5" targetStep={5} />}
                  <hr className="border-slate-200 mt-2" />
                  <div className="flex justify-between items-center pt-2">
                    <span className="text-[10px] font-black text-slate-900 uppercase tracking-tight">Opening Ledger Balance</span>
                    <span className="text-base font-black text-slate-900">
                      ₹{Number(studentData.tuitionFee || 0) + Number(studentData.admissionFee || 0) + Number(studentData.cautionDeposit || 0) + Number(studentData.libraryFee || 0) + Number(studentData.labFee || 0) + Number(studentData.sportsFee || 0) + Number(studentData.developmentFee || 0) + Number(studentData.examFee || 0)}
                    </span>
                  </div>
                </div>
                <div className="mt-3 bg-emerald-500/5 border border-emerald-500/20 p-2 rounded-lg">
                   <p className="text-[9px] text-emerald-600 font-bold uppercase text-center tracking-tighter">
                     ✓ Ledger Authenticated • No Discounts Applied
                   </p>
                </div>
              </div>
            </div>
          </div>

          {/* Full Width: Address & Transport */}
          <div className="col-span-2 mt-2 print:mt-1 space-y-4 print:space-y-1">
            <div>
              <SectionHeader icon={MapPin} title="Residence & Transport" />
              <div className="bg-muted/50/50 p-4 print:p-2.5 rounded-xl border border-border/50 grid grid-cols-2 gap-x-12">
                <div className="space-y-1 group" onClick={() => isReviewMode && onEditStep?.(4)}>
                  <span className="text-[10px] font-bold text-foreground opacity-50 uppercase tracking-tight flex items-center gap-1.5">
                    Address {isReviewMode && <div className="w-1 h-1 rounded-full bg-primary" />}
                  </span>
                  <p className={cn(
                    "text-[11px] font-semibold text-slate-700 leading-tight",
                    isReviewMode && "group-hover:text-primary cursor-pointer transition-colors"
                  )}>
                    {studentData.currentAddress}, {studentData.city}, {studentData.pinCode}
                  </p>
                </div>
                <div className="space-y-1 group" onClick={() => isReviewMode && onEditStep?.(4)}>
                  <span className="text-[10px] font-bold text-foreground opacity-50 uppercase tracking-tight flex items-center gap-1.5">
                    Transport {isReviewMode && <div className="w-1 h-1 rounded-full bg-primary" />}
                  </span>
                  <p className={cn(
                    "text-[11px] font-semibold text-slate-700",
                    isReviewMode && "group-hover:text-primary cursor-pointer transition-colors"
                  )}>
                    {studentData.transportRequired ? `Required: ${studentData.pickupStop}` : "Not Required"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ─── Signature Section ─── */}
          <div className="col-span-2 mt-8 print:mt-12 grid grid-cols-2 gap-24 px-4 pb-6 print:pb-4">
            <div className="text-center">
              <div className="border-t border-border pt-3">
                <p className="text-[10px] font-black text-foreground uppercase tracking-widest leading-none">School In-charge Signature</p>
                <p className="text-[8px] text-foreground opacity-50 mt-1 uppercase font-bold tracking-tight">Office Seal Required</p>
              </div>
            </div>
            <div className="text-center">
              <div className="border-t border-border pt-3">
                <p className="text-[10px] font-black text-foreground uppercase tracking-widest leading-none">Parent / Guardian Signature</p>
                <p className="text-[8px] text-foreground opacity-50 mt-1 uppercase font-bold tracking-tight">Declared as Correct Information</p>
              </div>
            </div>
          </div>

          {/* Footer Note */}
          <div className="col-span-2 text-center border-t border-border opacity-50">
            <p className="text-[9px] text-foreground opacity-50 uppercase font-black tracking-[0.2em]">
              Authorized Computer Generated Receipt • PaVa-EDUX Management System • Confidential Student Data
            </p>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @page {
          size: A4;
          margin: 0;
        }
        @media print {
          /* Global Print Reset */
            .sidebar, 
            .header, 
            .tab-list,
            div.flex.min-h-screen > aside,
            div.flex.min-h-screen > main > header,
            .animate-in { 
              display: none !important; 
              height: 0 !important;
              margin: 0 !important;
              padding: 0 !important;
            }

            /* Ensure main container expands */
            main, .max-w-4xl {
              padding: 0 !important;
              margin: 0 !important;
              max-width: none !important;
              width: 100% !important;
            }

            /* Show & Fix Summary Container */
            .print-container {
              position: static !important;
              width: 190mm !important;
              margin: 0 auto !important;
              padding: 0 !important;
              border: none !important;
              box-shadow: none !important;
              display: block !important;
              visibility: visible !important;
            }

            /* Force light theme colors on specific elements */
            .bg-muted/50, .bg-muted/50\/50 { background-color: #f8fafc !important; }
            .text-foreground { color: #0f172a !important; }
            .text-slate-800 { color: #1e293b !important; }
            .text-slate-700 { color: #334155 !important; }
            .text-foreground opacity-60 { color: #64748b !important; }
            .text-foreground opacity-50 { color: #94a3b8 !important; }
            .border-border { border-color: #f1f5f9 !important; }
            .border-border { border-color: #e2e8f0 !important; }
            .border-slate-300 { border-color: #cbd5e1 !important; }
            
            /* Tighten spacing for single page */
            .p-8 { padding: 1.25rem !important; }
            .p-6 { padding: 1rem !important; }
            .gap-y-2 { gap: 0.1rem !important; }
            .space-y-4 { margin-top: 0.1rem !important; }
            .mt-8 { margin-top: 1.5rem !important; }
          }
        }
      `}</style>
    </div>
  );
}
