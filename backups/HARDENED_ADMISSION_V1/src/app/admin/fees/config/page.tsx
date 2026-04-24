"use client";

import React, { useState, useEffect } from 'react';
import { 
  getFeeStructures, 
  getAvailableClasses, 
  getAcademicYears, 
  upsertFeeStructure,
  applyFeeStructureToClass
} from '@/lib/actions/fee-actions';
import { 
  Settings2, 
  Plus, 
  RefreshCcw, 
  ShieldCheck, 
  AlertCircle,
  TrendingUp,
  LayoutGrid,
  Zap,
  CheckCircle2,
  ChevronRight,
  ArrowLeft
} from 'lucide-react';
import Link from 'next/link';
import { formatCurrency } from '@/lib/utils/fee-utils';

export default function FeeConfigPage() {
    const [structures, setStructures] = useState<any[]>([]);
    const [classes, setClasses] = useState<any[]>([]);
    const [years, setYears] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [status, setStatus] = useState<{ success?: boolean, message?: string } | null>(null);

    const [formData, setFormData] = useState({
        name: '',
        classId: '',
        academicYearId: '',
        tuitionAmount: 0,
        admissionAmount: 0,
        libraryLabAmount: 0,
        activityAmount: 0,
        totalAmount: 0
    });

    // Auto-calculate total whenever components change
    useEffect(() => {
        const total = Number(formData.tuitionAmount) + 
                      Number(formData.admissionAmount) + 
                      Number(formData.libraryLabAmount) + 
                      Number(formData.activityAmount);
        setFormData(prev => ({ ...prev, totalAmount: total }));
    }, [formData.tuitionAmount, formData.admissionAmount, formData.libraryLabAmount, formData.activityAmount]);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        const [sRes, cRes, yRes] = await Promise.all([
            getFeeStructures(),
            getAvailableClasses(),
            getAcademicYears()
        ]);

        if (sRes.success) setStructures(sRes.data || []);
        if (cRes.success) setClasses(cRes.data || []);
        if (yRes.success) setYears(yRes.data || []);
        setIsLoading(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        const res = await upsertFeeStructure(formData);
        if (res.success) {
            setStatus({ success: true, message: 'Fee structure saved.' });
            setShowForm(false);
            loadData();
        } else {
            setStatus({ success: false, message: res.error });
        }
        setIsLoading(false);
    };

    const handleSync = async (id: string) => {
        setIsLoading(true);
        const res = await applyFeeStructureToClass(id);
        setStatus(res);
        setIsLoading(false);
    };

    return (
        <div className="min-h-screen bg-background p-8 space-y-10">
            {/* Header */}
            <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-primary font-black text-[10px] uppercase tracking-[0.3em]">
                        <Settings2 className="w-4 h-4" />
                        System Configuration
                    </div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        Fee Management <span className="text-slate-300 font-light">Hub</span>
                    </h1>
                </div>

                <div className="flex items-center gap-4">
                    <Link href="/admin/fees" className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-slate-600 hover:text-primary transition-colors">
                        <ArrowLeft className="w-4 h-4" />
                        Back to Billing
                    </Link>
                    <button 
                        onClick={() => setShowForm(!showForm)}
                        className="bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-2 shadow-lg shadow-primary/20 transition-all active:scale-95"
                    >
                        <Plus className="w-4 h-4" />
                        {showForm ? 'Cancel Editor' : 'Create Structure'}
                    </button>
                </div>
            </header>

            {status && (
                <div className={`p-4 rounded-2xl border flex items-center gap-3 transition-all animate-in fade-in slide-in-from-top-4 ${
                    status.success ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-red-50 border-red-100 text-red-700'
                }`}>
                    {status.success ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                    <span className="text-sm font-bold uppercase tracking-widest">{status.message}</span>
                </div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
                {/* Editor Overlay / Column */}
                {(showForm || structures.length === 0) && (
                    <div className="xl:col-span-1 border-r border-slate-200 pr-8 animate-in slide-in-from-left duration-500">
                        <form onSubmit={handleSubmit} className="bg-background p-8 rounded-[32px] border border-slate-200 shadow-sm space-y-6">
                            <h2 className="font-black text-slate-900 uppercase tracking-widest text-xs border-b border-border pb-4 flex items-center gap-2">
                                <Plus className="w-4 h-4 text-primary" />
                                New Fee Schedule
                            </h2>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-foreground opacity-50 uppercase tracking-widest">Schedule Name</label>
                                    <input 
                                        type="text"
                                        placeholder="e.g. Standard 10th - 2026"
                                        className="w-full bg-slate-50 border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                                        value={formData.name}
                                        onChange={e => setFormData({...formData, name: e.target.value})}
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-foreground opacity-50 uppercase tracking-widest">Target Class</label>
                                    <select 
                                        className="w-full bg-slate-50 border border-border rounded-xl px-4 py-3 text-sm focus:outline-none"
                                        value={formData.classId}
                                        onChange={e => setFormData({...formData, classId: e.target.value})}
                                        required
                                    >
                                        <option value="">Select Tier...</option>
                                        {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-foreground opacity-50 uppercase tracking-widest">Academic Cycle</label>
                                    <select 
                                        className="w-full bg-slate-50 border border-border rounded-xl px-4 py-3 text-sm focus:outline-none"
                                        value={formData.academicYearId}
                                        onChange={e => setFormData({...formData, academicYearId: e.target.value})}
                                        required
                                    >
                                        <option value="">Select Year...</option>
                                        {years.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-foreground opacity-50 uppercase tracking-widest">Tuition Fee (₹)</label>
                                        <input 
                                            type="number"
                                            className="w-full bg-slate-50 border border-border rounded-xl px-4 py-3 text-sm font-bold"
                                            value={formData.tuitionAmount}
                                            onChange={e => setFormData({...formData, tuitionAmount: Number(e.target.value)})}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-foreground opacity-50 uppercase tracking-widest">Admission (₹)</label>
                                        <input 
                                            type="number"
                                            className="w-full bg-slate-50 border border-border rounded-xl px-4 py-3 text-sm font-bold"
                                            value={formData.admissionAmount}
                                            onChange={e => setFormData({...formData, admissionAmount: Number(e.target.value)})}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-foreground opacity-50 uppercase tracking-widest">Library/Lab (₹)</label>
                                        <input 
                                            type="number"
                                            className="w-full bg-slate-50 border border-border rounded-xl px-4 py-3 text-sm font-bold"
                                            value={formData.libraryLabAmount}
                                            onChange={e => setFormData({...formData, libraryLabAmount: Number(e.target.value)})}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-foreground opacity-50 uppercase tracking-widest">Activity (₹)</label>
                                        <input 
                                            type="number"
                                            className="w-full bg-slate-50 border border-border rounded-xl px-4 py-3 text-sm font-bold"
                                            value={formData.activityAmount}
                                            onChange={e => setFormData({...formData, activityAmount: Number(e.target.value)})}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="p-4 bg-primary/5 border border-primary/20 rounded-2xl flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <p className="text-[10px] font-black text-primary uppercase tracking-widest leading-none">Auto-Calculated Total</p>
                                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">Gross Annual Portfolio</p>
                                    </div>
                                    <div className="text-xl font-black text-primary tracking-tighter">
                                        {formatCurrency(formData.totalAmount)}
                                    </div>
                                </div>
                            </div>

                            <button 
                                type="submit"
                                disabled={isLoading}
                                className="w-full bg-primary hover:bg-primary/90 shadow-primary/20 transition-all font-black uppercase tracking-[0.2em] text-[10px] flex items-center justify-center gap-2 p-4 rounded-xl text-white"
                            >
                                {isLoading ? 'Processing...' : 'Deploy Schedule'}
                            </button>
                        </form>
                    </div>
                )}

                {/* List View */}
                <div className={showForm ? 'xl:col-span-3' : 'xl:col-span-4'}>
                    <div className="bg-background rounded-[40px] border border-slate-200 shadow-sm overflow-hidden">
                        <div className="p-8 border-b border-border flex items-center justify-between">
                            <h2 className="font-black text-slate-900 uppercase tracking-widest text-xs flex items-center gap-2">
                                <LayoutGrid className="w-4 h-4 text-primary" />
                                Active Fee Structures
                            </h2>
                            <div className="flex items-center gap-2 text-[10px] font-bold text-foreground opacity-50 uppercase tracking-widest">
                                <TrendingUp className="w-3 h-3 text-emerald-500" />
                                {structures.length} Live Schedules
                            </div>
                        </div>

                        {isLoading && structures.length === 0 ? (
                            <div className="p-20 text-center space-y-4">
                                <RefreshCcw className="w-10 h-10 text-slate-200 animate-spin mx-auto" />
                                <p className="text-foreground opacity-50 font-medium italic">Loading financial matrices...</p>
                            </div>
                        ) : structures.length === 0 ? (
                            <div className="p-20 text-center space-y-6">
                                <div className="w-16 h-16 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto text-slate-200">
                                    <ShieldCheck className="w-8 h-8" />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-slate-900 font-black uppercase tracking-widest text-sm">No active schedules</p>
                                    <p className="text-foreground opacity-50 text-xs font-medium">Create your first fee structure to begin billing students.</p>
                                </div>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-background">
                                            <th className="px-8 py-5 text-[10px] font-black text-foreground opacity-50 uppercase tracking-widest">Name & Code</th>
                                            <th className="px-8 py-5 text-[10px] font-black text-foreground opacity-50 uppercase tracking-widest">Class Tier</th>
                                            <th className="px-8 py-5 text-[10px] font-black text-foreground opacity-50 uppercase tracking-widest">Academic Year</th>
                                            <th className="px-8 py-5 text-[10px] font-black text-foreground opacity-50 uppercase tracking-widest text-right">Fee Split (Net)</th>
                                            <th className="px-8 py-5 text-[10px] font-black text-foreground opacity-50 uppercase tracking-widest text-right">Annual Total</th>
                                            <th className="px-8 py-5 text-[10px] font-black text-foreground opacity-50 uppercase tracking-widest text-center">Protocol Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {structures.map((s) => (
                                            <tr key={s.id} className="hover:bg-slate-50/80 transition-colors group">
                                                <td className="px-8 py-6">
                                                    <div className="font-black text-slate-900 uppercase tracking-tight group-hover:text-primary transition-colors">{s.name}</div>
                                                    <div className="text-[10px] text-foreground opacity-50 font-medium">ID: {s.id.substring(0,8)}...</div>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <span className="px-3 py-1 bg-slate-100 rounded-full text-[10px] font-black text-slate-600 uppercase tracking-widest border border-slate-200">
                                                        {s.class?.name || 'All Tiers'}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <div className="text-xs font-bold text-slate-600">{s.academicYear?.name}</div>
                                                </td>
                                                <td className="px-8 py-6 text-right">
                                                    <div className="flex flex-col gap-1">
                                                        <div className="text-[10px] font-bold text-slate-600">T: {formatCurrency(s.tuitionAmount)} | A: {formatCurrency(s.admissionAmount)}</div>
                                                        <div className="text-[9px] font-medium text-slate-400">L/A: {formatCurrency(Number(s.libraryLabAmount) + Number(s.activityAmount))}</div>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6 text-right">
                                                    <div className="text-lg font-black text-slate-900 tracking-tighter">{formatCurrency(s.totalAmount)}</div>
                                                    <div className="text-[9px] text-foreground opacity-50 font-bold uppercase tracking-widest leading-none mt-1">Gross Annual</div>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <div className="flex items-center justify-center gap-3">
                                                        <button 
                                                            onClick={() => handleSync(s.id)}
                                                            disabled={isLoading}
                                                            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
                                                        >
                                                            <Zap className="w-3.5 h-3.5 fill-current" />
                                                            Sync Students
                                                        </button>
                                                        <button className="p-2 hover:bg-slate-200 rounded-lg transition-colors">
                                                            <ChevronRight className="w-4 h-4 text-foreground opacity-50" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
