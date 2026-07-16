import React, { useState, useEffect } from "react";
import { Mail, Send, History, Search, Filter, CheckCircle, XCircle, Info, Loader2, Users, Bell, DollarSign, Eye, Inbox, MessageSquare, Star, User, Sparkles } from "lucide-react";
import { getCommunicationLogsAction, sendCustomEmailAction, sendBulkRemindersAction, getInboxLogsAction, markNoticeAsReadAction, getClassListAction } from "@/lib/actions/communication-actions";
import { getStudentListAction } from "@/lib/actions/student-actions";
import { getStaffDirectoryAction } from "@/lib/actions/staff-actions";
import { useTenant } from "@/context/tenant-context";
import { getFeedbackReportsAction, moderateFeedbackAction } from "@/lib/actions/feedback-actions";
import { supabase } from "@/lib/supabase/client";

interface MailboxHubProps {
  params?: {
    recipient?: string;
    targetGroup?: "MANUAL" | "ALL_PARENTS" | "ALL_STAFF" | "ALL" | "STUDENT" | "STAFF";
    activeTab?: "logs" | "compose" | "inbox" | "reviews";
  };
}

export function MailboxHub({ params }: MailboxHubProps) {
  const { userRole, capabilities, userEmail } = useTenant();
  const canComposeAndManage = 
    userRole === "OWNER" || 
    userRole === "DEVELOPER" || 
    userRole === "PRINCIPAL" || 
    userRole === "ADMIN" ||
    capabilities?.ACADEMIC_CONFIG === true;

  const [activeTab, setActiveTab] = useState<"logs" | "compose" | "inbox" | "reviews">("inbox");
  const [mode, setMode] = useState<"mail" | "chat">("chat");
  const [logs, setLogs] = useState<any[]>([]);
  const [inboxLogs, setInboxLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Parent Reviews States
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [moderatingId, setModeratingId] = useState<string | null>(null);
  const [feedbackCategoryFilter, setFeedbackCategoryFilter] = useState<string>("");

  const fetchFeedbacks = async (cat?: string) => {
    setFeedbackLoading(true);
    try {
      const res = await getFeedbackReportsAction(cat || null);
      if (res.success) {
        setFeedbacks(res.feedbacks || []);
      } else {
        setFeedback({ success: false, message: res.error || "Failed to load reviews." });
      }
    } catch (err: any) {
      setFeedback({ success: false, message: err.message || "An unexpected error occurred." });
    }
    setFeedbackLoading(false);
  };

  const handleModerateFeedback = async (id: string, status: "APPROVED" | "REJECTED") => {
    setModeratingId(id);
    try {
      const res = await moderateFeedbackAction(id, status);
      if (res.success) {
        setFeedback({ success: true, message: res.message || `Feedback marked as ${status.toLowerCase()}.` });
        setFeedbacks(prev => prev.map(f => f.id === id ? { ...f, moderationStatus: status } : f));
      } else {
        setFeedback({ success: false, message: res.error || "Failed to moderate feedback." });
      }
    } catch (err: any) {
      setFeedback({ success: false, message: err.message || "An unexpected error occurred." });
    }
    setModeratingId(null);
  };

  useEffect(() => {
    if (activeTab === "reviews") {
      fetchFeedbacks(feedbackCategoryFilter);
    }
  }, [activeTab, feedbackCategoryFilter]);
  
  // Log Filters
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [searchRecipient, setSearchRecipient] = useState("");

  // Compose Form
  const [targetGroup, setTargetGroup] = useState<string>("MANUAL");
  const [isInternalOnly, setIsInternalOnly] = useState(true); // Default to Internal Portal Notice (Free)
  const [recipient, setRecipient] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [addOptions, setAddOptions] = useState(false);
  const [optionsList, setOptionsList] = useState("");
  const [modalReplyText, setModalReplyText] = useState("");
  const [modalSendingReply, setModalSendingReply] = useState(false);
  const [activeChatLog, setActiveChatLog] = useState<any | null>(null);
  const [chatSearchQuery, setChatSearchQuery] = useState("");
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [newChatSubject, setNewChatSubject] = useState("");
  const [newChatMessage, setNewChatMessage] = useState("");
  const [searchStaffQuery, setSearchStaffQuery] = useState("");
  const [selectedStaffForChat, setSelectedStaffForChat] = useState<any | null>(null);
  const [startingChat, setStartingChat] = useState(false);
  const [parentId, setParentId] = useState<string | null>(null);
  const [classesList, setClassesList] = useState<any[]>([]);
  
  // Smart Student Lookup Search
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [searchTermStudent, setSearchTermStudent] = useState("");
  const [filteredStudents, setFilteredStudents] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [loadingStudents, setLoadingStudents] = useState(false);
 
  // Smart Staff Lookup Search
  const [allStaff, setAllStaff] = useState<any[]>([]);
  const [searchTermStaff, setSearchTermStaff] = useState("");
  const [filteredStaff, setFilteredStaff] = useState<any[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<any | null>(null);
  const [loadingStaff, setLoadingStaff] = useState(false);
 
  // States
  const [sending, setSending] = useState(false);
  const [runningReminders, setRunningReminders] = useState(false);
  const [feedback, setFeedback] = useState<{ success: boolean; message: string } | null>(null);
  const [selectedLog, setSelectedLog] = useState<any | null>(null);
 
  // Pre-fill state if redirect parameters are passed
  useEffect(() => {
    if (params) {
      // Standard staff members should not be forced into unauthorized tabs
      if (params.activeTab && (canComposeAndManage || params.activeTab === "inbox")) {
        setActiveTab(params.activeTab as any);
      }
      if (params.recipient && canComposeAndManage) setRecipient(params.recipient);
      if (params.targetGroup && canComposeAndManage) setTargetGroup(params.targetGroup);
      
      if (params.recipient && canComposeAndManage) {
        setTargetGroup("MANUAL");
      }
    }
  }, [params, canComposeAndManage]);
 
  useEffect(() => {
    fetchAllData();

    // 1. Supabase Realtime channel subscription
    const channel = supabase
      .channel('public:CommunicationLog:admin')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'CommunicationLog'
        },
        () => {
          fetchAllData();
        }
      )
      .subscribe();

    // 2. 8-second polling fallback
    const interval = setInterval(() => {
      fetchAllData();
    }, 8000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [filterType, filterStatus, searchRecipient, canComposeAndManage]);
 
  // Load directory details only if user has management capabilities
  useEffect(() => {
    if (canComposeAndManage) {
      loadStudents();
      loadStaff();
      loadClasses();
    }
  }, [canComposeAndManage]);
 
  // Allow all target groups across both channels, no reset required
 
  async function loadStudents() {
    setLoadingStudents(true);
    try {
      const res = await getStudentListAction();
      if (res.success && res.data) {
        setAllStudents(res.data);
      }
    } catch (e) {
      console.error("Failed to load students:", e);
    }
    setLoadingStudents(false);
  }
 
  async function loadStaff() {
    setLoadingStaff(true);
    try {
      const res = await getStaffDirectoryAction();
      if (res.success && res.data) {
        setAllStaff(res.data);
      }
    } catch (e) {
      console.error("Failed to load staff directory:", e);
    }
    setLoadingStaff(false);
  }

  async function loadClasses() {
    try {
      const res = await getClassListAction();
      if (res.success && res.data) {
        setClassesList(res.data);
      }
    } catch (e) {
      console.error("Failed to load classes directory:", e);
    }
  }

  // Handle local searching for student lookup
  useEffect(() => {
    if (!searchTermStudent.trim()) {
      setFilteredStudents([]);
      return;
    }

    const term = searchTermStudent.toLowerCase();
    const matches = allStudents.filter(s => {
      const name = `${s.firstName || ""} ${s.lastName || ""}`.toLowerCase();
      const code = (s.studentCode || s.admissionNumber || "").toLowerCase();
      const phone = (s.phone || s.family?.fatherPhone || s.family?.motherPhone || "");
      const aadhar = (s.aadharNumber || s.family?.fatherAadhaar || s.family?.motherAadhaar || "");
      
      return name.includes(term) || code.includes(term) || phone.includes(term) || aadhar.includes(term);
    });

    setFilteredStudents(matches.slice(0, 10));
  }, [searchTermStudent, allStudents]);

  // Handle local searching for staff lookup
  useEffect(() => {
    if (!searchTermStaff.trim()) {
      setFilteredStaff([]);
      return;
    }

    const term = searchTermStaff.toLowerCase();
    const matches = allStaff.filter(s => {
      const name = `${s.firstName || ""} ${s.lastName || ""}`.toLowerCase();
      const code = (s.employeeId || "").toLowerCase();
      const phone = (s.phone || "");
      
      return name.includes(term) || code.includes(term) || phone.includes(term);
    });

    setFilteredStaff(matches.slice(0, 10));
  }, [searchTermStaff, allStaff]);

  async function fetchAllData() {
    setLoading(true);
    try {
      const [inboxRes, logsRes] = await Promise.all([
        getInboxLogsAction(),
        canComposeAndManage ? getCommunicationLogsAction({
          type: filterType || undefined,
          status: filterStatus || undefined,
          recipient: searchRecipient.trim() || undefined
        }) : Promise.resolve({ success: true, data: [] })
      ]);

      if (inboxRes.success && inboxRes.data) {
        setInboxLogs(inboxRes.data);
      }
      if (logsRes.success && logsRes.data) {
        setLogs(logsRes.data);
      }
    } catch (e) {
      console.error("Failed to load mailbox logs:", e);
    }
    setLoading(false);
  }

  const fetchInbox = fetchAllData;
  const fetchLogs = fetchAllData;

  async function handleOpenNotice(log: any) {
    setSelectedLog(log);
    if (!log.isRead) {
      try {
        const res = await markNoticeAsReadAction(log.id);
        if (res.success) {
          setInboxLogs(prev => prev.map(item => item.id === log.id ? { ...item, isRead: true, readAt: res.data.readAt } : item));
        }
      } catch (err) {
        console.error("Failed to mark notice as read:", err);
      }
    }
  }

  function handleReply(log: any) {
    setSelectedLog(null);
    setTargetGroup("MANUAL");
    setIsInternalOnly(!log.sender.includes("@") || log.sender.includes("internal@virtueschool.in"));
    
    // Extract email from "Name (email@domain.com)" or default to the sender string
    let targetRecipient = log.sender;
    const match = log.sender.match(/\(([^)]+)\)/);
    if (match && match[1]) {
      targetRecipient = match[1].trim();
    }
    
    setRecipient(targetRecipient);
    setSubject(log.subject.startsWith("Re:") ? log.subject : `Re: ${log.subject}`);
    setParentId(log.id);
    
    const quotedBody = `\n\n----- Original Message -----\nFrom: ${log.sender}\nDate: ${new Date(log.createdAt).toLocaleString()}\nSubject: ${log.subject}\n\n${log.body}`;
    setBody(quotedBody);
    
    setActiveTab("compose");
  }

  function handleSelectStudent(student: any) {
    setSelectedStudent(student);
    setSearchTermStudent("");
    setFilteredStudents([]);
    
    // Choose first available email as default
    const email = student.email || student.family?.fatherEmail || student.family?.motherEmail || "";
    setRecipient(email);
    
    if (!email) {
      setFeedback({ success: false, message: `Warning: Selected student ${student.firstName} has no email address configured in records.` });
    } else {
      setFeedback(null);
    }
  }

  function handleSelectStaff(staff: any) {
    setSelectedStaff(staff);
    setSearchTermStaff("");
    setFilteredStaff([]);
    
    const email = staff.email || "";
    setRecipient(email);
    
    if (!email) {
      setFeedback({ success: false, message: `Warning: Selected staff ${staff.firstName} has no email address configured in records.` });
    } else {
      setFeedback(null);
    }
  }

  async function handleSendModalReply(log: any) {
    if (!modalReplyText.trim()) return;
    setModalSendingReply(true);
    try {
      let targetRecipient = activeTab === "logs" ? log.recipient : log.sender;
      const match = targetRecipient.match(/\(([^)]+)\)/);
      if (match && match[1]) {
        targetRecipient = match[1].trim();
      }

      const res = await sendCustomEmailAction({
        targetGroup: "MANUAL",
        recipient: targetRecipient,
        subject: log.subject.startsWith("Re:") ? log.subject : `Re: ${log.subject}`,
        body: modalReplyText.trim(),
        isInternalOnly: true,
        parentId: log.id,
        type: log.type || "CUSTOM"
      });
      if (res.success) {
        setModalReplyText("");
        await fetchInbox();
        await fetchLogs();
      }
    } catch (e) {
      console.error("Failed to send modal reply:", e);
    }
    setModalSendingReply(false);
  }

  async function handleSelectChat(log: any) {
    setActiveChatLog(log);
    if (!log.isRead && activeTab === "inbox") {
      try {
        const res = await markNoticeAsReadAction(log.id);
        if (res.success) {
          setInboxLogs(prev => prev.map(item => item.id === log.id ? { ...item, isRead: true, readAt: res.data.readAt } : item));
        }
      } catch (err) {
        console.error("Failed to mark as read:", err);
      }
    }
  }

  async function handleStartNewStaffChat(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedStaffForChat || !selectedStaffForChat.email) return;
    setStartingChat(true);
    try {
      const res = await sendCustomEmailAction({
        targetGroup: "MANUAL",
        recipient: selectedStaffForChat.email,
        subject: newChatSubject.trim(),
        body: newChatMessage.trim(),
        isInternalOnly: true,
        type: "CHAT"
      });
      if (res.success) {
        setNewChatSubject("");
        setNewChatMessage("");
        setSelectedStaffForChat(null);
        setSearchStaffQuery("");
        setShowNewChatModal(false);

        await fetchInbox();
        await fetchLogs();
      }
    } catch (err) {
      console.error("Failed to start chat:", err);
    }
    setStartingChat(false);
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!canComposeAndManage) return;

    setSending(true);
    setFeedback(null);

    const finalGroup = (targetGroup === "STUDENT" || targetGroup === "STAFF") ? "MANUAL" : targetGroup;
    let finalBody = body;
    if (addOptions && optionsList.trim()) {
      finalBody = body + "\n\n---OPTIONS---\n" + optionsList.trim();
    }

    try {
      const res = await sendCustomEmailAction({
        targetGroup: finalGroup,
        recipient,
        subject,
        body: finalBody,
        isInternalOnly,
        parentId: parentId || undefined
      });

      if (res.success) {
        const text = isInternalOnly 
          ? `Portal Notice successfully logged in database for ${res.sentCount || 1} recipients!`
          : `Emails successfully dispatched via Hostinger SMTP for ${res.sentCount || 1} recipients!`;
        setFeedback({ success: true, message: text });
        setSubject("");
        setBody("");
        setRecipient("");
        setAddOptions(false);
        setOptionsList("");
        setSelectedStudent(null);
        setSelectedStaff(null);
        setParentId(null);
      } else {
        setFeedback({ success: false, message: res.error || "Failed to dispatch communication." });
      }
    } catch (err: any) {
      setFeedback({ success: false, message: err.message || "An unexpected error occurred." });
    }
    setSending(false);
  }

  async function triggerAutoReminders() {
    if (!canComposeAndManage) return;

    const confirm = window.confirm(
      `Are you sure you want to run the auto-reminders for all active students with outstanding dues?\n\nMode: ${
        isInternalOnly ? "Internal Portal Notices (Free)" : "Official Emails (External Communication)"
      }`
    );
    if (!confirm) return;

    setRunningReminders(true);
    setFeedback(null);

    try {
      const res = await sendBulkRemindersAction(isInternalOnly);
      if (res.success) {
        setFeedback({
          success: true,
          message: `Auto-Reminders complete! Sent ${res.sentCount} pending due alerts via ${isInternalOnly ? "Internal Notices" : "SMTP Emails"}.`
        });
        if (activeTab === "logs") fetchLogs();
      } else {
        setFeedback({ success: false, message: res.error || "Failed to execute auto-reminders." });
      }
    } catch (err: any) {
      setFeedback({ success: false, message: err.message || "An unexpected error occurred." });
    }
    setRunningReminders(false);
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Mail className="w-6 h-6 text-indigo-600" />
            School Mailbox Hub
          </h2>
          <p className="text-slate-500 font-medium text-xs mt-1">Manage school notices and send emails via Hostinger SMTP</p>
        </div>

        {/* Bulk Actions Button - Hidden for standard staff */}
        {canComposeAndManage && (
          <button
            onClick={triggerAutoReminders}
            disabled={runningReminders}
            className="bg-amber-500 hover:bg-amber-600 disabled:bg-amber-400 text-white font-bold py-2 px-4 rounded-xl text-xs flex items-center gap-2 shadow-sm transition-all animate-in fade-in"
          >
            {runningReminders ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <DollarSign className="w-4 h-4" />
            )}
            ⚡ Run Auto-Reminders for Fee Dues
          </button>
        )}
      </div>

      {/* Module Switcher Segmented Control */}
      <div className="flex justify-start border-b border-slate-200 bg-slate-50/50 p-2 rounded-xl">
        <div className="bg-slate-200/60 p-1 rounded-xl flex gap-1 shadow-inner">
          <button
            type="button"
            onClick={() => {
              setMode("chat");
              setActiveTab("inbox");
            }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-black transition-all border-none cursor-pointer ${
              mode === "chat"
                ? "bg-white text-indigo-700 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Direct Chat Box (Messaging)
          </button>
          
          <button
            type="button"
            onClick={() => {
              setMode("mail");
              setActiveTab("compose"); // Default to compose inside Mail mode
            }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-black transition-all border-none cursor-pointer ${
              mode === "mail"
                ? "bg-white text-indigo-700 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            Official Mail & Notices Hub
          </button>
        </div>
      </div>

      {/* Tabs Menu - Dynamic tabs based on user capabilities (Mail mode only) */}
      {mode === "mail" && (
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setActiveTab("inbox")}
            className={`flex items-center gap-2 py-3 px-6 text-sm font-semibold border-b-2 transition-all ${
              activeTab === "inbox"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <Inbox className="w-4 h-4" />
            Inbox (Received Notices)
          </button>

          {canComposeAndManage && (
            <>
              <button
                onClick={() => setActiveTab("logs")}
                className={`flex items-center gap-2 py-3 px-6 text-sm font-semibold border-b-2 transition-all ${
                  activeTab === "logs"
                    ? "border-indigo-600 text-indigo-600"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                <History className="w-4 h-4" />
                Outbox & Sent History
              </button>
              <button
                onClick={() => setActiveTab("compose")}
                className={`flex items-center gap-2 py-3 px-6 text-sm font-semibold border-b-2 transition-all ${
                  activeTab === "compose"
                    ? "border-indigo-600 text-indigo-600"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                <Send className="w-4 h-4" />
                Compose & Live Preview
              </button>
              <button
                onClick={() => setActiveTab("reviews")}
                className={`flex items-center gap-2 py-3 px-6 text-sm font-semibold border-b-2 transition-all ${
                  activeTab === "reviews"
                    ? "border-indigo-600 text-indigo-600"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                Parent Reviews
              </button>
            </>
          )}
        </div>
      )}

      {/* Main Panel Content */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm">
        {activeTab === "inbox" ? (
          /* INBOX VIEW - WhatsApp Workspace Layout */
          (() => {
             const modeInboxLogs = inboxLogs.filter(log => 
               mode === "chat" ? log.type === "CHAT" : log.type !== "CHAT"
             );
             const modeOutboxLogs = logs.filter(log => 
               mode === "chat" ? log.type === "CHAT" : log.type !== "CHAT"
             );
             const allLogs = [...modeInboxLogs, ...modeOutboxLogs];
             const allLogsMap = new Map<string, any>(allLogs.map(l => [l.id, l]));

             const getThreadRootId = (log: any): string => {
               let current = log;
               const visited = new Set<string>();
               while (current.parentId && allLogsMap.has(current.parentId)) {
                 if (visited.has(current.id)) break;
                 visited.add(current.id);
                 current = allLogsMap.get(current.parentId);
               }
               return current.id;
             };

             const threadsMap = new Map<string, any[]>();
             allLogs.forEach(log => {
               const rootId = getThreadRootId(log);
               if (!threadsMap.has(rootId)) {
                 threadsMap.set(rootId, []);
               }
               threadsMap.get(rootId)!.push(log);
             });

             const inboxThreadRootIds = new Set<string>();
             modeInboxLogs.forEach(log => {
               inboxThreadRootIds.add(getThreadRootId(log));
             });

             const rootInboxLogs: any[] = [];
             inboxThreadRootIds.forEach(rootId => {
               const threadLogs = threadsMap.get(rootId) || [];
               const sortedThread = [...threadLogs].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
               const rootLog = allLogsMap.get(rootId) || sortedThread[0];
               const latestLog = sortedThread[sortedThread.length - 1];

               rootInboxLogs.push({
                 ...rootLog,
                 body: latestLog.body,
                 createdAt: latestLog.createdAt,
                 sender: latestLog.sender,
                 isRead: rootLog.isRead
               });
             });

             rootInboxLogs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

             const filteredInboxLogs = rootInboxLogs.filter(log => 
               log.subject.toLowerCase().includes(chatSearchQuery.toLowerCase()) ||
               log.sender.toLowerCase().includes(chatSearchQuery.toLowerCase())
             );

            return (
              <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[600px] overflow-hidden bg-slate-50 rounded-xl">
                {/* Left Notice Titles List */}
                <div className="lg:col-span-4 bg-white border-r border-slate-200 flex flex-col h-[600px]">
                  <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Inbox Notices</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setShowNewChatModal(true);
                          setSelectedStaffForChat(null);
                          setNewChatSubject("");
                          setNewChatMessage("");
                          setSearchStaffQuery("");
                        }}
                        className="bg-[#00a884] hover:bg-[#008f72] text-white rounded-full w-5 h-5 flex items-center justify-center font-black text-xs shadow transition cursor-pointer border-none"
                        title="New Chat with Staff"
                      >
                        +
                      </button>
                      <button 
                        onClick={fetchInbox}
                        className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition"
                      >
                        Refresh
                      </button>
                    </div>
                  </div>

                  <div className="p-3 border-b border-slate-100 bg-white">
                    <div className="relative">
                      <Search className="absolute left-3 top-2 w-3.5 h-3.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search notice title..."
                        value={chatSearchQuery}
                        onChange={(e) => setChatSearchQuery(e.target.value)}
                        className="pl-9 w-full rounded-xl border border-slate-200 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-600"
                      />
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
                    {loading ? (
                      <div className="h-64 flex flex-col items-center justify-center gap-3">
                        <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
                        <span className="text-xs text-slate-500 font-bold">Loading notices...</span>
                      </div>
                    ) : filteredInboxLogs.length === 0 ? (
                      <div className="p-8 text-center text-slate-400 text-xs font-semibold">
                        No received notices found.
                      </div>
                    ) : (
                      filteredInboxLogs.map((log) => {
                        const isActive = activeChatLog && activeChatLog.id === log.id;
                        const delimiter = "\n\n---OPTIONS---\n";
                        const idx = log.body.indexOf(delimiter);
                        const clean = idx !== -1 ? log.body.substring(0, idx) : log.body;
                        const logBody = clean.replace(/<[^>]*>/g, "");
                        return (
                          <button
                            key={log.id}
                            type="button"
                            onClick={() => handleSelectChat(log)}
                            className={`w-full text-left p-4 flex gap-3 hover:bg-slate-50 transition-all ${
                              isActive ? "bg-slate-100" : ""
                            } ${!log.isRead ? "bg-indigo-50/10" : ""}`}
                          >
                            <div className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-150 flex items-center justify-center font-black text-indigo-700 shrink-0 text-sm">
                              {log.subject.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-start gap-1">
                                <h4 className={`text-xs truncate ${!log.isRead ? "font-black text-slate-900" : "font-bold text-slate-700"}`}>
                                  {log.subject}
                                </h4>
                                <span className="text-[9px] text-slate-400 shrink-0 font-semibold">
                                  {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-400 truncate mt-0.5 font-medium">
                                {log.sender}
                              </p>
                              <p className="text-[11px] text-slate-500 truncate mt-1 font-semibold">
                                {logBody}
                              </p>
                            </div>
                            {!log.isRead && (
                              <span className="w-2.5 h-2.5 bg-[#25d366] rounded-full self-center shrink-0 shadow-sm" />
                            )}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Right Chat Workspace Panel */}
                <div className="lg:col-span-8 flex flex-col h-[600px] bg-[#efeae2] relative" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'80\' height=\'80\' viewBox=\'0 0 80 80\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M14 16v18h18v-6H20v-6h12v-6H14zm0-12v6h18v-6H14zm44 0v6h18v-6H58zm0 12v18h18v-6H64v-6h12v-6H58zM14 44v6h18v-6H14zm44 0v6h18v-6H58z\' fill=\'%23dfdcd6\' fill-opacity=\'0.2\' fill-rule=\'evenodd\'%3E%3C/path%3E%3C/svg%3E")' }}>
                  {activeChatLog ? (() => {
                    const delimiter = "\n\n---OPTIONS---\n";
                    const idx = activeChatLog.body.indexOf(delimiter);
                    const cleanBody = idx !== -1 ? activeChatLog.body.substring(0, idx) : activeChatLog.body;
                    const optionsStr = idx !== -1 ? activeChatLog.body.substring(idx + delimiter.length).trim() : "";
                    const options = optionsStr ? optionsStr.split(",").map(o => o.trim()).filter(Boolean) : null;

                    // Resolve replies & counts
                    const activeRootId = getThreadRootId(activeChatLog);
                    const chatReplies = allLogs.filter(
                      (l) => getThreadRootId(l) === activeRootId && l.id !== activeRootId
                    );
                    const sortedReplies = chatReplies.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

                    const optionCounts: Record<string, number> = {};
                    if (options) {
                      options.forEach(o => { optionCounts[o] = 0; });
                      const responseReplies = allLogs.filter(
                        (l) => l.parentId === activeChatLog.id && l.body && l.body.startsWith("[Response: ")
                      );
                      responseReplies.forEach(rep => {
                        const match = rep.body.match(/\[Response:\s*([^\]]+)\]/);
                        if (match && match[1]) {
                          const optionVal = match[1].trim();
                          if (optionCounts[optionVal] !== undefined) {
                            optionCounts[optionVal]++;
                          }
                        }
                      });
                    }

                    return (
                      <>
                        {/* Chat Header */}
                        <div className="bg-[#f0f2f5] px-6 py-3 border-b border-slate-200/50 flex items-center gap-3 shrink-0 shadow-sm z-10">
                          <div className="w-10 h-10 rounded-full bg-indigo-650 text-white flex items-center justify-center font-bold text-sm">
                            {activeChatLog.subject.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="text-xs font-black text-slate-800 truncate">{activeChatLog.subject}</h3>
                            <p className="text-[10px] text-slate-500 truncate mt-0.5 font-bold">
                              From: {activeChatLog.sender}
                            </p>
                          </div>
                        </div>

                        {/* Chat Messages Scrolling Thread */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-4 flex flex-col z-10">
                          {/* Original notice bubble */}
                          <div className="flex gap-2 max-w-[80%] self-start animate-in fade-in duration-200">
                            <div className="bg-white text-[#111b21] rounded-2xl rounded-tl-none px-4 py-3 shadow border border-slate-200/40 relative">
                              <span className="text-[9px] text-[#00a884] font-black uppercase tracking-wider block mb-1">
                                {activeChatLog.sender}
                              </span>
                              <p className="text-xs leading-relaxed font-semibold">{cleanBody}</p>
                              
                              {/* Options tracker displayed inside original bubble if configured */}
                              {options && (
                                <div className="bg-slate-50 border border-slate-200/60 p-3 rounded-xl space-y-2.5 mt-3 shadow-inner">
                                  <span className="text-[9px] text-slate-500 uppercase tracking-widest font-black block">Interactive Selection Stats</span>
                                  <div className="grid grid-cols-2 gap-2">
                                    {options.map(opt => (
                                      <div key={opt} className="bg-white px-3 py-1.5 rounded-lg border border-slate-100 text-center">
                                        <span className="block text-[8px] text-slate-400 font-bold uppercase">{opt}</span>
                                        <span className="block text-sm font-black text-slate-700 mt-0.5">{optionCounts[opt] || 0}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              <div className="flex items-center justify-end gap-1 mt-2">
                                <span className="text-[8px] text-[#667781] block text-right font-medium">
                                  {new Date(activeChatLog.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                {userEmail && (activeChatLog.authorEmail === userEmail || activeChatLog.sender.includes(userEmail)) && (
                                  activeChatLog.status === "FAILED" ? (
                                    <span className="text-rose-500 text-[9px] font-bold select-none">⚠️ Failed</span>
                                  ) : activeChatLog.isRead || activeChatLog.readAt ? (
                                    <span className="text-[#53bdeb] text-[10px] font-black leading-none select-none" title={`Read at ${activeChatLog.readAt ? new Date(activeChatLog.readAt).toLocaleString() : ''}`}>✓✓</span>
                                  ) : (
                                    <span className="text-[#8696a0] text-[10px] font-black leading-none select-none" title="Sent (Unread)">✓✓</span>
                                  )
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Replies */}
                          {sortedReplies.map((rep) => {
                            const isSelf = userEmail && rep.sender.includes(userEmail);
                            return (
                              <div 
                                key={rep.id} 
                                className={`flex gap-2 max-w-[80%] ${isSelf ? "self-end animate-in fade-in animate-in slide-in-from-bottom-2" : "self-start animate-in fade-in animate-in slide-in-from-bottom-2"}`}
                              >
                                <div className={`rounded-2xl px-4 py-3 shadow border ${
                                  isSelf 
                                    ? "bg-[#d9fdd3] text-[#111b21] border-[#d9fdd3]/25 rounded-tr-none" 
                                    : "bg-white text-[#111b21] border-slate-200/40 rounded-tl-none"
                                }`}>
                                  <span className={`text-[9px] block mb-1 font-black uppercase tracking-wider ${isSelf ? "text-[#00a884]" : "text-indigo-600"}`}>
                                    {isSelf ? "You (Staff)" : rep.sender}
                                  </span>
                                  <p className="text-xs leading-relaxed font-semibold">{rep.body}</p>
                                  <div className="flex items-center justify-end gap-1 mt-2">
                                    <span className="text-[8px] text-[#667781] block text-right font-medium">
                                      {new Date(rep.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                    {isSelf && (
                                      rep.status === "FAILED" ? (
                                        <span className="text-rose-500 text-[9px] font-bold select-none">⚠️ Failed</span>
                                      ) : rep.isRead || rep.readAt ? (
                                        <span className="text-[#53bdeb] text-[10px] font-black leading-none select-none" title={`Read at ${rep.readAt ? new Date(rep.readAt).toLocaleString() : ''}`}>✓✓</span>
                                      ) : (
                                        <span className="text-[#8696a0] text-[10px] font-black leading-none select-none" title="Sent (Unread)">✓✓</span>
                                      )
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* WhatsApp Footer Input Bar */}
                        <div className="bg-[#f0f2f5] p-3.5 border-t border-slate-200/50 flex items-center gap-3 shrink-0 shadow-sm z-10">
                          <div className="flex gap-2.5 text-slate-500 shrink-0 text-lg">
                            <span className="hover:text-slate-700 cursor-pointer">☺</span>
                            <span className="hover:text-slate-700 cursor-pointer">📎</span>
                          </div>
                          <form 
                            onSubmit={(e) => {
                              e.preventDefault();
                              handleSendModalReply(activeChatLog);
                            }}
                            className="flex-1 flex gap-3"
                          >
                            <input
                              type="text"
                              required
                              value={modalReplyText}
                              onChange={(e) => setModalReplyText(e.target.value)}
                              placeholder="Type a message..."
                              className="flex-1 bg-white border-none px-4 py-2.5 rounded-xl text-xs font-semibold focus:outline-none focus:ring-0 text-[#111b21] shadow-sm"
                            />
                            <button
                              type="submit"
                              disabled={modalSendingReply}
                              className="w-10 h-10 bg-[#00a884] hover:bg-[#008f72] disabled:opacity-50 text-white rounded-full flex items-center justify-center shadow-md transition-all shrink-0 cursor-pointer border-none"
                            >
                              {modalSendingReply ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 text-white" />}
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
                        <h3 className="font-black text-slate-800 text-sm">Virtue School Inbox Hub</h3>
                        <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
                          Select a notice from the left menu to view options selections, response statistics, and send real-time replies.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })()
        ) : activeTab === "logs" && canComposeAndManage ? (
          /* OUTBOX LOGS VIEW - WhatsApp Workspace Layout */
          (() => {
             const modeInboxLogs = inboxLogs.filter(log => 
               mode === "chat" ? log.type === "CHAT" : log.type !== "CHAT"
             );
             const modeOutboxLogs = logs.filter(log => 
               mode === "chat" ? log.type === "CHAT" : log.type !== "CHAT"
             );
             const allLogs = [...modeInboxLogs, ...modeOutboxLogs];
             const allLogsMap = new Map<string, any>(allLogs.map(l => [l.id, l]));

             const getThreadRootId = (log: any): string => {
               let current = log;
               const visited = new Set<string>();
               while (current.parentId && allLogsMap.has(current.parentId)) {
                 if (visited.has(current.id)) break;
                 visited.add(current.id);
                 current = allLogsMap.get(current.parentId);
               }
               return current.id;
             };

             const threadsMap = new Map<string, any[]>();
             allLogs.forEach(log => {
               const rootId = getThreadRootId(log);
               if (!threadsMap.has(rootId)) {
                 threadsMap.set(rootId, []);
               }
               threadsMap.get(rootId)!.push(log);
             });

             const outboxThreadRootIds = new Set<string>();
             modeOutboxLogs.forEach(log => {
               outboxThreadRootIds.add(getThreadRootId(log));
             });

             const rootOutboxLogs: any[] = [];
             outboxThreadRootIds.forEach(rootId => {
               const threadLogs = threadsMap.get(rootId) || [];
               const sortedThread = [...threadLogs].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
               const rootLog = allLogsMap.get(rootId) || sortedThread[0];
               const latestLog = sortedThread[sortedThread.length - 1];

               rootOutboxLogs.push({
                 ...rootLog,
                 body: latestLog.body,
                 createdAt: latestLog.createdAt,
                 recipient: latestLog.recipient
               });
             });

             rootOutboxLogs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

             const filteredOutboxLogs = rootOutboxLogs.filter(log => 
               log.subject.toLowerCase().includes(chatSearchQuery.toLowerCase()) ||
               log.recipient.toLowerCase().includes(chatSearchQuery.toLowerCase())
             );

            return (
              <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[600px] overflow-hidden bg-slate-50 rounded-xl">
                {/* Left Notice Titles List */}
                <div className="lg:col-span-4 bg-white border-r border-slate-200 flex flex-col h-[600px]">
                  <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Outbox Notices</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setShowNewChatModal(true);
                          setSelectedStaffForChat(null);
                          setNewChatSubject("");
                          setNewChatMessage("");
                          setSearchStaffQuery("");
                        }}
                        className="bg-[#00a884] hover:bg-[#008f72] text-white rounded-full w-5 h-5 flex items-center justify-center font-black text-xs shadow transition cursor-pointer border-none"
                        title="New Chat with Staff"
                      >
                        +
                      </button>
                      <button 
                        onClick={fetchLogs}
                        className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition"
                      >
                        Refresh
                      </button>
                    </div>
                  </div>

                  <div className="p-3 border-b border-slate-100 bg-white">
                    <div className="relative">
                      <Search className="absolute left-3 top-2 w-3.5 h-3.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search notice title..."
                        value={chatSearchQuery}
                        onChange={(e) => setChatSearchQuery(e.target.value)}
                        className="pl-9 w-full rounded-xl border border-slate-200 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-600"
                      />
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
                    {loading ? (
                      <div className="h-64 flex flex-col items-center justify-center gap-3">
                        <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
                        <span className="text-xs text-slate-500 font-bold">Loading notices...</span>
                      </div>
                    ) : filteredOutboxLogs.length === 0 ? (
                      <div className="p-8 text-center text-slate-400 text-xs font-semibold">
                        No sent notices found.
                      </div>
                    ) : (
                      filteredOutboxLogs.map((log) => {
                        const isActive = activeChatLog && activeChatLog.id === log.id;
                        const delimiter = "\n\n---OPTIONS---\n";
                        const idx = log.body.indexOf(delimiter);
                        const clean = idx !== -1 ? log.body.substring(0, idx) : log.body;
                        const logBody = clean.replace(/<[^>]*>/g, "");
                        return (
                          <button
                            key={log.id}
                            type="button"
                            onClick={() => handleSelectChat(log)}
                            className={`w-full text-left p-4 flex gap-3 hover:bg-slate-50 transition-all ${
                              isActive ? "bg-slate-100" : ""
                            }`}
                          >
                            <div className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-150 flex items-center justify-center font-black text-indigo-700 shrink-0 text-sm">
                              {log.subject.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-start gap-1">
                                <h4 className="text-xs truncate font-bold text-slate-700">
                                  {log.subject}
                                </h4>
                                <span className="text-[9px] text-slate-400 shrink-0 font-semibold">
                                  {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-400 truncate mt-0.5 font-medium">
                                To: {log.recipient}
                              </p>
                              <p className="text-[11px] text-slate-500 truncate mt-1 font-semibold">
                                {logBody}
                              </p>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Right Chat Workspace Panel */}
                <div className="lg:col-span-8 flex flex-col h-[600px] bg-[#efeae2] relative" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'80\' height=\'80\' viewBox=\'0 0 80 80\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M14 16v18h18v-6H20v-6h12v-6H14zm0-12v6h18v-6H14zm44 0v6h18v-6H58zm0 12v18h18v-6H64v-6h12v-6H58zM14 44v6h18v-6H14zm44 0v6h18v-6H58z\' fill=\'%23dfdcd6\' fill-opacity=\'0.2\' fill-rule=\'evenodd\'%3E%3C/path%3E%3C/svg%3E")' }}>
                  {activeChatLog ? (() => {
                    const delimiter = "\n\n---OPTIONS---\n";
                    const idx = activeChatLog.body.indexOf(delimiter);
                    const cleanBody = idx !== -1 ? activeChatLog.body.substring(0, idx) : activeChatLog.body;
                    const optionsStr = idx !== -1 ? activeChatLog.body.substring(idx + delimiter.length).trim() : "";
                    const options = optionsStr ? optionsStr.split(",").map(o => o.trim()).filter(Boolean) : null;

                    // Resolve replies & counts
                    const activeRootId = getThreadRootId(activeChatLog);
                    const chatReplies = [...logs, ...inboxLogs].filter(
                      (l) => getThreadRootId(l) === activeRootId && l.id !== activeRootId
                    );
                    const sortedReplies = chatReplies.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

                    const optionCounts: Record<string, number> = {};
                    if (options) {
                      options.forEach(o => { optionCounts[o] = 0; });
                      const responseReplies = [...logs, ...inboxLogs].filter(
                        (l) => l.parentId === activeChatLog.id && l.body && l.body.startsWith("[Response: ")
                      );
                      responseReplies.forEach(rep => {
                        const match = rep.body.match(/\[Response:\s*([^\]]+)\]/);
                        if (match && match[1]) {
                          const optionVal = match[1].trim();
                          if (optionCounts[optionVal] !== undefined) {
                            optionCounts[optionVal]++;
                          }
                        }
                      });
                    }

                    return (
                      <>
                        {/* Chat Header */}
                        <div className="bg-[#f0f2f5] px-6 py-3 border-b border-slate-200/50 flex items-center gap-3 shrink-0 shadow-sm z-10">
                          <div className="w-10 h-10 rounded-full bg-indigo-650 text-white flex items-center justify-center font-bold text-sm">
                            {activeChatLog.subject.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="text-xs font-black text-slate-800 truncate">{activeChatLog.subject}</h3>
                            <p className="text-[10px] text-slate-500 truncate mt-0.5 font-bold">
                              To: {activeChatLog.recipient}
                            </p>
                          </div>
                        </div>

                        {/* Chat Messages Scrolling Thread */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-4 flex flex-col z-10">
                          {/* Original notice bubble */}
                          <div className="flex gap-2 max-w-[80%] self-start animate-in fade-in duration-200">
                            <div className="bg-white text-[#111b21] rounded-2xl rounded-tl-none px-4 py-3 shadow border border-slate-200/40 relative">
                              <span className="text-[9px] text-[#00a884] font-black uppercase tracking-wider block mb-1">
                                {activeChatLog.sender}
                              </span>
                              <p className="text-xs leading-relaxed font-semibold">{cleanBody}</p>
                              
                              {/* Options tracker displayed inside original bubble if configured */}
                              {options && (
                                <div className="bg-slate-50 border border-slate-200/60 p-3 rounded-xl space-y-2.5 mt-3 shadow-inner">
                                  <span className="text-[9px] text-slate-500 uppercase tracking-widest font-black block">Interactive Selection Stats</span>
                                  <div className="grid grid-cols-2 gap-2">
                                    {options.map(opt => (
                                      <div key={opt} className="bg-white px-3 py-1.5 rounded-lg border border-slate-100 text-center">
                                        <span className="block text-[8px] text-slate-400 font-bold uppercase">{opt}</span>
                                        <span className="block text-sm font-black text-slate-700 mt-0.5">{optionCounts[opt] || 0}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              <div className="flex items-center justify-end gap-1 mt-2">
                                <span className="text-[8px] text-[#667781] block text-right font-medium">
                                  {new Date(activeChatLog.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                {userEmail && (activeChatLog.authorEmail === userEmail || activeChatLog.sender.includes(userEmail)) && (
                                  activeChatLog.status === "FAILED" ? (
                                    <span className="text-rose-500 text-[9px] font-bold select-none">⚠️ Failed</span>
                                  ) : activeChatLog.isRead || activeChatLog.readAt ? (
                                    <span className="text-[#53bdeb] text-[10px] font-black leading-none select-none" title={`Read at ${activeChatLog.readAt ? new Date(activeChatLog.readAt).toLocaleString() : ''}`}>✓✓</span>
                                  ) : (
                                    <span className="text-[#8696a0] text-[10px] font-black leading-none select-none" title="Sent (Unread)">✓✓</span>
                                  )
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Replies */}
                          {sortedReplies.map((rep) => {
                            const isSelf = userEmail && rep.sender.includes(userEmail);
                            return (
                              <div 
                                key={rep.id} 
                                className={`flex gap-2 max-w-[80%] ${isSelf ? "self-end animate-in fade-in animate-in slide-in-from-bottom-2" : "self-start animate-in fade-in animate-in slide-in-from-bottom-2"}`}
                              >
                                <div className={`rounded-2xl px-4 py-3 shadow border ${
                                  isSelf 
                                    ? "bg-[#d9fdd3] text-[#111b21] border-[#d9fdd3]/25 rounded-tr-none" 
                                    : "bg-white text-[#111b21] border-slate-200/40 rounded-tl-none"
                                }`}>
                                  <span className={`text-[9px] block mb-1 font-black uppercase tracking-wider ${isSelf ? "text-[#00a884]" : "text-indigo-600"}`}>
                                    {isSelf ? "You (Staff)" : rep.sender}
                                  </span>
                                  <p className="text-xs leading-relaxed font-semibold">{rep.body}</p>
                                  <div className="flex items-center justify-end gap-1 mt-2">
                                    <span className="text-[8px] text-[#667781] block text-right font-medium">
                                      {new Date(rep.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                    {isSelf && (
                                      rep.status === "FAILED" ? (
                                        <span className="text-rose-500 text-[9px] font-bold select-none">⚠️ Failed</span>
                                      ) : rep.isRead || rep.readAt ? (
                                        <span className="text-[#53bdeb] text-[10px] font-black leading-none select-none" title={`Read at ${rep.readAt ? new Date(rep.readAt).toLocaleString() : ''}`}>✓✓</span>
                                      ) : (
                                        <span className="text-[#8696a0] text-[10px] font-black leading-none select-none" title="Sent (Unread)">✓✓</span>
                                      )
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* WhatsApp Footer Input Bar */}
                        <div className="bg-[#f0f2f5] p-3.5 border-t border-slate-200/50 flex items-center gap-3 shrink-0 shadow-sm z-10">
                          <div className="flex gap-2.5 text-slate-500 shrink-0 text-lg">
                            <span className="hover:text-slate-700 cursor-pointer">☺</span>
                            <span className="hover:text-slate-700 cursor-pointer">📎</span>
                          </div>
                          <form 
                            onSubmit={(e) => {
                              e.preventDefault();
                              handleSendModalReply(activeChatLog);
                            }}
                            className="flex-1 flex gap-3"
                          >
                            <input
                              type="text"
                              required
                              value={modalReplyText}
                              onChange={(e) => setModalReplyText(e.target.value)}
                              placeholder="Type a message..."
                              className="flex-1 bg-white border-none px-4 py-2.5 rounded-xl text-xs font-semibold focus:outline-none focus:ring-0 text-[#111b21] shadow-sm"
                            />
                            <button
                              type="submit"
                              disabled={modalSendingReply}
                              className="w-10 h-10 bg-[#00a884] hover:bg-[#008f72] disabled:opacity-50 text-white rounded-full flex items-center justify-center shadow-md transition-all shrink-0 cursor-pointer border-none"
                            >
                              {modalSendingReply ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 text-white" />}
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
                        <h3 className="font-black text-slate-800 text-sm">Virtue School Outbox Hub</h3>
                        <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
                          Select a notice from the left menu to view options selections, response statistics, and send real-time replies.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })()
        ) : activeTab === "compose" && canComposeAndManage ? (
          /* COMPOSE EMAIL VIEW WITH LIVE PREVIEW SIDE-BY-SIDE (PAGE-SCROLLED) */
          <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-100">
            {/* Left Column: Editor Form */}
            <form onSubmit={handleSend} className="p-6 space-y-5">
              {/* Feedback Alerts */}
              {feedback && (
                <div className={`p-4 rounded-xl border flex gap-3 ${
                  feedback.success
                    ? "bg-emerald-50 border-emerald-100 text-emerald-800"
                    : "bg-rose-50 border-rose-100 text-rose-800"
                }`}>
                  {feedback.success ? <CheckCircle className="w-5 h-5 flex-shrink-0" /> : <XCircle className="w-5 h-5 flex-shrink-0" />}
                  <p className="text-sm font-semibold">{feedback.message}</p>
                </div>
              )}

              {/* Connection Channel Selector */}
              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-700">Communication Channel</label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setIsInternalOnly(true)}
                    className={`flex flex-col items-start p-4 rounded-xl border-2 text-left transition-all ${
                      isInternalOnly 
                        ? "border-indigo-600 bg-indigo-50/20 text-indigo-900" 
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <span className="font-bold text-sm flex items-center gap-1.5">
                      <Bell className="w-4 h-4 text-indigo-600" />
                      Internal Portal Notice (Free)
                    </span>
                    <span className="text-[10px] text-slate-500 mt-1">Delivers instantly to parent/staff dashboard lists</span>
                  </button>
                  
                   <button
                    type="button"
                    onClick={() => setIsInternalOnly(false)}
                    className={`flex flex-col items-start p-4 rounded-xl border-2 text-left transition-all ${
                      !isInternalOnly 
                        ? "border-indigo-600 bg-indigo-50/20 text-indigo-900" 
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <span className="font-bold text-sm flex items-center gap-1.5">
                      <Mail className="w-4 h-4 text-indigo-600" />
                      Both (Portal Notice & SMTP Email)
                    </span>
                    <span className="text-[10px] text-slate-500 mt-1">Sends external email alerts to inbox via Hostinger SMTP AND publishes a portal notice</span>
                  </button>
                </div>
              </div>

              {/* Target Audience Group Selector - Dynamic based on internal channel selection */}
              <div className="space-y-1.5">
                <label className="block text-sm font-bold text-slate-700">Target Audience Group</label>
                <select
                  value={targetGroup}
                  onChange={(e: any) => {
                    setTargetGroup(e.target.value);
                    setRecipient("");
                    setSelectedStudent(null);
                    setSelectedStaff(null);
                    setSearchTermStudent("");
                    setSearchTermStaff("");
                  }}
                  className="w-full rounded-xl border border-slate-200 py-2.5 px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600/20"
                >
                  <option value="MANUAL">Manual Type Email Address</option>
                  
                  <option value="STUDENT">Select / Search from Student Directory</option>
                  <option value="ALL_PARENTS">All Active Parents</option>
                  <option value="ALL">All (Both Parents & Staff)</option>

                  <option value="STAFF">Select / Search from Staff Directory</option>
                  
                  <optgroup label="Staff Role Groups">
                    <option value="ALL_STAFF">All Active Staff</option>
                    <option value="TEACHERS">All Teachers</option>
                    <option value="DRIVERS">All Drivers</option>
                    <option value="ADMINS">All Admin/Management Staff</option>
                  </optgroup>

                  {classesList.length > 0 && (
                    <optgroup label="Class-Wise Teachers (Class Teachers)">
                      {classesList.map(cls => (
                        <option key={cls.id} value={`CLASS_TEACHER_${cls.id}`}>
                          {cls.name} Teachers
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>

              {/* Smart Student Lookup Search Section */}
              {targetGroup === "STUDENT" && (
                <div className="space-y-3 bg-slate-50/50 p-4 rounded-xl border border-slate-100 animate-in fade-in slide-in-from-top-1">
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest">Search Recipient Student</label>
                  
                  {/* Search Bar */}
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Type Student Name, Admission No, Phone, or Aadhar..."
                      value={searchTermStudent}
                      onChange={(e) => setSearchTermStudent(e.target.value)}
                      className="pl-9 w-full rounded-xl border border-slate-200 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-600/20"
                    />
                  </div>

                  {/* Filter results list */}
                  {filteredStudents.length > 0 && (
                    <div className="bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto divide-y divide-slate-100">
                      {filteredStudents.map(s => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => handleSelectStudent(s)}
                          className="w-full text-left p-3 hover:bg-slate-50 transition-all flex justify-between items-center text-xs"
                        >
                          <div>
                            <span className="font-bold text-slate-800">{s.firstName} {s.lastName || ""}</span>
                            <span className="text-slate-400 block text-[10px] mt-0.5">Adm No: {s.admissionNumber || s.studentCode || "N/A"}</span>
                          </div>
                          <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded font-semibold text-slate-500">
                            Class {s.academic?.class?.name || "N/A"}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Selected Student Card with quick email select buttons */}
                  {selectedStudent && (
                    <div className="bg-white p-3 rounded-xl border border-indigo-100 shadow-sm space-y-2 text-xs">
                      <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                        <span className="font-bold text-indigo-900">{selectedStudent.firstName} {selectedStudent.lastName || ""}</span>
                        <button 
                          type="button" 
                          onClick={() => { setSelectedStudent(null); setRecipient(""); }} 
                          className="text-rose-500 font-bold hover:underline text-[10px]"
                        >
                          Clear
                        </button>
                      </div>

                      {/* Associated Email Options Selector */}
                      <div className="space-y-1.5">
                        <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider block">Select Target Email Address:</span>
                        
                        {/* Student Email */}
                        {selectedStudent.email && (
                          <button
                            type="button"
                            onClick={() => setRecipient(selectedStudent.email)}
                            className={`w-full text-left p-2 rounded border flex justify-between items-center transition ${
                              recipient === selectedStudent.email ? "border-indigo-600 bg-indigo-50/30 text-indigo-900" : "border-slate-100 hover:bg-slate-50 text-slate-700"
                            }`}
                          >
                            <span>Student's Email:</span>
                            <span className="font-mono font-semibold">{selectedStudent.email}</span>
                          </button>
                        )}

                        {/* Father's Email */}
                        {selectedStudent.family?.fatherEmail && (
                          <button
                            type="button"
                            onClick={() => setRecipient(selectedStudent.family.fatherEmail)}
                            className={`w-full text-left p-2 rounded border flex justify-between items-center transition ${
                              recipient === selectedStudent.family.fatherEmail ? "border-indigo-600 bg-indigo-50/30 text-indigo-900" : "border-slate-100 hover:bg-slate-50 text-slate-700"
                            }`}
                          >
                            <span>Father's Email:</span>
                            <span className="font-mono font-semibold">{selectedStudent.family.fatherEmail}</span>
                          </button>
                        )}

                        {/* Mother's Email */}
                        {selectedStudent.family?.motherEmail && (
                          <button
                            type="button"
                            onClick={() => setRecipient(selectedStudent.family.motherEmail)}
                            className={`w-full text-left p-2 rounded border flex justify-between items-center transition ${
                              recipient === selectedStudent.family.motherEmail ? "border-indigo-600 bg-indigo-50/30 text-indigo-900" : "border-slate-100 hover:bg-slate-50 text-slate-700"
                            }`}
                          >
                            <span>Mother's Email:</span>
                            <span className="font-mono font-semibold">{selectedStudent.family.motherEmail}</span>
                          </button>
                        )}

                        {/* Fallback if no email configured */}
                        {!selectedStudent.email && !selectedStudent.family?.fatherEmail && !selectedStudent.family?.motherEmail && (
                          <p className="text-[10px] text-rose-500 italic">No email addresses found for this student or family record.</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Smart Staff Lookup Search Section */}
              {targetGroup === "STAFF" && (
                <div className="space-y-3 bg-slate-50/50 p-4 rounded-xl border border-slate-100 animate-in fade-in slide-in-from-top-1">
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest">Search Recipient Staff Member</label>
                  
                  {/* Search Bar */}
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Type Staff Name, Employee ID, or Phone..."
                      value={searchTermStaff}
                      onChange={(e) => setSearchTermStaff(e.target.value)}
                      className="pl-9 w-full rounded-xl border border-slate-200 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-600/20"
                    />
                  </div>

                  {/* Filter results list */}
                  {filteredStaff.length > 0 && (
                    <div className="bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto divide-y divide-slate-100">
                      {filteredStaff.map(st => (
                        <button
                          key={st.id}
                          type="button"
                          onClick={() => handleSelectStaff(st)}
                          className="w-full text-left p-3 hover:bg-slate-50 transition-all flex justify-between items-center text-xs"
                        >
                          <div>
                            <span className="font-bold text-slate-800">{st.firstName} {st.lastName || ""}</span>
                            <span className="text-slate-400 block text-[10px] mt-0.5">Emp ID: {st.employeeId || "N/A"}</span>
                          </div>
                          <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded font-semibold text-slate-500">
                            {st.role || "STAFF"}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Selected Staff Card */}
                  {selectedStaff && (
                    <div className="bg-white p-3 rounded-xl border border-indigo-100 shadow-sm space-y-2 text-xs">
                      <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                        <span className="font-bold text-indigo-900">{selectedStaff.firstName} {selectedStaff.lastName || ""} ({selectedStaff.employeeId || "Staff"})</span>
                        <button 
                          type="button" 
                          onClick={() => { setSelectedStaff(null); setRecipient(""); }} 
                          className="text-rose-500 font-bold hover:underline text-[10px]"
                        >
                          Clear
                        </button>
                      </div>

                      {/* Email select button */}
                      <div className="space-y-1">
                        <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider block">Target User Notification ID:</span>
                        {selectedStaff.email ? (
                          <button
                            type="button"
                            onClick={() => setRecipient(selectedStaff.email)}
                            className={`w-full text-left p-2 rounded border flex justify-between items-center transition ${
                              recipient === selectedStaff.email ? "border-indigo-600 bg-indigo-50/30 text-indigo-900" : "border-slate-100 hover:bg-slate-50 text-slate-700"
                            }`}
                          >
                            <span>Target Account:</span>
                            <span className="font-mono font-semibold">{selectedStaff.email}</span>
                          </button>
                        ) : (
                          <p className="text-[10px] text-rose-500 italic">No account identifier configured in database for this staff member.</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Recipient Input (Shown if MANUAL or student/staff selected) */}
              {(targetGroup === "MANUAL" || targetGroup === "STUDENT" || targetGroup === "STAFF") && (
                <div className="space-y-1.5">
                  <label className="block text-sm font-bold text-slate-700">
                    {isInternalOnly ? "Recipient Target Account" : "Recipient Email Address"}
                  </label>
                  <input
                    type="text"
                    required
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    placeholder={
                      targetGroup === "MANUAL" 
                        ? "Enter email addresses (use commas to separate multiple)" 
                        : isInternalOnly 
                        ? "Target user email identifier..." 
                        : "e.g. parent@gmail.com"
                    }
                    className="w-full rounded-xl border border-slate-200 py-2.5 px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600"
                  />
                  {targetGroup === "MANUAL" && (
                    <span className="text-[10px] text-slate-400 block mt-1">
                      Tip: You can enter multiple emails separated by commas (e.g. <code>staff.21@virtueschool.in, office@virtueschool.in</code>)
                    </span>
                  )}
                </div>
              )}

              {/* Pre-defined Templates Selector */}
              <div className="space-y-1.5">
                <label className="block text-sm font-bold text-slate-700">Pre-defined Message Template</label>
                <select
                  onChange={(e) => {
                    const templateId = e.target.value;
                    if (templateId) {
                      const TEMPLATES = [
                        {
                          id: "sports-day",
                          name: "Annual Sports Day Registration",
                          subject: "Annual Sports Day Event Registration Open",
                          body: "Dear Parents,\n\nWe are excited to announce that the registrations for our Annual Sports Day are now open. Events include track athletics, team sports, and agility drills.\n\nKindly ensure your child registers their selected events with their class teacher before the deadline. We invite you to join us on campus for this celebration!\n\nBest Regards,\nPhysical Education Department"
                        },
                        {
                          id: "fee-overdue",
                          name: "Tuition Fee Overdue Reminder",
                          subject: "Important Reminder: Outstanding Tuition Dues Notice",
                          body: "Dear Parent,\n\nThis is a friendly reminder that an outstanding balance remains pending for your warded student's tuition fees.\n\nKindly settle the dues online using the Fees tab in the Parent Portal or visit the Accounts Office. Thank you for your support in maintaining school operations.\n\nBest Regards,\nFinance & Accounts Office"
                        },
                        {
                          id: "exam-schedule",
                          name: "Exam Timetable Release",
                          subject: "Academic Calendar: Term Examination Timetable Released",
                          body: "Dear Parents,\n\nThe timetable and syllabus guidelines for the upcoming Term Examinations have been officially published. You can access the complete subject schedules under the Academics tab in the Parent Portal.\n\nPlease guide your child to prepare systematically for the examinations.\n\nBest Regards,\nAcademic Coordinator"
                        },
                        {
                          id: "weather-holiday",
                          name: "Advisory: Weather/Holiday Notice",
                          subject: "School Advisory: Unscheduled Holiday Announcement",
                          body: "Dear Parents,\n\nPlease note that due to weather conditions and local authority directives, the school will remain closed tomorrow.\n\nOnline learning modules will continue as per the standard schedule. Bus operations and extra-curricular clubs are cancelled for the day.\n\nBest Regards,\nSchool Administration"
                        },
                        {
                          id: "route-shift",
                          name: "Transport Timing Update",
                          subject: "Important: Transportation Route Timing Shift",
                          body: "Dear Parents,\n\nPlease note that the morning pick-up time for Bus Route has been adjusted by 10 minutes to accommodate traffic shifts.\n\nPlease check the Live Transport Tracker in your Parent Portal to monitor real-time vehicle coordinates and driver details.\n\nBest Regards,\nTransport Management Department"
                        }
                      ];
                      const t = TEMPLATES.find((x) => x.id === templateId);
                      if (t) {
                        setSubject(t.subject);
                        setBody(t.body);
                      }
                    }
                  }}
                  className="w-full rounded-xl border border-slate-200 py-2.5 px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 cursor-pointer"
                >
                  <option value="">-- Select a Template (Optional) --</option>
                  <option value="sports-day">Annual Sports Day Registration</option>
                  <option value="fee-overdue">Tuition Fee Overdue Reminder</option>
                  <option value="exam-schedule">Exam Timetable Release</option>
                  <option value="weather-holiday">Advisory: Weather/Holiday Notice</option>
                  <option value="route-shift">Transport Timing Update</option>
                </select>
              </div>

              {/* Subject */}
              <div className="space-y-1.5">
                <label className="block text-sm font-bold text-slate-700">Subject Line</label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Official Update: Term fee details"
                  className="w-full rounded-xl border border-slate-200 py-2.5 px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600"
                />
              </div>

              {/* Body */}
              <div className="space-y-1.5">
                <label className="block text-sm font-bold text-slate-700">Message Body</label>
                <textarea
                  required
                  rows={8}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Dear Parent,&#10;&#10;Write your official notice text here..."
                  className="w-full rounded-xl border border-slate-200 py-2.5 px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 font-sans text-xs"
                />
              </div>

              {/* Interactive Options Toggle */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3 animate-in fade-in">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={addOptions}
                    onChange={(e) => setAddOptions(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                  />
                  <span className="text-xs font-bold text-slate-700">Add Interactive Decision Buttons (Acceptance / Voting)</span>
                </label>
                {addOptions && (
                  <div className="space-y-1.5 animate-in fade-in">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">Options (Comma-separated list)</label>
                    <input
                      type="text"
                      value={optionsList}
                      onChange={(e) => setOptionsList(e.target.value)}
                      placeholder="e.g. Accept, Decline (or Yes, No, Maybe)"
                      className="w-full rounded-lg border border-slate-200 py-2 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-600"
                    />
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={sending}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold py-2.5 px-6 rounded-xl text-sm flex items-center gap-2 shadow-md hover:shadow-lg transition-all w-full justify-center"
              >
                {sending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Dispatching...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Broadcast Notification
                  </>
                )}
              </button>
            </form>

            {/* Right Column: Interactive Live Email Preview */}
            <div className="p-6 bg-slate-50/70 flex flex-col items-center justify-start">
              <div className="w-full max-w-lg mb-3 flex items-center gap-2 text-slate-500 font-semibold text-xs border-b border-slate-200 pb-2">
                <Eye className="w-4 h-4 text-slate-400" />
                <span>Live Email Template Preview (Simulated)</span>
              </div>

              {/* CSS keyframe simulator inside preview */}
              <style dangerouslySetInnerHTML={{__html: `
                @keyframes preview-subtle-pulse {
                  0%, 90%, 100% { transform: scale(1); box-shadow: 0 4px 10px rgba(26, 115, 232, 0.3); }
                  95% { transform: scale(1.04); box-shadow: 0 6px 18px rgba(26, 115, 232, 0.5); }
                }
                .preview-premium-btn {
                  display: inline-block !important;
                  background-color: #1A73E8 !important;
                  color: #ffffff !important;
                  font-family: Arial, sans-serif !important;
                  font-size: 14px !important;
                  font-weight: bold !important;
                  text-decoration: none !important;
                  padding: 12px 24px !important;
                  border-radius: 10px !important;
                  box-shadow: 0 4px 10px rgba(26, 115, 232, 0.3) !important;
                  transition: all 0.2s ease-in-out !important;
                  animation: preview-subtle-pulse 9s infinite ease-in-out !important;
                  border: 1px solid #1A73E8;
                  cursor: pointer;
                }
                .preview-premium-btn:hover {
                  transform: translateY(-2px) !important;
                  box-shadow: 0 6px 18px rgba(26, 115, 232, 0.6) !important;
                  background-color: #1557b0 !important;
                }
              `}} />

              {/* Styled Email Container Box */}
              <div className="w-full bg-white border border-slate-200 rounded-2xl shadow-md overflow-hidden text-left flex flex-col font-serif select-none">
                {/* Header Banner */}
                <div className="bg-gradient-to-br from-[#14213d] to-[#000000] p-8 text-center relative text-white">
                  {/* Star Circle */}
                  <div className="w-12 h-12 rounded-full bg-white/10 border border-white/20 mx-auto mb-3 flex items-center justify-center">
                    <span className="text-[#ffd700] text-2xl font-bold">★</span>
                  </div>
                  {/* Title */}
                  <h4 className="text-xl font-bold tracking-tight font-serif">Virtue School</h4>
                  {/* Subtitle */}
                  <p className="text-[#f7a072] text-[9px] font-bold tracking-[0.15em] uppercase font-sans mt-1">Nurturing Excellence in Every Child</p>
                </div>

                {/* Pink Floral Divider */}
                <div className="bg-[#f7d6e0] py-2 text-center text-[11px] tracking-[10px] text-[#ef709b] font-sans">
                  🌸🌸🌸🌸🌸
                </div>

                {/* Body Content */}
                <div className="p-6 bg-white flex-1 font-sans text-sm text-slate-700 flex flex-col">
                  {/* Subject Line Simulator */}
                  {subject && (
                    <div className="mb-4 pb-3 border-b border-slate-100 font-serif text-slate-800">
                      <strong className="text-slate-400 text-xs block font-sans uppercase font-bold tracking-wider mb-0.5">Subject:</strong>
                      <span className="font-bold text-base">{subject}</span>
                    </div>
                  )}

                  {/* Body Text */}
                  <div className="font-serif min-h-[120px] text-[14px] leading-relaxed text-slate-800 whitespace-pre-line">
                    {body || <span className="text-slate-400 font-sans italic text-xs">Start typing in the "Message Body" editor to preview the content live...</span>}
                  </div>

                  {/* Google Review CTA Widget - Hidden for Internal Portal Notices */}
                  {!isInternalOnly && (
                    <div className="border-t border-dashed border-slate-100 mt-8 pt-6 text-center flex flex-col items-center animate-in fade-in duration-300">
                      <h5 className="text-[#14213d] font-bold font-serif text-[15px] mb-2">🌸 Your Feedback Means the World to Us! 🌸</h5>
                      <p className="text-[11px] text-slate-500 max-w-sm mb-4 leading-normal font-sans">
                        Thank you for trusting <strong>Virtue School</strong> with your child's education. If you've had a wonderful experience, please take just 30 seconds to support our community by sharing your review on Google!
                      </p>

                      {/* Premium Button */}
                      <div className="my-2">
                        <button type="button" className="preview-premium-btn">
                          <span className="bg-white text-[#1A73E8] rounded-full w-5 h-5 inline-block text-center leading-5 text-[11px] font-extrabold mr-2 shadow-sm">G</span>
                          <span className="align-middle text-xs">Leave a ★★★★★ Google Review</span>
                        </button>
                      </div>
                      <p className="text-[9px] text-slate-400 italic mt-2 font-sans">Click above to share your experience on Google.</p>
                    </div>
                  )}

                  {/* Footer Divider */}
                  <hr className="border-t dotted border-slate-200 my-6" />
                  <p className="text-[11px] text-slate-500 text-center font-sans italic">
                    Thank you for being a valued member of the <strong>Virtue School</strong> family. ❤️
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : activeTab === "reviews" && canComposeAndManage ? (
          /* REVIEWS TAB VIEW */
          <div className="p-6 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-1.5">
                  <MessageSquare className="w-5 h-5 text-indigo-600" />
                  Parent Suggestions & Review Panel
                </h3>
                <p className="text-slate-500 text-xs mt-0.5">Moderate incoming feedback ratings and comments submitted by parents.</p>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-2">
                <select
                  value={feedbackCategoryFilter}
                  onChange={(e) => setFeedbackCategoryFilter(e.target.value)}
                  className="rounded-lg border border-slate-200 py-1.5 px-3 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-600 cursor-pointer"
                >
                  <option value="">All Categories</option>
                  <option value="GENERAL">General</option>
                  <option value="ACADEMIC">Academic</option>
                  <option value="TEACHER">Teacher</option>
                  <option value="SCHOOL">School</option>
                  <option value="TRANSPORT">Transport</option>
                  <option value="FEE">Fee</option>
                  <option value="APP">App</option>
                </select>
                <button
                  type="button"
                  onClick={() => fetchFeedbacks(feedbackCategoryFilter)}
                  className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-1.5 rounded-lg transition"
                >
                  Refresh
                </button>
              </div>
            </div>

            {/* Content List */}
            {feedbackLoading ? (
              <div className="h-64 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                <p className="text-xs text-slate-500 font-medium">Fetching parent reviews...</p>
              </div>
            ) : feedbacks.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center gap-2 text-slate-400">
                <MessageSquare className="w-10 h-10 stroke-[1.5]" />
                <p className="text-sm font-medium">No parent reviews found in this category.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 animate-in fade-in">
                {feedbacks.map((f) => (
                  <div key={f.id} className="p-5 border border-slate-100 rounded-2xl hover:border-slate-200 hover:shadow-sm transition-all space-y-4">
                    {/* Header info */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          f.category === "ACADEMIC" ? "bg-indigo-50 text-indigo-700 border border-indigo-100" :
                          f.category === "TEACHER" ? "bg-violet-50 text-violet-700 border border-violet-100" :
                          f.category === "SCHOOL" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" :
                          f.category === "TRANSPORT" ? "bg-amber-50 text-amber-700 border border-amber-100" :
                          f.category === "FEE" ? "bg-rose-50 text-rose-700 border border-rose-100" :
                          "bg-slate-50 text-slate-700 border border-slate-100"
                        }`}>
                          {f.category}
                        </span>

                        {/* Stars */}
                        <div className="flex items-center gap-0.5">
                          {[1,2,3,4,5].map((s) => (
                            <Star key={s} className={`w-3.5 h-3.5 ${s <= (f.rating || 0) ? "fill-amber-500 text-amber-500" : "text-slate-200"}`} />
                          ))}
                        </div>

                        {/* Date */}
                        <span className="text-[10px] text-slate-400 font-semibold ml-1">
                          {new Date(f.createdAt).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })}
                        </span>
                      </div>

                      {/* Moderation Status */}
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black tracking-wide uppercase ${
                        f.moderationStatus === "APPROVED" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" :
                        f.moderationStatus === "REJECTED" ? "bg-rose-50 text-rose-700 border border-rose-100" :
                        "bg-amber-50 text-amber-700 border border-amber-100 animate-pulse"
                      }`}>
                        {f.moderationStatus}
                      </span>
                    </div>

                    {/* Comment content */}
                    <div className="bg-slate-50/50 p-4 rounded-xl text-slate-700 text-xs font-semibold leading-relaxed border border-slate-100/50 whitespace-pre-wrap">
                      {f.comment}
                    </div>

                    {/* Metadata details (Guardian & Student) */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pt-1 border-t border-slate-100/50 text-[11px] font-bold text-slate-500">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span>Submitted By:</span>
                        {f.isAnonymous ? (
                          <span className="text-slate-400 italic">Anonymous Parent</span>
                        ) : (
                          <span className="text-slate-700">
                            {f.guardian?.firstName} {f.guardian?.lastName || ""} ({f.guardian?.email || "No Email"})
                          </span>
                        )}
                        {f.student && !f.isAnonymous && (
                          <>
                            <span className="text-slate-300">|</span>
                            <span>Student:</span>
                            <span className="text-indigo-600">
                              {f.student.firstName} {f.student.lastName || ""} (Class {f.student.className})
                            </span>
                          </>
                        )}
                      </div>

                      {/* Moderation buttons */}
                      {f.moderationStatus === "PENDING" && (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={moderatingId === f.id}
                            onClick={() => handleModerateFeedback(f.id, "APPROVED")}
                            className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold px-3 py-1 rounded-lg text-[10px] shadow-sm transition cursor-pointer"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            disabled={moderatingId === f.id}
                            onClick={() => handleModerateFeedback(f.id, "REJECTED")}
                            className="bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold px-3 py-1 rounded-lg text-[10px] shadow-sm transition cursor-pointer"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="p-8 text-center text-slate-500 font-medium text-sm">
            Access restricted. Please use the Inbox tab.
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedLog && (() => {
        const delimiter = "\n\n---OPTIONS---\n";
        const idx = selectedLog.body.indexOf(delimiter);
        const cleanBody = idx !== -1 ? selectedLog.body.substring(0, idx) : selectedLog.body;
        const optionsStr = idx !== -1 ? selectedLog.body.substring(idx + delimiter.length).trim() : "";

        // Parse voting counts
        const options = optionsStr ? optionsStr.split(",").map(o => o.trim()).filter(Boolean) : null;
        const optionCounts: Record<string, number> = {};
        if (options) {
          options.forEach(o => { optionCounts[o] = 0; });
          const responseReplies = [...logs, ...inboxLogs].filter(
            (l) => l.parentId === selectedLog.id && l.body && l.body.startsWith("[Response: ")
          );
          responseReplies.forEach(rep => {
            const match = rep.body.match(/\[Response:\s*([^\]]+)\]/);
            if (match && match[1]) {
              const optionVal = match[1].trim();
              if (optionCounts[optionVal] !== undefined) {
                optionCounts[optionVal]++;
              }
            }
          });
        }

        // Get custom chat replies (exclude raw automatic responses to avoid duplicate clutter)
        const modalReplies = [...logs, ...inboxLogs].filter(
          (l) => l.parentId === selectedLog.id && l.body && !l.body.startsWith("[Response: ")
        ).reverse();

        return (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
              {/* Modal Header */}
              <div className="bg-slate-50 px-6 py-5 border-b border-slate-100 flex justify-between items-center">
                <div>
                  <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase bg-indigo-50 border border-indigo-100 text-indigo-700 tracking-wider">
                    {selectedLog.type}
                  </span>
                  <p className="text-[10px] text-slate-400 font-bold mt-1">Notice ID: {selectedLog.id}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedLog(null);
                    setModalReplyText("");
                  }}
                  className="w-8 h-8 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center font-bold text-lg cursor-pointer"
                >
                  &times;
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-6 flex-1 overflow-y-auto max-h-[500px]">
                {selectedLog.parentId && (
                  <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 text-xs text-indigo-700 flex items-center gap-2 font-bold animate-in slide-in-from-top-2">
                    <Info className="w-4 h-4 flex-shrink-0" />
                    <span>This notice is a reply. (Original notice ID: {selectedLog.parentId})</span>
                  </div>
                )}

                {/* Metadata cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-2xl text-xs font-semibold">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-black">Sender</span>
                    <span className="text-slate-800 font-extrabold flex items-center gap-1 mt-0.5">
                      <User className="w-3.5 h-3.5 text-indigo-600" />
                      {selectedLog.sender}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-black">Recipient Target</span>
                    <span className="text-slate-800 font-extrabold mt-0.5 block">{selectedLog.recipient}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-black">Delivery Time</span>
                    <span className="text-slate-800 font-extrabold mt-0.5 block">{new Date(selectedLog.createdAt).toLocaleString()}</span>
                  </div>
                </div>

                {/* Subject */}
                <div className="space-y-1">
                  <span className="text-[10px] uppercase tracking-widest text-slate-400 block font-black">Subject Line</span>
                  <h3 className="font-black text-slate-800 text-base leading-snug">{selectedLog.subject}</h3>
                </div>

                {/* Main Content */}
                <div className="space-y-1.5 border-t border-slate-100 pt-4">
                  <span className="text-[10px] uppercase tracking-widest text-slate-400 block font-black mb-1">Message Body</span>
                  <pre className="bg-slate-50 rounded-2xl p-4 font-mono text-xs text-slate-600 whitespace-pre-wrap leading-relaxed border border-slate-100">
                    {cleanBody}
                  </pre>
                </div>

                {/* Voting Counts Panel */}
                {options && (
                  <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-5 space-y-3.5">
                    <span className="text-[10px] text-slate-500 uppercase tracking-widest font-black block">Interactive Options Feedback Tracker</span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {options.map((opt) => (
                        <div key={opt} className="bg-white border border-slate-200/60 p-3 rounded-xl shadow-sm text-center">
                          <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">{opt}</span>
                          <span className="block text-xl font-black text-slate-800 mt-1">{optionCounts[opt] || 0}</span>
                          <span className="text-[9px] text-emerald-600 font-extrabold block mt-0.5">Response count</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Conversations Chat log thread */}
                <div className="border-t border-slate-100 pt-6 mt-6 space-y-4">
                  <h4 className="text-xs uppercase tracking-widest font-black text-slate-400">Message Interaction Thread</h4>
                  
                  <div className="space-y-3.5 max-h-52 overflow-y-auto px-1 flex flex-col gap-2">
                    {/* Original notice bubble */}
                    <div className="flex gap-2.5 max-w-[85%] self-start font-semibold text-xs animate-in slide-in-from-left-3">
                      <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center font-black shrink-0 text-[10px]">
                        A
                      </div>
                      <div className="bg-slate-50 text-slate-800 rounded-2xl rounded-tl-none px-4 py-3 border border-slate-200/50 shadow-sm">
                        <span className="text-[9px] text-slate-400 block mb-1 font-black uppercase tracking-wider">{selectedLog.sender}</span>
                        <p className="leading-relaxed font-semibold">{cleanBody}</p>
                        <span className="text-[8px] text-slate-400/80 block mt-2 text-right">{new Date(selectedLog.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>

                    {/* Replies */}
                    {modalReplies.map((rep) => {
                      const isSelf = userEmail && rep.sender.includes(userEmail);
                      return (
                        <div 
                          key={rep.id} 
                          className={`flex gap-2.5 max-w-[85%] ${isSelf ? "self-end flex-row-reverse animate-in slide-in-from-right-3" : "self-start animate-in slide-in-from-left-3"}`}
                        >
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center font-black shrink-0 text-[10px] ${
                            isSelf 
                              ? "bg-indigo-600 text-white shadow-sm" 
                              : "bg-slate-100 border border-slate-200 text-slate-700"
                          }`}>
                            {isSelf ? "A" : "P"}
                          </div>
                          <div className={`rounded-2xl px-4 py-3 shadow-sm border ${
                            isSelf 
                              ? "bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white border-indigo-500/20 rounded-tr-none" 
                              : "bg-slate-50 text-slate-800 border-slate-200/50 rounded-tl-none"
                          }`}>
                            <span className={`text-[9px] block mb-1 font-black uppercase tracking-wider ${isSelf ? "text-indigo-200" : "text-slate-400"}`}>
                              {isSelf ? "You (Staff)" : rep.sender}
                            </span>
                            <p className="leading-relaxed font-semibold">{rep.body}</p>
                            <span className={`text-[8px] block mt-2 text-right ${isSelf ? "text-indigo-200/60" : "text-slate-400/60"}`}>
                              {new Date(rep.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Inline Reply Form */}
                  <div className="pt-2">
                    <form 
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleSendModalReply(selectedLog);
                      }} 
                      className="flex gap-2 animate-in slide-in-from-bottom-2 duration-150"
                    >
                      <input
                        type="text"
                        required
                        value={modalReplyText}
                        onChange={(e) => setModalReplyText(e.target.value)}
                        placeholder="Type a follow-up response to the parent here..."
                        className="flex-1 bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-500 text-slate-800"
                      />
                      <button
                        type="submit"
                        disabled={modalSendingReply}
                        className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-black flex items-center gap-1.5 transition cursor-pointer shadow-md"
                      >
                        {modalSendingReply ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                        Send
                      </button>
                    </form>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedLog(null);
                    setModalReplyText("");
                  }}
                  className="bg-slate-200 hover:bg-slate-300 text-slate-800 px-5 py-2.5 rounded-xl text-xs font-black transition cursor-pointer"
                >
                  Close Detail
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Start New Chat with Staff Modal */}
      {showNewChatModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-lg overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-slate-50 px-6 py-5 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="font-black text-slate-800 text-sm">Start Chat with Staff</h3>
                <p className="text-[10px] text-slate-400 font-bold mt-1">Select a colleague to start an internal message thread</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowNewChatModal(false);
                  setSelectedStaffForChat(null);
                  setSearchStaffQuery("");
                }}
                className="w-8 h-8 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center font-bold text-lg cursor-pointer"
              >
                &times;
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 flex-1 overflow-y-auto max-h-[400px]">
              {!selectedStaffForChat ? (() => {
                const filteredNewChatStaff = allStaff.filter(st => {
                  const name = `${st.firstName || ""} ${st.lastName || ""}`.toLowerCase();
                  const email = (st.email || "").toLowerCase();
                  const term = searchStaffQuery.toLowerCase();
                  return name.includes(term) || email.includes(term);
                });

                return (
                  <div className="space-y-3">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">Search Staff Colleague</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        value={searchStaffQuery}
                        onChange={(e) => setSearchStaffQuery(e.target.value)}
                        placeholder="Type colleague's name or email..."
                        className="pl-9 w-full rounded-xl border border-slate-200 py-2 text-xs font-semibold focus:outline-none focus:border-indigo-500 text-slate-800"
                      />
                    </div>

                    <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto border border-slate-200/60 rounded-2xl">
                      {filteredNewChatStaff.length === 0 ? (
                        <p className="p-4 text-center text-xs text-slate-400 font-bold">No matching staff found.</p>
                      ) : (
                        filteredNewChatStaff.map(st => (
                          <button
                            key={st.id}
                            type="button"
                            onClick={() => setSelectedStaffForChat(st)}
                            className="w-full text-left p-3 hover:bg-slate-50 transition-all flex items-center justify-between text-xs font-bold text-slate-700 cursor-pointer"
                          >
                            <div>
                              <span className="block font-black text-slate-800">{st.firstName} {st.lastName || ""}</span>
                              <span className="block text-[9px] text-slate-400 mt-0.5">{st.email || "No Email Address"}</span>
                            </div>
                            <span className="text-[9px] bg-slate-100 px-2 py-0.5 rounded font-black text-slate-500 uppercase tracking-wider">
                              {st.role || "Staff"}
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                );
              })() : (
                <form onSubmit={handleStartNewStaffChat} className="space-y-4">
                  {/* Selected Staff Card */}
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/60 flex items-center justify-between">
                    <div>
                      <span className="block text-[8px] text-slate-400 font-black uppercase tracking-widest">Recipient Colleague</span>
                      <span className="block text-xs font-black text-slate-800 mt-0.5">{selectedStaffForChat.firstName} {selectedStaffForChat.lastName || ""}</span>
                      <span className="block text-[9px] text-slate-500 font-medium">{selectedStaffForChat.email}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedStaffForChat(null)}
                      className="text-xs text-rose-500 font-bold hover:underline cursor-pointer"
                    >
                      Change Colleague
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">Subject Line</label>
                    <input
                      type="text"
                      required
                      value={newChatSubject}
                      onChange={(e) => setNewChatSubject(e.target.value)}
                      placeholder="e.g. Project Alignment / School Event"
                      className="w-full rounded-xl border border-slate-200 py-2.5 px-3.5 text-xs font-bold focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">Initial Message</label>
                    <textarea
                      required
                      rows={4}
                      value={newChatMessage}
                      onChange={(e) => setNewChatMessage(e.target.value)}
                      placeholder="Type your initial chat message here..."
                      className="w-full rounded-xl border border-slate-205 py-2.5 px-3.5 text-xs font-semibold focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="flex justify-end gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowNewChatModal(false);
                        setSelectedStaffForChat(null);
                        setSearchStaffQuery("");
                      }}
                      className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black cursor-pointer transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={startingChat}
                      className="px-5 py-2.5 bg-[#00a884] hover:bg-[#008f72] disabled:opacity-50 text-white rounded-xl text-xs font-black cursor-pointer flex items-center gap-1.5 shadow-md transition-all border-none"
                    >
                      {startingChat ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                      Start Chat
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
