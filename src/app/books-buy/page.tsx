"use client";

import { useState } from "react";
import { BookOpen, User, Phone, CheckCircle2, Loader2, Sparkles, ShoppingBag, ArrowRight, ShieldCheck, FileText, HelpCircle } from "lucide-react";

type Kit = {
  class: string;
  price: number;
  items: string;
};

const KITS: Kit[] = [
  { class: "Test Kit (Live)", price: 1, items: "1 Unit of Bookstore Test Item for Live Payment Verification" },
  { class: "Play Group", price: 1230, items: "Play Group Textbooks, Coloring Book, Activity Kit, Crayons" },
  { class: "Nursery", price: 2700, items: "Nursery Alphabet & Numbers Books, Drawing book, Clay Kit, Activity worksheets" },
  { class: "PP I (LKG)", price: 3700, items: "PP I Phonics, Math Workbook, General Awareness, Rhymes Book, Writing Notebooks, Pencil Box" },
  { class: "PP II (UKG)", price: 4700, items: "PP II English Reader, Hindi Varnamala, Math Practice, Cursive writing, Notebooks, Art supplies" },
  { class: "Class I", price: 8250, items: "Class I Textbooks (English, Hindi, Math, EVS, Comp), Notebooks, Sketch book, Pencil/Crayon kit" },
  { class: "Class II", price: 8250, items: "Class II Textbooks (English, Hindi, Math, EVS, Comp), Notebooks, Drawing notebook, Art supplies" },
  { class: "Class III", price: 9000, items: "Class III Textbooks (English, Hindi, Math, Science, Social, Comp), Notebooks, Geometry box" },
  { class: "Class IV", price: 8650, items: "Class IV Textbooks (English, Hindi, Math, Science, Social, Comp), Notebooks, Art kit, Lab Manual" },
  { class: "Class V", price: 8650, items: "Class V Textbooks (English, Hindi, Math, Science, Social, Comp), Notebooks, Geometry set" },
  { class: "Class VI", price: 5100, items: "Class VI Textbooks (NCERT English, Hindi, Math, Science, Social, Sans), Notebooks, Lab guides" },
  { class: "Class VII", price: 5200, items: "Class VII Textbooks (NCERT English, Hindi, Math, Science, Social, Sans), Notebooks, Graph book" },
  { class: "Class VIII", price: 5550, items: "Class VIII Textbooks (NCERT English, Hindi, Math, Science, Social, Sans), Notebooks, Practical books" },
  { class: "Class IX", price: 5550, items: "Class IX NCERT Textbooks, Lab Manuals, Science journals, Graph journals, Register notebooks" },
];

export default function BookstorePurchasePage() {
  const [showForm, setShowForm] = useState(false);
  const [readTerms, setReadTerms] = useState(false);

  const [studentName, setStudentName] = useState("");
  const [parentName, setParentName] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedKitIndex, setSelectedKitIndex] = useState<number | "">("");
  const [acceptedPolicy, setAcceptedPolicy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const selectedKit = selectedKitIndex !== "" ? KITS[selectedKitIndex] : null;

  async function handlePaymentSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!studentName.trim() || !parentName.trim() || !phone.trim() || selectedKitIndex === "") {
      setError("Please fill out all required fields.");
      return;
    }

    if (phone.replace(/[^0-9]/g, "").length < 10) {
      setError("Please enter a valid 10-digit phone number.");
      return;
    }

    if (!acceptedPolicy) {
      setError("Please accept the bookstore terms.");
      return;
    }

    setLoading(true);
    try {
      const kit = KITS[selectedKitIndex as number];
      const res = await fetch("/api/fee-link/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentName: studentName.trim(),
          parentName: parentName.trim(),
          phone: phone.replace(/[^0-9]/g, "").slice(-10), // normalize to last 10 digits
          amount: kit.price.toString(),
          description: `Book Kit - ${kit.class}`,
          pendingItems: kit.items, // Saves the included items list
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to initialize payment gateway.");
      }

      // Immediately redirect the parent to the verification and payment portal
      window.location.href = `/fee-pay/${data.token}`;
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  }

  const inputClass =
    "w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-[#4DA8DA] focus:ring-4 focus:ring-[#4DA8DA]/10 transition-all text-sm";
  const labelClass = "block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5";

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4 py-12 relative overflow-hidden">
      {/* Visual Accents */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-sky-200/20 rounded-full blur-3xl pointer-events-none -mr-48 -mt-48" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-amber-200/20 rounded-full blur-3xl pointer-events-none -ml-48 -mb-48" />

      <div className="relative w-full max-w-xl animate-fade-up">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white border border-slate-100 shadow-xl shadow-slate-200/50 mb-4">
            <ShoppingBag className="w-8 h-8 text-[#4DA8DA]" />
          </div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight leading-none">Bookstore Checkout</h1>
          <p className="text-slate-500 text-sm mt-2 font-medium">PAVA EDUX Bookstore & Supplies Portal</p>
        </div>

        {/* ─── STATE 1: TERMS AND CONDITIONS GATE ─── */}
        {!showForm ? (
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl shadow-slate-200/60 p-8 space-y-6">
            <div className="border-b border-slate-100 pb-4 text-center">
              <h2 className="text-lg font-black text-slate-800">Important Instructions / ముఖ్యమైన సూచనలు</h2>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-1">Please read carefully before proceeding</p>
            </div>

            {/* English Section */}
            <div className="space-y-3">
              <h3 className="text-xs font-black text-[#4DA8DA] uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-1.5 h-3 bg-[#4DA8DA] rounded-full" /> English Guidelines
              </h3>
              <ul className="text-xs text-slate-600 font-medium space-y-2 leading-relaxed pl-3 list-disc">
                <li><strong className="text-slate-800">Phone Number is Reference:</strong> Make sure to enter a working and usable mobile number. You will need it to lookup your status or download receipt later.</li>
                <li><strong className="text-slate-800">Download Receipt:</strong> Once the payment is successful, download the PDF receipt immediately.</li>
                <li><strong className="text-slate-800">Book Collection Rule:</strong> You can collect the books from the school <span className="font-bold text-red-600">ONLY by showing the payment receipt</span> on your phone or in printed format.</li>
                <li><strong className="text-slate-800">No Refunds:</strong> Payment once processed is strictly non-refundable.</li>
              </ul>
            </div>

            {/* Telugu Section */}
            <div className="space-y-3 pt-2 border-t border-dashed border-slate-100">
              <h3 className="text-xs font-black text-[#FF9933] uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-1.5 h-3 bg-[#FF9933] rounded-full" /> తెలుగు మార్గదర్శకాలు
              </h3>
              <ul className="text-xs text-slate-600 font-medium space-y-2 leading-relaxed pl-3 list-disc">
                <li><strong className="text-slate-800">ఫోన్ నంబర్ అనేది ఆధారం:</strong> దయచేసి పనిచేసే మొబైల్ నంబర్‌ను మాత్రమే ఇవ్వండి. మీ చెల్లింపు రశీదును డౌన్‌లోడ్ చేయడానికి ఈ నంబర్ ఉపయోగపడుతుంది.</li>
                <li><strong className="text-slate-800">రశీదు డౌన్‌లోడ్:</strong> చెల్లింపు విజయవంతంగా పూర్తయిన తర్వాత, వెంటనే రశీదును డౌన్‌లోడ్ చేసుకోండి.</li>
                <li><strong className="text-slate-800">పుస్తకాల సేకరణ విధానం:</strong> మీరు మీ మొబైల్ ఫోన్‌లో లేదా ప్రింట్ చేసిన కాపీ రూపంలో <span className="font-bold text-red-600">చెల్లింపు రశీదును చూపడం ద్వారా మాత్రమే</span> పాఠశాల నుండి పుస్తకాలను సేకరించగలరు.</li>
                <li><strong className="text-slate-800">తిరిగి చెల్లింపు లేదు (నో రీఫండ్):</strong> ఒకసారి చెల్లింపు చేసిన తర్వాత ఎలాంటి రుసుము వెనక్కి ఇవ్వబడదు.</li>
              </ul>
            </div>

            {/* Agree Checkbox */}
            <div className="flex items-start gap-3 bg-slate-50 border border-slate-100 rounded-2xl p-4 mt-4">
              <input
                type="checkbox"
                id="read-terms"
                checked={readTerms}
                onChange={e => setReadTerms(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-[#4DA8DA] focus:ring-[#4DA8DA]"
              />
              <label htmlFor="read-terms" className="text-[11px] text-slate-500 font-bold leading-normal cursor-pointer select-none">
                I have read and agree to the above terms in both English and Telugu. / నేను పైన పేర్కొన్న నిబంధనలను చదివాను మరియు అంగీకరిస్తున్నాను.
              </label>
            </div>

            <button
              onClick={() => {
                if (readTerms) setShowForm(true);
              }}
              disabled={!readTerms}
              className="w-full bg-[#4DA8DA] hover:bg-[#3c97c9] disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-4 rounded-2xl shadow-lg shadow-[#4DA8DA]/20 transition-all flex items-center justify-center gap-2 text-sm uppercase tracking-wider"
            >
              Continue to Checkout / కొనసాగండి
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          /* ─── STATE 2: CHECKOUT FORM ─── */
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl shadow-slate-200/60 overflow-hidden">
            <form onSubmit={handlePaymentSubmit} className="p-8 space-y-6 animate-scale-in">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Enter Details</span>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setReadTerms(false);
                  }}
                  className="text-xs font-bold text-[#4DA8DA] hover:text-[#3c97c9] transition-colors"
                >
                  View Instructions
                </button>
              </div>

              {/* Student Name */}
              <div>
                <label className={labelClass}>Student Name</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    className={`${inputClass} pl-10`}
                    placeholder="Enter student's full name"
                    value={studentName}
                    onChange={e => setStudentName(e.target.value)}
                    disabled={loading}
                    required
                  />
                </div>
              </div>

              {/* Parent Name */}
              <div>
                <label className={labelClass}>Parent Name</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    className={`${inputClass} pl-10`}
                    placeholder="Enter parent's full name"
                    value={parentName}
                    onChange={e => setParentName(e.target.value)}
                    disabled={loading}
                    required
                  />
                </div>
              </div>

              {/* Parent Phone */}
              <div>
                <label className={labelClass}>Parent Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                  <input
                    type="tel"
                    className={`${inputClass} pl-10`}
                    placeholder="Enter 10-digit phone number"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    disabled={loading}
                    required
                    maxLength={15}
                  />
                </div>
                <p className="text-[10px] text-slate-400 font-semibold mt-1">Make sure this phone number is correct and working.</p>
              </div>

              {/* Kit Selection Dropdown */}
              <div>
                <label className={labelClass}>Select Class / Grade Kit</label>
                <div className="relative">
                  <BookOpen className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
                  <select
                    className={`${inputClass} pl-10 appearance-none bg-slate-50/50 pr-10`}
                    value={selectedKitIndex}
                    onChange={e => setSelectedKitIndex(e.target.value === "" ? "" : Number(e.target.value))}
                    disabled={loading}
                    required
                  >
                    <option value="" disabled>Select the student's class</option>
                    {KITS.map((k, idx) => (
                      <option key={idx} value={idx}>
                        {k.class} Kit — ₹{k.price.toLocaleString("en-IN")}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                      <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Selected Kit Preview Card */}
              {selectedKit && (
                <div className="bg-sky-50/40 border border-sky-100 rounded-2xl p-5 animate-scale-in space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">{selectedKit.class} Book Kit</h3>
                      <p className="text-[10px] text-sky-600 font-bold uppercase tracking-wider mt-0.5">AY 2026-2027 Supply List</p>
                    </div>
                    <span className="text-xl font-black text-[#4DA8DA]">₹{selectedKit.price.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="text-xs text-slate-500 leading-relaxed font-medium bg-white/70 rounded-xl p-3 border border-sky-100/50">
                    <p className="font-bold text-slate-600 mb-1 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#FF9933]" />
                      Includes the following:
                    </p>
                    {selectedKit.items}
                  </div>
                </div>
              )}

              {/* Terms and refund policy */}
              <div className="flex items-start gap-3 bg-slate-50/70 border border-slate-100 rounded-2xl p-4">
                <input
                  type="checkbox"
                  id="policy"
                  checked={acceptedPolicy}
                  onChange={e => setAcceptedPolicy(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  disabled={loading}
                />
                <label htmlFor="policy" className="text-[11px] text-slate-500 font-bold leading-normal cursor-pointer select-none">
                  I agree that the phone number is my reference point, the kit includes the materials listed above, and that fees are non-refundable.
                </label>
              </div>

              {/* Error alerts */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-red-600 text-sm font-bold animate-shake">
                  ⚠️ {error}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || !acceptedPolicy}
                className="w-full bg-[#4DA8DA] hover:bg-[#3c97c9] disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-4 rounded-2xl shadow-lg shadow-[#4DA8DA]/20 transition-all flex items-center justify-center gap-2 text-base"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Generating secure gateway...
                  </>
                ) : (
                  <>
                    Proceed to Payment
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>

              {/* Muted Footer */}
              <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-400 font-bold uppercase tracking-wider pt-2 border-t border-slate-100">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                Secure 256-bit SSL checkout via Razorpay
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
