"use client";

import React, { useState, useEffect } from "react";
import { generateConsentLinksAction } from "@/lib/actions/consent-actions";
import { Copy, Link as LinkIcon, AlertCircle, CheckCircle2, Send, Loader2, Sparkles } from "lucide-react";

// Assuming we fetch these from a server action in a real scenario
const MOCK_CLASSES = ["Nursery", "LKG", "UKG", "Class 1", "Class 2", "Class 3", "Class 4", "Class 5"];
const TARGET_YEAR = "2026-27";

export function StudentPromotionManager() {
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [linksGenerated, setLinksGenerated] = useState(false);
  const [message, setMessage] = useState("");

  const handleGenerate = async () => {
    if (!selectedClass) return;
    setLoading(true);
    
    // In a real app we'd map TARGET_YEAR string to an actual AcademicYear UUID
    // For demonstration, we assume TARGET_YEAR is the ID or we've resolved it.
    const res = await generateConsentLinksAction(selectedClass, "uuid-for-2026-27");
    
    if (res.success) {
      setLinksGenerated(true);
      setMessage(res.message || "Links generated successfully!");
    } else {
      setMessage(res.error || "Failed to generate links");
    }
    setLoading(false);
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

        <div className="bg-muted/50 p-6 rounded-2xl border border-border flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1 text-left">
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

          <div className="flex-1 text-left">
            <label className="text-[10px] font-black uppercase tracking-widest text-foreground opacity-50 mb-2 block">Target Academic Year</label>
            <div className="w-full bg-background/50 border border-border rounded-xl px-4 py-3 text-foreground font-black opacity-90 cursor-not-allowed">
              {TARGET_YEAR}
            </div>
          </div>
        </div>

        <button 
          onClick={handleGenerate}
          disabled={!selectedClass || loading}
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

        {linksGenerated && (
          <div className="mt-8 text-left border-t border-border pt-8 animate-in slide-in-from-bottom-4 fade-in duration-500">
            <h3 className="text-sm font-black text-foreground mb-4 flex items-center gap-2">
              <Send className="w-4 h-4 text-primary" /> Distribute Links
            </h3>
            <p className="text-xs text-foreground opacity-60 mb-4">Links have been generated in the database. You can now use the Communication module to bulk SMS these links to parents, or copy them individually below.</p>
            
            {/* Mock List of links for demo purposes */}
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-background border border-border rounded-xl hover:border-primary/50 transition-colors">
                  <div>
                    <p className="text-xs font-bold text-foreground opacity-70">Student Name {i}</p>
                    <p className="text-[10px] text-foreground opacity-50">Consent Status: <span className="text-orange-500 font-bold">Pending</span></p>
                  </div>
                  <button className="p-2 hover:bg-muted/50 rounded-lg text-foreground opacity-50 hover:text-primary transition-colors">
                    <Copy className="w-4 h-4" />
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
