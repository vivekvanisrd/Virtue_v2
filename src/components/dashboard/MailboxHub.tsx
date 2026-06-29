import React, { useState, useEffect } from "react";
import { Mail, Send, History, Search, Filter, CheckCircle, XCircle, Info, Loader2, Users, Bell, DollarSign, Eye, Inbox } from "lucide-react";
import { getCommunicationLogsAction, sendCustomEmailAction, sendBulkRemindersAction, getInboxLogsAction, markNoticeAsReadAction } from "@/lib/actions/communication-actions";
import { getStudentListAction } from "@/lib/actions/student-actions";
import { getStaffDirectoryAction } from "@/lib/actions/staff-actions";
import { useTenant } from "@/context/tenant-context";

interface MailboxHubProps {
  params?: {
    recipient?: string;
    targetGroup?: "MANUAL" | "ALL_PARENTS" | "ALL_STAFF" | "ALL" | "STUDENT" | "STAFF";
    activeTab?: "logs" | "compose" | "inbox";
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

  const [activeTab, setActiveTab] = useState<"logs" | "compose" | "inbox">("inbox");
  const [logs, setLogs] = useState<any[]>([]);
  const [inboxLogs, setInboxLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Log Filters
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [searchRecipient, setSearchRecipient] = useState("");

  // Compose Form
  const [targetGroup, setTargetGroup] = useState<"MANUAL" | "ALL_PARENTS" | "ALL_STAFF" | "ALL" | "STUDENT" | "STAFF">("MANUAL");
  const [isInternalOnly, setIsInternalOnly] = useState(true); // Default to Internal Portal Notice (Free)
  const [recipient, setRecipient] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [parentId, setParentId] = useState<string | null>(null);
  
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
    if (activeTab === "logs" && canComposeAndManage) {
      fetchLogs();
    } else if (activeTab === "inbox") {
      fetchInbox();
    }
  }, [activeTab, filterType, filterStatus, canComposeAndManage]);

  // Load directory details only if user has management capabilities
  useEffect(() => {
    if (canComposeAndManage) {
      loadStudents();
      loadStaff();
    }
  }, [canComposeAndManage]);

  // When communication channel changes, adapt the target groups
  useEffect(() => {
    if (isInternalOnly) {
      if (targetGroup === "STUDENT" || targetGroup === "ALL_PARENTS" || targetGroup === "ALL") {
        setTargetGroup("MANUAL");
        setRecipient("");
        setSelectedStudent(null);
      }
    }
  }, [isInternalOnly]);

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

  async function fetchLogs() {
    setLoading(true);
    try {
      const res = await getCommunicationLogsAction({
        type: filterType || undefined,
        status: filterStatus || undefined,
        recipient: searchRecipient.trim() || undefined
      });
      if (res.success && res.data) {
        setLogs(res.data);
      }
    } catch (e) {
      console.error("Failed to load logs:", e);
    }
    setLoading(false);
  }

  async function fetchInbox() {
    setLoading(true);
    try {
      const res = await getInboxLogsAction();
      if (res.success && res.data) {
        setInboxLogs(res.data);
      }
    } catch (e) {
      console.error("Failed to load inbox:", e);
    }
    setLoading(false);
  }

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

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!canComposeAndManage) return;

    setSending(true);
    setFeedback(null);

    const finalGroup = (targetGroup === "STUDENT" || targetGroup === "STAFF") ? "MANUAL" : targetGroup;

    try {
      const res = await sendCustomEmailAction({
        targetGroup: finalGroup,
        recipient,
        subject,
        body,
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

      {/* Tabs Menu - Dynamic tabs based on user capabilities */}
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
          </>
        )}
      </div>

      {/* Main Panel Content */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm">
        {activeTab === "inbox" ? (
          /* INBOX VIEW */
          <div className="p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <span className="text-xs font-black uppercase text-slate-400 tracking-wider">Internal notices sent to you</span>
              <button 
                onClick={fetchInbox}
                className="text-xs font-semibold text-indigo-600 hover:underline"
              >
                Refresh Inbox
              </button>
            </div>

            <div className="border border-slate-100 rounded-lg overflow-x-auto">
              {loading ? (
                <div className="h-64 flex flex-col items-center justify-center gap-3">
                  <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                  <p className="text-xs text-slate-500 font-medium">Checking received notices...</p>
                </div>
              ) : inboxLogs.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center gap-2 text-slate-400">
                  <Inbox className="w-10 h-10 stroke-[1.5]" />
                  <p className="text-sm font-medium">Your Inbox is completely clear!</p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">From</th>
                      <th className="py-3 px-4">Subject</th>
                      <th className="py-3 px-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {inboxLogs.map((log) => (
                      <tr key={log.id} className={`hover:bg-slate-50/50 transition ${!log.isRead ? "bg-indigo-50/15" : ""}`}>
                        <td className="py-3 px-4 text-slate-500 whitespace-nowrap flex items-center gap-2">
                          {!log.isRead && (
                            <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse flex-shrink-0" title="Unread notice" />
                          )}
                          {new Date(log.createdAt).toLocaleString(undefined, {
                            dateStyle: "short",
                            timeStyle: "short"
                          })}
                        </td>
                        <td className={`py-3 px-4 text-indigo-900 ${!log.isRead ? "font-extrabold" : "font-medium"}`}>{log.sender}</td>
                        <td className={`py-3 px-4 text-slate-700 truncate max-w-[200px] ${!log.isRead ? "font-bold" : "font-medium"}`} title={log.subject}>
                          {log.subject}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => handleOpenNotice(log)}
                            className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 mx-auto"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Open Notice
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        ) : activeTab === "logs" && canComposeAndManage ? (
          /* OUTBOX LOGS VIEW */
          <div className="p-6 space-y-4">
            {/* Filter Controls */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by recipient address..."
                  value={searchRecipient}
                  onChange={(e) => setSearchRecipient(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && fetchLogs()}
                  className="pl-9 w-full rounded-lg border border-slate-200 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-600 focus:border-indigo-600"
                />
              </div>

              <div className="flex gap-3">
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="rounded-lg border border-slate-200 py-2 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-600"
                >
                  <option value="">All Categories</option>
                  <option value="RECEIPT">Receipts</option>
                  <option value="REMINDER">Reminders</option>
                  <option value="ADMISSION">Admissions</option>
                  <option value="PROMOTION">Promotions</option>
                  <option value="DEPARTURE">Exits</option>
                  <option value="CUSTOM">Custom Mail</option>
                </select>

                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="rounded-lg border border-slate-200 py-2 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-600"
                >
                  <option value="">All Statuses</option>
                  <option value="SUCCESS">Success</option>
                  <option value="FAILED">Failed</option>
                </select>

                <button
                  onClick={fetchLogs}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 px-4 rounded-lg text-sm font-semibold flex items-center gap-1.5 transition"
                >
                  <Filter className="w-4 h-4" />
                  Apply
                </button>
              </div>
            </div>

            {/* Logs Table */}
            <div className="border border-slate-100 rounded-lg overflow-x-auto">
              {loading ? (
                <div className="h-64 flex flex-col items-center justify-center gap-3">
                  <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                  <p className="text-xs text-slate-500 font-medium">Fetching outbox history...</p>
                </div>
              ) : logs.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center gap-2 text-slate-400">
                  <Mail className="w-10 h-10 stroke-[1.5]" />
                  <p className="text-sm font-medium">No sent messages found matching filters.</p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Recipient</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Subject</th>
                      <th className="py-3 px-4 text-center">Connection</th>
                      <th className="py-3 px-4 text-center">Delivery</th>
                      <th className="py-3 px-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {logs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/50 transition">
                        <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleString(undefined, {
                            dateStyle: "short",
                            timeStyle: "short"
                          })}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-700">{log.recipient}</td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            log.type === "RECEIPT" ? "bg-emerald-50 text-emerald-700" :
                            log.type === "REMINDER" ? "bg-amber-50 text-amber-700" :
                            log.type === "ADMISSION" ? "bg-indigo-50 text-indigo-700" :
                            log.type === "PROMOTION" ? "bg-sky-50 text-sky-700" :
                            log.type === "DEPARTURE" ? "bg-rose-50 text-rose-700" :
                            "bg-slate-100 text-slate-700"
                          }`}>
                            {log.type}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600 truncate max-w-[150px]" title={log.subject}>
                          {log.subject}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${
                            log.sender.includes("internal@virtueschool.in") || log.sender.includes("mock") || !log.sender.includes("@")
                              ? "bg-slate-100 text-slate-600"
                              : "bg-indigo-50 text-indigo-600"
                          }`}>
                            {!log.sender.includes("@") || log.sender.includes("internal@virtueschool.in") ? "INTERNAL PORTAL" : "SMTP EMAIL"}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {log.status === "SUCCESS" ? (
                            <div className="flex flex-col items-center gap-0.5">
                              <span className="inline-flex items-center gap-1 text-emerald-600 font-bold text-xs">
                                <CheckCircle className="w-4 h-4 fill-emerald-50" />
                                Delivered
                              </span>
                              {(!log.sender.includes("@") || log.sender.includes("internal@virtueschool.in")) && (
                                <span className={`text-[10px] font-bold ${log.isRead ? "text-indigo-600" : "text-slate-400"}`}>
                                  {log.isRead ? (
                                    <span title={`Read on ${new Date(log.readAt).toLocaleString()}`}>✓✓ Read</span>
                                  ) : (
                                    "✓ Sent"
                                  )}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span
                              className="inline-flex items-center gap-1 text-rose-600 font-bold text-xs cursor-help"
                              title={log.errorMessage || "Unknown error occurred"}
                            >
                              <XCircle className="w-4 h-4 fill-rose-50" />
                              Failed
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => setSelectedLog(log)}
                            className="text-indigo-600 hover:text-indigo-800 font-semibold text-xs flex items-center gap-1.5 mx-auto"
                          >
                            <Info className="w-3.5 h-3.5" />
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
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
                      Official Email (External Communication)
                    </span>
                    <span className="text-[10px] text-slate-500 mt-1">Sends external email alerts to inbox via Hostinger SMTP</span>
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
                  
                  {/* Hide parent/student groups for purely internal dashboard notices */}
                  {!isInternalOnly && (
                    <>
                      <option value="STUDENT">Select / Search from Student Directory</option>
                      <option value="ALL_PARENTS">All Active Parents</option>
                      <option value="ALL">All (Both Parents & Staff)</option>
                    </>
                  )}

                  <option value="STAFF">Select / Search from Staff Directory</option>
                  <option value="ALL_STAFF">All Active Staff</option>
                </select>
              </div>

              {/* Smart Student Lookup Search Section (Only if External Communication) */}
              {!isInternalOnly && targetGroup === "STUDENT" && (
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
                    placeholder={isInternalOnly ? "Target user email identifier..." : "e.g. parent@gmail.com"}
                    className="w-full rounded-xl border border-slate-200 py-2.5 px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600"
                  />
                </div>
              )}

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
        ) : (
          <div className="p-8 text-center text-slate-500 font-medium text-sm">
            Access restricted. Please use the Inbox tab.
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-100 w-full max-w-xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-slate-800">Internal Notice Detail</h3>
                <p className="text-[11px] text-slate-500 font-medium">Log ID: {selectedLog.id}</p>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold p-1"
              >
                &times;
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 flex-1 overflow-y-auto max-h-[450px]">
              {selectedLog.parentId && (
                <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-2.5 text-xs text-indigo-700 flex items-center gap-2">
                  <Info className="w-4 h-4 flex-shrink-0" />
                  <span>This notice is a reply. (Original notice ID: {selectedLog.parentId})</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 text-xs font-semibold">
                <div>
                  <span className="text-slate-400 block font-normal">Sender</span>
                  <span className="text-slate-700">{selectedLog.sender}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-normal">Recipient</span>
                  <span className="text-slate-700">{selectedLog.recipient}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-normal">Timestamp</span>
                  <span className="text-slate-700">{new Date(selectedLog.createdAt).toLocaleString()}</span>
                </div>
              </div>

              <hr className="border-slate-100" />

              <div className="space-y-2">
                <span className="text-xs text-slate-400 block">Notice Subject</span>
                <p className="font-bold text-slate-800 text-sm">{selectedLog.subject}</p>
              </div>

              <div className="space-y-2">
                <span className="text-xs text-slate-400 block">Notice Content</span>
                <pre className="bg-slate-50 rounded-lg p-4 font-mono text-xs text-slate-600 whitespace-pre-wrap leading-relaxed border border-slate-100">
                  {selectedLog.body}
                </pre>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center">
              {userEmail && selectedLog.recipient === userEmail ? (
                <button
                  onClick={() => handleReply(selectedLog)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-1.5 shadow-sm"
                >
                  <Send className="w-3.5 h-3.5" />
                  Reply to Notice
                </button>
              ) : (
                <div />
              )}
              <button
                onClick={() => setSelectedLog(null)}
                className="bg-slate-200 hover:bg-slate-300 text-slate-800 px-4 py-2 rounded-lg text-sm font-semibold transition"
              >
                Close Log
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
