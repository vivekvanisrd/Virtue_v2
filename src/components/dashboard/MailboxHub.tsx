import React, { useState, useEffect } from "react";
import { Mail, Send, History, Search, Filter, CheckCircle, XCircle, Info, Loader2, Users, Bell, DollarSign } from "lucide-react";
import { getCommunicationLogsAction, sendCustomEmailAction, sendBulkRemindersAction } from "@/lib/actions/communication-actions";
import { getStudentListAction } from "@/lib/actions/student-actions";

export function MailboxHub() {
  const [activeTab, setActiveTab] = useState<"logs" | "compose">("logs");
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Log Filters
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [searchRecipient, setSearchRecipient] = useState("");

  // Compose Form
  const [targetGroup, setTargetGroup] = useState<"MANUAL" | "ALL_PARENTS" | "ALL_STAFF" | "ALL" | "STUDENT">("MANUAL");
  const [isInternalOnly, setIsInternalOnly] = useState(true); // Default to Internal Portal Notice (Free)
  const [recipient, setRecipient] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  
  // Student selection fields
  const [studentsList, setStudentsList] = useState<any[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [loadingStudents, setLoadingStudents] = useState(false);

  // States
  const [sending, setSending] = useState(false);
  const [runningReminders, setRunningReminders] = useState(false);
  const [feedback, setFeedback] = useState<{ success: boolean; message: string } | null>(null);
  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  useEffect(() => {
    if (activeTab === "logs") {
      fetchLogs();
    }
  }, [activeTab, filterType, filterStatus]);

  useEffect(() => {
    if (targetGroup === "STUDENT") {
      loadStudents();
    }
  }, [targetGroup]);

  async function loadStudents() {
    setLoadingStudents(true);
    try {
      const res = await getStudentListAction();
      if (res.success && res.data) {
        setStudentsList(res.data);
      }
    } catch (e) {
      console.error("Failed to load students:", e);
    }
    setLoadingStudents(false);
  }

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

  // Set recipient based on selected student's family details
  function handleStudentChange(studentId: string) {
    setSelectedStudentId(studentId);
    const student = studentsList.find(s => s.id === studentId);
    if (student) {
      const email = student.email || student.family?.fatherEmail || student.family?.motherEmail || "";
      setRecipient(email);
      if (!email) {
        setFeedback({ success: false, message: `Warning: Selected student ${student.firstName} has no email configured.` });
      } else {
        setFeedback(null);
      }
    }
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setFeedback(null);

    // If student selected, use MANUAL dispatch to their resolved email
    const finalGroup = targetGroup === "STUDENT" ? "MANUAL" : targetGroup;

    try {
      const res = await sendCustomEmailAction({
        targetGroup: finalGroup,
        recipient,
        subject,
        body,
        isInternalOnly
      });

      if (res.success) {
        const text = isInternalOnly 
          ? `Portal Notice successfully logged in database for ${res.sentCount || 1} recipients!`
          : `Emails successfully dispatched via Hostinger SMTP for ${res.sentCount || 1} recipients!`;
        setFeedback({ success: true, message: text });
        setSubject("");
        setBody("");
        setRecipient("");
        setSelectedStudentId("");
      } else {
        setFeedback({ success: false, message: res.error || "Failed to dispatch communication." });
      }
    } catch (err: any) {
      setFeedback({ success: false, message: err.message || "An unexpected error occurred." });
    }
    setSending(false);
  }

  async function triggerAutoReminders() {
    const confirm = window.confirm(
      `Are you sure you want to run the auto-reminders for all active students with outstanding dues?\n\nMode: ${
        isInternalOnly ? "Internal Portal Notices (Free)" : "External Hostinger SMTP Emails (Active)"
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
    <div className="space-y-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Mail className="w-6 h-6 text-indigo-600" />
            School Mailbox Hub
          </h2>
          <p className="text-slate-500 font-medium text-xs mt-1">Manage school notices and send emails via Hostinger SMTP</p>
        </div>

        {/* Bulk Actions Button */}
        <button
          onClick={triggerAutoReminders}
          disabled={runningReminders}
          className="bg-amber-500 hover:bg-amber-600 disabled:bg-amber-400 text-white font-bold py-2 px-4 rounded-xl text-xs flex items-center gap-2 shadow-sm transition-all"
        >
          {runningReminders ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <DollarSign className="w-4 h-4" />
          )}
          ⚡ Run Auto-Reminders for Fee Dues
        </button>
      </div>

      {/* Tabs Menu */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab("logs")}
          className={`flex items-center gap-2 py-3 px-6 text-sm font-semibold border-b-2 transition-all ${
            activeTab === "logs"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <History className="w-4 h-4" />
          Outbox & Notification History
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
          Compose & Broadcast Notices
        </button>
      </div>

      {/* Main Panel Content */}
      <div className="flex-1 bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
        {activeTab === "logs" ? (
          /* OUTBOX LOGS VIEW */
          <div className="p-6 space-y-4 flex-1 flex flex-col overflow-hidden">
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
            <div className="flex-1 overflow-y-auto border border-slate-100 rounded-lg">
              {loading ? (
                <div className="h-64 flex flex-col items-center justify-center gap-3">
                  <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                  <p className="text-xs text-slate-500 font-medium">Fetching communication logs...</p>
                </div>
              ) : logs.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center gap-2 text-slate-400">
                  <Mail className="w-10 h-10 stroke-[1.5]" />
                  <p className="text-sm font-medium">No sent messages found matching filters.</p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
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
                  <tbody className="text-sm divide-y divide-slate-50">
                    {logs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/50 transition">
                        <td className="py-3 px-4 text-slate-500 font-medium whitespace-nowrap">
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
                            log.sender === "internal@virtueschool.in" || log.sender.includes("mock")
                              ? "bg-slate-100 text-slate-600"
                              : "bg-indigo-50 text-indigo-600"
                          }`}>
                            {log.sender === "internal@virtueschool.in" ? "INTERNAL PORTAL" : "SMTP EMAIL"}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {log.status === "SUCCESS" ? (
                            <span className="inline-flex items-center gap-1 text-emerald-600 font-bold text-xs">
                              <CheckCircle className="w-4 h-4 fill-emerald-50" />
                              Delivered
                            </span>
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
                            className="text-indigo-600 hover:text-indigo-800 font-semibold text-xs flex items-center gap-1 mx-auto"
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
        ) : (
          /* COMPOSE EMAIL VIEW */
          <form onSubmit={handleSend} className="p-6 space-y-6 max-w-2xl overflow-y-auto">
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
                  className={`flex flex-col items-start p-4 rounded-xl border-2 transition-all ${
                    isInternalOnly 
                      ? "border-indigo-600 bg-indigo-50/20 text-indigo-900" 
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <span className="font-bold text-sm flex items-center gap-1.5">
                    <Bell className="w-4 h-4 text-indigo-600" />
                    Internal Portal Notice (Free)
                  </span>
                  <span className="text-[10px] text-slate-500 mt-1">Delivers instantly to dashboard notification lists</span>
                </button>
                
                <button
                  type="button"
                  onClick={() => setIsInternalOnly(false)}
                  className={`flex flex-col items-start p-4 rounded-xl border-2 transition-all ${
                    !isInternalOnly 
                      ? "border-indigo-600 bg-indigo-50/20 text-indigo-900" 
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <span className="font-bold text-sm flex items-center gap-1.5">
                    <Mail className="w-4 h-4 text-indigo-600" />
                    Hostinger SMTP Email
                  </span>
                  <span className="text-[10px] text-slate-500 mt-1">Sends external email alerts to parent/staff inboxes</span>
                </button>
              </div>
            </div>

            {/* Target Audience Group Selector */}
            <div className="space-y-1.5">
              <label className="block text-sm font-bold text-slate-700">Target Audience Group</label>
              <select
                value={targetGroup}
                onChange={(e: any) => {
                  setTargetGroup(e.target.value);
                  setRecipient("");
                  setSelectedStudentId("");
                }}
                className="w-full rounded-xl border border-slate-200 py-2.5 px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600/20"
              >
                <option value="MANUAL">Manual Type Email Address</option>
                <option value="STUDENT">Select from Student Directory</option>
                <option value="ALL_PARENTS">All Active Parents</option>
                <option value="ALL_STAFF">All Active Staff</option>
                <option value="ALL">All (Both Parents & Staff)</option>
              </select>
            </div>

            {/* Student Directory selector */}
            {targetGroup === "STUDENT" && (
              <div className="space-y-1.5">
                <label className="block text-sm font-bold text-slate-700">Select Student</label>
                {loadingStudents ? (
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                    Loading student list...
                  </div>
                ) : (
                  <select
                    value={selectedStudentId}
                    onChange={(e) => handleStudentChange(e.target.value)}
                    required
                    className="w-full rounded-xl border border-slate-200 py-2.5 px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600/20"
                  >
                    <option value="">-- Choose student --</option>
                    {studentsList.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.firstName} {s.lastName || ""} ({s.admissionNumber || s.studentCode || "No ID"})
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {/* Recipient Input (Shown if MANUAL or student selected) */}
            {(targetGroup === "MANUAL" || targetGroup === "STUDENT") && (
              <div className="space-y-1.5">
                <label className="block text-sm font-bold text-slate-700">Recipient Address</label>
                <input
                  type="text"
                  required
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  placeholder="e.g. parent@gmail.com"
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
                rows={6}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write your email or notice here..."
                className="w-full rounded-xl border border-slate-200 py-2.5 px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 font-sans text-xs"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={sending}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold py-2.5 px-6 rounded-xl text-sm flex items-center gap-2 shadow-md hover:shadow-lg transition-all"
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
        )}
      </div>

      {/* Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-100 w-full max-w-xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-slate-800">Email Message Log Detail</h3>
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
                  <span className="text-slate-400 block font-normal">Sent Timestamp</span>
                  <span className="text-slate-700">{new Date(selectedLog.createdAt).toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-normal">Status</span>
                  <span className={selectedLog.status === "SUCCESS" ? "text-emerald-600" : "text-rose-600"}>
                    {selectedLog.status}
                  </span>
                </div>
              </div>

              {selectedLog.errorMessage && (
                <div className="bg-rose-50 border border-rose-100 p-3 rounded-lg text-rose-800 text-xs font-mono">
                  <strong>Error Message:</strong> {selectedLog.errorMessage}
                </div>
              )}

              <hr className="border-slate-100" />

              <div className="space-y-2">
                <span className="text-xs text-slate-400 block">Email Subject</span>
                <p className="font-bold text-slate-800 text-sm">{selectedLog.subject}</p>
              </div>

              <div className="space-y-2">
                <span className="text-xs text-slate-400 block">Email Text Content</span>
                <pre className="bg-slate-50 rounded-lg p-4 font-mono text-xs text-slate-600 whitespace-pre-wrap leading-relaxed border border-slate-100">
                  {selectedLog.body}
                </pre>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end">
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
