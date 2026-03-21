"use client";

import React, { useRef } from "react";
import { 
  CheckCircle2, Printer, PlusCircle, ArrowLeft, 
  User, School, Users, MapPin, CreditCard, Shield, Download
} from "lucide-react";
import { cn } from "@/lib/utils";
import jsPDF from "jspdf";
import { toPng } from "html-to-image";

interface SummaryProps {
  studentData: any;
  admissionId: string;
  onReset: () => void;
}

export function StudentAdmissionSummary({ studentData, admissionId, onReset }: SummaryProps) {
  const printRef = useRef<HTMLDivElement>(null);

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

  const InfoRow = ({ label, value, className }: { label: string; value: string | number | null | undefined; className?: string }) => (
    <div className={cn("grid grid-cols-2 py-1.5 border-b border-slate-50 last:border-0", className)}>
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{label}</span>
      <span className="text-[12px] font-semibold text-slate-700">{value || "N/A"}</span>
    </div>
  );

  const SectionHeader = ({ icon: Icon, title }: { icon: any; title: string }) => (
    <div className="flex items-center gap-2 mb-3 mt-4 first:mt-0">
      <div className="p-1.5 bg-primary/5 rounded-lg border border-primary/10">
        <Icon className="w-3.5 h-3.5 text-primary" />
      </div>
      <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">{title}</h3>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* ─── Header Actions ─── */}
      <div className="flex items-center justify-between no-print">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6 text-emerald-500" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 leading-none">Admission Successful</h2>
            <p className="text-xs text-slate-500 mt-1 uppercase font-bold tracking-tight">Record stored in secure cloud repository</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all border border-slate-200"
          >
            <Printer className="w-3.5 h-3.5" />
            Print
          </button>
          <button
            onClick={handleDownloadPDF}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all shadow-lg hover:shadow-slate-200"
          >
            <Download className="w-3.5 h-3.5" />
            Download PDF
          </button>
          <button
            onClick={onReset}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:border-slate-300 text-slate-600 text-xs font-bold rounded-xl transition-all"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            New Admission
          </button>
        </div>
      </div>

      {/* ─── Printable Document ─── */}
      <div 
        ref={printRef}
        className="bg-white rounded-2xl border border-slate-200 shadow-xl print:shadow-none print:border-0 overflow-hidden print-container"
      >
        {/* Document Header (Fixed Layout for Print) */}
        <div className="p-8 print:p-6 bg-slate-50 border-b border-slate-100 flex justify-between items-start print:bg-white">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center font-black text-white text-sm uppercase">V</div>
              <h1 className="text-2xl font-black tracking-tighter text-slate-900 uppercase">Virtue Modern School</h1>
            </div>
            <p className="text-xs text-slate-500 max-w-[300px] font-medium leading-relaxed uppercase">
              Official Student Registration Form <br />
              Generated on {new Date().toLocaleDateString()}
            </p>
          </div>
          <div className="text-right">
            <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Registration ID</span>
            <span className="block text-2xl font-black text-primary font-mono">{admissionId}</span>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-8 print:p-6 grid grid-cols-2 gap-x-12 gap-y-2">
          {/* Left Column: Personal & Academic */}
          <div className="space-y-4 print:space-y-2">
            <div>
              <SectionHeader icon={User} title="Student Information" />
              <div className="bg-slate-50/50 p-4 print:p-3 rounded-xl border border-slate-100/50">
                <InfoRow label="Full Name" value={`${studentData.firstName} ${studentData.lastName || ""}`} />
                <InfoRow label="Gender" value={studentData.gender} />
                <InfoRow label="DOB" value={studentData.dateOfBirth} />
                <InfoRow label="Aadhaar No" value={studentData.aadhaarNumber} />
                <InfoRow label="Category" value={studentData.category} />
                <InfoRow label="Blood Group" value={studentData.bloodGroup} />
              </div>
            </div>

            <div>
              <SectionHeader icon={School} title="Academic Placement" />
              <div className="bg-slate-50/50 p-4 print:p-3 rounded-xl border border-slate-100/50">
                <InfoRow label="Class" value={studentData.classId} />
                <InfoRow label="Section" value={studentData.sectionId} />
                <InfoRow label="Academic Year" value={studentData.academicYearId} />
                <InfoRow label="Admission Date" value={studentData.admissionDate} />
                <InfoRow label="Branch" value={studentData.branchId} />
                <InfoRow label="PEN Number" value={studentData.penNumber} />
              </div>
            </div>
          </div>

          {/* Right Column: Family & Financial */}
          <div className="space-y-4 print:space-y-2">
            <div>
              <SectionHeader icon={Users} title="Family Details" />
              <div className="bg-slate-50/50 p-4 print:p-3 rounded-xl border border-slate-100/50">
                <InfoRow label="Father Name" value={studentData.fatherName} />
                <InfoRow label="Father Phone" value={studentData.fatherPhone} />
                <InfoRow label="Mother Name" value={studentData.motherName} />
                <InfoRow label="Mother Phone" value={studentData.motherPhone} />
                <InfoRow label="Emergency Contact" value={studentData.emergencyContactPhone} />
              </div>
            </div>

            <div>
              <SectionHeader icon={CreditCard} title="Financial Snapshot" />
              <div className="bg-slate-50/50 p-4 print:p-3 rounded-xl border border-slate-100/50">
                <InfoRow label="Tuition Fee" value={studentData.tuitionFee} />
                <InfoRow label="Admission Fee" value={studentData.admissionFee} />
                <InfoRow label="Payment Mode" value={studentData.paymentType} />
                <div className="flex justify-between items-center py-3 print:py-2 mt-2 border-t border-slate-200">
                  <span className="text-[10px] font-black text-slate-800 uppercase">Estimated 1st Term Dues</span>
                  <span className="text-base font-black text-emerald-600">
                    ₹{(Number(studentData.tuitionFee || 0) + Number(studentData.admissionFee || 0)) * 0.5}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Full Width: Address & Transport */}
          <div className="col-span-2 mt-2 print:mt-1 space-y-4 print:space-y-1">
            <div>
              <SectionHeader icon={MapPin} title="Residence & Transport" />
              <div className="bg-slate-50/50 p-4 print:p-2.5 rounded-xl border border-slate-100/50 grid grid-cols-2 gap-x-12">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Address</span>
                  <p className="text-[11px] font-semibold text-slate-700 leading-tight">
                    {studentData.currentAddress}, {studentData.city}, {studentData.pinCode}
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Transport Integration</span>
                  <p className="text-[11px] font-semibold text-slate-700">
                    {studentData.transportRequired ? `Required: ${studentData.pickupStop}` : "Not Required"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ─── Signature Section ─── */}
          <div className="col-span-2 mt-8 print:mt-12 grid grid-cols-2 gap-24 px-4 pb-6 print:pb-4">
            <div className="text-center">
              <div className="border-t border-slate-300 pt-3">
                <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest leading-none">School In-charge Signature</p>
                <p className="text-[8px] text-slate-400 mt-1 uppercase font-bold tracking-tight">Office Seal Required</p>
              </div>
            </div>
            <div className="text-center">
              <div className="border-t border-slate-300 pt-3">
                <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest leading-none">Parent / Guardian Signature</p>
                <p className="text-[8px] text-slate-400 mt-1 uppercase font-bold tracking-tight">Declared as Correct Information</p>
              </div>
            </div>
          </div>

          {/* Footer Note */}
          <div className="col-span-2 text-center border-t border-slate-50 pt-4 print:pt-2 opacity-50">
            <p className="text-[9px] text-slate-400 uppercase font-black tracking-[0.2em]">
              Authorized Computer Generated Receipt • Virtue School Management System • Confidential Student Data
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
            .bg-slate-50, .bg-slate-50\/50 { background-color: #f8fafc !important; }
            .text-slate-900 { color: #0f172a !important; }
            .text-slate-800 { color: #1e293b !important; }
            .text-slate-700 { color: #334155 !important; }
            .text-slate-500 { color: #64748b !important; }
            .text-slate-400 { color: #94a3b8 !important; }
            .border-slate-100 { border-color: #f1f5f9 !important; }
            .border-slate-200 { border-color: #e2e8f0 !important; }
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
