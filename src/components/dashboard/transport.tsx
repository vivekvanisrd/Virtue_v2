"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Bus,
  MapPin,
  Calendar,
  Clock,
  ShieldAlert,
  AlertTriangle,
  ShieldCheck,
  Activity,
  Users,
  Settings,
  Wrench,
  FileText,
  ChevronRight,
  Play,
  Pause,
  RefreshCcw,
  Plus,
  Edit2,
  Trash2,
  Eye,
  Map,
  AlertCircle,
  PlusCircle,
  Search,
  UserCheck,
  Check,
  Sparkles,
  History,
  Info,
  DollarSign,
  UserX,
  Lock,
  ArrowRight
} from "lucide-react";
import { useTabs } from "@/context/tab-context";
import { useTenant } from "@/context/tenant-context";

// Server Action Imports
import {
  getRoutesAction,
  createRouteAction,
  updateRouteAction,
  deleteRouteAction,
  getVehiclesAction,
  createVehicleAction,
  updateVehicleAction,
  deleteVehicleAction,
  getStopAction,
  getStopsAction,
  createStopAction,
  updateStopAction,
  deleteStopAction,
  getDriversAction,
  createDriverAction,
  updateDriverAction,
  deleteDriverAction,
  getDriverAssignmentsAction,
  assignDriverAction,
  unassignDriverAction,
  getTripSessionsAction,
  createTripSessionAction,
  updateTripSessionAction,
  deleteTripSessionAction,
  getIncidentsAction,
  createIncidentAction,
  updateIncidentAction,
  deleteIncidentAction,
  getMaintenancesAction,
  createMaintenanceAction,
  updateMaintenanceAction,
  deleteMaintenanceAction,
  assignStudentTransportAction,
  removeStudentTransportAction,
} from "@/lib/actions/transport-actions-v2";

import { getStudentListAction } from "@/lib/actions/student-actions";

// Feature Flag
const ENABLE_PARENT_TRACKING = false;

// Helpers
function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export function TransportContent({ tabId }: { tabId: string; params?: any }) {
  const { openTab } = useTabs();
  const { schoolId, branchId, userRole } = useTenant();

  // Unified Loading State
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Core Data Lists
  const [routes, setRoutes] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [stops, setStops] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [trips, setTrips] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [maintenances, setMaintenances] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);

  // Setup sub-navigation state: 'routes' | 'stops' | 'vehicles' | 'drivers' | 'assignments' | 'students'
  const [setupTab, setSetupTab] = useState<string>("routes");

  // Filter Search
  const [searchTerm, setSearchTerm] = useState("");

  // Modals state
  const [activeModal, setActiveModal] = useState<string | null>(null); // 'route' | 'stop' | 'vehicle' | 'driver' | 'assign-driver' | 'assign-student' | 'incident' | 'maintenance' | 'delete'
  const [editItem, setEditItem] = useState<any>(null);
  const [deleteContext, setDeleteContext] = useState<{ type: string; id: string } | null>(null);

  // Message banners
  const [bannerMsg, setBannerMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const showBanner = (text: string, type: "success" | "error" = "success") => {
    setBannerMsg({ text, type });
    setTimeout(() => setBannerMsg(null), 4000);
  };

  // 🏛️ Dynamic Data Fetching
  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [
        rRes,
        vRes,
        sRes,
        dRes,
        aRes,
        tRes,
        iRes,
        mRes,
        studRes
      ] = await Promise.all([
        getRoutesAction(),
        getVehiclesAction(),
        getStopsAction(),
        getDriversAction(),
        getDriverAssignmentsAction(),
        getTripSessionsAction(),
        getIncidentsAction(),
        getMaintenancesAction(),
        getStudentListAction().catch(() => ({ success: true, data: [] }))
      ]);

      if (rRes.success) setRoutes((rRes as any).data || []);
      if (vRes.success) setVehicles((vRes as any).data || []);
      if (sRes.success) setStops((sRes as any).data || []);
      if (dRes.success) setDrivers((dRes as any).data || []);
      if (aRes.success) setAssignments((aRes as any).data || []);
      if (tRes.success) setTrips((tRes as any).data || []);
      if (iRes.success) setIncidents((iRes as any).data || []);
      if (mRes.success) setMaintenances((mRes as any).data || []);
      if (studRes.success) setStudents((studRes as any).data || []);
    } catch (err) {
      console.error("Error fetching transport core registry:", err);
      showBanner("Failed to synchronize local fleet metrics", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Compute Expiry Metrics for Vehicle Health
  const today = new Date();
  const getExpiryStatus = (expiryStr?: string) => {
    if (!expiryStr) return "MISSING";
    const expDate = new Date(expiryStr);
    if (expDate < today) return "EXPIRED";
    const diffDays = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
    if (diffDays <= 30) return "WARNING";
    return "OK";
  };

  const vehicleHealthList = vehicles.map(v => {
    const docs = v.documents || {};
    const insStatus = getExpiryStatus(docs.insuranceExpiry);
    const fitStatus = getExpiryStatus(docs.fitnessExpiry);
    const polStatus = getExpiryStatus(docs.pollutionExpiry);

    // Look for pending overdue maintenance
    const vMaint = maintenances.filter(m => m.vehicleId === v.id);
    const overdueMaint = vMaint.some(m => m.status === "PENDING" && m.nextDueDate && new Date(m.nextDueDate) < today);

    // Check if active trip on this vehicle is offline
    const isOffline = trips.some(t => t.vehicleId === v.id && t.status === "OFFLINE");

    return {
      id: v.id,
      registrationNo: v.registrationNo,
      model: v.model,
      insuranceExpiry: docs.insuranceExpiry,
      fitnessExpiry: docs.fitnessExpiry,
      pollutionExpiry: docs.pollutionExpiry,
      insStatus,
      fitStatus,
      polStatus,
      overdueMaint,
      isOffline,
      hasIssues: insStatus === "EXPIRED" || fitStatus === "EXPIRED" || polStatus === "EXPIRED" || overdueMaint || isOffline || insStatus === "WARNING" || fitStatus === "WARNING" || polStatus === "WARNING"
    };
  });

  const expiredCount = vehicleHealthList.filter(h => h.insStatus === "EXPIRED" || h.fitStatus === "EXPIRED" || h.polStatus === "EXPIRED").length;
  const warningsCount = vehicleHealthList.filter(h => h.insStatus === "WARNING" || h.fitStatus === "WARNING" || h.polStatus === "WARNING").length;
  const overdueMaintCount = vehicleHealthList.filter(h => h.overdueMaint).length;
  const offlineCount = vehicleHealthList.filter(h => h.isOffline).length;

  // Render Loading Spinner
  if (loading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center">
          <RefreshCcw className="w-10 h-10 text-indigo-600 animate-spin" />
          <p className="text-xs font-black uppercase tracking-widest text-slate-400">Loading Fleet Telemetry...</p>
        </div>
      </div>
    );
  }

  // Modals Submit Handler
  const handleFormSubmit = async (type: string, data: any) => {
    setSubmitting(true);
    let result: any = { success: false };
    try {
      if (type === "route") {
        if (editItem) {
          result = await updateRouteAction(editItem.id, { ...data, updatedAt: editItem.updatedAt });
        } else {
          result = await createRouteAction(data);
        }
      } else if (type === "stop") {
        if (editItem) {
          result = await updateStopAction(editItem.id, { ...data, updatedAt: editItem.updatedAt });
        } else {
          result = await createStopAction(data);
        }
      } else if (type === "vehicle") {
        if (editItem) {
          result = await updateVehicleAction(editItem.id, { ...data, updatedAt: editItem.updatedAt });
        } else {
          result = await createVehicleAction(data);
        }
      } else if (type === "driver") {
        if (editItem) {
          result = await updateDriverAction(editItem.id, { ...data, updatedAt: editItem.updatedAt });
        } else {
          result = await createDriverAction(data);
        }
      } else if (type === "assign-driver") {
        result = await assignDriverAction(data);
      } else if (type === "assign-student") {
        result = await assignStudentTransportAction(data);
      } else if (type === "incident") {
        if (editItem) {
          result = await updateIncidentAction(editItem.id, { ...data, updatedAt: editItem.updatedAt });
        } else {
          result = await createIncidentAction(data);
        }
      } else if (type === "maintenance") {
        if (editItem) {
          result = await updateMaintenanceAction(editItem.id, { ...data, updatedAt: editItem.updatedAt });
        } else {
          result = await createMaintenanceAction(data);
        }
      }

      if (result.success) {
        showBanner(`${editItem ? "Updated" : "Created"} successfully!`);
        setActiveModal(null);
        setEditItem(null);
        await loadData(true);
      } else {
        showBanner(result.error?.message || "Operation failed", "error");
      }
    } catch (err: any) {
      showBanner(err.message || "An unexpected error occurred", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Action Confirm
  const handleDeleteConfirm = async () => {
    if (!deleteContext) return;
    setSubmitting(true);
    let result = { success: false };
    try {
      const { type, id } = deleteContext;
      if (type === "route") result = await deleteRouteAction(id);
      else if (type === "stop") result = await deleteStopAction(id);
      else if (type === "vehicle") result = await deleteVehicleAction(id);
      else if (type === "driver") result = await deleteDriverAction(id);
      else if (type === "assignment") result = await unassignDriverAction(id);
      else if (type === "student") result = await removeStudentTransportAction(id);
      else if (type === "incident") result = await deleteIncidentAction(id);
      else if (type === "maintenance") result = await deleteMaintenanceAction(id);

      if (result.success) {
        showBanner("Deleted record successfully");
        setActiveModal(null);
        setDeleteContext(null);
        await loadData(true);
      } else {
        showBanner("Delete failed. Verification error.", "error");
      }
    } catch (err: any) {
      showBanner(err.message || "Deletion failed", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // Quick helper to fetch route polyline coordinates
  const getRoutePolyline = (routeId: string): [number, number][] => {
    // Demo coordinate fallback if no polyline
    const routesDemoCoords: Record<string, [number, number][]> = {
      "DEMO-R-A": [
        [17.6000, 78.1000],
        [17.6020, 78.1050],
        [17.6050, 78.1100],
        [17.6090, 78.1150],
        [17.6120, 78.1200]
      ],
      "DEMO-R-B": [
        [17.6200, 78.1500],
        [17.6230, 78.1550],
        [17.6260, 78.1600],
        [17.6290, 78.1650]
      ]
    };
    const route = routes.find(r => r.id === routeId);
    if (!route) return [[17.6000, 78.1000]];
    return routesDemoCoords[route.routeCode] || [[17.6000, 78.1000]];
  };

  return (
    <div className="space-y-6">
      {/* Banner Notifications */}
      {bannerMsg && (
        <div
          className={cn(
            "fixed top-4 right-4 z-[999] px-6 py-4 rounded-2xl shadow-xl backdrop-blur-md border animate-in slide-in-from-top-5 duration-300 flex items-center gap-3",
            bannerMsg.type === "success"
              ? "bg-emerald-50/90 border-emerald-100 text-emerald-800"
              : "bg-rose-50/90 border-rose-100 text-rose-800"
          )}
        >
          {bannerMsg.type === "success" ? <ShieldCheck className="w-5 h-5 text-emerald-600" /> : <ShieldAlert className="w-5 h-5 text-rose-600" />}
          <span className="text-xs font-bold">{bannerMsg.text}</span>
        </div>
      )}

      {/* Main Tab Renderings */}
      {tabId === "transport" || tabId === "transport-dashboard" ? (
        <TransportDashboardView
          healthList={vehicleHealthList}
          expiredCount={expiredCount}
          warningsCount={warningsCount}
          overdueMaintCount={overdueMaintCount}
          offlineCount={offlineCount}
          trips={trips}
          incidents={incidents}
          routes={routes}
          vehicles={vehicles}
          drivers={drivers}
          maintenances={maintenances}
          students={students}
          stops={stops}
          openTab={openTab}
          setActiveModal={setActiveModal}
          setEditItem={setEditItem}
          setDeleteContext={setDeleteContext}
        />
      ) : tabId === "transport-setup" ? (
        <TransportSetupView
          setupTab={setupTab}
          setSetupTab={setSetupTab}
          routes={routes}
          stops={stops}
          vehicles={vehicles}
          drivers={drivers}
          assignments={assignments}
          students={students}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          setActiveModal={setActiveModal}
          setEditItem={setEditItem}
          setDeleteContext={setDeleteContext}
        />
      ) : tabId === "transport-live" ? (
        <TransportLiveView
          trips={trips}
          vehicles={vehicles}
          routes={routes}
          stops={stops}
          getPolyline={getRoutePolyline}
        />
      ) : tabId === "transport-replay" ? (
        <TransportReplayView
          trips={trips}
          routes={routes}
          vehicles={vehicles}
          incidents={incidents}
          stops={stops}
          getPolyline={getRoutePolyline}
        />
      ) : tabId === "transport-parent" ? (
        <TransportParentView />
      ) : null}

      {/* Modal Overlays */}
      {activeModal && (
        <TransportModalOverlay
          type={activeModal}
          editItem={editItem}
          routes={routes}
          vehicles={vehicles}
          stops={stops}
          drivers={drivers}
          students={students}
          onClose={() => {
            setActiveModal(null);
            setEditItem(null);
          }}
          onSubmit={handleFormSubmit}
          submitting={submitting}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteContext && (
        <div className="fixed inset-0 z-[999] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-slate-100 space-y-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-4 text-rose-600">
              <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black tracking-tight uppercase">Confirm Deletion</h3>
                <p className="text-xs text-slate-400 font-medium">This action cannot be undone.</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed font-semibold">
              Are you sure you want to delete this {deleteContext.type} record? Any linked assignments will be marked as inactive.
            </p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  setDeleteContext(null);
                  setActiveModal(null);
                }}
                disabled={submitting}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold uppercase transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={submitting}
                className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg shadow-rose-600/20"
              >
                {submitting ? <RefreshCcw className="w-3.5 h-3.5 animate-spin" /> : "Delete Record"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 📊 VIEW: TRANSPORT DASHBOARD (OVERVIEW)
// ============================================================================
interface DashboardProps {
  healthList: any[];
  expiredCount: number;
  warningsCount: number;
  overdueMaintCount: number;
  offlineCount: number;
  trips: any[];
  incidents: any[];
  routes: any[];
  vehicles: any[];
  drivers: any[];
  maintenances: any[];
  students: any[];
  stops: any[];
  openTab: (tab: any) => void;
  setActiveModal: (type: string) => void;
  setEditItem: (item: any) => void;
  setDeleteContext: (context: any) => void;
}

function TransportDashboardView({
  healthList,
  expiredCount,
  warningsCount,
  overdueMaintCount,
  offlineCount,
  trips,
  incidents,
  routes,
  vehicles,
  drivers,
  maintenances,
  students,
  stops,
  openTab,
  setActiveModal,
  setEditItem,
  setDeleteContext
}: DashboardProps) {
  const activeTrips = trips.filter(t => t.status === "ACTIVE" || t.status === "STALE");

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Overview Headers */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Bus className="w-8 h-8 text-indigo-600" />
            Transport Operations Hub
          </h2>
          <p className="text-slate-500 font-medium text-sm mt-1">
            Real-time telemetry, fleet tracking status, and maintenance overview
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => openTab({ id: "transport-setup", title: "Fleet Setup", icon: Settings, component: "Transport" })}
            className="px-4 py-2.5 bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-slate-300 rounded-xl text-xs font-bold uppercase flex items-center gap-1.5 transition-all shadow-sm"
          >
            <Settings className="w-4 h-4" /> Setup Fleet
          </button>
          <button
            onClick={() => openTab({ id: "transport-live", title: "Live Tracking", icon: Map, component: "Transport" })}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-lg shadow-indigo-600/20"
          >
            <Map className="w-4 h-4" /> Live Map
          </button>
        </div>
      </div>

      {/* Grid: 4 Analytic Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Active Bus Runs", value: activeTrips.length, icon: Activity, color: "text-indigo-600", bg: "bg-indigo-50 border-indigo-100/60" },
          { label: "Pending Incidents", value: incidents.filter(i => i.status === "PENDING").length, icon: ShieldAlert, color: "text-rose-600", bg: "bg-rose-50 border-rose-100/60" },
          { label: "Fleet Health Issues", value: expiredCount + overdueMaintCount + offlineCount, icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50 border-amber-100/60" },
          { label: "Transport Students", value: students.filter(s => s.studentTransport).length, icon: Users, color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-100/60" },
        ].map((item, i) => (
          <div key={i} className={cn("bg-white border rounded-[1.5rem] p-5 flex items-center justify-between shadow-sm hover:scale-[1.01] transition-all", item.bg)}>
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{item.label}</span>
              <p className={cn("text-3xl font-black tracking-tighter", item.color)}>{item.value}</p>
            </div>
            <div className="p-3 bg-white border border-slate-100 rounded-2xl shadow-inner">
              <item.icon className={cn("w-6 h-6", item.color)} />
            </div>
          </div>
        ))}
      </div>

      {/* Grid 2 Column: Active Runs & Fleet Health Overview */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Active Runs Table */}
        <div className="xl:col-span-2 bg-white border border-slate-200/60 rounded-[2rem] shadow-xl shadow-slate-200/30 overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Activity className="w-5 h-5 text-indigo-600" />
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-900">Active Bus Runs</h3>
            </div>
            <span className="text-[10px] bg-emerald-50 border border-emerald-100 text-emerald-600 px-2 py-0.5 rounded-lg font-black uppercase tracking-wider animate-pulse">
              Live updates
            </span>
          </div>

          <div className="flex-1 overflow-x-auto">
            {activeTrips.length === 0 ? (
              <div className="py-20 text-center space-y-3">
                <Bus className="w-12 h-12 text-slate-200 mx-auto" />
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">No Active Runs Right Now</p>
                <p className="text-xs text-slate-400 max-w-xs mx-auto font-medium">Use the Driver App telemetry or start mock trip runs to view live updates here.</p>
              </div>
            ) : (
              <table className="w-full text-left text-[11px] border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 font-black uppercase tracking-widest">
                    <th className="p-4">Vehicle / Reg</th>
                    <th className="p-4">Route</th>
                    <th className="p-4">Driver</th>
                    <th className="p-4">Run Type</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                  {activeTrips.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 font-bold">
                        <span className="block text-slate-900 font-black">{t.vehicle?.registrationNo || "Vehicle"}</span>
                        <span className="text-[10px] text-slate-400">Eicher Coach</span>
                      </td>
                      <td className="p-4">
                        <span className="block text-slate-900 font-bold">{t.route?.routeName || "Alpha"}</span>
                        <span className="text-[9px] font-black text-indigo-500 uppercase">{t.route?.routeCode}</span>
                      </td>
                      <td className="p-4 font-bold text-slate-800">
                        {t.driver?.name || "Driver"}
                      </td>
                      <td className="p-4">
                        <span className={cn(
                          "px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest border",
                          t.tripType === "PICKUP" ? "bg-blue-50 border-blue-100 text-blue-600" : "bg-purple-50 border-purple-100 text-purple-600"
                        )}>
                          {t.tripType}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={cn(
                          "inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border",
                          t.status === "ACTIVE" ? "bg-emerald-50 border-emerald-100 text-emerald-600" : "bg-rose-50 border-rose-100 text-rose-600"
                        )}>
                          <span className={cn("w-1.5 h-1.5 rounded-full", t.status === "ACTIVE" ? "bg-emerald-500 animate-ping" : "bg-rose-500")} />
                          {t.status}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => openTab({ id: "transport-live", title: "Live Tracking", icon: Map, component: "Transport" })}
                          className="px-2.5 py-1 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-lg text-[10px] font-black uppercase hover:bg-indigo-600 hover:text-white transition-all"
                        >
                          Track Live
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Vehicle Health & Expiry Panel */}
        <div className="bg-white border border-slate-200/60 rounded-[2rem] shadow-xl shadow-slate-200/30 overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2.5">
              <Wrench className="w-5 h-5 text-amber-500" />
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-900">Vehicle Health & Expiry</h3>
            </div>
            {expiredCount > 0 && (
              <span className="text-[9px] font-black bg-rose-50 border border-rose-100 text-rose-600 px-2 py-0.5 rounded-md uppercase tracking-widest animate-pulse">
                {expiredCount} Critical
              </span>
            )}
          </div>

          <div className="p-5 space-y-4 flex-1">
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="p-3 bg-rose-50/50 border border-rose-100 rounded-2xl">
                <span className="block text-[8px] font-black uppercase tracking-widest text-rose-400">Expired Docs</span>
                <span className="text-2xl font-black text-rose-600">{expiredCount}</span>
              </div>
              <div className="p-3 bg-amber-50/50 border border-amber-100 rounded-2xl">
                <span className="block text-[8px] font-black uppercase tracking-widest text-amber-500">Expiring Soon</span>
                <span className="text-2xl font-black text-amber-600">{warningsCount}</span>
              </div>
              <div className="p-3 bg-red-50/50 border border-red-100 rounded-2xl">
                <span className="block text-[8px] font-black uppercase tracking-widest text-red-500">Overdue Maint</span>
                <span className="text-2xl font-black text-red-600">{overdueMaintCount}</span>
              </div>
              <div className="p-3 bg-slate-50/50 border border-slate-200/60 rounded-2xl">
                <span className="block text-[8px] font-black uppercase tracking-widest text-slate-400">Offline Buses</span>
                <span className="text-2xl font-black text-slate-700">{offlineCount}</span>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-4 space-y-2.5">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Maintenance & Documents Alerts</h4>
              
              <div className="max-h-60 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {healthList.map(h => (
                  <div key={h.id} className={cn(
                    "p-3 rounded-xl border flex flex-col gap-1 transition-all",
                    h.hasIssues ? "bg-amber-50/20 border-amber-100/50" : "bg-slate-50/30 border-slate-100"
                  )}>
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] font-black text-slate-800">{h.registrationNo}</span>
                      <span className="text-[9px] font-medium text-slate-400">{h.model}</span>
                    </div>

                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {h.insStatus === "EXPIRED" && <span className="px-1.5 py-0.5 bg-rose-50 text-rose-600 text-[8px] font-black border border-rose-100 rounded uppercase">Insurance Expired</span>}
                      {h.insStatus === "WARNING" && <span className="px-1.5 py-0.5 bg-amber-50 text-amber-600 text-[8px] font-black border border-amber-100 rounded uppercase">Insurance Expiring</span>}
                      {h.fitStatus === "EXPIRED" && <span className="px-1.5 py-0.5 bg-rose-50 text-rose-600 text-[8px] font-black border border-rose-100 rounded uppercase">Fitness Expired</span>}
                      {h.polStatus === "EXPIRED" && <span className="px-1.5 py-0.5 bg-rose-50 text-rose-600 text-[8px] font-black border border-rose-100 rounded uppercase">Pollution Expired</span>}
                      {h.overdueMaint && <span className="px-1.5 py-0.5 bg-red-50 text-red-600 text-[8px] font-black border border-red-100 rounded uppercase">Overdue Maint</span>}
                      {h.isOffline && <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 text-[8px] font-black border border-slate-200 rounded uppercase">Offline</span>}
                      
                      {!h.hasIssues && (
                        <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-600 text-[8px] font-black border border-emerald-100 rounded uppercase flex items-center gap-1">
                          <Check className="w-2.5 h-2.5" /> Healthy
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Incident Feed & Quick Action Tools */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Incident Feed */}
        <div className="lg:col-span-2 bg-white border border-slate-200/60 rounded-[2rem] shadow-xl shadow-slate-200/30 overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <ShieldAlert className="w-5 h-5 text-rose-600" />
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-900">Incident Feed & Safety Alerts</h3>
            </div>
            <button
              onClick={() => setActiveModal("incident")}
              className="p-1 hover:bg-slate-50 text-indigo-600 rounded-lg transition-colors border border-transparent hover:border-slate-100"
              title="Report Incident"
            >
              <PlusCircle className="w-5 h-5" />
            </button>
          </div>

          <div className="p-5 space-y-3 flex-grow max-h-[350px] overflow-y-auto custom-scrollbar">
            {incidents.length === 0 ? (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <ShieldCheck className="w-10 h-10 text-emerald-400 mx-auto" />
                <p className="text-[10px] font-black uppercase tracking-widest">Zero Incidents Reported</p>
                <p className="text-xs font-medium text-slate-400">All transport fleets are operating in normal parameters.</p>
              </div>
            ) : (
              incidents.map((i) => (
                <div key={i.id} className="p-4 bg-slate-50 border border-slate-100 rounded-2xl hover:border-slate-200 transition-all flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn(
                        "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 border rounded-md",
                        i.severity === "CRITICAL" ? "bg-red-100 border-red-200 text-red-700" :
                        i.severity === "HIGH" ? "bg-rose-50 border-rose-100 text-rose-700" :
                        i.severity === "MEDIUM" ? "bg-amber-50 border-amber-100 text-amber-700" :
                        "bg-blue-50 border-blue-100 text-blue-700"
                      )}>
                        {i.severity} Severity
                      </span>
                      <span className="text-[9px] font-bold text-slate-400 uppercase">{new Date(i.reportedAt).toLocaleDateString()}</span>
                      <span className="text-[9px] font-black bg-slate-100 text-slate-600 px-1.5 rounded">{i.incidentType || "GENERAL"}</span>
                    </div>
                    <p className="text-xs text-slate-700 font-bold leading-relaxed">{i.description}</p>
                    <div className="text-[10px] font-bold text-slate-400 flex items-center gap-2">
                      <span>Vehicle: {i.vehicle?.registrationNo}</span>
                      <span>·</span>
                      <span>Driver: {i.driver?.name}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className={cn(
                      "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 border rounded-md",
                      i.status === "RESOLVED" ? "bg-emerald-50 border-emerald-100 text-emerald-600" : "bg-amber-50 border-amber-100 text-amber-600"
                    )}>
                      {i.status}
                    </span>
                    <button
                      onClick={() => {
                        setEditItem(i);
                        setActiveModal("incident");
                      }}
                      className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-indigo-600 transition-all"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteContext({ type: "incident", id: i.id })}
                      className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-rose-600 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Operations Portal */}
        <div className="bg-white border border-slate-200/60 rounded-[2rem] shadow-xl shadow-slate-200/30 overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-100 bg-slate-50/50">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-900">Historical playback</h3>
          </div>

          <div className="p-5 space-y-4 flex-grow flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-12 h-12 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center justify-center">
                <History className="w-6 h-6 text-indigo-600" />
              </div>
              <h4 className="text-sm font-black tracking-tight text-slate-800">Trip Replay Viewer</h4>
              <p className="text-xs font-medium text-slate-400 leading-relaxed">
                Review completed trips, route adherence polylines, chronological speed pings, and geofence events.
              </p>
            </div>

            <button
              onClick={() => openTab({ id: "transport-replay", title: "Trip Replay", icon: History, component: "Transport" })}
              className="w-full py-3 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all shadow-md"
            >
              Open Playback <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 🛠️ VIEW: TRANSPORT SETUP PANEL (CRUD TABLES)
// ============================================================================
interface SetupProps {
  setupTab: string;
  setSetupTab: (tab: string) => void;
  routes: any[];
  stops: any[];
  vehicles: any[];
  drivers: any[];
  assignments: any[];
  students: any[];
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  setActiveModal: (type: string) => void;
  setEditItem: (item: any) => void;
  setDeleteContext: (context: any) => void;
}

function TransportSetupView({
  setupTab,
  setSetupTab,
  routes,
  stops,
  vehicles,
  drivers,
  assignments,
  students,
  searchTerm,
  setSearchTerm,
  setActiveModal,
  setEditItem,
  setDeleteContext
}: SetupProps) {

  // Filter lists based on search
  const filteredRoutes = routes.filter(r => r.routeName.toLowerCase().includes(searchTerm.toLowerCase()) || r.routeCode.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredVehicles = vehicles.filter(v => v.registrationNo.toLowerCase().includes(searchTerm.toLowerCase()) || (v.model || "").toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredStops = stops.filter(s => s.stopName.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredDrivers = drivers.filter(d => d.name.toLowerCase().includes(searchTerm.toLowerCase()) || d.phone.includes(searchTerm));
  const filteredAssignments = assignments.filter(a => a.driver?.name.toLowerCase().includes(searchTerm.toLowerCase()) || a.vehicle?.registrationNo.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredStudents = students.filter(s => s.studentTransport && (s.firstName.toLowerCase().includes(searchTerm.toLowerCase()) || (s.lastName || "").toLowerCase().includes(searchTerm.toLowerCase())));

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Fleet Management Setup</h2>
          <p className="text-slate-500 font-medium text-xs mt-0.5">Manage routes, stops, vehicles, drivers, and allocations</p>
        </div>

        {/* Dynamic add button based on active subtab */}
        <div>
          {setupTab === "routes" && (
            <button onClick={() => setActiveModal("route")} className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase flex items-center gap-1.5 transition-all">
              <Plus className="w-4 h-4" /> Add Route
            </button>
          )}
          {setupTab === "stops" && (
            <button onClick={() => setActiveModal("stop")} className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase flex items-center gap-1.5 transition-all">
              <Plus className="w-4 h-4" /> Add Stop
            </button>
          )}
          {setupTab === "vehicles" && (
            <button onClick={() => setActiveModal("vehicle")} className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase flex items-center gap-1.5 transition-all">
              <Plus className="w-4 h-4" /> Add Vehicle
            </button>
          )}
          {setupTab === "drivers" && (
            <button onClick={() => setActiveModal("driver")} className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase flex items-center gap-1.5 transition-all">
              <Plus className="w-4 h-4" /> Add Driver
            </button>
          )}
          {setupTab === "assignments" && (
            <button onClick={() => setActiveModal("assign-driver")} className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase flex items-center gap-1.5 transition-all">
              <Plus className="w-4 h-4" /> Assign Driver
            </button>
          )}
          {setupTab === "students" && (
            <button onClick={() => setActiveModal("assign-student")} className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase flex items-center gap-1.5 transition-all">
              <Plus className="w-4 h-4" /> Allocate Student
            </button>
          )}
        </div>
      </div>

      {/* Setup Sub-navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-200 pb-3 gap-4">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 md:pb-0 scrollbar-none shrink-0">
          {[
            { id: "routes", label: "Routes" },
            { id: "stops", label: "Stops" },
            { id: "vehicles", label: "Vehicles" },
            { id: "drivers", label: "Drivers" },
            { id: "assignments", label: "Assignments" },
            { id: "students", label: "Student Alloc" },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => {
                setSetupTab(t.id);
                setSearchTerm("");
              }}
              className={cn(
                "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                setupTab === t.id
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-slate-50 border border-slate-200/60 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative max-w-xs w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search records..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-xs font-semibold text-slate-700"
          />
        </div>
      </div>

      {/* Tables container with rounded borders */}
      <div className="bg-white border border-slate-200/60 rounded-[2rem] overflow-hidden shadow-xl shadow-slate-200/30">
        
        {/* ROUTES TABLE */}
        {setupTab === "routes" && (
          <div className="overflow-x-auto">
            {filteredRoutes.length === 0 ? (
              <div className="py-20 text-center text-slate-400 uppercase tracking-widest text-xs font-black">No routes found</div>
            ) : (
              <table className="w-full text-left text-[11px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 font-black uppercase tracking-widest">
                    <th className="p-4">Route Name</th>
                    <th className="p-4">Route Code</th>
                    <th className="p-4">Stops count</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 font-semibold">
                  {filteredRoutes.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 font-black text-slate-900">{r.routeName}</td>
                      <td className="p-4">
                        <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded text-[10px] font-black uppercase">{r.routeCode}</span>
                      </td>
                      <td className="p-4 text-slate-500 font-bold">{r.stops?.length || 0} stops configured</td>
                      <td className="p-4 text-right flex items-center justify-end gap-1.5">
                        <button onClick={() => { setEditItem(r); setActiveModal("route"); }} className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-500 hover:text-indigo-600 transition-all">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setDeleteContext({ type: "route", id: r.id })} className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-500 hover:text-rose-600 transition-all">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* STOPS TABLE */}
        {setupTab === "stops" && (
          <div className="overflow-x-auto">
            {filteredStops.length === 0 ? (
              <div className="py-20 text-center text-slate-400 uppercase tracking-widest text-xs font-black">No stops configured</div>
            ) : (
              <table className="w-full text-left text-[11px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 font-black uppercase tracking-widest">
                    <th className="p-4">Stop Name</th>
                    <th className="p-4">Associated Route</th>
                    <th className="p-4">Pickup Time</th>
                    <th className="p-4">Drop Time</th>
                    <th className="p-4">Monthly Fee</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 font-semibold">
                  {filteredStops.map(s => (
                    <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 font-black text-slate-900">{s.stopName}</td>
                      <td className="p-4">
                        <span className="block text-slate-800 font-bold">{s.route?.routeName}</span>
                        <span className="text-[9px] text-slate-400 uppercase">{s.route?.routeCode}</span>
                      </td>
                      <td className="p-4 text-slate-500">{s.pickupTime || "08:00 AM"}</td>
                      <td className="p-4 text-slate-500">{s.dropTime || "04:30 PM"}</td>
                      <td className="p-4 font-black text-slate-900">₹{s.monthlyFee}</td>
                      <td className="p-4 text-right flex items-center justify-end gap-1.5">
                        <button onClick={() => { setEditItem(s); setActiveModal("stop"); }} className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-500 hover:text-indigo-600 transition-all">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setDeleteContext({ type: "stop", id: s.id })} className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-500 hover:text-rose-600 transition-all">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* VEHICLES TABLE */}
        {setupTab === "vehicles" && (
          <div className="overflow-x-auto">
            {filteredVehicles.length === 0 ? (
              <div className="py-20 text-center text-slate-400 uppercase tracking-widest text-xs font-black">No vehicles registered</div>
            ) : (
              <table className="w-full text-left text-[11px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 font-black uppercase tracking-widest">
                    <th className="p-4">Reg Number</th>
                    <th className="p-4">Model</th>
                    <th className="p-4">Capacity</th>
                    <th className="p-4">Assigned Route</th>
                    <th className="p-4">Documents</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 font-semibold">
                  {filteredVehicles.map(v => {
                    const docs = v.documents || {};
                    return (
                      <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4 font-black text-slate-900">{v.registrationNo}</td>
                        <td className="p-4 text-slate-600">{v.model || "Standard Coach"}</td>
                        <td className="p-4 font-bold">{v.capacity} Seats</td>
                        <td className="p-4">
                          <span className="block text-slate-800 font-bold">{v.route?.routeName}</span>
                          <span className="text-[9px] text-slate-400 uppercase">{v.route?.routeCode}</span>
                        </td>
                        <td className="p-4 space-y-0.5">
                          {docs.insuranceExpiry && <span className="block text-[8px] text-slate-400">Ins Expiry: {docs.insuranceExpiry}</span>}
                          {docs.fitnessExpiry && <span className="block text-[8px] text-slate-400">Fit Expiry: {docs.fitnessExpiry}</span>}
                        </td>
                        <td className="p-4 text-right flex items-center justify-end gap-1.5">
                          <button onClick={() => { setEditItem(v); setActiveModal("vehicle"); }} className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-500 hover:text-indigo-600 transition-all">
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => setDeleteContext({ type: "vehicle", id: v.id })} className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-500 hover:text-rose-600 transition-all">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* DRIVERS TABLE */}
        {setupTab === "drivers" && (
          <div className="overflow-x-auto">
            {filteredDrivers.length === 0 ? (
              <div className="py-20 text-center text-slate-400 uppercase tracking-widest text-xs font-black">No drivers registered</div>
            ) : (
              <table className="w-full text-left text-[11px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 font-black uppercase tracking-widest">
                    <th className="p-4">Photo</th>
                    <th className="p-4">Name</th>
                    <th className="p-4">Phone Number</th>
                    <th className="p-4">License No</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 font-semibold">
                  {filteredDrivers.map(d => {
                    const docs = d.documents || {};
                    return (
                      <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4">
                          <div className="w-10 h-10 bg-slate-100 rounded-full border border-slate-200 overflow-hidden">
                            {docs.photoUrl ? (
                              <img src={docs.photoUrl} alt={d.name} className="w-full h-full object-cover" />
                            ) : (
                              <span className="w-full h-full flex items-center justify-center font-black text-slate-400">Dr</span>
                            )}
                          </div>
                        </td>
                        <td className="p-4 font-black text-slate-900">{d.name}</td>
                        <td className="p-4 text-slate-600">{d.phone}</td>
                        <td className="p-4 text-slate-500 font-bold">{d.licenseNo}</td>
                        <td className="p-4">
                          <span className={cn(
                            "px-2 py-0.5 border text-[9px] font-black uppercase tracking-widest rounded-md",
                            d.status === "ACTIVE" ? "bg-emerald-50 border-emerald-100 text-emerald-600" : "bg-slate-50 border-slate-200 text-slate-400"
                          )}>
                            {d.status}
                          </span>
                        </td>
                        <td className="p-4 text-right flex items-center justify-end gap-1.5">
                          <button onClick={() => { setEditItem(d); setActiveModal("driver"); }} className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-500 hover:text-indigo-600 transition-all">
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => setDeleteContext({ type: "driver", id: d.id })} className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-500 hover:text-rose-600 transition-all">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* ASSIGNMENTS TABLE */}
        {setupTab === "assignments" && (
          <div className="overflow-x-auto">
            {filteredAssignments.length === 0 ? (
              <div className="py-20 text-center text-slate-400 uppercase tracking-widest text-xs font-black">No driver-vehicle assignments</div>
            ) : (
              <table className="w-full text-left text-[11px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 font-black uppercase tracking-widest">
                    <th className="p-4">Driver Name</th>
                    <th className="p-4">Assigned Vehicle</th>
                    <th className="p-4">Route Name</th>
                    <th className="p-4">Assigned Date</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 font-semibold">
                  {filteredAssignments.map(a => (
                    <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 font-black text-slate-900">{a.driver?.name}</td>
                      <td className="p-4">
                        <span className="block text-slate-800 font-bold">{a.vehicle?.registrationNo}</span>
                        <span className="text-[9px] text-slate-400">{a.vehicle?.model}</span>
                      </td>
                      <td className="p-4 font-bold text-slate-700">{a.route?.routeName}</td>
                      <td className="p-4 text-slate-500">{new Date(a.assignedAt).toLocaleDateString()}</td>
                      <td className="p-4">
                        <span className={cn(
                          "px-2 py-0.5 border text-[9px] font-black uppercase tracking-widest rounded-md",
                          a.status === "Active" ? "bg-emerald-50 border-emerald-100 text-emerald-600" : "bg-slate-50 border-slate-200 text-slate-400"
                        )}>
                          {a.status}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <button onClick={() => setDeleteContext({ type: "assignment", id: a.id })} className="p-2 bg-slate-50 hover:bg-rose-50 border border-slate-200 hover:border-rose-100 rounded-xl text-slate-400 hover:text-rose-600 transition-all" title="Unassign Driver">
                          <UserX className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* STUDENT ALLOCATIONS TABLE */}
        {setupTab === "students" && (
          <div className="overflow-x-auto">
            {filteredStudents.length === 0 ? (
              <div className="py-20 text-center text-slate-400 uppercase tracking-widest text-xs font-black">No student transport allocations</div>
            ) : (
              <table className="w-full text-left text-[11px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 font-black uppercase tracking-widest">
                    <th className="p-4">Student Name</th>
                    <th className="p-4">Route</th>
                    <th className="p-4">Pickup Stop</th>
                    <th className="p-4">Drop Stop</th>
                    <th className="p-4">Monthly Fee</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 font-semibold">
                  {filteredStudents.map(s => {
                    const st = s.studentTransport;
                    return (
                      <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4 font-black text-slate-900">{s.firstName} {s.lastName || ""}</td>
                        <td className="p-4 font-bold text-slate-700">{st.route?.routeName}</td>
                        <td className="p-4 text-slate-600">{st.pickupStop?.stopName || "Stop A1"}</td>
                        <td className="p-4 text-slate-600">{st.dropStop?.stopName || "Stop A2"}</td>
                        <td className="p-4 font-black text-slate-900">₹{st.monthlyFee}</td>
                        <td className="p-4 text-right">
                          <button onClick={() => setDeleteContext({ type: "student", id: st.id })} className="p-2 bg-slate-50 hover:bg-rose-50 border border-slate-200 hover:border-rose-100 rounded-xl text-slate-400 hover:text-rose-600 transition-all" title="Remove Allocation">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// 🌍 VIEW: LIVE TRACKING (LEAFLET INTEGRATION)
// ============================================================================
interface LiveProps {
  trips: any[];
  vehicles: any[];
  routes: any[];
  stops: any[];
  getPolyline: (routeId: string) => [number, number][];
}

function TransportLiveView({ trips, vehicles, routes, stops, getPolyline }: LiveProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const activeTrips = trips.filter(t => t.status === "ACTIVE" || t.status === "STALE");
  const [selectedTrip, setSelectedTrip] = useState<any>(activeTrips[0] || null);

  useEffect(() => {
    if (typeof window === "undefined" || !mapRef.current) return;

    let isMounted = true;
    let mapInstance: any = null;
    let markers: any[] = [];
    let polylineInstance: any = null;

    async function initLeaflet() {
      // 1. Dynamic import of leaflet
      const L = await import("leaflet");

      // Fix default Leaflet icon paths
      // @ts-ignore
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      if (!isMounted || !mapRef.current) return;

      // 2. Initialize Map
      const startCenter: [number, number] = selectedTrip 
        ? getPolyline(selectedTrip.routeId)[0] 
        : [17.6000, 78.1100];

      mapInstance = L.map(mapRef.current).setView(startCenter, 13);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>'
      }).addTo(mapInstance);

      // 3. Draw stops & Route Polyline if trip is selected
      if (selectedTrip) {
        const polyCoords = getPolyline(selectedTrip.routeId);
        
        // Draw Polyline
        polylineInstance = L.polyline(polyCoords, {
          color: "#4f46e5",
          weight: 4,
          opacity: 0.8
        }).addTo(mapInstance);

        // Zoom to polyline
        mapInstance.fitBounds(polylineInstance.getBounds(), { padding: [40, 40] });

        // Draw Stop Markers
        const routeStops = stops.filter(s => s.routeId === selectedTrip.routeId);
        routeStops.forEach(stop => {
          // Dummy offsets for stops along polyline
          const randomOffset = polyCoords[Math.floor(Math.random() * polyCoords.length)];
          const stopMarker = L.marker(randomOffset, {
            icon: L.divIcon({
              className: "custom-stop-marker",
              html: `<div class="w-6 h-6 bg-indigo-100 border-2 border-indigo-600 rounded-full flex items-center justify-center text-[8px] font-black text-indigo-700 shadow shadow-indigo-600/30">📌</div>`
            })
          })
            .addTo(mapInstance)
            .bindPopup(`<b class="text-xs font-black text-slate-800">${stop.stopName}</b><br><span class="text-[10px] text-slate-500">Pickup: ${stop.pickupTime}</span>`);
          markers.push(stopMarker);
        });

        // Draw Moving Vehicle Marker (Pulsating live indicator)
        const vehiclePos = polyCoords[Math.floor(polyCoords.length / 2)];
        const vehicleMarker = L.marker(vehiclePos, {
          icon: L.divIcon({
            className: "custom-bus-marker",
            html: `<div class="w-8 h-8 bg-indigo-600 border-2 border-white rounded-full flex items-center justify-center text-white shadow-lg animate-bounce">🚌</div>`
          })
        })
          .addTo(mapInstance)
          .bindPopup(`<b class="text-xs font-black text-slate-800">Bus: ${selectedTrip.vehicle?.registrationNo}</b><br><span class="text-[10px] text-slate-500">Status: Moving (35 km/h)</span>`);
        markers.push(vehicleMarker);
      }
    }

    initLeaflet();

    return () => {
      isMounted = false;
      if (polylineInstance && mapInstance) {
        polylineInstance.remove();
      }
      markers.forEach(m => m.remove());
      if (mapInstance) {
        mapInstance.remove();
      }
    };
  }, [selectedTrip]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 animate-in fade-in duration-300">
      
      {/* Side Panel: Active Trips */}
      <div className="bg-white border border-slate-200/60 rounded-[2rem] shadow-xl shadow-slate-200/30 overflow-hidden flex flex-col lg:col-span-1 max-h-[500px]">
        <div className="p-5 border-b border-slate-100 bg-slate-50/50">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-900">Active Fleet Runs</h3>
        </div>

        <div className="p-4 space-y-3 overflow-y-auto flex-1 custom-scrollbar">
          {activeTrips.length === 0 ? (
            <div className="py-20 text-center text-slate-400 uppercase tracking-widest text-xs font-black">No active trips</div>
          ) : (
            activeTrips.map(t => (
              <button
                key={t.id}
                onClick={() => setSelectedTrip(t)}
                className={cn(
                  "w-full text-left p-4 rounded-2xl border transition-all duration-200 flex flex-col gap-2",
                  selectedTrip?.id === t.id
                    ? "bg-indigo-50/40 border-indigo-200 shadow-md shadow-indigo-600/5"
                    : "bg-slate-50/50 border-slate-100 hover:border-slate-200"
                )}
              >
                <div className="flex justify-between items-center">
                  <span className="text-xs font-black text-slate-800">{t.vehicle?.registrationNo}</span>
                  <span className={cn(
                    "text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 border rounded-md",
                    t.status === "ACTIVE" ? "bg-emerald-50 border-emerald-100 text-emerald-600" : "bg-rose-50 border-rose-100 text-rose-600"
                  )}>
                    {t.status}
                  </span>
                </div>

                <div className="text-[10px] font-bold text-slate-500">
                  <span className="block font-black text-slate-700">{t.route?.routeName}</span>
                  <span className="block text-[8px] uppercase">{t.tripType} RUN</span>
                </div>

                <div className="flex justify-between items-center text-[8px] text-slate-400 font-bold uppercase border-t border-slate-100 pt-2 mt-1">
                  <span>Driver: {t.driver?.name}</span>
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> 08:30 AM</span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Live Map Panel */}
      <div className="lg:col-span-3 bg-white border border-slate-200/60 rounded-[2rem] overflow-hidden shadow-xl shadow-slate-200/30 flex flex-col min-h-[500px]">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Map className="w-5 h-5 text-indigo-600" />
            <div>
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-900">
                {selectedTrip ? `Live Tracker: ${selectedTrip.vehicle?.registrationNo}` : "Live Telemetry Tracking"}
              </h3>
              {selectedTrip && <p className="text-[10px] text-slate-400 font-bold uppercase">{selectedTrip.route?.routeName}</p>}
            </div>
          </div>
        </div>

        {/* Leaflet container */}
        <div ref={mapRef} id="map-container" className="flex-1 bg-slate-50 w-full h-full relative" />
      </div>
    </div>
  );
}

// ============================================================================
// 🎬 VIEW: TRIP HISTORICAL PLAYBACK (TRIP REPLAY)
// ============================================================================
interface ReplayProps {
  trips: any[];
  routes: any[];
  vehicles: any[];
  incidents: any[];
  stops: any[];
  getPolyline: (routeId: string) => [number, number][];
}

function TransportReplayView({ trips, routes, vehicles, incidents, stops, getPolyline }: ReplayProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  
  // Only completed trips for replay
  const completedTrips = trips.filter(t => t.status === "COMPLETED");
  
  const [selectedTrip, setSelectedTrip] = useState<any>(completedTrips[0] || null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [timelineVal, setTimelineVal] = useState(0); // 0 to 100 percentage slider
  const markerRef = useRef<any>(null);

  // Hook Leaflet Setup
  useEffect(() => {
    if (typeof window === "undefined" || !mapRef.current || !selectedTrip) return;

    let isMounted = true;
    let mapInstance: any = null;
    let polylineInstance: any = null;
    let stopsMarkers: any[] = [];

    async function initReplayMap() {
      const L = await import("leaflet");

      // Fix default Leaflet icon paths
      // @ts-ignore
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      if (!isMounted || !mapRef.current) return;

      const polyCoords = getPolyline(selectedTrip.routeId);
      mapInstance = L.map(mapRef.current).setView(polyCoords[0], 13);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>'
      }).addTo(mapInstance);

      // Draw polyline
      polylineInstance = L.polyline(polyCoords, {
        color: "#6366f1",
        weight: 4,
        opacity: 0.6
      }).addTo(mapInstance);

      mapInstance.fitBounds(polylineInstance.getBounds(), { padding: [40, 40] });

      // Draw stops
      const routeStops = stops.filter(s => s.routeId === selectedTrip.routeId);
      routeStops.forEach(stop => {
        const randomOffset = polyCoords[Math.floor(Math.random() * polyCoords.length)];
        const sm = L.marker(randomOffset, {
          icon: L.divIcon({
            className: "stop-mark",
            html: `<div class="w-5 h-5 bg-white border border-slate-300 rounded-full flex items-center justify-center text-[7px] font-black text-slate-500 shadow">📍</div>`
          })
        }).addTo(mapInstance).bindPopup(`<b>${stop.stopName}</b>`);
        stopsMarkers.push(sm);
      });

      // Moving marker based on timelineVal
      const coordinateIndex = Math.min(
        Math.floor((timelineVal / 100) * polyCoords.length),
        polyCoords.length - 1
      );
      const activeCoords = polyCoords[coordinateIndex];

      markerRef.current = L.marker(activeCoords, {
        icon: L.divIcon({
          className: "vehicle-replay-marker",
          html: `<div class="w-8 h-8 bg-slate-900 border border-white text-white rounded-full flex items-center justify-center shadow-lg">🚌</div>`
        })
      }).addTo(mapInstance);
    }

    initReplayMap();

    return () => {
      isMounted = false;
      if (polylineInstance && mapInstance) polylineInstance.remove();
      stopsMarkers.forEach(s => s.remove());
      if (markerRef.current && mapInstance) markerRef.current.remove();
      if (mapInstance) mapInstance.remove();
    };
  }, [selectedTrip, timelineVal]);

  // Handle Play Animation
  useEffect(() => {
    let interval: any = null;
    if (isPlaying) {
      interval = setInterval(() => {
        setTimelineVal(prev => {
          if (prev >= 100) {
            setIsPlaying(false);
            return 0;
          }
          return prev + 2;
        });
      }, 300);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 animate-in fade-in duration-300">
      
      {/* Replay Controls & Trip selector */}
      <div className="bg-white border border-slate-200/60 rounded-[2rem] shadow-xl shadow-slate-200/30 overflow-hidden flex flex-col lg:col-span-1 max-h-[500px]">
        <div className="p-5 border-b border-slate-100 bg-slate-50/50">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-900">Completed Trips History</h3>
        </div>

        <div className="p-4 space-y-3 overflow-y-auto flex-1 custom-scrollbar">
          {completedTrips.length === 0 ? (
            <div className="py-20 text-center text-slate-400 uppercase tracking-widest text-xs font-black">No completed trips</div>
          ) : (
            completedTrips.map(t => (
              <button
                key={t.id}
                onClick={() => {
                  setSelectedTrip(t);
                  setTimelineVal(0);
                  setIsPlaying(false);
                }}
                className={cn(
                  "w-full text-left p-4 rounded-2xl border transition-all duration-200 flex flex-col gap-1.5",
                  selectedTrip?.id === t.id
                    ? "bg-slate-900 border-slate-950 text-white shadow-xl shadow-slate-900/10"
                    : "bg-slate-50/50 border-slate-100 hover:border-slate-200 text-slate-800"
                )}
              >
                <div className="flex justify-between items-center">
                  <span className="text-xs font-black">{t.vehicle?.registrationNo}</span>
                  <span className={cn(
                    "text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 border rounded-md",
                    selectedTrip?.id === t.id ? "bg-white/10 border-white/20 text-white" : "bg-slate-100 border-slate-200 text-slate-500"
                  )}>
                    {new Date(t.startedAt).toLocaleDateString()}
                  </span>
                </div>

                <div className="text-[10px] font-bold">
                  <span className={selectedTrip?.id === t.id ? "text-slate-200" : "text-slate-600"}>{t.route?.routeName}</span>
                </div>

                <div className={cn(
                  "flex justify-between items-center text-[8px] font-bold uppercase border-t pt-2 mt-1",
                  selectedTrip?.id === t.id ? "border-white/10 text-slate-400" : "border-slate-100 text-slate-400"
                )}>
                  <span>Driver: {t.driver?.name}</span>
                  <span>1 Hour Run</span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Map Replay Player */}
      <div className="lg:col-span-3 bg-white border border-slate-200/60 rounded-[2rem] overflow-hidden shadow-xl shadow-slate-200/30 flex flex-col min-h-[500px]">
        
        {/* Title details */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-indigo-600" />
            <div>
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-900">Trip Replay Map Player</h3>
              {selectedTrip && <p className="text-[10px] text-slate-400 font-bold uppercase">{selectedTrip.vehicle?.registrationNo} · {selectedTrip.route?.routeName}</p>}
            </div>
          </div>

          {selectedTrip && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="p-2.5 bg-slate-950 text-white rounded-xl text-xs font-bold uppercase hover:bg-black transition-all flex items-center gap-1 shadow-md"
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={() => setTimelineVal(0)}
                className="p-2.5 bg-slate-100 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-200 transition-all"
                title="Reset Replay"
              >
                <RefreshCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Map view container */}
        <div ref={mapRef} id="replay-map-container" className="flex-1 bg-slate-50 relative min-h-[350px]" />

        {/* Timeline Slider Control */}
        {selectedTrip && (
          <div className="p-5 border-t border-slate-100 bg-slate-50/50 space-y-3">
            <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-slate-400">
              <span>Start: {new Date(selectedTrip.startedAt).toLocaleTimeString()}</span>
              <span className="text-indigo-600 font-black">Playback Progress: {timelineVal}%</span>
              <span>End: {new Date(selectedTrip.endedAt).toLocaleTimeString()}</span>
            </div>

            <div className="flex items-center gap-4">
              <input
                type="range"
                min="0"
                max="100"
                value={timelineVal}
                onChange={e => {
                  setTimelineVal(parseInt(e.target.value, 10));
                  setIsPlaying(false);
                }}
                className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 outline-none"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// 🏡 VIEW: PARENT TRACKING PANEL (FEATURE DISABLED PLACEHOLDER)
// ============================================================================
function TransportParentView() {
  return (
    <div className="bg-white border border-slate-200/60 rounded-[2rem] shadow-xl shadow-slate-200/30 overflow-hidden p-8 max-w-lg mx-auto text-center space-y-6 animate-in fade-in duration-300">
      <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto border border-slate-200">
        <Lock className="w-8 h-8 text-slate-400" />
      </div>

      <div className="space-y-2">
        <h3 className="text-base font-black tracking-tight text-slate-800 uppercase">Parent Portal Isolated</h3>
        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
          Feature Flag: `ENABLE_PARENT_TRACKING = false`
        </p>
      </div>

      <p className="text-xs text-slate-500 leading-relaxed font-semibold">
        Sovereign V2 specifies that the parent tracking experience should reside on dedicated mobile layouts or isolated parent portals (e.g. `/parent/transport` or `/mobile/transport`) rather than inside the main staff administrative command center.
      </p>

      <div className="border-t border-slate-100 pt-4 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
        Virtue Enterprise Security Architecture
      </div>
    </div>
  );
}

// ============================================================================
// 🏛️ MODAL OVERLAYS (FORM DIALOGS)
// ============================================================================
interface ModalProps {
  type: string;
  editItem?: any;
  routes: any[];
  vehicles: any[];
  stops: any[];
  drivers: any[];
  students: any[];
  onClose: () => void;
  onSubmit: (type: string, data: any) => void;
  submitting: boolean;
}

function TransportModalOverlay({
  type,
  editItem,
  routes,
  vehicles,
  stops,
  drivers,
  students,
  onClose,
  onSubmit,
  submitting
}: ModalProps) {
  const [formData, setFormData] = useState<any>({});

  // Populate data on edit mode
  useEffect(() => {
    if (editItem) {
      setFormData(editItem);
    } else {
      // Default initial states
      if (type === "route") setFormData({ routeName: "", routeCode: "" });
      else if (type === "stop") setFormData({ routeId: routes[0]?.id || "", stopName: "", pickupTime: "08:00 AM", dropTime: "04:30 PM", monthlyFee: 1500 });
      else if (type === "vehicle") setFormData({ registrationNo: "", model: "", capacity: 15, routeId: routes[0]?.id || "", onboardingStatus: "ACTIVE", documents: { insuranceExpiry: "", fitnessExpiry: "", pollutionExpiry: "" } });
      else if (type === "driver") setFormData({ name: "", phone: "", licenseNo: "", password: "", status: "ACTIVE" });
      else if (type === "assign-driver") setFormData({ driverId: drivers[0]?.id || "", vehicleId: vehicles[0]?.id || "", routeId: routes[0]?.id || "", status: "Active" });
      else if (type === "assign-student") setFormData({ studentId: students.filter(s => !s.studentTransport)[0]?.id || "", routeId: routes[0]?.id || "", pickupStopId: stops[0]?.id || "", dropStopId: stops[0]?.id || "", monthlyFee: 1500 });
      else if (type === "incident") setFormData({ vehicleId: vehicles[0]?.id || "", driverId: drivers[0]?.id || null, severity: "MEDIUM", description: "", status: "PENDING" });
      else if (type === "maintenance") setFormData({ vehicleId: vehicles[0]?.id || "", maintenanceType: "SERVICE", cost: 1500, description: "", performedAt: new Date().toISOString().substring(0, 10), nextDueDate: "", status: "COMPLETED" });
    }
  }, [editItem, type]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(type, formData);
  };

  const getTitle = () => {
    const action = editItem ? "Edit" : "New";
    return `${action} ${type.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}`;
  };

  return (
    <div className="fixed inset-0 z-[999] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-slate-100 space-y-6 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto custom-scrollbar">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">{getTitle()}</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-50 text-slate-400 hover:text-slate-600 rounded-lg">
            &times;
          </button>
        </div>

        {/* Forms body */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-semibold text-slate-700">
          
          {/* ROUTE FORM */}
          {type === "route" && (
            <div className="space-y-3">
              <div>
                <label className="block text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1">Route Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Route Alpha"
                  value={formData.routeName || ""}
                  onChange={e => setFormData({ ...formData, routeName: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl outline-none"
                />
              </div>
              <div>
                <label className="block text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1">Route Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. RT-ALPHA"
                  value={formData.routeCode || ""}
                  onChange={e => setFormData({ ...formData, routeCode: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl outline-none"
                />
              </div>
            </div>
          )}

          {/* STOP FORM */}
          {type === "stop" && (
            <div className="space-y-3">
              <div>
                <label className="block text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1">Select Route</label>
                <select
                  value={formData.routeId || ""}
                  onChange={e => setFormData({ ...formData, routeId: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl outline-none"
                >
                  {routes.map(r => <option key={r.id} value={r.id}>{r.routeName} ({r.routeCode})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1">Stop Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Green Park Sector 2"
                  value={formData.stopName || ""}
                  onChange={e => setFormData({ ...formData, stopName: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1">Pickup Time</label>
                  <input
                    type="text"
                    placeholder="e.g. 08:00 AM"
                    value={formData.pickupTime || ""}
                    onChange={e => setFormData({ ...formData, pickupTime: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1">Drop Time</label>
                  <input
                    type="text"
                    placeholder="e.g. 04:30 PM"
                    value={formData.dropTime || ""}
                    onChange={e => setFormData({ ...formData, dropTime: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1">Monthly Fee (₹)</label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 1500"
                  value={formData.monthlyFee || ""}
                  onChange={e => setFormData({ ...formData, monthlyFee: parseFloat(e.target.value) })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl outline-none"
                />
              </div>
            </div>
          )}

          {/* VEHICLE FORM */}
          {type === "vehicle" && (
            <div className="space-y-3">
              <div>
                <label className="block text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1">Registration No</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. TS-09-DEMO-99"
                  value={formData.registrationNo || ""}
                  onChange={e => setFormData({ ...formData, registrationNo: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1">Model</label>
                  <input
                    type="text"
                    placeholder="e.g. Tata Winger"
                    value={formData.model || ""}
                    onChange={e => setFormData({ ...formData, model: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1">Capacity</label>
                  <input
                    type="number"
                    required
                    value={formData.capacity || ""}
                    onChange={e => setFormData({ ...formData, capacity: parseInt(e.target.value, 10) })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1">Select Route</label>
                <select
                  value={formData.routeId || ""}
                  onChange={e => setFormData({ ...formData, routeId: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl outline-none"
                >
                  {routes.map(r => <option key={r.id} value={r.id}>{r.routeName}</option>)}
                </select>
              </div>

              {/* Expiry inputs (seeding requirements) */}
              <div className="border-t border-slate-100 pt-3 space-y-2">
                <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">Document Expiry Settings</span>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[8px] font-bold text-slate-400 mb-1">Insurance</label>
                    <input
                      type="date"
                      value={formData.documents?.insuranceExpiry || ""}
                      onChange={e => setFormData({
                        ...formData,
                        documents: { ...formData.documents, insuranceExpiry: e.target.value }
                      })}
                      className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-lg outline-none text-[10px]"
                    />
                  </div>
                  <div>
                    <label className="block text-[8px] font-bold text-slate-400 mb-1">Fitness</label>
                    <input
                      type="date"
                      value={formData.documents?.fitnessExpiry || ""}
                      onChange={e => setFormData({
                        ...formData,
                        documents: { ...formData.documents, fitnessExpiry: e.target.value }
                      })}
                      className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-lg outline-none text-[10px]"
                    />
                  </div>
                  <div>
                    <label className="block text-[8px] font-bold text-slate-400 mb-1">Pollution</label>
                    <input
                      type="date"
                      value={formData.documents?.pollutionExpiry || ""}
                      onChange={e => setFormData({
                        ...formData,
                        documents: { ...formData.documents, pollutionExpiry: e.target.value }
                      })}
                      className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-lg outline-none text-[10px]"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* DRIVER FORM */}
          {type === "driver" && (
            <div className="space-y-3">
              <div>
                <label className="block text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1">Driver Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Jane Smith"
                  value={formData.name || ""}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl outline-none"
                />
              </div>
              <div>
                <label className="block text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1">Phone Number</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 9999999901"
                  value={formData.phone || ""}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl outline-none"
                />
              </div>
              <div>
                <label className="block text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1">License No</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. DL-DEMO-001"
                  value={formData.licenseNo || ""}
                  onChange={e => setFormData({ ...formData, licenseNo: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl outline-none"
                />
              </div>
              {!editItem && (
                <div>
                  <label className="block text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1">Password</label>
                  <input
                    type="password"
                    required
                    placeholder="e.g. password123"
                    value={formData.password || ""}
                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl outline-none"
                  />
                </div>
              )}
            </div>
          )}

          {/* ASSIGN DRIVER FORM */}
          {type === "assign-driver" && (
            <div className="space-y-3">
              <div>
                <label className="block text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1">Select Driver</label>
                <select
                  value={formData.driverId || ""}
                  onChange={e => setFormData({ ...formData, driverId: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl outline-none"
                >
                  {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1">Select Vehicle</label>
                <select
                  value={formData.vehicleId || ""}
                  onChange={e => setFormData({ ...formData, vehicleId: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl outline-none"
                >
                  {vehicles.map(v => <option key={v.id} value={v.id}>{v.registrationNo} ({v.model})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1">Select Route</label>
                <select
                  value={formData.routeId || ""}
                  onChange={e => setFormData({ ...formData, routeId: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl outline-none"
                >
                  {routes.map(r => <option key={r.id} value={r.id}>{r.routeName}</option>)}
                </select>
              </div>
            </div>
          )}

          {/* STUDENT ALLOCATION FORM */}
          {type === "assign-student" && (
            <div className="space-y-3">
              <div>
                <label className="block text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1">Select Student</label>
                <select
                  value={formData.studentId || ""}
                  onChange={e => setFormData({ ...formData, studentId: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl outline-none"
                >
                  {students.filter(s => !s.studentTransport).map(s => <option key={s.id} value={s.id}>{s.firstName} {s.lastName || ""}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1">Select Route</label>
                <select
                  value={formData.routeId || ""}
                  onChange={e => {
                    const rId = e.target.value;
                    const rStops = stops.filter(s => s.routeId === rId);
                    setFormData({
                      ...formData,
                      routeId: rId,
                      pickupStopId: rStops[0]?.id || "",
                      dropStopId: rStops[0]?.id || ""
                    });
                  }}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl outline-none"
                >
                  {routes.map(r => <option key={r.id} value={r.id}>{r.routeName}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1">Pickup Stop</label>
                  <select
                    value={formData.pickupStopId || ""}
                    onChange={e => setFormData({ ...formData, pickupStopId: e.target.value })}
                    className="w-full px-3 py-3 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl outline-none text-[10px]"
                  >
                    {stops.filter(s => s.routeId === formData.routeId).map(s => <option key={s.id} value={s.id}>{s.stopName}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1">Drop Stop</label>
                  <select
                    value={formData.dropStopId || ""}
                    onChange={e => setFormData({ ...formData, dropStopId: e.target.value })}
                    className="w-full px-3 py-3 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl outline-none text-[10px]"
                  >
                    {stops.filter(s => s.routeId === formData.routeId).map(s => <option key={s.id} value={s.id}>{s.stopName}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1">Monthly Fee (₹)</label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 1500"
                  value={formData.monthlyFee || ""}
                  onChange={e => setFormData({ ...formData, monthlyFee: parseFloat(e.target.value) })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl outline-none"
                />
              </div>
            </div>
          )}

          {/* INCIDENT FORM */}
          {type === "incident" && (
            <div className="space-y-3">
              <div>
                <label className="block text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1">Select Vehicle</label>
                <select
                  value={formData.vehicleId || ""}
                  onChange={e => setFormData({ ...formData, vehicleId: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl outline-none"
                >
                  {vehicles.map(v => <option key={v.id} value={v.id}>{v.registrationNo}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1">Driver</label>
                  <select
                    value={formData.driverId || ""}
                    onChange={e => setFormData({ ...formData, driverId: e.target.value || null })}
                    className="w-full px-3 py-3 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl outline-none"
                  >
                    <option value="">No Driver</option>
                    {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1">Severity</label>
                  <select
                    value={formData.severity || "MEDIUM"}
                    onChange={e => setFormData({ ...formData, severity: e.target.value })}
                    className="w-full px-3 py-3 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl outline-none"
                  >
                    <option value="LOW">LOW</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HIGH">HIGH</option>
                    <option value="CRITICAL">CRITICAL</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1">Description</label>
                <textarea
                  required
                  placeholder="Describe the incident (e.g. Engine alternator breakdown, delayed by 15 mins due to tire puncture)"
                  value={formData.description || ""}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl outline-none h-20 resize-none"
                />
              </div>
            </div>
          )}

          {/* MAINTENANCE FORM */}
          {type === "maintenance" && (
            <div className="space-y-3">
              <div>
                <label className="block text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1">Select Vehicle</label>
                <select
                  value={formData.vehicleId || ""}
                  onChange={e => setFormData({ ...formData, vehicleId: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl outline-none"
                >
                  {vehicles.map(v => <option key={v.id} value={v.id}>{v.registrationNo}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1">Type</label>
                  <select
                    value={formData.maintenanceType || "SERVICE"}
                    onChange={e => setFormData({ ...formData, maintenanceType: e.target.value })}
                    className="w-full px-3 py-3 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl outline-none"
                  >
                    <option value="SERVICE">SERVICE</option>
                    <option value="REPAIR">REPAIR</option>
                    <option value="INSPECTION">INSPECTION</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1">Cost (₹)</label>
                  <input
                    type="number"
                    required
                    value={formData.cost || 0}
                    onChange={e => setFormData({ ...formData, cost: parseFloat(e.target.value) })}
                    className="w-full px-3 py-3 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1">Performed Date</label>
                  <input
                    type="date"
                    required
                    value={formData.performedAt || ""}
                    onChange={e => setFormData({ ...formData, performedAt: e.target.value })}
                    className="w-full px-3 py-3 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl outline-none text-[10px]"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1">Next Due Date</label>
                  <input
                    type="date"
                    value={formData.nextDueDate || ""}
                    onChange={e => setFormData({ ...formData, nextDueDate: e.target.value })}
                    className="w-full px-3 py-3 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl outline-none text-[10px]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1">Description</label>
                <textarea
                  required
                  placeholder="Detail the work done..."
                  value={formData.description || ""}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl outline-none h-20 resize-none"
                />
              </div>
            </div>
          )}

          {/* Submit Actions */}
          <div className="flex gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold uppercase transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-indigo-600/20"
            >
              {submitting ? <RefreshCcw className="w-3.5 h-3.5 animate-spin" /> : `${editItem ? "Save Changes" : "Create Record"}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
