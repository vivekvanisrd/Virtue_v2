"use client";

import React, { useEffect, useState } from 'react';
import { getImportLogs, undoImportAction } from '@/lib/actions/setup-actions';
import { History,RotateCcw, Trash2, Clock, AlertTriangle, Loader2 } from 'lucide-react';

interface HistorySentinelProps {
    onAction: (msg: string) => void;
}

export function HistorySentinel({ onAction }: HistorySentinelProps) {
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [confirmUndo, setConfirmUndo] = useState<string | null>(null);

    const loadLogs = async () => {
        const data = await getImportLogs();
        setLogs(data || []);
    };

    useEffect(() => {
        loadLogs();
        const interval = setInterval(loadLogs, 10000); // Poll every 10s
        return () => clearInterval(interval);
    }, []);

    const handleUndo = async (batchId: string) => {
        setLoading(true);
        onAction(`INITIATING ROLLBACK: ${batchId}`);
        const res = await undoImportAction(batchId);
        if (res.success) {
            onAction(`ROLLBACK COMPLETE: ${res.message}`);
            setConfirmUndo(null);
            loadLogs();
        } else {
            onAction(`ROLLBACK FAILED: ${res.error}`);
        }
        setLoading(false);
    };

    if (logs.length === 0) return null;

    return (
        <div className="bg-neutral-900/80 backdrop-blur-md border border-white/5 rounded-2xl p-6 space-y-4 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-widest text-neutral-500 flex items-center gap-2">
                    <History size={14} />
                    Import Logs
                </h3>
            </div>

            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 scrollbar-hide">
                {logs.map((log) => (
                    <div key={log.batchId} className="bg-black/40 border border-white/5 rounded-xl p-4 space-y-3 group relative overflow-hidden">
                        
                        {/* Status Guard */}
                        {confirmUndo === log.batchId ? (
                            <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                                <div className="flex items-center gap-2 text-red-400 text-[10px] font-bold uppercase tracking-tighter">
                                    <AlertTriangle size={12} />
                                    Destructive Action
                                </div>
                                <p className="text-[11px] text-neutral-400">This will surgically delete {log.ids.length} records including all IDs from this batch. Continue?</p>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => handleUndo(log.batchId)} 
                                        disabled={loading}
                                        className="flex-1 bg-red-600/20 text-red-400 border border-red-500/20 py-2 rounded-lg text-[10px] font-bold uppercase hover:bg-red-600 hover:text-white transition-all disabled:opacity-50"
                                    >
                                        {loading ? 'Processing...' : 'Yes, Undo'}
                                    </button>
                                    <button 
                                        onClick={() => setConfirmUndo(null)} 
                                        className="px-4 bg-neutral-800 text-neutral-400 py-2 rounded-lg text-[10px] font-bold uppercase hover:bg-neutral-700 transition-all"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="flex items-start justify-between">
                                    <div className="space-y-1">
                                        <div className="text-[11px] font-bold text-white/80">{log.template}</div>
                                        <div className="text-[9px] text-neutral-500 font-mono">{log.batchId}</div>
                                    </div>
                                    <button 
                                        onClick={() => setConfirmUndo(log.batchId)}
                                        className="p-2 text-neutral-600 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                                        title="Undo Import"
                                    >
                                        <RotateCcw size={14} />
                                    </button>
                                </div>

                                <div className="flex items-center justify-between text-[10px]">
                                    <div className="flex items-center gap-1.5 text-neutral-500">
                                        <Clock size={10} />
                                        {new Date(log.timestamp).toLocaleDateString()}
                                    </div>
                                    <div className="text-indigo-400 font-bold">
                                        {log.ids.length} Records
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
