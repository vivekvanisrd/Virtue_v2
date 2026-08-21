"use client";

import React, { useState } from "react";
import { 
  BookOpen, 
  Search, 
  X, 
  HelpCircle, 
  Sparkles, 
  Calculator, 
  CheckCircle2, 
  ArrowRight, 
  DollarSign, 
  UserCheck, 
  PhoneCall, 
  Bus, 
  ShieldCheck, 
  FileText,
  Percent,
  Wallet,
  UserPlus
} from "lucide-react";

interface PortalHelpManualProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PortalHelpManual({ isOpen, onClose }: PortalHelpManualProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");

  if (!isOpen) return null;

  const categories = [
    { id: "all", label: "All Topics", icon: BookOpen },
    { id: "finance", label: "Finance & Discounts", icon: DollarSign },
    { id: "pos", label: "POS Fee Collection", icon: Wallet },
    { id: "admissions", label: "Admissions & Students", icon: UserPlus },
    { id: "profile", label: "Student Profiles", icon: UserCheck },
    { id: "transport", label: "Transport & Ancillary", icon: Bus },
    { id: "google", label: "Google Contacts Sync", icon: PhoneCall },
    { id: "security", label: "Security & Multi-Tenancy", icon: ShieldCheck }
  ];

  const guideTopics = [
    {
      id: "gross-fee-calc",
      category: "finance",
      title: "Actual Fee (Gross) vs Net Payable Calculation",
      description: "How total fees, concessions, and net payable balances are computed mathematically.",
      details: [
        "Gross Actual Fee = Gross Annual Tuition Base + Sum of all Ancillary Component Schedules (Admission Fee, Transport Fee, Caution Deposit, Library, Lab, Exam Fees).",
        "Policy Concession = Single active approved discount policy applied strictly on the Gross Annual Tuition Base.",
        "Net Payable Fee = Gross Actual Fee minus Policy Concession.",
        "Remaining Due = Net Payable Fee minus Total Settled Collections."
      ],
      nextAction: "Displays exact itemized breakdown when clicking Card 2 (Actual Fee Gross) in the Student Financial Hub."
    },
    {
      id: "discount-rules",
      category: "finance",
      title: "Governed Discount Non-Repeatability & Tuition-Only Base",
      description: "Strict accounting rules governing how discounts are applied and modified.",
      details: [
        "Tuition-Only Rule: Concessions are calculated STRICTLY against the Gross Annual Tuition Base. Transport, Admission, Caution Deposit, and Exam Fees are 100% excluded.",
        "Non-Repeating Rule: Changing a discount policy REPLACES the existing discount (does NOT stack or increment).",
        "Single Active Policy: Previous discount records are marked 'Replaced', and previous discount ledger entries are purged and replaced with a single active entry."
      ],
      nextAction: "Opens the Discount Vault selector modal when clicking Card 3 (Policy Concession) or 'Apply / Change Discount'."
    },
    {
      id: "pos-fee-collection",
      category: "pos",
      title: "Collecting Fees & Recording Payments",
      description: "Step-by-step procedure for settling student fee installments.",
      details: [
        "Select student and view installment breakdown (Term 1, Term 2, Term 3).",
        "Choose sequential terms or partial payment amounts.",
        "Select payment mode: Cash, Razorpay Online Gateway, UPI Bank QR, or Card Swipe.",
        "System generates a permanent Ledger Transaction ID and issues a printable Fee Receipt."
      ],
      nextAction: "Posts a RECEIPT ledger entry, updates settled balances instantly, and opens the printable receipt viewer."
    },
    {
      id: "profile-editing",
      category: "profile",
      title: "Direct Inline Profile Editing & Save Protocol",
      description: "Editing student details, family contacts, government IDs, and health records.",
      details: [
        "Click 'Edit Profile' in the top header bar or under Quick Actions in the right sidebar.",
        "An animated indigo banner confirms 'Edit Mode Active'.",
        "All input fields across Overview, Academics, Govt IDs, Family Details, Address, and Health become editable.",
        "Click 'Save Profile' in the top banner or sidebar to save all updates transactionally."
      ],
      nextAction: "Executes updateStudentProfile server action, updates PostgreSQL, and revalidates layout without refreshing."
    },
    {
      id: "ancillary-fees",
      category: "transport",
      title: "Ancillary Fees & Transport Subscription",
      description: "Managing non-academic charges like Transport, Books, Uniforms, and Labs.",
      details: [
        "Ancillary fees are assigned as distinct StudentFeeComponent records.",
        "Transport Monthly Fee is billed based on assigned vehicle routes.",
        "Discounts NEVER reduce ancillary charges; ancillary components must be paid in full unless explicitly waived."
      ],
      nextAction: "Updates ancillary fee inventory and includes transport charges in total gross fee schedule."
    },
    {
      id: "google-contacts-sync",
      category: "google",
      title: "Google Contacts & Mobile Directory Sync",
      description: "Syncing student parent and staff phone numbers to Google Contacts for mobile caller ID.",
      details: [
        "Connect Google Account via OAuth in Google Contacts Manager.",
        "Click 'Trigger Live People API Sync' to push parent & staff phone numbers to Google Contacts.",
        "When parents call school mobile phones, student name and class details display on caller ID automatically.",
        "Export directory anytime as vCard (.vcf) or CSV string."
      ],
      nextAction: "Pushes contact cards to Google People API or downloads contact files to mobile storage."
    },
    {
      id: "multi-tenancy-auth",
      category: "security",
      title: "Sovereign Identity & Multi-Tenancy Campus Switching",
      description: "Dual-mode authentication, branch switching, and multi-tenant security.",
      details: [
        "Bimodal Verification: Fast header retrieval backed by encrypted cookie verification.",
        "Campus Switcher: Owners and Developers can switch branches seamlessly via the top header bar.",
        "Tenant Isolation: School context is automatically enforced across all database queries and server actions."
      ],
      nextAction: "Updates active tenant cookie and re-initializes dashboard context for selected branch."
    }
  ];

  const filteredTopics = guideTopics.filter(topic => {
    const matchesCategory = activeCategory === "all" || topic.category === activeCategory;
    const matchesSearch = searchQuery.trim() === "" || 
      topic.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      topic.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      topic.details.some(d => d.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 lg:p-6 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white rounded-[2.5rem] w-full max-w-5xl h-[85vh] shadow-2xl border border-slate-100 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header Bar */}
        <div className="p-6 bg-slate-900 text-white flex items-center justify-between shrink-0 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-indigo-500/20 rounded-2xl border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black tracking-tight text-white">Institutional Operating Manual & Help Center</h2>
                <span className="text-[9px] font-black uppercase tracking-widest bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5" /> Interactive Guidance System
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium mt-0.5">Comprehensive guide, system rules, and step-by-step operating procedures for the entire portal.</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-10 h-10 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-2xl flex items-center justify-center transition-all shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Category Navigation */}
        <div className="p-6 bg-slate-50 border-b border-slate-200/80 space-y-4 shrink-0">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search help guide, accounting rules, POS actions, profile editing, Google Contacts..."
              className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all placeholder:text-slate-400 shadow-sm"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery("")} 
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                Clear
              </button>
            )}
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {categories.map(cat => {
              const Icon = cat.icon;
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all border shrink-0 ${
                    isActive
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-100"
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100 hover:border-slate-300"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Topics Grid */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Accounting Rules Formula Banner */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 text-white border border-indigo-500/30 shadow-lg space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-500/20 rounded-xl flex items-center justify-center text-indigo-400 border border-indigo-500/30">
                <Calculator className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black tracking-tight text-white">Governed Institutional Financial Formula</h3>
                <p className="text-[10px] text-slate-300 font-medium">Standardized calculation engine enforced across all dashboards, collection forms, and receipts.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="bg-white/5 backdrop-blur-md p-3 rounded-2xl border border-white/10">
                <span className="text-[8px] font-black uppercase tracking-widest text-indigo-300 block">Gross Actual Fee</span>
                <p className="text-xs font-bold text-white mt-1">Gross Tuition + Ancillary Component Schedules</p>
              </div>

              <div className="bg-emerald-500/10 backdrop-blur-md p-3 rounded-2xl border border-emerald-500/20">
                <span className="text-[8px] font-black uppercase tracking-widest text-emerald-400 block">Policy Concession</span>
                <p className="text-xs font-bold text-emerald-200 mt-1">Approved Concession on Tuition Base Only</p>
              </div>

              <div className="bg-blue-500/10 backdrop-blur-md p-3 rounded-2xl border border-blue-500/20">
                <span className="text-[8px] font-black uppercase tracking-widest text-blue-300 block">Net Payable Fee</span>
                <p className="text-xs font-bold text-blue-100 mt-1">Gross Actual Fee minus Policy Concession</p>
              </div>
            </div>
          </div>

          {/* Topics List */}
          {filteredTopics.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <HelpCircle className="w-12 h-12 text-slate-300 mx-auto" />
              <h4 className="text-sm font-black text-slate-700">No matching help topics found</h4>
              <p className="text-xs text-slate-400">Try adjusting your search terms or selecting 'All Topics'.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredTopics.map(topic => (
                <div key={topic.id} className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm hover:shadow-md transition-all space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h4 className="text-base font-black text-slate-900 tracking-tight">{topic.title}</h4>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">{topic.description}</p>
                    </div>
                    <span className="text-[8px] font-black uppercase tracking-widest px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full border border-indigo-100 shrink-0">
                      {topic.category}
                    </span>
                  </div>

                  <div className="space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 block mb-1">Key Operating Procedures:</span>
                    {topic.details.map((detail, idx) => (
                      <div key={idx} className="flex items-start gap-2.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <p className="text-xs font-semibold text-slate-700 leading-snug">{detail}</p>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-900">
                    <ArrowRight className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <span className="text-[8px] font-black uppercase tracking-widest text-emerald-700 block">What Will Happen Next:</span>
                      <p className="text-xs font-bold text-emerald-900 leading-tight mt-0.5">{topic.nextAction}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>

        {/* Footer Bar */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between shrink-0 border-t border-slate-800">
          <p className="text-xs font-medium text-slate-400">
            Need immediate administrative support? Contact the institutional IT desk or system administrator.
          </p>
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-md active:scale-95"
          >
            Close Help Manual
          </button>
        </div>

      </div>
    </div>
  );
}
