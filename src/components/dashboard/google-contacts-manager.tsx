"useClient";

import React, { useState, useEffect } from "react";
import {
  Globe, Download, RefreshCcw, CheckCircle2, AlertCircle,
  Users, UserCheck, ShieldCheck, ExternalLink, ArrowRight,
  Sparkles, FileText, Phone, Key, HelpCircle, AlertTriangle
} from "lucide-react";
import {
  getGoogleContactsIntegrationStatusAction,
  getGoogleOAuthUrlAction,
  triggerGoogleContactsSyncAction,
  disconnectGoogleIntegrationAction,
  exportVCardAction,
  exportCSVAction
} from "@/lib/actions/google-contacts-actions";

export function GoogleContactsManager() {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showGuide, setShowGuide] = useState(false);

  const fetchStatus = async () => {
    setLoading(true);
    const res = await getGoogleContactsIntegrationStatusAction();
    if (res.success) {
      setStatus(res.data);
    } else {
      setMessage({ type: "error", text: res.error || "Failed to load status" });
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleConnectGoogle = async () => {
    setMessage(null);
    const res = await getGoogleOAuthUrlAction();
    if (res.success && res.url) {
      window.location.href = res.url;
    } else {
      setMessage({
        type: "error",
        text: res.error || "Google Client ID is missing. Set GOOGLE_CLIENT_ID in .env or use instant vCard/CSV export below."
      });
    }
  };

  const handleDisconnect = async () => {
    if (!confirm("Are you sure you want to disconnect Google Contacts?")) return;
    setLoading(true);
    const res = await disconnectGoogleIntegrationAction();
    if (res.success) {
      setMessage({ type: "success", text: res.message });
      fetchStatus();
    } else {
      setMessage({ type: "error", text: res.error || "Failed to disconnect" });
    }
    setLoading(false);
  };

  const handleSync = async (category: "parents" | "staff" | "all") => {
    setSyncing(true);
    setMessage(null);
    const res = await triggerGoogleContactsSyncAction(category);
    if (res.success) {
      setMessage({ type: "success", text: res.message });
      fetchStatus();
    } else {
      setMessage({ type: "error", text: res.error || "Sync failed" });
    }
    setSyncing(false);
  };

  const handleExportVCard = async (category: "parents" | "staff" | "all") => {
    setExporting(`vcard-${category}`);
    setMessage(null);
    const res = await exportVCardAction(category);
    if (res.success && res.content) {
      const blob = new Blob([res.content], { type: "text/vcard;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = res.filename || `virtue_contacts_${category}.vcf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setMessage({ type: "success", text: `Exported ${category} contacts as vCard (.vcf) file!` });
    } else {
      setMessage({ type: "error", text: res.error || "Export failed" });
    }
    setExporting(null);
  };

  const handleExportCSV = async (category: "parents" | "staff" | "all") => {
    setExporting(`csv-${category}`);
    setMessage(null);
    const res = await exportCSVAction(category);
    if (res.success && res.content) {
      const blob = new Blob([res.content], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = res.filename || `virtue_contacts_${category}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setMessage({ type: "success", text: `Exported ${category} contacts as Google Contacts CSV!` });
    } else {
      setMessage({ type: "error", text: res.error || "Export failed" });
    }
    setExporting(null);
  };

  return (
    <div className="space-y-6">
      {/* 🚀 Header Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-bold uppercase tracking-wider">
              <Globe className="w-3.5 h-3.5" /> Google Contacts Integration
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Sync School Contacts to Google & Mobile Devices
            </h2>
            <p className="text-slate-300 text-sm max-w-2xl font-medium">
              Seamlessly push parents, guardians, and staff phone numbers to Google Contacts so incoming calls automatically show student names and class information on mobile devices.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 items-center">
            {status?.isConnected ? (
              <div className="flex items-center gap-3 bg-emerald-950/80 border border-emerald-500/40 px-4 py-2.5 rounded-2xl">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <div className="text-left">
                  <div className="text-xs text-emerald-300 font-bold">Connected Account</div>
                  <div className="text-sm text-white font-mono font-semibold">{status.userEmail}</div>
                </div>
              </div>
            ) : (
              <button
                onClick={handleConnectGoogle}
                className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-white hover:bg-slate-100 text-slate-900 font-black text-sm transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                Connect Google Account
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 🔔 Message Feedback */}
      {message && (
        <div className={`p-4 rounded-2xl border flex items-start gap-3 text-sm font-semibold ${
          message.type === "success"
            ? "bg-emerald-50 text-emerald-900 border-emerald-200"
            : "bg-rose-50 text-rose-900 border-rose-200"
        }`}>
          {message.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          )}
          <div className="flex-1">{message.text}</div>
          <button onClick={() => setMessage(null)} className="text-slate-400 hover:text-slate-600 font-bold">×</button>
        </div>
      )}

      {/* 📈 Quick Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-black uppercase tracking-wider">Parents & Guardians</span>
            <Users className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-black text-slate-800">{status?.parentCount ?? 0}</div>
          <p className="text-xs text-slate-500 font-medium">Fathers, Mothers & Emergency Contacts</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-black uppercase tracking-wider">Teachers & Staff</span>
            <UserCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-slate-800">{status?.staffCount ?? 0}</div>
          <p className="text-xs text-slate-500 font-medium">Faculty & Administration Members</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-black uppercase tracking-wider">Synced to Google</span>
            <ShieldCheck className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-black text-indigo-600">{status?.syncedMappingsCount ?? 0}</div>
          <p className="text-xs text-slate-500 font-medium">
            {status?.lastSyncedAt ? `Last: ${new Date(status.lastSyncedAt).toLocaleString()}` : "Not synced yet"}
          </p>
        </div>
      </div>

      {/* ⚡ Option 1: Live Google OAuth Sync Panel */}
      <div className="bg-white rounded-3xl border border-slate-100 p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-600" /> Option 1: Live Google People API Sync
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Automated 2-way live sync directly to Google Contacts under dedicated labels (<code className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-mono">Virtue ERP - Parents</code> & <code className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-mono">Virtue ERP - Staff</code>).
            </p>
          </div>

          {status?.isConnected && (
            <button
              onClick={handleDisconnect}
              className="px-4 py-2 rounded-xl text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 transition-all self-start sm:self-auto"
            >
              Disconnect Account
            </button>
          )}
        </div>

        {status?.isConnected ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => handleSync("parents")}
              disabled={syncing}
              className="p-5 rounded-2xl border-2 border-indigo-100 bg-indigo-50/40 hover:bg-indigo-50 hover:border-indigo-300 transition-all text-left space-y-3 group disabled:opacity-50"
            >
              <div className="flex items-center justify-between">
                <span className="p-2 bg-indigo-100 rounded-xl text-indigo-700 font-black text-xs">PARENTS</span>
                <RefreshCcw className={`w-4 h-4 text-indigo-600 ${syncing ? "animate-spin" : "group-hover:rotate-180 transition-all duration-500"}`} />
              </div>
              <div>
                <div className="text-sm font-black text-slate-900">Sync Parents</div>
                <div className="text-xs text-slate-500 font-medium">Pushes {status.parentCount} parent contacts</div>
              </div>
            </button>

            <button
              onClick={() => handleSync("staff")}
              disabled={syncing}
              className="p-5 rounded-2xl border-2 border-emerald-100 bg-emerald-50/40 hover:bg-emerald-50 hover:border-emerald-300 transition-all text-left space-y-3 group disabled:opacity-50"
            >
              <div className="flex items-center justify-between">
                <span className="p-2 bg-emerald-100 rounded-xl text-emerald-700 font-black text-xs">STAFF</span>
                <RefreshCcw className={`w-4 h-4 text-emerald-600 ${syncing ? "animate-spin" : "group-hover:rotate-180 transition-all duration-500"}`} />
              </div>
              <div>
                <div className="text-sm font-black text-slate-900">Sync Faculty & Staff</div>
                <div className="text-xs text-slate-500 font-medium">Pushes {status.staffCount} staff contacts</div>
              </div>
            </button>

            <button
              onClick={() => handleSync("all")}
              disabled={syncing}
              className="p-5 rounded-2xl border-2 border-slate-900 bg-slate-900 text-white hover:bg-slate-800 transition-all text-left space-y-3 group disabled:opacity-50"
            >
              <div className="flex items-center justify-between">
                <span className="p-2 bg-white/10 rounded-xl text-white font-black text-xs">ALL CONTACTS</span>
                <RefreshCcw className={`w-4 h-4 text-white ${syncing ? "animate-spin" : "group-hover:rotate-180 transition-all duration-500"}`} />
              </div>
              <div>
                <div className="text-sm font-black text-white">Full School Sync</div>
                <div className="text-xs text-slate-300 font-medium">Sync all parents + staff</div>
              </div>
            </button>
          </div>
        ) : (
          <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Key className="w-8 h-8 text-amber-500 shrink-0" />
              <div>
                <div className="text-sm font-bold text-slate-800">Google OAuth Account Not Connected</div>
                <div className="text-xs text-slate-500 font-medium">
                  Connect your Google account to enable live sync, or use the zero-setup instant vCard/CSV download options below.
                </div>
              </div>
            </div>
            <button
              onClick={handleConnectGoogle}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shrink-0 transition-all shadow"
            >
              Connect Google OAuth
            </button>
          </div>
        )}
      </div>

      {/* 📲 Option 2: Zero Setup Instant vCard & CSV Export */}
      <div className="bg-white rounded-3xl border border-slate-100 p-6 sm:p-8 shadow-sm space-y-6">
        <div className="border-b border-slate-100 pb-5">
          <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <Download className="w-5 h-5 text-emerald-600" /> Option 2: Instant vCard (.vcf) & CSV Download (Zero Setup)
          </h3>
          <p className="text-xs text-slate-500 font-medium mt-1">
            No API keys or Google Cloud configuration required! Instantly download contacts formatted for one-click import into Android, iPhone, or <a href="https://contacts.google.com" target="_blank" rel="noreferrer" className="text-blue-600 underline">contacts.google.com</a>.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* vCard Exporter */}
          <div className="bg-emerald-50/50 border border-emerald-100 p-5 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-900 font-black text-sm">
                <Phone className="w-4 h-4 text-emerald-600" /> Mobile vCard (.vcf) Export
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md">Best for Phones</span>
            </div>
            <p className="text-xs text-slate-600 font-medium leading-relaxed">
              Downloads a standard <code className="font-mono bg-white px-1 py-0.5 rounded border border-emerald-200 text-emerald-800">.vcf</code> contact card file. Open on Android or iPhone to add all parent/staff contacts into your address book instantly.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                onClick={() => handleExportVCard("parents")}
                disabled={Boolean(exporting)}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs transition-all shadow-sm flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" /> Parents (.vcf)
              </button>
              <button
                onClick={() => handleExportVCard("staff")}
                disabled={Boolean(exporting)}
                className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold text-xs transition-all shadow-sm flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" /> Staff (.vcf)
              </button>
              <button
                onClick={() => handleExportVCard("all")}
                disabled={Boolean(exporting)}
                className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs transition-all shadow-sm flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" /> All Contacts (.vcf)
              </button>
            </div>
          </div>

          {/* Google CSV Exporter */}
          <div className="bg-blue-50/50 border border-blue-100 p-5 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-blue-900 font-black text-sm">
                <FileText className="w-4 h-4 text-blue-600" /> Google Contacts CSV Export
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-800 px-2 py-0.5 rounded-md">Web Import</span>
            </div>
            <p className="text-xs text-slate-600 font-medium leading-relaxed">
              Downloads a CSV file formatted specifically for <a href="https://contacts.google.com" target="_blank" rel="noreferrer" className="text-blue-600 underline font-bold">Google Contacts Web</a>. Go to Google Contacts &gt; Import &gt; Select CSV file.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                onClick={() => handleExportCSV("parents")}
                disabled={Boolean(exporting)}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs transition-all shadow-sm flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" /> Parents (.csv)
              </button>
              <button
                onClick={() => handleExportCSV("staff")}
                disabled={Boolean(exporting)}
                className="px-3.5 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl font-bold text-xs transition-all shadow-sm flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" /> Staff (.csv)
              </button>
              <button
                onClick={() => handleExportCSV("all")}
                disabled={Boolean(exporting)}
                className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs transition-all shadow-sm flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" /> All Contacts (.csv)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 📖 Setup Instructions Guide Accordion */}
      <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5 space-y-3">
        <button
          onClick={() => setShowGuide(!showGuide)}
          className="w-full flex items-center justify-between font-bold text-xs text-slate-700 hover:text-slate-900"
        >
          <span className="flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-indigo-500" /> How to configure Google Cloud OAuth Credentials for Live Sync
          </span>
          <span>{showGuide ? "Hide Guide ▲" : "Show Guide ▼"}</span>
        </button>

        {showGuide && (
          <div className="text-xs text-slate-600 space-y-2 pt-2 border-t border-slate-200 font-medium leading-relaxed">
            <p>To enable <strong>Option 1 (One-click Google OAuth live sync)</strong>:</p>
            <ol className="list-decimal pl-5 space-y-1">
              <li>Go to <a href="https://console.cloud.google.com" target="_blank" rel="noreferrer" className="text-blue-600 underline font-bold">Google Cloud Console</a>.</li>
              <li>Create a project and enable <strong>Google People API</strong>.</li>
              <li>Go to <strong>Credentials &gt; Create Credentials &gt; OAuth client ID</strong> (Web Application).</li>
              <li>Add Authorized Redirect URI: <code className="bg-white px-1.5 py-0.5 border rounded font-mono text-slate-800">http://localhost:3010/api/integrations/google/callback</code> (or your domain URL).</li>
              <li>Add environment variables in your <code className="bg-white px-1.5 py-0.5 border rounded font-mono text-slate-800">.env</code> file:
                <pre className="bg-slate-900 text-emerald-400 p-3 rounded-xl font-mono text-[11px] mt-1.5">
                  GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"{"\n"}
                  GOOGLE_CLIENT_SECRET="your-client-secret"{"\n"}
                  GOOGLE_REDIRECT_URI="http://localhost:3010/api/integrations/google/callback"
                </pre>
              </li>
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}
