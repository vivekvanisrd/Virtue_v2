"use client";

import React, { useState } from "react";
import { Mail, Search, Eye, CheckCircle2, AlertCircle, Info, Loader2, Calendar, User, ArrowRight, Square, CheckSquare } from "lucide-react";
import { markParentNotificationAsReadAction } from "@/lib/actions/guardian-notification-actions";

interface ParentNotificationsHubProps {
  initialNotifications: any[];
}

export function ParentNotificationsHub({ initialNotifications }: ParentNotificationsHubProps) {
  const [notifications, setNotifications] = useState<any[]>(initialNotifications);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedNotification, setSelectedNotification] = useState<any | null>(null);
  const [markingReadId, setMarkingReadId] = useState<string | null>(null);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleOpenNotification = async (notification: any) => {
    setSelectedNotification(notification);
    
    if (!notification.isRead) {
      setMarkingReadId(notification.id);
      const res = await markParentNotificationAsReadAction(notification.id);
      if (res.success) {
        // Update local status
        setNotifications(prev => 
          prev.map(item => 
            item.id === notification.id 
              ? { ...item, isRead: true, readAt: new Date().toISOString() } 
              : item
          )
        );
      }
      setMarkingReadId(null);
    }
  };

  const filteredNotifications = notifications.filter(item => {
    const matchesFilter = filter === "all" || !item.isRead;
    const matchesSearch = 
      item.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.body.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.type.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getTypeStyle = (type: string) => {
    switch (type) {
      case "RECEIPT":
        return "bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400";
      case "REMINDER":
        return "bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400";
      case "ADMISSION":
        return "bg-indigo-500/10 border border-indigo-500/20 text-indigo-700 dark:text-indigo-400";
      case "PROMOTION":
        return "bg-purple-500/10 border border-purple-500/20 text-purple-700 dark:text-purple-400";
      case "DEPARTURE":
        return "bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400";
      default:
        return "bg-slate-500/10 border border-slate-500/20 text-slate-700 dark:text-slate-400";
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Sidebar Controls */}
      <div className="lg:col-span-3 space-y-6">
        <div className="bg-card border border-border rounded-3xl p-4 space-y-2">
          <button
            onClick={() => setFilter("all")}
            className={`w-full text-left px-4 py-3 rounded-2xl font-bold text-xs flex items-center justify-between transition-all cursor-pointer ${
              filter === "all" 
                ? "bg-primary text-primary-foreground shadow-md" 
                : "hover:bg-muted/50 text-foreground/75"
            }`}
          >
            <span>All Messages</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] ${
              filter === "all" ? "bg-white/20 text-white" : "bg-muted text-foreground/60"
            }`}>
              {notifications.length}
            </span>
          </button>
          
          <button
            onClick={() => setFilter("unread")}
            className={`w-full text-left px-4 py-3 rounded-2xl font-bold text-xs flex items-center justify-between transition-all cursor-pointer ${
              filter === "unread" 
                ? "bg-primary text-primary-foreground shadow-md" 
                : "hover:bg-muted/50 text-foreground/75"
            }`}
          >
            <span>Unread Only</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] ${
              filter === "unread" ? "bg-white/20 text-white" : "bg-rose-500/10 text-rose-500"
            }`}>
              {notifications.filter(n => !n.isRead).length}
            </span>
          </button>
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-3.5 w-4 h-4 text-muted-foreground/60" />
          <input
            type="text"
            placeholder="Search inbox..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-card border border-border rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
        </div>
      </div>

      {/* Main Messages Inbox Grid */}
      <div className="lg:col-span-9">
        <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm">
          <div className="divide-y divide-border/60">
            {filteredNotifications.length > 0 ? (
              filteredNotifications.map((item) => {
                const isSelected = selectedNotification?.id === item.id;
                return (
                  <div
                    key={item.id}
                    onClick={() => handleOpenNotification(item)}
                    className={`p-6 flex items-start gap-4 hover:bg-muted/20 cursor-pointer transition-all ${
                      !item.isRead ? "bg-primary/[0.02] border-l-4 border-l-primary" : "border-l-4 border-l-transparent"
                    } ${isSelected ? "bg-muted/30" : ""}`}
                  >
                    {/* Status Dot */}
                    <div className="mt-1 shrink-0">
                      {!item.isRead ? (
                        <div className="w-2.5 h-2.5 bg-primary rounded-full animate-pulse" />
                      ) : (
                        <div className="w-2.5 h-2.5 bg-slate-300 rounded-full dark:bg-slate-700" />
                      )}
                    </div>

                    <div className="flex-1 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${getTypeStyle(item.type)}`}>
                          {item.type}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(item.createdAt).toLocaleString()}
                        </span>
                      </div>

                      <h3 className={`text-sm tracking-tight ${!item.isRead ? "font-black" : "font-bold text-foreground/80"}`}>
                        {item.subject}
                      </h3>

                      <p className="text-xs text-muted-foreground font-semibold line-clamp-1">
                        {item.body.replace(/<[^>]*>/g, "")}
                      </p>
                    </div>

                    <ArrowRight className="w-4 h-4 text-muted-foreground/45 shrink-0 self-center" />
                  </div>
                );
              })
            ) : (
              <div className="p-12 text-center space-y-4">
                <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto text-muted-foreground/60">
                  <Mail className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-sm">No Messages Found</h4>
                  <p className="text-xs opacity-50 mt-1">We couldn't find any notifications matching your filters.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Expanded Message Detail Overlay Modal */}
      {selectedNotification && (
        <div className="fixed inset-0 bg-slate-955/45 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-6 py-5 border-b border-border/80 flex items-center justify-between bg-muted/20">
              <div>
                <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${getTypeStyle(selectedNotification.type)}`}>
                  {selectedNotification.type}
                </span>
                <p className="text-[10px] opacity-40 font-bold mt-1">Official Message Ref: {selectedNotification.id}</p>
              </div>
              <button
                onClick={() => setSelectedNotification(null)}
                className="w-8 h-8 rounded-full hover:bg-muted text-foreground/60 hover:text-foreground flex items-center justify-center font-bold text-lg cursor-pointer"
              >
                &times;
              </button>
            </div>

            {/* Content Container */}
            <div className="p-6 space-y-6 flex-1 overflow-y-auto max-h-[500px]">
              {/* Metadata Panel */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-muted/20 p-4 rounded-2xl text-xs font-semibold">
                <div>
                  <span className="opacity-45 block font-normal text-[10px] uppercase tracking-wider">Sender Office</span>
                  <span className="text-foreground/90 flex items-center gap-1 mt-0.5 font-bold">
                    <User className="w-3.5 h-3.5 text-primary" />
                    {selectedNotification.sender}
                  </span>
                </div>
                <div>
                  <span className="opacity-45 block font-normal text-[10px] uppercase tracking-wider">Recipient Contact</span>
                  <span className="text-foreground/90 mt-0.5 block font-bold">{selectedNotification.recipient}</span>
                </div>
                <div>
                  <span className="opacity-45 block font-normal text-[10px] uppercase tracking-wider">Delivery Date</span>
                  <span className="text-foreground/90 mt-0.5 block font-bold">{new Date(selectedNotification.createdAt).toLocaleString()}</span>
                </div>
              </div>

              {/* Subject */}
              <div className="space-y-1">
                <span className="opacity-45 block font-normal text-[10px] uppercase tracking-wider">Subject Title</span>
                <h2 className="text-base font-black tracking-tight leading-snug">{selectedNotification.subject}</h2>
              </div>

              {/* Message Body Block */}
              <div className="space-y-1.5 border-t border-border/60 pt-4">
                <span className="opacity-45 block font-normal text-[10px] uppercase tracking-wider mb-2">Message Body</span>
                {selectedNotification.body.trim().startsWith("<") || selectedNotification.body.includes("</") ? (
                  <div 
                    dangerouslySetInnerHTML={{ __html: selectedNotification.body }}
                    className="p-4 bg-white dark:bg-slate-900 border border-border/80 rounded-2xl overflow-x-auto text-xs leading-relaxed max-w-full font-sans select-text text-black dark:text-white"
                  />
                ) : (
                  <pre className="p-4 bg-slate-50 border border-border/80 dark:bg-slate-950 dark:border-border/40 text-slate-800 dark:text-slate-300 rounded-2xl font-mono text-xs whitespace-pre-wrap leading-relaxed overflow-x-auto select-text">
                    {selectedNotification.body}
                  </pre>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-border/80 bg-muted/10 flex justify-end">
              <button
                onClick={() => setSelectedNotification(null)}
                className="px-5 py-2.5 bg-primary text-primary-foreground font-bold text-xs rounded-xl hover:opacity-90 shadow-md transition-all cursor-pointer"
              >
                Close Notification
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
