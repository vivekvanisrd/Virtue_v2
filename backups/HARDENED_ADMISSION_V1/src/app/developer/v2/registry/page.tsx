"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Search, 
  Filter, 
  Building2, 
  Globe, 
  Users, 
  ArrowRight, 
  EllipsisVertical,
  ExternalLink,
  ShieldAlert,
  Plus,
  RefreshCcw,
  LayoutGrid,
  List
} from 'lucide-react';
import { getGlobalData } from "@/lib/actions/dev-actions";
import { cn } from "@/lib/utils";
import Link from 'next/link';

export default function V2IdentityRegistry() {
  const [isMounted, setIsMounted] = useState(false);
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = async () => {
    setIsLoading(true);
    const res = await getGlobalData();
    if (res.success) setData(res.data);
    setIsLoading(false);
  };

  useEffect(() => { 
    setIsMounted(true);
    load(); 
  }, []);

  if (!isMounted) return null;

  const filteredSchools = data?.schools?.filter((s: any) => 
    s.name.toLowerCase().includes(search.toLowerCase()) || 
    s.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-10">
      {/* 🔮 Header */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
            <h2 className="text-4xl font-black tracking-tighter text-slate-900">Identity <span className="text-indigo-600 italic">Registry</span></h2>
            <p className="text-sm font-medium text-slate-500">Global tenant mapping & resource management.</p>
        </div>
        
        <div className="flex items-center gap-4">
            <button onClick={load} className="p-3 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 transition-all">
                <RefreshCcw className={cn("w-4 h-4 text-slate-400", isLoading && "animate-spin")} />
            </button>
            <Link href="/developer/v2/factory" className="px-6 py-3 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 flex items-center gap-2">
                <Plus className="w-4 h-4" /> New Instance
            </Link>
        </div>
      </section>

      {/* 🏮 Search & Filters */}
      <div className="flex flex-col md:flex-row items-center gap-4">
        <div className="flex-1 relative group w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
            <input 
                className="w-full bg-white border border-slate-200 rounded-[1.5rem] py-4 pl-12 pr-4 text-sm font-bold focus:outline-none focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/5 transition-all shadow-sm"
                placeholder="Search by school name, code or location..." 
                value={search}
                onChange={e => setSearch(e.target.value)}
            />
        </div>
        <div className="flex items-center p-1 bg-white border border-slate-200 rounded-2xl shadow-sm">
            <button className="p-3 bg-slate-50 text-indigo-600 rounded-xl"><LayoutGrid className="w-4.5 h-4.5" /></button>
            <button className="p-3 text-slate-400 hover:text-slate-600"><List className="w-4.5 h-4.5" /></button>
        </div>
      </div>

      {/* 📋 Registry Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredSchools?.map((school: any) => (
          <motion.div 
            key={school.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="group bg-white border border-slate-200/60 rounded-[2.5rem] p-8 shadow-sm hover:shadow-2xl hover:shadow-slate-200/50 transition-all relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-6">
                <button className="p-2 text-slate-300 hover:text-slate-900 transition-colors">
                    <EllipsisVertical className="w-5 h-5" />
                </button>
            </div>

            <div className="flex items-center gap-4 mb-8">
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-xl font-black text-indigo-600 shadow-sm">
                    {school.id.substring(0, 2)}
                </div>
                <div>
                    <h3 className="text-lg font-black tracking-tight text-slate-900 leading-none">{school.name}</h3>
                    <div className="mt-2 flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-slate-100 text-[8px] font-black text-slate-500 rounded-md uppercase tracking-tight">{school.code}</span>
                        <span className="text-[8px] font-black text-emerald-500 uppercase flex items-center gap-1">
                            <div className="w-1 h-1 rounded-full bg-emerald-500" /> ACTIVE
                        </span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                        <Users className="w-3 h-3" /> Students
                    </div>
                    <div className="text-xl font-black text-slate-900">{school._count?.students || 0}</div>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                        <Building2 className="w-3 h-3" /> Branches
                    </div>
                    <div className="text-xl font-black text-slate-900">{school._count?.branches || 0}</div>
                </div>
            </div>

            <div className="pt-6 border-t border-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
                    <Globe className="w-3.5 h-3.5" /> India / KA
                </div>
                <Link 
                    href={`/developer/v2/crisis?schoolId=${school.id}`}
                    className="p-2.5 rounded-xl bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-sm"
                    title="Emergency Overrides"
                >
                    <ShieldAlert className="w-4.5 h-4.5" />
                </Link>
            </div>

            <div className="absolute inset-0 border-2 border-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity rounded-[2.5rem] pointer-events-none" />
          </motion.div>
        ))}
        {isLoading && [1,2,3].map(i => (
             <div key={i} className="h-64 bg-white border border-slate-100 rounded-[2.5rem] animate-pulse" />
        ))}
      </div>
    </div>
  );
}
