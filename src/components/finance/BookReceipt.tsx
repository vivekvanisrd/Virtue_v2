"use client";

import React, { useRef, useState } from "react";
import { CheckCircle2, ShoppingBag, Printer, Download, Loader2 } from "lucide-react";
import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";
import { useSearchParams } from "next/navigation";

interface BookReceiptProps {
  linkData: {
    token: string;
    student_name: string;
    parent_name: string;
    phone: string;
    amount: number;
    description?: string;
    pending_items?: string;
    razorpay_payment_id?: string;
    paid_at?: string;
    created_at?: string;
  };
  autoDownloadOverride?: boolean;
}

export function BookReceipt({ linkData, autoDownloadOverride }: BookReceiptProps) {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const searchParams = useSearchParams();
  const autoDownload = autoDownloadOverride ?? (searchParams ? searchParams.get("autodownload") === "true" : false);

  const date = new Date(linkData.paid_at || linkData.created_at || new Date()).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const formattedAmount = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(linkData.amount);

  const itemsList = linkData.pending_items 
    ? linkData.pending_items.split(",").map(i => i.trim()).filter(Boolean)
    : [];

  React.useEffect(() => {
    if (autoDownload && receiptRef.current) {
      const timer = setTimeout(() => {
        handleDownloadPDF();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [autoDownload]);

  const handleDownloadPDF = async () => {
    if (!receiptRef.current) return;
    setDownloading(true);

    try {
      const originalClass = receiptRef.current.className;
      receiptRef.current.className = "bg-white p-16 w-[210mm] min-h-[297mm] mx-auto";

      const dataUrl = await toPng(receiptRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
      });

      receiptRef.current.className = originalClass;

      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4',
      });

      const imgProps = pdf.getImageProperties(dataUrl);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`BookReceipt_${linkData.token.slice(0, 8)}.pdf`);
    } catch (error) {
      console.error("[PDF_GEN_ERROR]", error);
      alert("Failed to create PDF. Please try the Print option.");
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    if (!receiptRef.current) return;

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    const styles = Array.from(document.styleSheets);
    let styleHtml = '';
    try {
      styles.forEach(sheet => {
        if (sheet.href) {
          styleHtml += `<link rel="stylesheet" href="${sheet.href}">`;
        } else {
          const rules = Array.from(sheet.cssRules).map(rule => rule.cssText).join('\n');
          styleHtml += `<style>${rules}</style>`;
        }
      });
    } catch (e) {
      console.warn("Style extraction inhibited by CORS, falling back to basic styles.");
    }

    const content = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>PaVa Book Receipt - ${linkData.token.slice(0, 8)}</title>
          ${styleHtml}
          <style>
            @page { size: auto; margin: 0; }
            body { 
              margin: 0; 
              padding: 0; 
              background: white !important; 
              -webkit-print-color-adjust: exact !important; 
              print-color-adjust: exact !important;
            }
            .print-wrapper {
              padding: 40px !important;
              max-width: 800px;
              margin: 0 auto;
            }
            .print\\:hidden { display: none !important; }
            * { box-sizing: border-box; }
          </style>
        </head>
        <body>
          <div class="print-wrapper">
            ${receiptRef.current.innerHTML}
          </div>
          <script>
            window.onload = () => {
              setTimeout(() => {
                window.print();
                setTimeout(() => {
                  window.parent.document.body.removeChild(window.frameElement);
                }, 100);
              }, 500);
            };
          </script>
        </body>
      </html>
    `;

    doc.open();
    doc.write(content);
    doc.close();
  };

  return (
    <div className="w-full max-w-xl mx-auto space-y-6">
      <div 
        ref={receiptRef}
        className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-2xl print:shadow-none print:border-none print:p-0"
      >
        {/* Header (Branding & Receipt Details) */}
        <div className="flex justify-between items-start border-b border-slate-100 pb-8 mb-8">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-sky-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-sky-500/20">
                <ShoppingBag className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-black text-slate-900 tracking-tight leading-none mb-1">
                  PAVA EDUX
                </h1>
                <p className="text-[10px] font-black text-sky-600 uppercase tracking-widest leading-none">
                  Bookstore & Supplies
                </p>
              </div>
            </div>
            <p className="text-[10px] text-slate-400 font-bold leading-normal max-w-[200px]">
              Jubilee Hills, Hyderabad • help@pava-edux.edu.in
            </p>
          </div>

          <div className="text-right space-y-2">
            <div className="inline-block px-4 py-2 bg-saffron-50/50 border border-amber-100 rounded-2xl text-right">
              <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest leading-none mb-1">Receipt ID</p>
              <p className="text-sm font-black text-slate-900 leading-none">
                PAVA-BK-{linkData.token.slice(0, 8).toUpperCase()}
              </p>
            </div>
            <p className="text-[9px] font-bold text-slate-400 italic">Issued on {date}</p>
          </div>
        </div>

        {/* Buyer Information */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 border-b border-slate-50 pb-1">
              Customer Details
            </h3>
            <h4 className="text-base font-black text-slate-800">{linkData.parent_name}</h4>
            <p className="text-xs font-bold text-slate-400 mt-1">Ph: {linkData.phone}</p>
          </div>

          <div>
            <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 border-b border-slate-50 pb-1">
              Student / Recipient
            </h3>
            <h4 className="text-base font-black text-slate-800">{linkData.student_name}</h4>
            <p className="text-xs font-bold text-slate-400 mt-1">Classroom Delivery</p>
          </div>
        </div>

        {/* Items Purchased */}
        <div className="mb-8">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-900 text-[9px] font-black uppercase tracking-widest text-slate-400 text-left">
                <th className="py-3">Description</th>
                <th className="py-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              <tr className="text-sm font-bold text-slate-700">
                <td className="py-5">
                  <span className="font-black text-slate-900">Consolidated Book & Supply Kit</span>
                  {itemsList.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {itemsList.map((item, idx) => (
                        <span 
                          key={idx} 
                          className="inline-block px-2.5 py-1 bg-sky-50 text-[10px] text-sky-700 font-bold rounded-lg border border-sky-100/50"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  )}
                </td>
                <td className="py-5 text-right font-black text-slate-900">
                  {formattedAmount}
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr className="border-t border-slate-900">
                <td className="py-6">
                  <div className="flex items-center gap-2 text-emerald-600">
                    <CheckCircle2 className="w-5 h-5" />
                    <p className="text-xs font-black uppercase tracking-widest">Payment Verified & Sealed</p>
                  </div>
                </td>
                <td className="py-6 text-right">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Paid</p>
                  <p className="text-2xl font-black text-slate-900 tracking-tight">{formattedAmount}</p>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Transaction Reference */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex justify-between items-center text-xs font-bold text-slate-500 mb-8">
          <span>Gateway Method: {linkData.razorpay_payment_id ? "Razorpay" : "Mock Gateway"}</span>
          {linkData.razorpay_payment_id && (
            <span className="font-mono text-[11px] text-slate-400">Ref: {linkData.razorpay_payment_id}</span>
          )}
        </div>

        {/* Terms */}
        <div className="pt-6 border-t border-dashed border-slate-200">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Notice / గమనిక</p>
          <ul className="text-[9px] text-slate-400 space-y-1 font-medium leading-relaxed">
            <li>• Show this receipt on your mobile phone or as a printout to collect books from the school. / పాఠశాలలో పుస్తకాలు తీసుకోవడానికి ఈ రశీదును మీ మొబైల్ ఫోన్‌లో లేదా ప్రింట్ కాపీ రూపంలో చూపించాల్సి ఉంటుంది.</li>
            <li>• The materials listed above are included in the kit. Please verify all items before leaving the counter. / ఈ క్రింది సామాగ్రి కిట్‌లో చేర్చబడింది. దయచేసి కౌంటర్ నుండి వెళ్లే ముందు అన్ని వస్తువులను సరిచూసుకోండి.</li>
            <li>• Fees once paid are strictly non-refundable. / ఒకసారి చెల్లించిన రుసుము ఎట్టిపరిస్థితుల్లోనూ తిరిగి ఇవ్వబడదు.</li>
          </ul>
        </div>
      </div>

      {/* Print / Download Quick Actions */}
      <div className="flex gap-4 print:hidden px-4">
        <button 
          onClick={handlePrint}
          className="flex-1 py-3.5 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-slate-800 transition-all active:scale-[0.98] shadow-lg shadow-slate-900/10"
        >
          <Printer className="w-4 h-4" /> Print Document
        </button>
        <button 
          onClick={handleDownloadPDF}
          disabled={downloading}
          className="flex-1 py-3.5 bg-white border border-slate-200 text-slate-900 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-slate-50 transition-all active:scale-[0.98] disabled:opacity-50"
        >
          {downloading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          Download as PDF
        </button>
      </div>
    </div>
  );
}
