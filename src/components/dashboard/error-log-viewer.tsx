"use client";

import React, { useState, useEffect, useTransition } from "react";
import {
  getSystemErrorsAction,
  resolveSystemErrorAction,
  clearOldSystemErrorsAction,
  testTriggerErrorAction,
} from "@/lib/actions/error-actions";
import {
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Filter,
  RefreshCw,
  Search,
  Server,
  Monitor,
  Mail,
  Trash2,
  Zap,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  ShieldAlert,
} from "lucide-react";

export function SystemErrorLogViewer() {
  const [errors, setErrors] = useState<any[]>([]);
  const [stats, setStats] = useState({ unresolved: 0, critical: 0 });
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  // Filters
  const [severityFilter, setSeverityFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("UNRESOLVED");
  const [sourceFilter, setSourceFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Selected error detail view
  const [selectedError, setSelectedError] = useState<any | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const fetchErrors = async () => {
    setLoading(true);
    const res = await getSystemErrorsAction({
      severity: severityFilter,
      status: statusFilter,
      source: sourceFilter,
      query: searchQuery,
      limit: 50,
    });
    if (res.success) {
      setErrors(res.errors || []);
      setTotalCount(res.total || 0);
      setStats(res.stats || { unresolved: 0, critical: 0 });
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchErrors();
  }, [severityFilter, statusFilter, sourceFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchErrors();
  };

  const handleUpdateStatus = (id: string, newStatus: any) => {
    startTransition(async () => {
      const res = await resolveSystemErrorAction(id, newStatus);
      if (res.success) {
        setActionNotice(`Status updated to ${newStatus}`);
        fetchErrors();
        if (selectedError?.id === id) {
          setSelectedError({ ...selectedError, status: newStatus });
        }
        setTimeout(() => setActionNotice(null), 3000);
      }
    });
  };

  const handleTriggerTestError = () => {
    startTransition(async () => {
      const res = await testTriggerErrorAction("Manual diagnostic test error triggered by administrator.");
      if (res.success) {
        setActionNotice("Test error captured & email sent to admin successfully!");
        fetchErrors();
        setTimeout(() => setActionNotice(null), 4000);
      }
    });
  };

  const handleClearOld = () => {
    if (!confirm("Are you sure you want to clear system logs older than 30 days?")) return;
    startTransition(async () => {
      const res = await clearOldSystemErrorsAction(30);
      if (res.success) {
        setActionNotice(`Cleared ${res.count} old error logs.`);
        fetchErrors();
        setTimeout(() => setActionNotice(null), 3000);
      }
    });
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "CRITICAL":
        return <span className="px-2.5 py-1 text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/40 rounded-md flex items-center gap-1"><AlertOctagon className="w-3.5 h-3.5" /> CRITICAL</span>;
      case "HIGH":
        return <span className="px-2.5 py-1 text-xs font-bold bg-orange-500/20 text-orange-400 border border-orange-500/40 rounded-md flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> HIGH</span>;
      case "MEDIUM":
        return <span className="px-2.5 py-1 text-xs font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-md">MEDIUM</span>;
      default:
        return <span className="px-2.5 py-1 text-xs font-medium bg-slate-700 text-slate-300 rounded-md">LOW</span>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "UNRESOLVED":
        return <span className="px-2 py-0.5 text-xs font-bold bg-red-950/80 text-red-300 border border-red-800/60 rounded">UNRESOLVED</span>;
      case "INVESTIGATING":
        return <span className="px-2 py-0.5 text-xs font-bold bg-yellow-950/80 text-yellow-300 border border-yellow-800/60 rounded">INVESTIGATING</span>;
      case "RESOLVED":
        return <span className="px-2 py-0.5 text-xs font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 rounded">RESOLVED</span>;
      default:
        return <span className="px-2 py-0.5 text-xs font-medium bg-slate-800 text-slate-400 rounded">IGNORED</span>;
    }
  };

  return (
    <div className="space-y-6 text-slate-100 font-sans">
      {/* Header & Metrics Summary */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-6 h-6 text-red-400" />
              <h2 className="text-xl font-bold tracking-tight text-white">System Error Diagnostics</h2>
            </div>
            <p className="text-sm text-slate-400 mt-1">
              Real-time monitoring of client UI crashes, server action exceptions, and automated email alerts.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleTriggerTestError}
              disabled={isPending}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold bg-red-600/30 hover:bg-red-600/50 text-red-300 border border-red-500/40 rounded-xl transition-all active:scale-95 disabled:opacity-50"
            >
              <Zap className="w-3.5 h-3.5" />
              Trigger Test Error & Email
            </button>

            <button
              onClick={fetchErrors}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl transition-all active:scale-95"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>

            <button
              onClick={handleClearOld}
              disabled={isPending}
              className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700/60 rounded-xl transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear &gt;30d
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Unresolved Errors</p>
            <p className="text-2xl font-extrabold text-red-400 mt-1">{stats.unresolved}</p>
          </div>
          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Critical Failures</p>
            <p className="text-2xl font-extrabold text-orange-400 mt-1">{stats.critical}</p>
          </div>
          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Matching Filter</p>
            <p className="text-2xl font-extrabold text-cyan-400 mt-1">{totalCount}</p>
          </div>
          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">SMTP Email Dispatch</p>
            <p className="text-sm font-semibold text-emerald-400 mt-2 flex items-center gap-1.5">
              <Mail className="w-4 h-4" /> Active (office@virtueschool.in)
            </p>
          </div>
        </div>
      </div>

      {actionNotice && (
        <div className="p-3 bg-emerald-950/80 border border-emerald-600/50 text-emerald-300 rounded-xl text-sm font-medium animate-fade-in flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          {actionNotice}
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search error message, stack trace, route, component, user..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/60 transition-colors"
          />
        </form>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-400 font-medium">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-slate-200 font-medium focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-slate-900">All Statuses</option>
              <option value="UNRESOLVED" className="bg-slate-900">Unresolved</option>
              <option value="INVESTIGATING" className="bg-slate-900">Investigating</option>
              <option value="RESOLVED" className="bg-slate-900">Resolved</option>
              <option value="IGNORED" className="bg-slate-900">Ignored</option>
            </select>
          </div>

          <div className="flex items-center gap-1 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 text-xs">
            <span className="text-slate-400 font-medium">Severity:</span>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="bg-transparent text-slate-200 font-medium focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-slate-900">All Severities</option>
              <option value="CRITICAL" className="bg-slate-900">Critical</option>
              <option value="HIGH" className="bg-slate-900">High</option>
              <option value="MEDIUM" className="bg-slate-900">Medium</option>
              <option value="LOW" className="bg-slate-900">Low</option>
            </select>
          </div>

          <div className="flex items-center gap-1 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 text-xs">
            <span className="text-slate-400 font-medium">Source:</span>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="bg-transparent text-slate-200 font-medium focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-slate-900">All Sources</option>
              <option value="CLIENT" className="bg-slate-900">Client (Browser)</option>
              <option value="SERVER" className="bg-slate-900">Server Action</option>
            </select>
          </div>
        </div>
      </div>

      {/* Errors Table / List */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-500 mb-3" />
            <p className="text-sm font-medium">Querying System Error Diagnostics...</p>
          </div>
        ) : errors.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-200">No matching system errors found</h3>
            <p className="text-xs text-slate-500 mt-1">All systems operational or filter query cleared.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {errors.map((err) => {
              const isSelected = selectedError?.id === err.id;
              const dateStr = new Date(err.createdAt).toLocaleString("en-IN", {
                timeZone: "Asia/Kolkata",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              });

              return (
                <div key={err.id} className="p-4 hover:bg-slate-800/40 transition-colors">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                    {/* Left details */}
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {getSeverityBadge(err.severity)}
                        {getStatusBadge(err.status)}
                        <span className="text-xs px-2 py-0.5 bg-slate-800 text-slate-300 rounded font-mono flex items-center gap-1">
                          {err.source === "CLIENT" ? <Monitor className="w-3 h-3 text-cyan-400" /> : <Server className="w-3 h-3 text-indigo-400" />}
                          {err.source}
                        </span>
                        {err.emailSent && (
                          <span className="text-xs px-2 py-0.5 bg-emerald-950/80 text-emerald-400 border border-emerald-800/40 rounded flex items-center gap-1" title="Admin alert email sent">
                            <Mail className="w-3 h-3" /> Mail Sent
                          </span>
                        )}
                        <span className="text-xs text-slate-500 font-mono ml-auto lg:ml-0">{dateStr}</span>
                      </div>

                      <p className="text-sm font-semibold text-red-300 font-mono truncate">
                        {err.errorName}: {err.message}
                      </p>

                      <div className="flex items-center gap-4 text-xs text-slate-400 flex-wrap">
                        {err.route && <span>Route: <strong className="text-slate-200 font-mono">{err.route}</strong></span>}
                        {err.component && <span>Component: <strong className="text-slate-200 font-mono">{err.component}</strong></span>}
                        {err.userName && <span>User: <strong className="text-slate-200">{err.userName}</strong> ({err.userRole || "N/A"})</span>}
                      </div>
                    </div>

                    {/* Right Action buttons */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => setSelectedError(isSelected ? null : err)}
                        className="px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition-all flex items-center gap-1"
                      >
                        {isSelected ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        {isSelected ? "Hide Stack" : "Inspect Stack"}
                      </button>

                      {err.status === "UNRESOLVED" && (
                        <button
                          onClick={() => handleUpdateStatus(err.id, "RESOLVED")}
                          disabled={isPending}
                          className="px-3 py-1.5 text-xs font-semibold bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/30 rounded-lg transition-all"
                        >
                          Resolve
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expanded Detail View */}
                  {isSelected && (
                    <div className="mt-4 pt-4 border-t border-slate-800 space-y-3 bg-slate-950/80 p-4 rounded-xl">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Full Stack Trace & Payload Context</h4>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => copyToClipboard(`${err.message}\n\n${err.stack || ""}`, err.id)}
                            className="px-2.5 py-1 text-xs font-mono bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 flex items-center gap-1"
                          >
                            {copiedId === err.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            {copiedId === err.id ? "Copied" : "Copy Stack"}
                          </button>
                          {err.status !== "RESOLVED" && (
                            <button
                              onClick={() => handleUpdateStatus(err.id, "RESOLVED")}
                              className="px-2.5 py-1 text-xs font-semibold bg-emerald-600 text-white rounded hover:bg-emerald-500"
                            >
                              Mark Resolved
                            </button>
                          )}
                          {err.status !== "IGNORED" && (
                            <button
                              onClick={() => handleUpdateStatus(err.id, "IGNORED")}
                              className="px-2.5 py-1 text-xs font-semibold bg-slate-800 text-slate-400 hover:text-slate-200 rounded border border-slate-700"
                            >
                              Ignore
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                        <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                          <span className="text-slate-500 block">Error ID:</span>
                          <span className="font-mono text-cyan-300 select-all">{err.id}</span>
                        </div>
                        <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                          <span className="text-slate-500 block">School / Branch Code:</span>
                          <span className="font-mono text-slate-200">{err.schoolId || "GLOBAL"} / {err.branchId || "N/A"}</span>
                        </div>
                        <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                          <span className="text-slate-500 block">Next.js Digest:</span>
                          <span className="font-mono text-slate-300">{err.digest || "N/A"}</span>
                        </div>
                      </div>

                      {err.stack ? (
                        <pre className="bg-slate-900 text-slate-300 p-4 rounded-xl font-mono text-xs overflow-x-auto border border-slate-800 max-h-72 leading-relaxed">
                          {err.stack}
                        </pre>
                      ) : (
                        <p className="text-xs text-slate-500 italic">No stack trace available for this record.</p>
                      )}

                      {err.metadata && (
                        <div>
                          <p className="text-xs font-semibold text-slate-400 mb-1">Sanitized Metadata Context:</p>
                          <pre className="bg-slate-900 text-slate-400 p-3 rounded-lg font-mono text-xs overflow-x-auto border border-slate-800">
                            {JSON.stringify(err.metadata, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
