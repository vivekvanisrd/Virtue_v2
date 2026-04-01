"use client";

import React, { useEffect, useState } from "react";
import { Activity, Clock, FileEdit, PlusCircle, Trash2, User, KeyRound, MonitorCheck } from "lucide-react";
import { getRecentActivity } from "@/lib/actions/audit-actions";
import { cn } from "@/lib/utils";

import { useTenant } from "@/context/tenant-context";

export function ActivityLogViewer() {
  const { schoolId } = useTenant();
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setIsLoading(true);
    const res = await getRecentActivity(schoolId, 100);
    if (res.success && res.data) {
      setLogs(res.data);
    }
    setIsLoading(false);
  };

  const getActionIcon = (action: string) => {
    switch (action.toUpperCase()) {
      case "CREATE":
        return <PlusCircle className="w-5 h-5 text-green-500" />;
      case "UPDATE":
        return <FileEdit className="w-5 h-5 text-blue-500" />;
      case "DELETE":
        return <Trash2 className="w-5 h-5 text-red-500" />;
      case "LOGIN":
        return <KeyRound className="w-5 h-5 text-purple-500" />;
      case "IMPORT":
        return <MonitorCheck className="w-5 h-5 text-indigo-500" />;
      default:
        return <Activity className="w-5 h-5 text-foreground opacity-40" />;
    }
  };

  const getActionPillCode = (action: string) => {
    switch (action.toUpperCase()) {
      case "CREATE": return "bg-green-100 text-green-700 border-green-200";
      case "UPDATE": return "bg-blue-100 text-blue-700 border-blue-200";
      case "DELETE": return "bg-red-100 text-red-700 border-red-200";
      case "LOGIN": return "bg-purple-100 text-purple-700 border-purple-200";
      case "IMPORT": return "bg-indigo-100 text-indigo-700 border-indigo-200";
      default: return "bg-slate-100 text-slate-700 border-border";
    }
  };

  const formatDate = (dateString: Date) => {
    const d = new Date(dateString);
    return new Intl.DateTimeFormat("en-IN", {
      month: "short", day: "numeric", hour: "numeric", minute: "numeric", hour12: true
    }).format(d);
  };

  return (
    <div className="space-y-6">
      <div className="bg-background p-6 rounded-2xl border border-border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Activity className="w-6 h-6 text-primary" />
            System Audit Trail
          </h2>
          <p className="text-foreground opacity-50 mt-1">
            A secure immutable log of all sensitive activities performed by staff.
          </p>
        </div>
        <button 
          onClick={fetchLogs}
          disabled={isLoading}
          className="px-4 py-2 bg-muted text-foreground hover:bg-muted/80 rounded-lg text-sm font-bold flex items-center gap-2 border border-border transition-colors"
        >
          <Clock className={cn("w-4 h-4", isLoading && "animate-spin")} />
          Refresh Feed
        </button>
      </div>

      <div className="bg-background rounded-2xl border border-border shadow-sm overflow-hidden min-h-[500px]">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-20 text-foreground opacity-40">
            <Activity className="w-8 h-8 animate-pulse mb-3" />
            <p className="font-medium animate-pulse">Loading secure audit logs...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-20 text-foreground opacity-40">
            <Activity className="w-8 h-8 mb-3 opacity-50" />
            <h3 className="font-bold text-lg text-foreground opacity-60 font-bold text-lg mb-1">No Activity Found</h3>
            <p>There are no recorded actions in the database yet.</p>
          </div>
        ) : (
          <div className="p-0">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-muted text-foreground opacity-50 font-bold border-b border-border">
                  <th className="py-3 px-6 whitespace-nowrap w-24">Action</th>
                  <th className="py-3 px-4">Entity</th>
                  <th className="py-3 px-4">Performed By</th>
                  <th className="py-3 px-4 w-1/3">Detailed Description</th>
                  <th className="py-3 px-6 text-right w-40">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-muted/50 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        {getActionIcon(log.action)}
                        <span className={cn(
                          "px-2.5 py-1 rounded-md text-[10px] font-black tracking-wider uppercase border",
                          getActionPillCode(log.action)
                        )}>
                          {log.action}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="font-bold text-foreground font-bold tracking-wide text-xs">
                        {log.entityType}
                      </div>
                      <div className="text-foreground opacity-40 font-mono text-[10px] mt-0.5 max-w-[120px] truncate">
                        ID: {log.entityId}
                      </div>
                    </td>
                    <td className="py-4 px-4 font-medium text-foreground flex items-center gap-2">
                       <div className="w-6 h-6 rounded-full bg-muted border border-border flex items-center justify-center shrink-0">
                         <User className="w-3.5 h-3.5 text-foreground opacity-50" />
                       </div>
                       {log.userId}
                    </td>
                    <td className="py-4 px-4 text-foreground opacity-60 font-medium">
                      {log.details || "-"}
                    </td>
                    <td className="py-4 px-6 text-right text-foreground opacity-50 text-xs font-medium whitespace-nowrap">
                      {formatDate(log.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
