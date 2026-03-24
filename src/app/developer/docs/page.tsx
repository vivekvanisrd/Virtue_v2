"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FileText, 
  Search, 
  ChevronRight, 
  Book, 
  ArrowLeft, 
  Download,
  Terminal,
  Info,
  Clock
} from "lucide-react";
import Link from "next/link";
import { getDeveloperDocs, getDocContent } from "@/lib/actions/dev-actions";

export default function DocsHub() {
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null);
  const [content, setContent] = useState<string | null>(null);
  const [contentLoading, setContentLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function loadDocs() {
      const result = await getDeveloperDocs();
      if (result.success) {
        setDocs(result.docs || []);
        // Load README or first doc by default
        const defaultDoc = result.docs?.find((d: any) => d.filename.toLowerCase().includes('readme')) || result.docs?.[0];
        if (defaultDoc) {
          handleSelectDoc(defaultDoc.filename);
        }
      }
      setLoading(false);
    }
    loadDocs();
  }, []);

  const handleSelectDoc = async (filename: string) => {
    setSelectedDoc(filename);
    setContentLoading(true);
    const result = await getDocContent(filename);
    if (result.success) {
      setContent(result.content || "");
    }
    setContentLoading(false);
  };

  const filteredDocs = docs.filter(doc => 
    doc.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#0a0e27] text-white flex flex-col font-sans">
      {/* Header */}
      <header className="h-16 border-b border-white/10 flex items-center justify-between px-6 bg-black/40 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <Link href="/developer/dashboard" className="p-2 hover:bg-white/5 rounded-lg transition-colors group">
            <ArrowLeft className="w-5 h-5 text-slate-400 group-hover:text-white transition-colors" />
          </Link>
          <div className="h-6 w-[1px] bg-white/10" />
          <div className="flex items-center gap-2">
            <Book className="w-6 h-6 text-blue-400" />
            <h1 className="text-xl font-bold tracking-tight">Developer Docs</h1>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="relative group lg:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
            <input 
              type="text" 
              placeholder="Search specifications, rulebooks, planning..."
              className="w-full bg-white/5 border border-white/10 rounded-full py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button className="hidden sm:flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-semibold transition-all">
            <Download className="w-4 h-4" />
            Export PDF
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-80 border-r border-white/10 bg-black/20 overflow-y-auto hidden md:block">
          <div className="p-4 space-y-1">
            <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold px-3 mb-2">
              All Documents ({docs.length})
            </div>
            
            {loading ? (
              Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="h-10 w-full animate-pulse bg-white/5 rounded-lg" />
              ))
            ) : (
              filteredDocs.map((doc) => (
                <button
                  key={doc.id}
                  onClick={() => handleSelectDoc(doc.filename)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left group ${
                    selectedDoc === doc.filename 
                      ? "bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-lg shadow-blue-900/10" 
                      : "text-slate-400 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <FileText className={`w-4 h-4 transition-colors ${selectedDoc === doc.filename ? "text-blue-300" : "text-slate-500 group-hover:text-slate-300"}`} />
                  <span className="text-sm font-medium truncate">{doc.title}</span>
                  {selectedDoc === doc.filename && <ChevronRight className="w-4 h-4 ml-auto" />}
                </button>
              ))
            )}
          </div>
        </aside>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto bg-[#0a0e27]">
          <div className="max-w-4xl mx-auto py-12 px-8">
            <AnimatePresence mode="wait">
              {contentLoading ? (
                <motion.div 
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center py-24 space-y-4"
                >
                  <div className="w-12 h-12 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin" />
                  <p className="text-slate-500 font-mono text-sm uppercase tracking-widest">Parsing Markdown Registry...</p>
                </motion.div>
              ) : selectedDoc ? (
                <motion.article
                  key={selectedDoc}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className="space-y-8"
                >
                  {/* Article Metadata */}
                  <div className="border-b border-white/10 pb-8">
                    <div className="flex items-center gap-2 text-blue-400 font-mono text-xs uppercase tracking-widest mb-4">
                      <Terminal className="w-3 h-3" />
                      <span>Virtue OS Internal Specification</span>
                    </div>
                    <h2 className="text-4xl font-extrabold tracking-tight text-white mb-6 leading-tight">
                      {selectedDoc.replace('.md', '').replace(/_/g, ' ')}
                    </h2>
                    <div className="flex flex-wrap gap-4 text-sm text-slate-400">
                      <div className="flex items-center gap-1.5 px-3 py-1 bg-white/5 rounded-full border border-white/10">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Last Updated: Legacy Storage</span>
                      </div>
                      <div className="flex items-center gap-1.5 px-3 py-1 bg-white/5 rounded-full border border-white/10">
                        <Info className="w-3.5 h-3.5" />
                        <span>Source: j:\virtue_fb\dev\docs</span>
                      </div>
                    </div>
                  </div>

                  {/* Documentation Body */}
                  <div className="prose prose-invert prose-blue max-w-none">
                    <pre className="p-8 rounded-2xl bg-black/40 border border-white/10 overflow-x-auto text-slate-300 font-mono text-sm leading-relaxed whitespace-pre-wrap">
                      {content}
                    </pre>
                  </div>

                  {/* Footer Navigation */}
                  <div className="border-t border-white/10 pt-12 mt-12 flex justify-between">
                    <button className="text-sm font-bold text-slate-500 hover:text-white transition-colors flex items-center gap-2">
                      <ChevronRight className="rotate-180 w-4 h-4" />
                      Previous Module
                    </button>
                    <button className="text-sm font-bold text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-2">
                       Next Module
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </motion.article>
              ) : (
                <div className="flex flex-col items-center justify-center py-32 text-center space-y-6">
                  <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center border border-white/10">
                    <Book className="w-10 h-10 text-slate-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2">Select a Document</h3>
                    <p className="text-slate-500 max-w-xs mx-auto">
                      Access official rulebooks, technical specifications, and planning summaries from our legacy systems.
                    </p>
                  </div>
                </div>
              )}
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
}
