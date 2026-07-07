import React, { useState, useEffect } from "react";
import { 
  FileText, CheckCircle, XCircle, Clock, Plus, Loader2, Calendar, 
  DollarSign, Briefcase, RefreshCw, Send, ShieldAlert, Award, MessageSquare 
} from "lucide-react";
import { 
  createApprovalRequestAction, 
  getStaffApprovalRequestsAction, 
  getPendingApprovalsAction, 
  getResolvedApprovalsAction, 
  resolveApprovalRequestAction 
} from "@/lib/actions/approval-actions";
import {
  getPendingDiscountsAction,
  approveDiscountAction,
  rejectDiscountAction
} from "@/lib/actions/discount-actions";
import { useTenant } from "@/context/tenant-context";

export function ApprovalsHub() {
  const { userRole } = useTenant();
  const isApprover = ["OWNER", "DEVELOPER", "PRINCIPAL", "ADMIN"].includes(userRole);

  const [activeTab, setActiveTab] = useState<"my-requests" | "pending-reviews" | "review-history" | "discount-approvals">("my-requests");
  
  // State lists
  const [myRequests, setMyRequests] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [historyRequests, setHistoryRequests] = useState<any[]>([]);
  const [pendingDiscounts, setPendingDiscounts] = useState<any[]>([]);
  
  // Loaders
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [discountActionLoading, setDiscountActionLoading] = useState<string | null>(null);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [category, setCategory] = useState<"LEAVE" | "ADVANCE" | "SUPPLIES" | "CUSTOM">("LEAVE");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [amount, setAmount] = useState("");
  const [feedback, setFeedback] = useState<{ success: boolean; message: string } | null>(null);

  // Review Modal state
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const [reviewComments, setReviewComments] = useState("");

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  async function handleApproveDiscount(id: string) {
    if (!confirm("Are you sure you want to approve this student fee discount? This will update their financial record, ledger and accounts immediately.")) return;
    setDiscountActionLoading(id);
    try {
      const res = await approveDiscountAction(id);
      if (res.success) {
        alert("Discount approved successfully.");
        fetchData();
      } else {
        alert("Failed to approve discount: " + res.error);
      }
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setDiscountActionLoading(null);
    }
  }

  async function handleRejectDiscount(id: string) {
    if (!confirm("Are you sure you want to reject this discount proposal?")) return;
    setDiscountActionLoading(id);
    try {
      const res = await rejectDiscountAction(id);
      if (res.success) {
        alert("Discount proposal rejected.");
        fetchData();
      } else {
        alert("Failed to reject discount: " + res.error);
      }
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setDiscountActionLoading(null);
    }
  }

  async function fetchData() {
    setLoading(true);
    setFeedback(null);
    try {
      if (isApprover) {
        // Parallel load of pending reviews and discount approvals
        const [requestsRes, discountsRes] = await Promise.all([
          getPendingApprovalsAction(),
          getPendingDiscountsAction()
        ]);
        if (requestsRes.success && requestsRes.data) setPendingRequests(requestsRes.data);
        if (discountsRes.success && discountsRes.data) setPendingDiscounts(discountsRes.data);
        
        if (activeTab === "review-history") {
          const res = await getResolvedApprovalsAction();
          if (res.success && res.data) setHistoryRequests(res.data);
        }
      }
      
      if (activeTab === "my-requests") {
        const res = await getStaffApprovalRequestsAction();
        if (res.success && res.data) setMyRequests(res.data);
      }
    } catch (e) {
      console.error("Failed to load requests data:", e);
    }
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);

    try {
      const res = await createApprovalRequestAction({
        category,
        title,
        description,
        startDate: category === "LEAVE" ? startDate || undefined : undefined,
        endDate: category === "LEAVE" ? endDate || undefined : undefined,
        amount: category === "ADVANCE" ? Number(amount) || undefined : undefined
      });

      if (res.success) {
        setFeedback({ success: true, message: "Request submitted successfully!" });
        // Reset form
        setTitle("");
        setDescription("");
        setStartDate("");
        setEndDate("");
        setAmount("");
        setShowForm(false);
        fetchData();
      } else {
        setFeedback({ success: false, message: res.error || "Failed to submit request." });
      }
    } catch (err: any) {
      setFeedback({ success: false, message: err.message || "An unexpected error occurred." });
    }
    setSubmitting(false);
  }

  async function handleResolve(status: "APPROVED" | "REJECTED") {
    if (!selectedRequest) return;
    setResolvingId(selectedRequest.id);

    try {
      const res = await resolveApprovalRequestAction({
        requestId: selectedRequest.id,
        status,
        comments: reviewComments.trim()
      });

      if (res.success) {
        setSelectedRequest(null);
        setReviewComments("");
        fetchData();
      } else {
        alert(res.error || "Failed to resolve request.");
      }
    } catch (err: any) {
      alert(err.message || "An unexpected error occurred.");
    }
    setResolvingId(null);
  }

  function getCategoryBadge(cat: string) {
    switch (cat) {
      case "LEAVE":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700">Leave</span>;
      case "ADVANCE":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700">Salary Advance</span>;
      case "SUPPLIES":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700">Supplies</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-50 text-slate-700">Custom</span>;
    }
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case "APPROVED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
            <CheckCircle className="w-3.5 h-3.5 fill-emerald-50" /> Approved
          </span>
        );
      case "REJECTED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-100">
            <XCircle className="w-3.5 h-3.5 fill-rose-50" /> Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-100 animate-pulse">
            <Clock className="w-3.5 h-3.5" /> Pending
          </span>
        );
    }
  }

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-5">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Award className="w-6 h-6 text-indigo-600" />
            Approvals & Requests Hub
          </h2>
          <p className="text-slate-500 font-medium text-xs mt-1">Submit institutional requests and manage approvals queue</p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={fetchData}
            className="p-2 text-slate-500 hover:text-slate-700 bg-white rounded-xl border border-slate-200 shadow-sm transition hover:bg-slate-50"
            title="Refresh logs"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          
          {activeTab === "my-requests" && !showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-xl text-xs flex items-center gap-2 shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              New Leave/Request
            </button>
          )}
        </div>
      </div>

      {/* Tabs Menu */}
      {isApprover && (
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => { setActiveTab("my-requests"); setShowForm(false); }}
            className={`flex items-center gap-2 py-3 px-6 text-sm font-semibold border-b-2 transition-all ${
              activeTab === "my-requests"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <FileText className="w-4 h-4" />
            My Requests
          </button>
          <button
            onClick={() => { setActiveTab("pending-reviews"); setShowForm(false); }}
            className={`flex items-center gap-2 py-3 px-6 text-sm font-semibold border-b-2 transition-all ${
              activeTab === "pending-reviews"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <Clock className="w-4 h-4" />
            Pending Reviews ({pendingRequests.length})
          </button>
          <button
            onClick={() => { setActiveTab("review-history"); setShowForm(false); }}
            className={`flex items-center gap-2 py-3 px-6 text-sm font-semibold border-b-2 transition-all ${
              activeTab === "review-history"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <CheckCircle className="w-4 h-4" />
            History Log
          </button>
          <button
            onClick={() => { setActiveTab("discount-approvals"); setShowForm(false); }}
            className={`flex items-center gap-2 py-3 px-6 text-sm font-semibold border-b-2 transition-all ${
              activeTab === "discount-approvals"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <DollarSign className="w-4 h-4" />
            Discount Approvals ({pendingDiscounts.length})
          </button>
        </div>
      )}

      {/* NEW REQUEST FORM MODAL/PANEL */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-6 max-w-xl animate-in slide-in-from-top-4 duration-300">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-5">
            <h3 className="font-bold text-slate-800 text-base">New Request Submission</h3>
            <button 
              onClick={() => setShowForm(false)} 
              className="text-slate-400 hover:text-slate-600 font-bold"
            >
              Cancel
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-600 uppercase">Category</label>
              <select
                value={category}
                onChange={(e: any) => setCategory(e.target.value)}
                className="w-full rounded-xl border border-slate-200 py-2.5 px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600/20"
              >
                <option value="LEAVE">Leave Request</option>
                <option value="ADVANCE">Salary Advance (₹)</option>
                <option value="SUPPLIES">Stationery & Supplies</option>
                <option value="CUSTOM">Custom / Other Request</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-600 uppercase">Request Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Sick Leave / Request for registers"
                className="w-full rounded-xl border border-slate-200 py-2.5 px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600/20"
              />
            </div>

            {/* Dynamic Leave Date Fields */}
            {category === "LEAVE" && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-600 uppercase">Start Date</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 py-2.5 px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600/20"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-600 uppercase">End Date</label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 py-2.5 px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600/20"
                  />
                </div>
              </div>
            )}

            {/* Dynamic Advance Amount Field */}
            {category === "ADVANCE" && (
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-600 uppercase">Requested Amount (₹)</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-3 text-slate-400 font-bold text-sm">₹</span>
                  <input
                    type="number"
                    required
                    min={1}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Amount in Rupees"
                    className="pl-8 w-full rounded-xl border border-slate-200 py-2.5 px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600/20"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-600 uppercase">Description / Reason</label>
              <textarea
                required
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide detailed reasons or specifications for your request..."
                className="w-full rounded-xl border border-slate-200 py-2.5 px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600/20"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold py-2.5 px-6 rounded-xl text-sm flex items-center gap-2 shadow-sm transition-all w-full justify-center"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Submitting...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" /> Submit Request
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* MAIN LAYOUT ACCORDING TO TABS */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="h-64 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
            <p className="text-xs text-slate-500 font-medium">Loading requests log...</p>
          </div>
        ) : activeTab === "my-requests" ? (
          /* USER STAFF VIEW */
          <div className="p-6">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">My Submitted Requests</h4>
            </div>

            {feedback && (
              <div className={`p-4 rounded-xl border flex gap-3 mb-4 ${
                feedback.success ? "bg-emerald-50 border-emerald-100 text-emerald-800" : "bg-rose-50 border-rose-100 text-rose-800"
              }`}>
                {feedback.success ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                <p className="text-sm font-semibold">{feedback.message}</p>
              </div>
            )}

            {myRequests.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center gap-2 text-slate-400">
                <FileText className="w-10 h-10 stroke-[1.5]" />
                <p className="text-sm font-medium">You haven't submitted any requests yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Request</th>
                      <th className="py-3 px-4">Details</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Feedback</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 font-medium">
                    {myRequests.map((req) => (
                      <tr key={req.id} className="hover:bg-slate-50/50 transition">
                        <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                          {new Date(req.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-3.5 px-4">{getCategoryBadge(req.category)}</td>
                        <td className="py-3.5 px-4 text-slate-800 font-bold">{req.title}</td>
                        <td className="py-3.5 px-4 text-slate-600 text-xs">
                          {req.category === "LEAVE" && req.startDate && (
                            <span className="flex items-center gap-1 text-purple-700">
                              <Calendar className="w-3.5 h-3.5" />
                              {new Date(req.startDate).toLocaleDateString()} - {new Date(req.endDate).toLocaleDateString()}
                            </span>
                          )}
                          {req.category === "ADVANCE" && req.amount && (
                            <span className="text-emerald-700 font-bold">₹{Number(req.amount).toLocaleString()}</span>
                          )}
                          <p className="mt-0.5 line-clamp-1 italic text-slate-400">{req.description}</p>
                        </td>
                        <td className="py-3.5 px-4">{getStatusBadge(req.status)}</td>
                        <td className="py-3.5 px-4 text-xs max-w-[200px] truncate" title={req.reviewComments || ""}>
                          {req.reviewerName ? (
                            <div>
                              <span className="block font-bold text-slate-500">{req.reviewerName}:</span>
                              <span className="text-slate-400 italic">{req.reviewComments || "No comments"}</span>
                            </div>
                          ) : (
                            <span className="text-slate-300 italic">Waiting review</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : activeTab === "pending-reviews" && isApprover ? (
          /* PENDING APPROVAL QUEUE */
          <div className="p-6">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 pb-3 border-b border-slate-100 mb-4">Pending Requests Queue</h4>
            
            {pendingRequests.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center gap-2 text-slate-400">
                <CheckCircle className="w-10 h-10 stroke-[1.5] text-emerald-500 fill-emerald-50" />
                <p className="text-sm font-medium">All clear! No pending requests to review.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pendingRequests.map((req) => (
                  <div key={req.id} className="border border-slate-200 rounded-2xl p-5 bg-white hover:border-slate-300 transition-all flex flex-col justify-between shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-3">
                      {getCategoryBadge(req.category)}
                    </div>

                    <div className="space-y-3">
                      <div>
                        <span className="text-[10px] text-slate-400 font-black block tracking-widest uppercase">Submitted by</span>
                        <h5 className="font-extrabold text-indigo-900 text-sm">
                          {req.staff?.firstName} {req.staff?.lastName} ({req.staff?.staffCode || "Staff"})
                        </h5>
                        <span className="text-[10px] text-slate-500 font-medium block mt-0.5">Role: {req.staff?.role}</span>
                      </div>

                      <div className="border-t border-slate-100 pt-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Request</span>
                        <h6 className="font-extrabold text-slate-800 text-sm mt-0.5">{req.title}</h6>
                        
                        {req.category === "LEAVE" && req.startDate && (
                          <div className="mt-1.5 flex items-center gap-1.5 text-xs text-purple-700 bg-purple-50 px-2.5 py-1 rounded-lg w-max font-bold">
                            <Calendar className="w-3.5 h-3.5" />
                            {new Date(req.startDate).toLocaleDateString()} - {new Date(req.endDate).toLocaleDateString()}
                          </div>
                        )}

                        {req.category === "ADVANCE" && req.amount && (
                          <div className="mt-1.5 flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg w-max font-bold">
                            <DollarSign className="w-3.5 h-3.5" />
                            ₹{Number(req.amount).toLocaleString()}
                          </div>
                        )}
                        
                        <p className="mt-2 text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100 font-medium whitespace-pre-wrap leading-relaxed">
                          {req.description}
                        </p>
                      </div>
                    </div>

                    <div className="border-t border-slate-100 pt-4 mt-4 flex justify-between items-center">
                      <span className="text-[10px] text-slate-400 font-medium">Submitted {new Date(req.createdAt).toLocaleDateString()}</span>
                      <button
                        onClick={() => { setSelectedRequest(req); setReviewComments(""); }}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-1.5 px-4 rounded-xl transition shadow-sm hover:shadow"
                      >
                        Review Request
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : activeTab === "discount-approvals" && isApprover ? (
          /* PENDING STUDENT DISCOUNTS QUEUE */
          <div className="p-6">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 pb-3 border-b border-slate-100 mb-4">Pending Student Discounts Queue</h4>
            
            {pendingDiscounts.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center gap-2 text-slate-400">
                <CheckCircle className="w-10 h-10 stroke-[1.5] text-emerald-500 fill-emerald-50" />
                <p className="text-sm font-medium">All clear! No pending student discounts to review.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pendingDiscounts.map((disc) => {
                  const student = disc.financialRecord?.student;
                  const isActing = discountActionLoading === disc.id;
                  return (
                    <div key={disc.id} className="border border-slate-200 rounded-2xl p-5 bg-white hover:border-slate-300 transition-all flex flex-col justify-between shadow-sm relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-3">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-100">
                          Pending
                        </span>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <span className="text-[10px] text-slate-400 font-black block tracking-widest uppercase">Student Identity</span>
                          <h5 className="font-extrabold text-indigo-900 text-sm">
                            {student?.firstName} {student?.lastName}
                          </h5>
                          <span className="text-[10px] text-slate-500 font-medium block mt-0.5">
                            ID: {student?.admissionNumber || student?.registrationId || "N/A"}
                          </span>
                        </div>

                        <div className="border-t border-slate-100 pt-2">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Discount Details</span>
                          <h6 className="font-extrabold text-slate-800 text-sm mt-0.5">{disc.discountType?.name}</h6>
                          
                          <div className="mt-1.5 flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg w-max font-bold">
                            <DollarSign className="w-3.5 h-3.5" />
                            ₹{Number(disc.amount).toLocaleString()}
                          </div>
                          
                          <p className="mt-2 text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100 font-medium whitespace-pre-wrap leading-relaxed">
                            Reason: {disc.reason || "No reason specified"}
                          </p>
                        </div>
                      </div>

                      <div className="border-t border-slate-100 pt-4 mt-4 flex justify-between items-center">
                        <span className="text-[10px] text-slate-400 font-medium">Submitted {new Date(disc.createdAt || new Date()).toLocaleDateString()}</span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleRejectDiscount(disc.id)}
                            disabled={isActing}
                            className="bg-rose-50 hover:bg-rose-100 text-rose-700 font-extrabold text-[11px] py-1.5 px-3.5 rounded-xl transition-all border border-rose-200"
                          >
                            Reject
                          </button>
                          <button
                            onClick={() => handleApproveDiscount(disc.id)}
                            disabled={isActing}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[11px] py-1.5 px-4 rounded-xl transition-all shadow-sm"
                          >
                            {isActing ? "Processing..." : "Approve"}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* RESOLVED HISTORY LOG */
          <div className="p-6">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 pb-3 border-b border-slate-100 mb-4">Historical Resolutions</h4>
            
            {historyRequests.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center gap-2 text-slate-400">
                <FileText className="w-10 h-10 stroke-[1.5]" />
                <p className="text-sm font-medium">No historically resolved requests found.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Staff Member</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Request</th>
                      <th className="py-3 px-4">Details</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Reviewed By</th>
                      <th className="py-3 px-4">Comments</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 font-medium">
                    {historyRequests.map((req) => (
                      <tr key={req.id} className="hover:bg-slate-50/50 transition text-xs">
                        <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                          {new Date(req.reviewedAt || req.updatedAt).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-slate-700">
                          <span className="font-bold block">{req.staff?.firstName} {req.staff?.lastName}</span>
                          <span className="text-[10px] text-slate-400 block">{req.staff?.staffCode}</span>
                        </td>
                        <td className="py-3 px-4">{getCategoryBadge(req.category)}</td>
                        <td className="py-3 px-4 font-bold text-slate-800">{req.title}</td>
                        <td className="py-3 px-4">
                          {req.category === "LEAVE" && req.startDate && (
                            <span className="font-bold text-purple-700">Leave dates resolved</span>
                          )}
                          {req.category === "ADVANCE" && req.amount && (
                            <span className="font-bold text-emerald-700">₹{Number(req.amount).toLocaleString()}</span>
                          )}
                          <p className="text-[10px] text-slate-400 line-clamp-1 italic">{req.description}</p>
                        </td>
                        <td className="py-3 px-4">{getStatusBadge(req.status)}</td>
                        <td className="py-3 px-4 text-slate-700 font-bold">{req.reviewerName}</td>
                        <td className="py-3 px-4 text-slate-500 italic max-w-[200px] truncate" title={req.reviewComments || ""}>
                          {req.reviewComments || "No feedback"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* REVIEW DETAILS MODAL */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-lg overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-slate-800">Review Request</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Submitted: {new Date(selectedRequest.createdAt).toLocaleString()}</p>
              </div>
              <button
                onClick={() => setSelectedRequest(null)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold p-1"
              >
                &times;
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4 flex-1 overflow-y-auto max-h-[450px]">
              <div className="grid grid-cols-2 gap-4 text-xs border-b border-slate-100 pb-3">
                <div>
                  <span className="text-slate-400 block font-normal">Staff Name</span>
                  <span className="font-bold text-slate-800">{selectedRequest.staff?.firstName} {selectedRequest.staff?.lastName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-normal">Staff Code</span>
                  <span className="font-bold text-slate-800">{selectedRequest.staff?.staffCode}</span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-xs text-slate-400 block">Title</span>
                <p className="font-extrabold text-slate-800 text-sm">{selectedRequest.title}</p>
              </div>

              {selectedRequest.category === "LEAVE" && selectedRequest.startDate && (
                <div className="bg-purple-50/50 p-3 rounded-xl border border-purple-100/50 text-xs">
                  <span className="text-purple-400 font-bold block">Leave Period Requested:</span>
                  <p className="font-bold text-purple-800 mt-1 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(selectedRequest.startDate).toLocaleDateString()} to {new Date(selectedRequest.endDate).toLocaleDateString()}
                  </p>
                </div>
              )}

              {selectedRequest.category === "ADVANCE" && selectedRequest.amount && (
                <div className="bg-emerald-50/50 p-3 rounded-xl border border-emerald-100/50 text-xs">
                  <span className="text-emerald-400 font-bold block">Requested Advance Amount:</span>
                  <p className="font-bold text-emerald-800 mt-1 flex items-center gap-1">
                    <DollarSign className="w-3.5 h-3.5" />
                    ₹{Number(selectedRequest.amount).toLocaleString()}
                  </p>
                </div>
              )}

              <div className="space-y-1 bg-slate-50 p-3.5 rounded-xl border border-slate-100/70">
                <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Reason Details</span>
                <p className="text-xs text-slate-600 font-medium whitespace-pre-wrap leading-relaxed">{selectedRequest.description}</p>
              </div>

              <div className="space-y-1.5 pt-2">
                <label className="block text-xs font-bold text-slate-700 uppercase flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                  Reviewer Feedback / Comments
                </label>
                <textarea
                  rows={3}
                  value={reviewComments}
                  onChange={(e) => setReviewComments(e.target.value)}
                  placeholder="Approve with congratulations, or explain reason for rejection..."
                  className="w-full rounded-xl border border-slate-200 py-2.5 px-3.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-600/20"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center gap-3">
              <button
                onClick={() => setSelectedRequest(null)}
                className="bg-slate-200 hover:bg-slate-300 text-slate-800 px-4 py-2 rounded-lg text-sm font-semibold transition"
              >
                Cancel
              </button>

              <div className="flex gap-2">
                <button
                  onClick={() => handleResolve("REJECTED")}
                  disabled={resolvingId !== null}
                  className="bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400 text-white font-bold text-sm px-4 py-2 rounded-lg transition shadow-sm"
                >
                  {resolvingId === selectedRequest.id ? "Resolving..." : "Reject"}
                </button>
                <button
                  onClick={() => handleResolve("APPROVED")}
                  disabled={resolvingId !== null}
                  className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-bold text-sm px-4 py-2 rounded-lg transition shadow-sm"
                >
                  {resolvingId === selectedRequest.id ? "Resolving..." : "Approve"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
