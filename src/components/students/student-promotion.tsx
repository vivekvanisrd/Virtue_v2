"use client";

import React, { useState, useEffect } from "react";
import { generateConsentLinksAction, getConsentLinksAction } from "@/lib/actions/consent-actions";
import { getAcademicYearsAction } from "@/lib/actions/academic-actions";
import { Copy, Link as LinkIcon, AlertCircle, CheckCircle2, Send, Loader2, Sparkles, Check } from "lucide-react";

// Assuming we fetch these from a server action in a real scenario
const MOCK_CLASSES = [
  "Play Group",
  "Nursery",
  "LKG",
  "UKG",
  "1st Grade",
  "2nd Grade",
  "3rd Grade",
  "4th Grade",
  "5th Grade",
  "6th Grade",
  "7th Grade",
  "8th Grade",
  "9th Grade",
  "10th Grade",
  "11th Grade",
  "12th Grade"
];

export function StudentPromotionManager() {
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [linksGenerated, setLinksGenerated] = useState(false);
  const [message, setMessage] = useState("");
  const [consents, setConsents] = useState<any[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");

  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [sourceYear, setSourceYear] = useState<string>("");
  const [targetYear, setTargetYear] = useState<string>("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }

    getAcademicYearsAction().then((res) => {
      if (res.success && res.data) {
        setAcademicYears(res.data);
        const current = res.data.find((y: any) => y.isCurrent);
        if (current) {
          setTargetYear(current.id);
          const currentIndex = res.data.findIndex((y: any) => y.id === current.id);
          if (currentIndex !== -1 && currentIndex + 1 < res.data.length) {
            setSourceYear(res.data[currentIndex + 1].id);
          } else {
            setSourceYear(current.id);
          }
        } else if (res.data.length > 0) {
          setTargetYear(res.data[0].id);
          setSourceYear(res.data[0].id);
        }
      }
    });
  }, []);

  // Fetch existing consents when class or years change
  useEffect(() => {
    if (selectedClass && targetYear && sourceYear) {
      getConsentLinksAction(selectedClass, targetYear, sourceYear).then(res => {
        if (res.success && res.consents) {
          setConsents(res.consents);
          setLinksGenerated(res.consents.length > 0);
          if (res.consents.length > 0) {
            setMessage(`Found ${res.consents.length} existing consent links for ${selectedClass}.`);
          } else {
            setMessage("");
          }
        }
      });
    } else {
      setConsents([]);
      setLinksGenerated(false);
      setMessage("");
    }
  }, [selectedClass, targetYear, sourceYear]);

  const handleGenerate = async () => {
    if (!selectedClass || !targetYear || !sourceYear) return;
    setLoading(true);
    setMessage("");
    
    const res = await generateConsentLinksAction(selectedClass, targetYear, sourceYear);
    
    if (res.success) {
      setLinksGenerated(true);
      setMessage(res.message || "Links generated successfully!");
      
      const refreshRes = await getConsentLinksAction(selectedClass, targetYear, sourceYear);
      if (refreshRes.success && refreshRes.consents) {
        setConsents(refreshRes.consents);
      }
    } else {
      setMessage(res.error || "Failed to generate links");
    }
    setLoading(false);
  };

  const handleCopy = (id: string, token: string) => {
    const url = `${origin}/consent/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="bg-background rounded-3xl border border-border shadow-sm p-8 min-h-[600px] flex flex-col items-center justify-center relative overflow-hidden">
      {/* Decorative BG */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 blur-[100px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-fuchsia-500/5 blur-[100px] rounded-full pointer-events-none" />

      <div className="max-w-xl w-full text-center relative z-10">
        <div className="w-16 h-16 bg-gradient-to-br from-primary to-fuchsia-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-primary/20 text-white">
          <Sparkles className="w-8 h-8" />
        </div>
        
        <h2 className="text-3xl font-black text-foreground tracking-tight mb-2">Year-End Promotions & Consent</h2>
        <p className="text-foreground opacity-60 font-medium mb-10">Generate unique, secure re-admission consent links for parents. This automates the fee generation and profile update process for the upcoming academic year.</p>

        <div className="bg-muted/50 p-6 rounded-2xl border border-border flex flex-col gap-4 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="text-left">
              <label className="text-[10px] font-black uppercase tracking-widest text-foreground opacity-50 mb-2 block">Source Academic Year (Students Studying In)</label>
              <select 
                className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground font-bold opacity-80 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                value={sourceYear}
                onChange={(e) => setSourceYear(e.target.value)}
              >
                <option value="" disabled>Select Year</option>
                {academicYears.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
              </select>
            </div>

            <div className="text-left">
              <label className="text-[10px] font-black uppercase tracking-widest text-foreground opacity-50 mb-2 block">Target Academic Year (Promotion Target)</label>
              <select 
                className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground font-bold opacity-80 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                value={targetYear}
                onChange={(e) => setTargetYear(e.target.value)}
              >
                <option value="" disabled>Select Year</option>
                {academicYears.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
              </select>
            </div>
          </div>

          <div className="text-left">
            <label className="text-[10px] font-black uppercase tracking-widest text-foreground opacity-50 mb-2 block">Target Class to Promote</label>
            <select 
              className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground font-bold opacity-80 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
            >
              <option value="" disabled>Select a Class</option>
              {MOCK_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <button 
          onClick={handleGenerate}
          disabled={!selectedClass || !targetYear || !sourceYear || loading}
          className="w-full py-4 bg-primary hover:bg-primary/90 text-white font-black rounded-xl transition-all shadow-xl shadow-primary/10 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
             <><Loader2 className="w-5 h-5 animate-spin" /> Processing Batch...</>
          ) : (
            <><LinkIcon className="w-5 h-5" /> Generate Secure Consent Links</>
          )}
        </button>

        {message && (
          <div className={`mt-6 p-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 ${linksGenerated ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'}`}>
            {linksGenerated ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {message}
          </div>
        )}

        {linksGenerated && consents.length > 0 && (
          <div className="mt-8 text-left border-t border-border pt-8 animate-in slide-in-from-bottom-4 fade-in duration-500">
            <h3 className="text-sm font-black text-foreground mb-4 flex items-center gap-2">
              <Send className="w-4 h-4 text-primary" /> Distribute Links
            </h3>
            <p className="text-xs text-foreground opacity-60 mb-4">Links have been generated in the database. You can now use the Communication module to bulk SMS these links to parents, or copy them individually below.</p>
            
            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {consents.map((c) => (
                <div key={c.id} className="flex items-center justify-between p-3 bg-background border border-border rounded-xl hover:border-primary/50 transition-colors">
                  <div>
                    <p className="text-xs font-bold text-foreground opacity-70">{c.studentName}</p>
                    <p className="text-[10px] text-foreground opacity-50">Consent Status: <span className="text-orange-500 font-bold">{c.status}</span></p>
                    <p className="text-[9px] text-slate-400 font-mono mt-0.5 select-all">{origin}/consent/{c.token}</p>
                  </div>
                  <button 
                    onClick={() => handleCopy(c.id, c.token)}
                    className="p-2 hover:bg-muted/50 rounded-lg text-foreground opacity-50 hover:text-primary transition-colors"
                  >
                    {copiedId === c.id ? <Check className="w-4 h-4 text-emerald-600 animate-bounce" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
