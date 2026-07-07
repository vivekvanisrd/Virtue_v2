"use client";

import React, { useState, useEffect } from "react";
import { 
  Fingerprint, 
  Plus, 
  Trash2, 
  RefreshCcw, 
  MapPin, 
  Activity, 
  Wifi, 
  WifiOff, 
  ToggleLeft, 
  ToggleRight, 
  Loader2, 
  Database,
  Search,
  CheckCircle,
  XCircle,
  AlertCircle
} from "lucide-react";
import { 
  getBiometricDevicesAction, 
  registerBiometricDeviceAction, 
  toggleBiometricDeviceAction, 
  deleteBiometricDeviceAction,
  getRecentBiometricPunchesAction
} from "@/lib/actions/attendance-v2-actions";
import { cn } from "@/lib/utils";
import { BiometricKioskView } from "./BiometricKioskView";

export function BiometricDevicesManager() {
  const [devices, setDevices] = useState<any[]>([]);
  const [punches, setPunches] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<"DEVICES" | "LOGS" | "KIOSK">("DEVICES");
  
  // Registration Form State
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState({
    deviceCode: "",
    deviceName: "",
    location: "",
    model: "BioMax ADMS Push"
  });
  const [formError, setFormError] = useState<string | null>(null);

  // Search filter
  const [searchTerm, setSearchTerm] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const [devRes, punchRes] = await Promise.all([
        getBiometricDevicesAction(),
        getRecentBiometricPunchesAction()
      ]);
      
      if (devRes.success && devRes.data) {
        setDevices(devRes.data);
      }
      if (punchRes.success && punchRes.data) {
        setPunches(punchRes.data);
      }
    } catch (e) {
      console.error("Failed to fetch biometric data:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Poll for live punches and online status updates every 10 seconds
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      const res = await registerBiometricDeviceAction(form);
      if (res.success) {
        setShowAddModal(false);
        setForm({
          deviceCode: "",
          deviceName: "",
          location: "",
          model: "BioMax ADMS Push"
        });
        await fetchData();
      } else {
        setFormError(res.error || "Failed to register biometric device.");
      }
    } catch (err: any) {
      setFormError(err.message || "A technical error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (deviceId: string, currentStatus: boolean) => {
    try {
      const res = await toggleBiometricDeviceAction(deviceId, !currentStatus);
      if (res.success) {
        setDevices(prev => prev.map(d => d.id === deviceId ? { ...d, isActive: !currentStatus } : d));
      } else {
        alert(res.error || "Failed to update device status.");
      }
    } catch (e) {
      alert("A technical error occurred.");
    }
  };

  const handleDelete = async (deviceId: string) => {
    if (!confirm("Are you sure you want to delete this biometric device registration?")) return;
    try {
      const res = await deleteBiometricDeviceAction(deviceId);
      if (res.success) {
        setDevices(prev => prev.filter(d => d.id !== deviceId));
      } else {
        alert(res.error || "Failed to delete device.");
      }
    } catch (e) {
      alert("A technical error occurred.");
    }
  };

  const isOnline = (lastPingAt: string | null) => {
    if (!lastPingAt) return false;
    const diff = Date.now() - new Date(lastPingAt).getTime();
    return diff < 5 * 60 * 1000; // Online if pinged within last 5 minutes
  };

  const filteredDevices = devices.filter(d => 
    d.deviceName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    d.deviceCode.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* Tab Switcher & Action Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-4">
        <div className="flex gap-4">
          <button 
            onClick={() => setActiveSubTab("DEVICES")}
            className={cn(
              "pb-4 px-2 text-xs font-black uppercase tracking-wider transition-all border-b-2",
              activeSubTab === "DEVICES" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-400 hover:text-slate-600"
            )}
          >
            Active Devices ({devices.length})
          </button>
          <button 
            onClick={() => setActiveSubTab("LOGS")}
            className={cn(
              "pb-4 px-2 text-xs font-black uppercase tracking-wider transition-all border-b-2",
              activeSubTab === "LOGS" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-400 hover:text-slate-600"
            )}
          >
            Live Punch Stream ({punches.length})
          </button>
          <button 
            onClick={() => setActiveSubTab("KIOSK")}
            className={cn(
              "pb-4 px-2 text-xs font-black uppercase tracking-wider transition-all border-b-2",
              activeSubTab === "KIOSK" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-400 hover:text-slate-600"
            )}
          >
            Kiosk Display
          </button>
        </div>

        <div className="flex gap-3 w-full sm:w-auto">
          <button 
            onClick={fetchData}
            disabled={loading}
            className="p-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-all shadow-inner active:scale-95 flex items-center justify-center"
            title="Refresh logs & device status"
          >
            <RefreshCcw className={cn("w-4 h-4", loading && "animate-spin")} />
          </button>

          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center justify-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-500/10 active:scale-95"
          >
            <Plus className="w-4 h-4" /> Register Device
          </button>
        </div>
      </div>

      {activeSubTab === "DEVICES" && (
        <div className="space-y-6">
          {/* Search bar */}
          <div className="flex items-center gap-4 bg-white px-5 py-3 rounded-2xl border border-slate-200 shadow-sm focus-within:ring-2 focus-within:ring-blue-500/20 transition-all max-w-md">
            <Search className="w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="SEARCH REGISTERED DEVICES..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent text-[10px] font-black outline-none w-full placeholder:text-slate-300"
            />
          </div>

          {/* Grid of registered devices */}
          {filteredDevices.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-300 gap-4 opacity-50 bg-white rounded-[2.5rem] border border-slate-200 shadow-sm">
              <Fingerprint className="w-16 h-16" />
              <p className="text-[10px] font-black uppercase tracking-[0.3em]">No registered biometric devices found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredDevices.map((dev) => {
                const online = isOnline(dev.lastPingAt);
                return (
                  <div 
                    key={dev.id} 
                    className="p-6 bg-white border border-slate-200 rounded-[2.5rem] hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between relative overflow-hidden group shadow-sm"
                  >
                    <div>
                      {/* Status indicator */}
                      <div className="flex items-center justify-between mb-4">
                        <span className="px-3 py-1 bg-slate-50 border border-slate-100 text-slate-400 text-[8px] font-black uppercase tracking-wider rounded-lg font-mono">
                          {dev.model || "BioMax ADMS"}
                        </span>
                        
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "w-2 h-2 rounded-full",
                            online ? "bg-emerald-500 animate-pulse" : "bg-rose-500"
                          )} />
                          <span className={cn(
                            "text-[8px] font-black uppercase tracking-widest",
                            online ? "text-emerald-500" : "text-rose-500"
                          )}>
                            {online ? "Online" : "Offline"}
                          </span>
                        </div>
                      </div>

                      <h4 className="text-lg font-black text-slate-900 uppercase tracking-tight truncate group-hover:text-blue-600 transition-colors">
                        {dev.deviceName}
                      </h4>
                      <p className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-widest mt-1">
                        S/N: {dev.deviceCode}
                      </p>

                      <div className="mt-4 flex items-center gap-2 text-slate-500">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-[10px] font-bold uppercase tracking-wider truncate">
                          {dev.location || "Not Configured"}
                        </span>
                      </div>
                    </div>

                    <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-slate-400">
                        <Activity className="w-3.5 h-3.5" />
                        <span className="text-[8px] font-black uppercase tracking-widest">
                          {dev.lastPingAt 
                            ? `Ping: ${new Date(dev.lastPingAt).toLocaleTimeString()}`
                            : "No pings received"
                          }
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Toggle Active status */}
                        <button
                          onClick={() => handleToggle(dev.id, dev.isActive)}
                          className={cn(
                            "p-1.5 rounded-lg transition-all active:scale-90",
                            dev.isActive ? "text-emerald-500 hover:text-emerald-600" : "text-slate-300 hover:text-slate-400"
                          )}
                          title={dev.isActive ? "Deactivate device" : "Activate device"}
                        >
                          {dev.isActive ? <ToggleRight className="w-7 h-7" /> : <ToggleLeft className="w-7 h-7" />}
                        </button>

                        {/* Delete button */}
                        <button
                          onClick={() => handleDelete(dev.id)}
                          className="p-1.5 text-slate-300 hover:text-rose-600 transition-all rounded-lg hover:bg-rose-50 active:scale-90"
                          title="Unregister device"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Subtle backdrop icon */}
                    <div className="absolute -bottom-4 -right-4 p-8 opacity-[0.02] group-hover:opacity-[0.04] transition-opacity pointer-events-none">
                      <Fingerprint className="w-24 h-24 rotate-12 text-slate-900" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeSubTab === "LOGS" && (
        <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
          <div className="p-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Real-time attendance log receiver</p>
            </div>
            <div className="flex items-center gap-2">
              <Database className="w-3.5 h-3.5 text-blue-500" />
              <span className="text-[9px] font-black text-blue-600 uppercase tracking-wider font-mono">ADMS Push Receiver Active</span>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[9px] font-black uppercase tracking-widest text-slate-400">
                  <th className="px-8 py-4">Employee</th>
                  <th className="px-8 py-4">Action</th>
                  <th className="px-8 py-4">Time</th>
                  <th className="px-8 py-4">Source Device</th>
                  <th className="px-8 py-4">Status</th>
                  <th className="px-8 py-4">Device remarks</th>
                </tr>
              </thead>
              <tbody>
                {punches.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-8 py-12 text-center text-slate-400 text-xs italic uppercase tracking-wider font-bold">
                      No biometric scans received today. Use emulator script to test.
                    </td>
                  </tr>
                ) : (
                  punches.map((punch, idx) => (
                    <tr key={punch.id || idx} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                      <td className="px-8 py-4">
                        <p className="text-xs font-black text-slate-900 uppercase italic">{punch.name}</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{punch.code}</p>
                      </td>
                      <td className="px-8 py-4">
                        <span className={cn(
                          "px-2.5 py-1 text-[8px] font-black uppercase tracking-wider rounded-lg border",
                          punch.type === "IN" 
                            ? "bg-blue-50 text-blue-600 border-blue-100" 
                            : "bg-amber-50 text-amber-600 border-amber-100"
                        )}>
                          {punch.type}
                        </span>
                      </td>
                      <td className="px-8 py-4 text-xs font-bold text-slate-600">{punch.time}</td>
                      <td className="px-8 py-4">
                        <div className="flex items-center gap-1.5">
                          <Fingerprint className="w-3.5 h-3.5 text-slate-400" />
                          <span className="text-xs font-bold text-slate-700 uppercase">{punch.remarks.match(/device (\S+)/)?.[1] || "Device"}</span>
                        </div>
                      </td>
                      <td className="px-8 py-4">
                        <span className={cn(
                          "text-[9px] font-black uppercase tracking-wider",
                          punch.status === "Present" ? "text-emerald-500" :
                          punch.status === "Late" ? "text-amber-500" : "text-slate-400"
                        )}>
                          {punch.status}
                        </span>
                      </td>
                      <td className="px-8 py-4 text-[10px] font-medium text-slate-400 truncate max-w-xs" title={punch.remarks}>
                        {punch.remarks}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeSubTab === "KIOSK" && (
        <BiometricKioskView />
      )}

      {/* Register Device Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in duration-300">
            <div className="px-8 py-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-black italic uppercase tracking-tighter text-slate-900">Register Biometric Device</h3>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Connect hardware terminal to campus branch</p>
              </div>
              <button 
                onClick={() => setShowAddModal(false)}
                className="w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 flex items-center justify-center font-bold text-slate-600 transition-all text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRegister} className="p-8 space-y-5">
              {formError && (
                <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <p className="text-[10px] font-bold text-rose-600 leading-relaxed uppercase">{formError}</p>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Device Serial Number (S/N)</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. BMAX123456789" 
                  value={form.deviceCode}
                  onChange={(e) => setForm(prev => ({ ...prev, deviceCode: e.target.value.trim() }))}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-2xl px-5 py-4 text-xs font-bold text-slate-900 outline-none transition-all focus:ring-4 focus:ring-blue-500/5 shadow-inner"
                />
                <p className="text-[8px] font-semibold text-slate-400 uppercase leading-normal">
                  Found in the biometric device settings or label (often labeled SN or Serial Number)
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Device Name</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Main Gate Biometric Terminal" 
                  value={form.deviceName}
                  onChange={(e) => setForm(prev => ({ ...prev, deviceName: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-2xl px-5 py-4 text-xs font-bold text-slate-900 outline-none transition-all focus:ring-4 focus:ring-blue-500/5 shadow-inner"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Installation Location</label>
                <input 
                  type="text" 
                  placeholder="e.g. Front Gate, Lobby, Staff Office" 
                  value={form.location}
                  onChange={(e) => setForm(prev => ({ ...prev, location: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-2xl px-5 py-4 text-xs font-bold text-slate-900 outline-none transition-all focus:ring-4 focus:ring-blue-500/5 shadow-inner"
                />
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                <button 
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={submitting}
                  className="px-7 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-500/20 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Register
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
