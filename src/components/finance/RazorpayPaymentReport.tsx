'use client';

import React, { useState, useEffect } from 'react';
import { 
  Search, 
  ArrowLeft, 
  ExternalLink, 
  Download, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Filter,
  CreditCard,
  Smartphone,
  ChevronRight,
  MoreVertical
} from 'lucide-react';
import { getRazorpayReport } from '@/lib/actions/finance-actions';
import { format } from 'date-fns';

interface RazorpayRecord {
  id: string;
  paymentReference: string;
  amountPaid: string;
  totalPaid: string;
  paymentDate: string;
  status: string;
  allocatedTo: any;
  student: {
    firstName: string;
    lastName: string;
    admissionNumber: string;
    family: {
      fatherPhone: string | null;
      motherPhone: string | null;
    }
  };
}

export default function RazorpayPaymentReport({ onBack }: { onBack: () => void }) {
  const [data, setData] = useState<RazorpayRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');

  useEffect(() => {
    fetchReport();
  }, []);

  const fetchReport = async () => {
    setLoading(true);
    const res = await getRazorpayReport();
    if (res.success) {
      setData(res.data);
    }
    setLoading(false);
  };

  const filteredData = data.filter(item => {
    const matchesSearch = 
      item.paymentReference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${item.student.firstName} ${item.student.lastName}`.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'All' || item.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Success':
        return (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-100">
            <CheckCircle2 className="w-3 h-3" />
            Captured
          </div>
        );
      case 'Pending':
        return (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-amber-100">
            <Clock className="w-3 h-3" />
            Pending
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-rose-50 text-rose-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-rose-100">
            <XCircle className="w-3 h-3" />
            Failed
          </div>
        );
    }
  };

  const getPaymentMethodIcon = (rrn: string) => {
    if (!rrn) return <CreditCard className="w-4 h-4 text-slate-400" />;
    return <Smartphone className="w-4 h-4 text-slate-400" />; // Assume UPI if RRN exists for now
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header Area */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Razorpay Digital Ledger</h1>
            <p className="text-slate-500 text-sm font-medium">Real-time audit matching your Razorpay Dashboard</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
            <button onClick={fetchReport} className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-50 text-slate-600">Refresh</button>
            <button className="px-4 py-2 bg-[#0047ab] text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-blue-500/10 flex items-center gap-2">
                <Download className="w-4 h-4" />
                Export CSV
            </button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
              { label: 'Total Volume', value: `₹${data.reduce((s, c) => s + Number(c.totalPaid), 0).toLocaleString()}`, color: 'blue' },
              { label: 'Total Settlements', value: data.length, color: 'emerald' },
              { label: 'Avg Ticket Size', value: `₹${(data.reduce((s, c) => s + Number(c.totalPaid), 0) / (data.length || 1)).toLocaleString(undefined, { maximumFractionDigits: 0 })}`, color: 'slate' },
              { label: 'Failure Rate', value: '0%', color: 'rose' }
          ].map((stat, i) => (
              <div key={i} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{stat.label}</p>
                  <p className={`text-xl font-black text-slate-900 tracking-tighter`}>{stat.value}</p>
              </div>
          ))}
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-[2rem] border border-slate-100 flex items-center justify-between gap-4 shadow-sm">
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-[#0047ab] transition-colors" />
            <input 
              type="text" 
              placeholder="Search by Payment ID, Student, or Admission..."
              className="w-full pl-12 pr-6 py-3 bg-slate-50 border-transparent rounded-2xl text-sm font-medium focus:bg-white focus:border-slate-200 focus:ring-0 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-2xl border border-slate-100">
              {['All', 'Success', 'Pending', 'Failed'].map((status) => (
                  <button 
                    key={status}
                    onClick={() => setFilterStatus(status)}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filterStatus === status ? 'bg-white shadow-sm text-slate-900 border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    {status}
                  </button>
              ))}
          </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-xl shadow-slate-200/20">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-100">
              <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Payment ID</th>
              <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Bank RRN / Method</th>
              <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Customer Detail</th>
              <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Created On</th>
              <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Amount</th>
              <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
              <th className="px-8 py-5"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
                <tr>
                    <td colSpan={7} className="px-8 py-20 text-center">
                        <div className="flex flex-col items-center gap-3">
                            <div className="w-8 h-8 border-4 border-slate-200 border-t-[#0047ab] rounded-full animate-spin" />
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Syncing with Ledger...</p>
                        </div>
                    </td>
                </tr>
            ) : filteredData.length === 0 ? (
                <tr>
                    <td colSpan={7} className="px-8 py-20 text-center">
                        <p className="text-slate-400 font-medium">No matching digital settlements found.</p>
                    </td>
                </tr>
            ) : filteredData.map((record) => (
              <tr key={record.id} className="hover:bg-slate-50/80 transition-colors group">
                <td className="px-8 py-6">
                  <div className="flex flex-col">
                    <span className="text-xs font-black text-slate-900 tracking-tight select-all">{record.paymentReference || 'PENDING_REF'}</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">RAZORPAY ID</span>
                  </div>
                </td>
                <td className="px-8 py-6">
                   <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center">
                             {getPaymentMethodIcon((record.allocatedTo as any)?.bankRrn)}
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xs font-bold text-slate-700">{(record.allocatedTo as any)?.bankRrn || '--'}</span>
                            <span className="text-[10px] font-black text-slate-300 uppercase tracking-tighter">BANK RRN</span>
                        </div>
                   </div>
                </td>
                <td className="px-8 py-6">
                    <div className="flex flex-col">
                        <span className="text-xs font-black text-slate-900">{record.student.firstName} {record.student.lastName}</span>
                        <div className="flex items-center gap-2 mt-0.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                            <span className="text-[10px] font-bold text-slate-500">{record.student.family.fatherPhone || record.student.family.motherPhone || 'N/A'}</span>
                        </div>
                    </div>
                </td>
                <td className="px-8 py-6">
                    <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-700">{format(new Date(record.paymentDate), 'LLL dd, yyyy')}</span>
                        <span className="text-[10px] font-medium text-slate-400">{format(new Date(record.paymentDate), 'hh:mm a')}</span>
                    </div>
                </td>
                <td className="px-8 py-6">
                    <span className="text-sm font-black text-slate-900 tracking-tight">₹{Number(record.totalPaid).toLocaleString()}</span>
                </td>
                <td className="px-8 py-6">
                  {getStatusBadge(record.status)}
                </td>
                <td className="px-8 py-6 text-right">
                  <button className="p-2 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition-all opacity-0 group-hover:opacity-100">
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {!loading && (
            <div className="bg-slate-50/50 p-6 flex items-center justify-between border-t border-slate-100">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Entries: {filteredData.length}</p>
                <div className="flex items-center gap-2">
                    <button className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-200 bg-white text-slate-600 disabled:opacity-50" disabled>Previous</button>
                    <button className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-200 bg-white text-slate-600 disabled:opacity-50" disabled>Next</button>
                </div>
            </div>
        )}
      </div>
    </div>
  );
}
