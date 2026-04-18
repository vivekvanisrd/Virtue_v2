"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, MapPin, Building2, Users, Receipt, Calendar, Settings, FileText, ChevronRight, Activity, PieChart, Shield, Phone, Mail, Box, ShieldCheck, Download, BarChart2, Briefcase, IndianRupee, Bell, Maximize, TrendingUp, AlertCircle, Loader2, Plus, Settings2, School as SchoolIcon, GraduationCap, EllipsisVertical, X } from 'lucide-react';
import { getAllSchoolsAction } from "@/lib/actions/super-admin-actions";
import { SchoolCreationForm } from "@/components/super-admin/SchoolCreationForm";
import { cn } from "@/lib/utils";

export function SuperAdminDashboard() {
  const [schools, setSchools] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  async function fetchSchools() {
    setIsLoading(true);
    const result = await getAllSchoolsAction();
    if (result.success) {
      setSchools(result.data || []);
    }
    setIsLoading(false);
  }

  useEffect(() => {
    fetchSchools();
  }, []);

  const filteredSchools = schools.filter(school => 
    school.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    school.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background p-6 lg:p-10">
      {/* Header Section */}
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 text-primary mb-2">
              <div className="p-2 bg-primary/10 rounded-lg">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <span className="text-sm font-black uppercase tracking-widest italic">Core Registry</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-foreground tracking-tight italic">
              Super <span className="text-primary italic">Admin</span> Dashboard
            </h1>
            <p className="text-foreground opacity-60 font-bold mt-2">Managing {schools.length} unique school instances in the ecosystem.</p>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="px-6 py-4 bg-slate-900 hover:bg-black text-white rounded-2xl font-black flex items-center gap-3 shadow-xl transition-all active:scale-[0.98] group"
          >
            <div className="bg-background/20 p-1 rounded-lg group-hover:rotate-90 transition-transform">
              <Plus className="w-5 h-5 text-white" />
            </div>
            Deploy New Instance
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { label: "Total Schools", value: schools.length, color: "text-blue-600", bg: "bg-blue-50" },
            { label: "Global Students", value: schools.reduce((acc, s) => acc + s._count.students, 0), color: "text-emerald-600", bg: "bg-emerald-50" },
            { label: "Active Nodes", value: schools.reduce((acc, s) => acc + s._count.branches, 0), color: "text-violet-600", bg: "bg-violet-50" }
          ].map((stat, i) => (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              key={i}
              className={cn("p-6 rounded-3xl border border-border shadow-sm flex flex-col justify-between h-32", stat.bg)}
            >
              <span className="text-sm font-black text-foreground opacity-60 uppercase tracking-widest">{stat.label}</span>
              <span className={cn("text-4xl font-black italic", stat.color)}>{stat.value.toLocaleString()}</span>
            </motion.div>
          ))}
        </div>

        {/* Search & Actions */}
        <div className="flex items-center gap-4 bg-background p-2 rounded-3xl border border-border shadow-sm">
          <div className="relative flex-grow">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground opacity-50" />
            <input
              type="text"
              placeholder="Filter by school name or registry code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-transparent outline-none font-bold text-slate-700"
            />
          </div>
          <div className="w-[1px] h-8 bg-slate-100 hidden md:block" />
          <button className="p-3 hover:bg-muted/50 rounded-2xl transition-colors">
            <Settings2 className="w-5 h-5 text-foreground opacity-50" />
          </button>
        </div>

        {/* Schools List */}
        <div className="grid grid-cols-1 gap-4">
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-4">
              <Loader2 className="w-10 h-10 animate-spin text-slate-300" />
              <p className="text-foreground opacity-50 font-bold italic tracking-widest">Accessing Registry...</p>
            </div>
          ) : filteredSchools.length > 0 ? (
            filteredSchools.map((school, i) => (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                key={school.id}
                className="group bg-background p-6 rounded-3xl border border-border shadow-sm hover:shadow-xl hover:border-primary/20 transition-all flex flex-col md:flex-row md:items-center justify-between gap-6"
              >
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 bg-muted/50 rounded-2xl flex items-center justify-center group-hover:bg-primary/5 transition-colors overflow-hidden">
                    {school.logo ? (
                      <img src={school.logo} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <SchoolIcon className="w-8 h-8 text-slate-300 group-hover:text-primary transition-colors" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-xl font-black text-foreground italic">{school.name}</h3>
                      <span className="px-2 py-0.5 bg-slate-100 text-[10px] font-black text-foreground opacity-60 rounded-md uppercase">
                        {school.code}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs font-bold text-foreground opacity-50 italic">
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-3 h-3" />
                        {school.address || "Location not set"}
                      </span>
                      <span className="w-1 h-1 bg-slate-200 rounded-full" />
                      <span className="flex items-center gap-1.5">
                        <Users className="w-3 h-3" />
                        {school._count.staff} Staff
                      </span>
                      <span className="w-1 h-1 bg-slate-200 rounded-full" />
                      <span className="flex items-center gap-1.5 font-black text-primary/60">
                        <GraduationCap className="w-3 h-3" />
                        {school._count.students} Students
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="hidden lg:flex items-center gap-3 mr-4">
                    <div className="text-right">
                      <p className="text-[10px] text-foreground opacity-50 font-bold uppercase tracking-widest">Active Since</p>
                      <p className="text-sm font-black text-slate-700 italic">
                        {new Date(school.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <button className="px-4 py-2 border-2 border-border hover:border-primary/20 hover:bg-primary/5 rounded-xl font-bold text-slate-600 hover:text-primary transition-all flex items-center gap-2">
                    Manage
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <button className="p-2 hover:bg-muted/50 rounded-xl transition-colors">
                    <EllipsisVertical className="w-5 h-5 text-foreground opacity-50" />
                  </button>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="py-20 text-center space-y-4 bg-muted/50/50 rounded-[40px] border-2 border-dashed border-slate-200">
              <div className="w-16 h-16 bg-background rounded-2xl flex items-center justify-center mx-auto shadow-sm">
                <Search className="w-8 h-8 text-slate-200" />
              </div>
              <p className="text-foreground opacity-50 font-bold italic tracking-widest uppercase text-sm">No schools found matching search</p>
            </div>
          )}
        </div>
      </div>

      {/* Creation Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-background rounded-[40px] shadow-2xl overflow-hidden border border-white/20"
            >
              <div className="p-8 lg:p-12">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-3xl font-black text-foreground italic">Provision New School</h2>
                    <p className="text-foreground opacity-60 font-bold">Deploy a fresh school instance and first branch node.</p>
                  </div>
                  <button 
                    onClick={() => setIsModalOpen(false)}
                    className="p-3 hover:bg-muted/50 rounded-2xl transition-colors"
                  >
                    <X className="w-6 h-6 text-foreground opacity-50" />
                  </button>
                </div>
                
                <SchoolCreationForm 
                  onSuccess={() => {
                    setIsModalOpen(false);
                    fetchSchools();
                  }} 
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
