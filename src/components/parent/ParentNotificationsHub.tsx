"use client";

import React, { useState, useEffect } from "react";
import { Mail, Search, Eye, CheckCircle2, AlertCircle, Info, Loader2, Calendar, User, ArrowRight, Square, CheckSquare, Send, Sparkles, MessageSquare } from "lucide-react";
import { markParentNotificationAsReadAction, sendParentReplyAction, getParentNotificationsAction, sendParentChatAction, getGuardianStudentTeachersAction } from "@/lib/actions/guardian-notification-actions";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

interface ParentNotificationsHubProps {
  initialNotifications: any[];
  parentEmail?: string | null;
  parentPhone?: string | null;
}

export function ParentNotificationsHub({ initialNotifications, parentEmail, parentPhone }: ParentNotificationsHubProps) {
  const router = useRouter();
  const [notifications, setNotifications] = useState<any[]>(initialNotifications);
  const [mode, setMode] = useState<"mail" | "chat">("chat");
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedNotification, setSelectedNotification] = useState<any | null>(null);
  const [markingReadId, setMarkingReadId] = useState<string | null>(null);

  // Interactivity States
  const [submittingResponseId, setSubmittingResponseId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [showReplyForm, setShowReplyForm] = useState(false);

  // Start New Chat States (Parent)
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [teachersList, setTeachersList] = useState<any[]>([]);
  const [selectedRecipient, setSelectedRecipient] = useState<string>("office");
  const [newChatMessage, setNewChatMessage] = useState("");
  const [startingNewChat, setStartingNewChat] = useState(false);

  const fetchNotifications = async () => {
    try {
      const res = await getParentNotificationsAction();
      if (res.success && res.data) {
        setNotifications(res.data);
      }
    } catch (err) {
      console.error("Failed to poll notifications:", err);
    }
  };

  useEffect(() => {
    // 1. Supabase Realtime sync
    const channel = supabase
      .channel('public:CommunicationLog:parent')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'CommunicationLog'
        },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    // 2. Polling fallback (8 seconds)
    const interval = setInterval(() => {
      fetchNotifications();
    }, 8000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    async function loadTeachers() {
      try {
        const res = await getGuardianStudentTeachersAction();
        if (res.success && res.data) {
          setTeachersList(res.data);
        }
      } catch (err) {
        console.error("Failed to load student teachers:", err);
      }
    }
    loadTeachers();
  }, []);

  // Helper to parse options from body text
  const parseInteractiveOptions = (bodyText: string) => {
    if (!bodyText) return { cleanBody: "", options: null };
    const delimiter = "\n\n---OPTIONS---\n";
    const idx = bodyText.indexOf(delimiter);
    if (idx !== -1) {
      const cleanBody = bodyText.substring(0, idx);
      const optionsStr = bodyText.substring(idx + delimiter.length).trim();
      const options = optionsStr.split(",").map(o => o.trim()).filter(Boolean);
      return { cleanBody, options };
    }
    return { cleanBody: bodyText, options: null };
  };

  // Helper to resolve parent response from reply logs
  const getExistingResponse = (notificationId: string) => {
    const replies = notifications.filter(
      (n) => n.parentId === notificationId && n.body && n.body.startsWith("[Response: ")
    );
    if (replies.length > 0) {
      const latestReply = replies[0];
      const match = latestReply.body.match(/\[Response:\s*([^\]]+)\]/);
      return match ? match[1] : null;
    }
    return null;
  };

  const handleSendOptionResponse = async (notification: any, selectedOption: string) => {
    setSubmittingResponseId(notification.id);
    try {
      const res = await sendParentReplyAction({
        originalNoticeId: notification.id,
        body: `[Response: ${selectedOption}] Parent responded to interactive notification.`,
        recipient: notification.sender,
        subject: `Re: ${notification.subject}`
      });
      if (res.success) {
        setNotifications((prev) => [
          {
            id: res.logId,
            parentId: notification.id,
            sender: "You (Parent)",
            recipient: notification.sender,
            subject: `Re: ${notification.subject}`,
            body: `[Response: ${selectedOption}] Parent responded to interactive notification.`,
            createdAt: new Date().toISOString(),
            isRead: true,
            type: "CUSTOM"
          },
          ...prev
        ]);
        router.refresh();
      }
    } catch (err) {
      console.error("Option response failed:", err);
    }
    setSubmittingResponseId(null);
  };

  const handleSendCustomReply = async (notification: any) => {
    if (!replyText.trim()) return;
    setSendingReply(true);
    try {
      if (mode === "chat" || notification.type === "CHAT") {
        const res = await sendParentChatAction({
          body: replyText.trim(),
          recipient: notification.sender,
          parentId: notification.id
        });
        if (res.success) {
          setNotifications((prev) => [
            {
              id: res.logId,
              parentId: notification.id,
              sender: "You (Parent)",
              recipient: notification.sender,
              subject: "Direct Support Chat",
              body: replyText.trim(),
              createdAt: new Date().toISOString(),
              isRead: true,
              type: "CHAT"
            },
            ...prev
          ]);
          setReplyText("");
          setShowReplyForm(false);
          router.refresh();
        }
      } else {
        const res = await sendParentReplyAction({
          originalNoticeId: notification.id,
          body: replyText.trim(),
          recipient: notification.sender,
          subject: `Re: ${notification.subject}`
        });
        if (res.success) {
          setNotifications((prev) => [
            {
              id: res.logId,
              parentId: notification.id,
              sender: "You (Parent)",
              recipient: notification.sender,
              subject: `Re: ${notification.subject}`,
              body: replyText.trim(),
              createdAt: new Date().toISOString(),
              isRead: true,
              type: notification.type || "CUSTOM"
            },
            ...prev
          ]);
          setReplyText("");
          setShowReplyForm(false);
          router.refresh();
        }
      }
    } catch (err) {
      console.error("Reply failed:", err);
    }
    setSendingReply(false);
  };

  async function handleStartParentNewChat(e: React.FormEvent) {
    e.preventDefault();
    if (!newChatMessage.trim() || startingNewChat) return;
    setStartingNewChat(true);

    try {
      let recipientString = "School Administration (office@virtueschool.in)";
      if (selectedRecipient !== "office") {
        const selectedStaff = teachersList.find(t => t.id === selectedRecipient);
        if (selectedStaff) {
          recipientString = `${selectedStaff.firstName} ${selectedStaff.lastName || ""} (${selectedStaff.email})`;
        }
      }

      const res = await sendParentChatAction({
        body: newChatMessage.trim(),
        recipient: recipientString
      });

      if (res.success) {
        setNewChatMessage("");
        setSelectedRecipient("office");
        setShowNewChatModal(false);
        await fetchNotifications();
      }
    } catch (err) {
      console.error("Failed to start new parent-teacher chat:", err);
    }
    setStartingNewChat(false);
  }

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
        router.refresh();
      }
      setMarkingReadId(null);
    }
  };

  const filteredByModeNotifications = notifications.filter(n => 
    mode === "chat" ? n.type === "CHAT" : n.type !== "CHAT"
  );

  const notificationsMap = new Map<string, any>(filteredByModeNotifications.map(n => [n.id, n]));

  const getThreadRootId = (log: any): string => {
    let current = log;
    const visited = new Set<string>();
    while (current.parentId && notificationsMap.has(current.parentId)) {
      if (visited.has(current.id)) break;
      visited.add(current.id);
      current = notificationsMap.get(current.parentId);
    }
    return current.id;
  };

  const threadsMap = new Map<string, any[]>();
  filteredByModeNotifications.forEach(log => {
    const rootId = getThreadRootId(log);
    if (!threadsMap.has(rootId)) {
      threadsMap.set(rootId, []);
    }
    threadsMap.get(rootId)!.push(log);
  });

  const rootNotifications: any[] = [];
  threadsMap.forEach((threadLogs, rootId) => {
    const sortedThread = [...threadLogs].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    const rootLog = notificationsMap.get(rootId) || sortedThread[0];
    const latestLog = sortedThread[sortedThread.length - 1];

    rootNotifications.push({
      ...rootLog,
      body: latestLog.body,
      createdAt: latestLog.createdAt,
      sender: latestLog.sender,
      isRead: rootLog.isRead // Keep read status of root (or thread status)
    });
  });

  // Sort roots by latest message date descending
  rootNotifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const filteredNotifications = rootNotifications.filter(item => {
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
    <div className="space-y-4">
      {/* Module Switcher Segmented Control */}
      <div className="flex justify-start border-b border-slate-200 bg-slate-50/50 p-2 rounded-xl">
        <div className="bg-slate-200/60 p-1 rounded-xl flex gap-1 shadow-inner">
          <button
            type="button"
            onClick={() => {
              setMode("chat");
              setSelectedNotification(null);
            }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-black transition-all border-none cursor-pointer ${
              mode === "chat"
                ? "bg-white text-indigo-700 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Support Chat Box (Direct)
          </button>
          
          <button
            type="button"
            onClick={() => {
              setMode("mail");
              setSelectedNotification(null);
            }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-black transition-all border-none cursor-pointer ${
              mode === "mail"
                ? "bg-white text-indigo-700 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            Bulletins & Alerts
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[600px] overflow-hidden bg-slate-50 border border-slate-200/50 rounded-2xl">
      {/* Left Sidebar notice list */}
      <div className="lg:col-span-4 bg-white border-r border-slate-200 flex flex-col h-[600px]">
        {/* Sidebar Header */}
        <div className="p-4 border-b border-slate-100 flex flex-col gap-3 bg-slate-50/50">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-slate-505 tracking-wider">Notifications</span>
            <div className="flex items-center gap-1.5 bg-slate-200/60 p-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider">
              <button
                type="button"
                onClick={() => setFilter("all")}
                className={`px-2 py-1 rounded transition-all cursor-pointer ${
                  filter === "all" ? "bg-white text-slate-800 shadow-sm" : "text-slate-400 font-bold"
                }`}
              >
                All ({notifications.length})
              </button>
              <button
                type="button"
                onClick={() => setFilter("unread")}
                className={`px-2 py-1 rounded transition-all cursor-pointer ${
                  filter === "unread" ? "bg-white text-slate-800 shadow-sm" : "text-slate-400 font-bold"
                }`}
              >
                Unread ({notifications.filter(n => !n.isRead).length})
              </button>
            </div>
          </div>

          {/* Search box */}
          <div className="relative">
            <Search className="absolute left-3 top-2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search notifications..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 w-full rounded-xl border border-slate-200 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-650 font-semibold"
            />
          </div>

          {mode === "chat" && (
            <button
              type="button"
              onClick={() => {
                setSelectedRecipient("office");
                setNewChatMessage("");
                setShowNewChatModal(true);
              }}
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-sm transition-all cursor-pointer border-none flex items-center justify-center gap-1.5"
            >
              💬 Start New Support Chat
            </button>
          )}
        </div>

        {/* Notices list */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {filteredNotifications.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs font-bold space-y-4">
              <div>{mode === "chat" ? "No active chats found." : "No bulletins found."}</div>
              {mode === "chat" && (
                <button
                  type="button"
                  onClick={async () => {
                    setSendingReply(true);
                    try {
                      const res = await sendParentChatAction({
                        body: "Hello, I would like to start a chat with the school office regarding my ward."
                      });
                      if (res.success) {
                        await fetchNotifications();
                      }
                    } catch (err) {
                      console.error(err);
                    }
                    setSendingReply(false);
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow transition-all cursor-pointer border-none"
                >
                  💬 Start Support Chat
                </button>
              )}
            </div>
          ) : (
            filteredNotifications.map((item) => {
              const isActive = selectedNotification && selectedNotification.id === item.id;
              const { cleanBody } = parseInteractiveOptions(item.body);
              const logBody = cleanBody.replace(/<[^>]*>/g, "");
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleOpenNotification(item)}
                  className={`w-full text-left p-4 flex gap-3 hover:bg-slate-50 transition-all border-none bg-transparent cursor-pointer ${
                    isActive ? "bg-slate-100" : ""
                  } ${!item.isRead ? "bg-indigo-50/10" : ""}`}
                >
                  <div className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-150 flex items-center justify-center font-black text-indigo-700 shrink-0 text-sm">
                    {item.subject.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-1">
                      <h4 className={`text-xs truncate ${!item.isRead ? "font-black text-slate-900" : "font-bold text-slate-700"}`}>
                        {item.subject}
                      </h4>
                      <span className="text-[9px] text-slate-400 shrink-0 font-semibold">
                        {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-405 truncate mt-0.5 font-medium">
                      {item.sender}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate mt-1 font-semibold">
                      {logBody}
                    </p>
                  </div>
                  {!item.isRead && (
                    <span className="w-2.5 h-2.5 bg-[#25d366] rounded-full self-center shrink-0 shadow-sm" />
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Right Chat Panel */}
      <div className="lg:col-span-8 flex flex-col h-[600px] bg-[#efeae2] relative" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'80\' height=\'80\' viewBox=\'0 0 80 80\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M14 16v18h18v-6H20v-6h12v-6H14zm0-12v6h18v-6H14zm44 0v6h18v-6H58zm0 12v18h18v-6H64v-6h12v-6H58zM14 44v6h18v-6H14zm44 0v6h18v-6H58z\' fill=\'%23dfdcd6\' fill-opacity=\'0.2\' fill-rule=\'evenodd\'%3E%3C/path%3E%3C/svg%3E")' }}>
        {selectedNotification ? (() => {
          const { cleanBody, options } = parseInteractiveOptions(selectedNotification.body);
          const existingResponse = getExistingResponse(selectedNotification.id);
          const activeRootId = getThreadRootId(selectedNotification);
          const replies = filteredByModeNotifications
            .filter((n) => getThreadRootId(n) === activeRootId && n.id !== activeRootId && n.body && !n.body.startsWith("[Response: "))
            .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

          return (
            <>
              {/* Chat Header */}
              <div className="bg-[#f0f2f5] px-6 py-3 border-b border-slate-200/50 flex items-center gap-3 shrink-0 shadow-sm z-10">
                <div className="w-10 h-10 rounded-full bg-indigo-650 text-white flex items-center justify-center font-bold text-sm">
                  {selectedNotification.subject.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-xs font-black text-slate-800 truncate">{selectedNotification.subject}</h3>
                  <p className="text-[10px] text-slate-505 truncate mt-0.5 font-bold">
                    From: {selectedNotification.sender}
                  </p>
                </div>
              </div>

              {/* Scrolling Thread */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 flex flex-col z-10">
                {/* Original notice bubble */}
                <div className="flex gap-2 max-w-[80%] self-start animate-in fade-in duration-200">
                  <div className="bg-white text-[#111b21] rounded-2xl rounded-tl-none px-4 py-3 shadow border border-slate-200/40 relative">
                    <span className="text-[9px] text-[#00a884] font-black uppercase tracking-wider block mb-1">
                      {selectedNotification.sender}
                    </span>
                    {cleanBody.trim().startsWith("<") || cleanBody.includes("</") ? (
                      <div 
                        dangerouslySetInnerHTML={{ __html: cleanBody }}
                        className="p-3 bg-slate-50/50 border border-slate-200/60 rounded-xl overflow-x-auto text-[11px] leading-relaxed max-w-full font-sans select-text text-black"
                      />
                    ) : (
                      <p className="text-xs leading-relaxed font-semibold whitespace-pre-wrap">{cleanBody}</p>
                    )}
                    
                    {/* Poll Card inline if configured */}
                    {options && options.length > 0 && (
                      <div className="bg-slate-50 border border-slate-200/60 p-3 rounded-xl space-y-2.5 mt-3 shadow-inner">
                        <span className="text-[9px] text-slate-500 uppercase tracking-widest font-black block">Action Required: Choose Response</span>
                        {existingResponse ? (
                          <div className="bg-emerald-50 border border-emerald-250 text-emerald-700 px-3 py-1.5 rounded-lg text-[10px] font-black flex items-center gap-1.5">
                            <span>Selection Registered: <strong>{existingResponse}</strong></span>
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {options.map((opt) => (
                              <button
                                key={opt}
                                type="button"
                                disabled={submittingResponseId === selectedNotification.id}
                                onClick={() => handleSendOptionResponse(selectedNotification, opt)}
                                className="px-3 py-1.5 bg-white border border-slate-200 text-[#00a884] hover:bg-[#00a884] hover:text-white rounded-lg text-[10px] font-black transition cursor-pointer disabled:opacity-50 border-solid"
                              >
                                {opt}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    <span className="text-[8px] text-[#667781] block mt-2 text-right">
                      {new Date(selectedNotification.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>

                {/* Replies list */}
                {replies.map((rep) => {
                  const isParent = (
                    (parentEmail && rep.sender.includes(parentEmail)) ||
                    (parentPhone && rep.sender.includes(parentPhone)) ||
                    rep.sender.includes("You")
                  );
                  return (
                    <div 
                      key={rep.id} 
                      className={`flex gap-2 max-w-[80%] ${isParent ? "self-end animate-in fade-in animate-in slide-in-from-bottom-2" : "self-start animate-in fade-in animate-in slide-in-from-bottom-2"}`}
                    >
                      <div className={`rounded-2xl px-4 py-3 shadow border ${
                        isParent 
                          ? "bg-[#d9fdd3] text-[#111b21] border-[#d9fdd3]/25 rounded-tr-none" 
                          : "bg-white text-[#111b21] border-slate-200/40 rounded-tl-none"
                      }`}>
                        <span className={`text-[9px] block mb-1 font-black uppercase tracking-wider ${isParent ? "text-[#00a884]" : "text-indigo-650"}`}>
                          {isParent ? "You (Parent)" : rep.sender}
                        </span>
                        <p className="text-xs leading-relaxed font-semibold">{rep.body}</p>
                        <div className="flex items-center justify-end gap-1 mt-2">
                          <span className="text-[8px] text-[#667781] block text-right font-medium">
                            {new Date(rep.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {isParent && (
                            <span className="text-[#53bdeb] text-[10px] font-black leading-none select-none">✓✓</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* WhatsApp footer input bar */}
              <div className="bg-[#f0f2f5] p-3.5 border-t border-slate-200/50 flex items-center gap-3 shrink-0 shadow-sm z-10">
                <div className="flex gap-2.5 text-slate-500 shrink-0 text-lg">
                  <span className="hover:text-slate-700 cursor-pointer">☺</span>
                  <span className="hover:text-slate-700 cursor-pointer">📎</span>
                </div>
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendCustomReply(selectedNotification);
                  }}
                  className="flex-1 flex gap-3"
                >
                  <input
                    type="text"
                    required
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 bg-white border-none px-4 py-2.5 rounded-xl text-xs font-semibold focus:outline-none focus:ring-0 text-[#111b21] shadow-sm"
                  />
                  <button
                    type="submit"
                    disabled={sendingReply}
                    className="w-10 h-10 bg-[#00a884] hover:bg-[#008f72] disabled:opacity-50 text-white rounded-full flex items-center justify-center shadow-md transition-all shrink-0 cursor-pointer border-none"
                  >
                    {sendingReply ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 text-white" />}
                  </button>
                </form>
              </div>
            </>
          );
        })() : (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-slate-400 p-8 text-center bg-[#f8f9fa] z-10">
            <div className="w-20 h-20 rounded-full bg-white shadow-md flex items-center justify-center">
              <Mail className="w-10 h-10 text-[#00a884] animate-pulse" />
            </div>
            <div>
              <h3 className="font-black text-slate-800 text-sm">Virtue School Notifications</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
                Select a notification from the left menu to view options, stats, and send real-time replies.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>

    {/* Start New Support Chat Modal */}
    {showNewChatModal && (
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[999] animate-in fade-in duration-200">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
          {/* Modal Header */}
          <div className="bg-indigo-600 px-6 py-4 flex items-center justify-between text-white">
            <h3 className="text-sm font-black flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4" />
              Start Support Chat
            </h3>
            <button
              type="button"
              onClick={() => setShowNewChatModal(false)}
              className="text-white hover:text-indigo-100 bg-transparent border-none cursor-pointer font-bold text-sm font-sans"
            >
              ✕
            </button>
          </div>

          {/* Modal Form */}
          <form onSubmit={handleStartParentNewChat} className="p-6 space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Select Recipient</label>
              <select
                value={selectedRecipient}
                onChange={(e) => setSelectedRecipient(e.target.value)}
                className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-650 bg-white"
              >
                <option value="office">School Administration (Office)</option>
                {teachersList.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.firstName} {teacher.lastName || ""} - {teacher.assignedClass?.name || "Teacher"} ({teacher.email})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Message Description</label>
              <textarea
                required
                rows={4}
                value={newChatMessage}
                onChange={(e) => setNewChatMessage(e.target.value)}
                placeholder="Type your initial message query..."
                className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-650 bg-white"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowNewChatModal(false)}
                className="px-4 py-2 border border-slate-200 text-slate-500 hover:bg-slate-50 rounded-xl text-xs font-black transition cursor-pointer bg-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={startingNewChat}
                className="px-5 py-2 bg-[#00a884] hover:bg-[#008f72] disabled:opacity-50 text-white rounded-xl text-xs font-black shadow transition cursor-pointer border-none flex items-center gap-1.5"
              >
                {startingNewChat ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Send Message"}
              </button>
            </div>
          </form>
        </div>
      </div>
    )}
  </div>
  );
}
