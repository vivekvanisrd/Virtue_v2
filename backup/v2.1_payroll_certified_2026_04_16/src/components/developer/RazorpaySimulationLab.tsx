'use client';

import React, { useState } from 'react';
import { 
  Zap, 
  Terminal, 
  RefreshCcw, 
  CheckCircle2, 
  AlertTriangle, 
  Search,
  Database,
  ArrowRight,
  FlaskConical,
  ShieldCheck
} from 'lucide-react';
import { searchStudentsAction } from '@/lib/actions/student-actions';

export default function RazorpaySimulationLab() {
  const [search, setSearch] = useState('');
  const [student, setStudent] = useState<any>(null);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<{time: string, msg: string, type: 'info' | 'success' | 'error'}[]>([]);

  const addLog = (msg: string, type: 'info' | 'success' | 'error' = 'info') => {
    setLogs(prev => [{ time: new Date().toLocaleTimeString(), msg, type }, ...prev].slice(0, 5));
  };

  const handleSearch = async () => {
    if (search.length < 3) {
      addLog("Search query too short (min 3 chars).", "error");
      return;
    }
    setLoading(true);
    const res = await searchStudentsAction(search);
    if (res.success && res.data && res.data.length > 0) {
        setSearchResults(res.data);
        addLog(`Found ${res.data.length} potential targets.`, 'info');
    } else {
        setSearchResults([]);
        addLog(`No students found matching "${search}".`, 'error');
    }
    setLoading(false);
  };

  const simulateWebhook = async (type: 'order.paid' | 'payment.captured') => {
    if (!student) return;
    
    setLoading(true);
    addLog(`Broadcasting ${type} for ${student.firstName}...`, 'info');

    const amount = 12721250; // Paisa
    const payId = `pay_LAB_${Math.random().toString(36).substring(7).toUpperCase()}`;
    const rrn = `9999${Math.floor(Math.random() * 100000000)}`;

    const payload = {
        event: type,
        payload: {
            payment: {
                entity: {
                    id: payId,
                    amount,
                    currency: "INR",
                    status: "captured",
                    notes: {
                        studentId: student.id,
                        terms: "term1,term2",
                        type: "FEE_COLLECTION_V2_TAXED",
                        baseAmount: (amount / 100).toString()
                    },
                    acquirer_data: {
                        rrn: rrn,
                        upi_transaction_id: "UPI_" + rrn
                    },
                    contact: "+91 9999999999",
                    email: "lab_tester@pava-edux.academy",
                    created_at: Math.floor(Date.now() / 1000)
                }
            }
        }
    };

    try {
        const res = await fetch("/api/webhooks/razorpay", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-razorpay-simulation": "PAVA_SIM_FIX_369",
                "x-razorpay-signature": "LAB_SIGNATURE"
            },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            addLog(`✅ Settlement SUCCESS: ${payId}`, 'success');
        } else {
            const err = await res.json();
            addLog(`❌ Webhook REJECTED: ${err.error}`, 'error');
        }
    } catch (err: any) {
        addLog(`❌ Error: ${err.message}`, 'error');
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 p-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 bg-amber-500 text-white rounded-[2rem] flex items-center justify-center shadow-xl shadow-amber-200">
          <FlaskConical className="w-8 h-8" />
        </div>
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter italic">Razorpay Simulation Lab</h1>
          <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-1">Universal Webhook & Payment Testing Protocol</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Step 1: Target Selection */}
        <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-xl shadow-slate-200/20 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center border border-blue-100">
              <Search className="w-4 h-4" />
            </div>
            <h3 className="font-black text-lg text-slate-800 tracking-tight">1. Select Target Student</h3>
          </div>

          <div className="relative group">
            <input 
              type="text" 
              placeholder="Name or Admission #..."
              className="w-full px-6 py-4 bg-slate-50 border-transparent rounded-2xl text-sm font-medium focus:bg-white focus:border-blue-200 transition-all outline-none"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <button 
                onClick={handleSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-blue-600 text-white rounded-xl shadow-lg hover:scale-105 active:scale-95 transition-all"
            >
                <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {searchResults.length > 0 && !student && (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar animate-in slide-in-from-top-2">
                  {searchResults.map((s) => (
                      <button 
                        key={s.id}
                        onClick={() => {
                            setStudent(s);
                            setSearchResults([]);
                            addLog(`Selected Target: ${s.firstName} ${s.lastName}`, 'success');
                        }}
                        className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-blue-50 border border-slate-100 rounded-2xl transition-all group"
                      >
                          <div className="text-left">
                              <p className="text-sm font-black text-slate-700">{s.firstName} {s.lastName}</p>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{s.academic?.class?.name || 'Class N/A'}</p>
                          </div>
                          <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition-colors" />
                      </button>
                  ))}
              </div>
          )}

          {student && (
              <div className="bg-blue-50/50 p-6 rounded-[2rem] border border-blue-100/50 animate-in zoom-in duration-300 relative group">
                 <button 
                    onClick={() => setStudent(null)}
                    className="absolute top-4 right-4 p-2 bg-white rounded-xl shadow-sm text-[8px] font-black uppercase tracking-widest text-slate-400 hover:text-rose-500 transition-colors"
                 >
                    Reset
                 </button>
                 <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-1">Target Identified</p>
                 <p className="text-xl font-bold text-slate-900">{student.firstName} {student.lastName}</p>
                 <p className="text-xs font-medium text-slate-400">UUID: {student.id.slice(0, 12)}...</p>
              </div>
          )}
        </div>

        {/* Step 2: Simulation Controls */}
        <div className="bg-slate-900 text-white p-8 rounded-[3rem] shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-3xl rounded-full" />
          <div className="relative z-10 space-y-6">
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white/10 rounded-xl flex items-center justify-center border border-white/10 text-amber-400">
                <Zap className="w-4 h-4" />
                </div>
                <h3 className="font-black text-lg tracking-tight">2. Simulation Payload</h3>
            </div>

            <div className="space-y-3">
                <button 
                   disabled={!student || loading}
                   onClick={() => simulateWebhook('payment.captured')}
                   className="w-full py-5 bg-blue-600 hover:bg-blue-700 disabled:opacity-30 disabled:grayscale rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-blue-500/20 flex items-center justify-center gap-3"
                >
                    <ShieldCheck className="w-4 h-4" /> Simulate Payment Capture
                </button>
                <button 
                   disabled={!student || loading}
                   className="w-full py-5 bg-white/10 hover:bg-white/20 border border-white/5 opacity-50 cursor-not-allowed rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-3"
                >
                    <RefreshCcw className="w-4 h-4" /> Simulate Refund (Coming)
                </button>
            </div>

            <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest flex items-center gap-2">
                    <Database className="w-3 h-3" /> Digital Ledger Bypass ON
                </p>
            </div>
          </div>
        </div>
      </div>

      {/* Terminal View */}
      <div className="bg-slate-50 border border-slate-200 rounded-[3rem] p-10 space-y-6 shadow-sm overflow-hidden relative">
          <div className="flex items-center justify-between border-b border-slate-200 pb-6 mb-4">
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-slate-900 text-white rounded-xl flex items-center justify-center">
                    <Terminal className="w-4 h-4" />
                </div>
                <h3 className="font-black text-xs uppercase tracking-widest text-slate-400">Bypass Console (Activity Trace)</h3>
            </div>
            {loading && <div className="w-2 h-2 bg-blue-600 rounded-full animate-ping" />}
          </div>

          <div className="space-y-3 font-mono">
              {logs.length === 0 ? (
                  <p className="text-slate-300 text-xs italic">Waiting for simulation packets...</p>
              ) : logs.map((log, i) => (
                  <div key={i} className="flex gap-4 p-4 bg-white rounded-2xl border border-slate-100 animate-in slide-in-from-left-4 duration-500">
                      <span className="text-[10px] font-black text-slate-300 tabular-nums">{log.time}</span>
                      <p className={`text-xs font-bold ${log.type === 'success' ? 'text-emerald-600' : log.type === 'error' ? 'text-rose-600' : 'text-slate-600'}`}>
                          {log.msg}
                      </p>
                  </div>
              ))}
          </div>

          {!student && (
              <div className="absolute inset-0 bg-slate-100/60 backdrop-blur-sm flex items-center justify-center p-12">
                  <div className="text-center group">
                      <AlertTriangle className="w-12 h-12 text-slate-300 mx-auto mb-4 group-hover:scale-110 transition-transform" />
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Select a student (Step 1) to unlock terminal</p>
                  </div>
              </div>
          )}
      </div>

      <div className="flex items-center gap-3 justify-center text-slate-300">
          <p className="text-[10px] font-black uppercase tracking-widest">Simulation Key: PAVA_SIM_FIX_369</p>
          <div className="w-1 h-1 rounded-full bg-slate-200" />
          <p className="text-[10px] font-black uppercase tracking-widest">Protocol: PaVa-Ledger-V2</p>
      </div>
    </div>
  );
}
