"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  User, 
  Briefcase, 
  CreditCard, 
  Heart, 
  FileText, 
  UploadCloud, 
  Trash2, 
  Eye, 
  Download, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  Calendar, 
  MapPin, 
  Phone, 
  Mail,
  Key,
  Camera,
  Search,
  FileCheck
} from "lucide-react";
import { 
  getStaffProfileDetailsAction, 
  updateStaffPersonalDetailsAction, 
  updateStaffBankDetailsAction, 
  updateStaffHealthDetailsAction, 
  deleteStaffDocumentAction,
  updateStaffPasswordAction
} from "@/lib/actions/staff-document-actions";
import { useTenant } from "@/context/tenant-context";

const MANDATORY_DOCS = [
  "Aadhaar Card",
  "PAN Card",
  "Passport Photo",
  "Degree Certificate",
  "Bank Passbook / Cancelled Cheque"
];

const DOCUMENT_TYPES = [
  "Aadhaar Card",
  "PAN Card",
  "Passport Photo",
  "Address Proof",
  "SSC Marks Memo",
  "Intermediate Marks Memo",
  "Degree Certificate",
  "PG Degree Certificate",
  "B.Ed / D.Ed Certificate",
  "Transfer Certificate (TC)",
  "Experience Certificate",
  "Bank Passbook / Cancelled Cheque",
  "Appointment Letter",
  "Relieving Letter",
  "Other"
];

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export default function StaffProfileHub({ targetStaffId }: { targetStaffId?: string }) {
  const session = useTenant();
  const [activeStaffId, setActiveStaffId] = useState<string | undefined>(targetStaffId);
  const [profile, setProfile] = useState<any>(null);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Impersonation selector filter
  const [searchQuery, setSearchQuery] = useState("");

  // Form states
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("");
  const [address, setAddress] = useState("");

  const [accountName, setAccountName] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [ifscCode, setIfscCode] = useState("");

  const [bloodGroup, setBloodGroup] = useState("");
  const [allergies, setAllergies] = useState("");
  const [emergencyName, setEmergencyName] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");

  // Password change states
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Upload states
  const [selectedDocType, setSelectedDocType] = useState(DOCUMENT_TYPES[0]);
  const [customName, setCustomName] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(false);
  const [replacingDocId, setReplacingDocId] = useState<string | null>(null);

  const isAuthorizedAdmin = ["PRINCIPAL", "OWNER", "DEVELOPER"].includes(session.userRole);

  useEffect(() => {
    loadProfile(activeStaffId);
  }, [activeStaffId]);

  const showNotification = (type: "success" | "error", text: string) => {
    setNotification({ type, text });
    setTimeout(() => setNotification(null), 5000);
  };

  const loadProfile = async (id?: string) => {
    setLoading(true);
    const res = await getStaffProfileDetailsAction(id);
    if (res.success && res.data) {
      const data = res.data;
      setProfile(data);
      if (res.staffList) {
        setStaffList(res.staffList);
      }
      
      // Auto synchronize selector active state
      if (!activeStaffId) {
        setActiveStaffId(data.id);
      }

      // Initialize edit fields
      setDob(data.dob ? new Date(data.dob).toISOString().split("T")[0] : "");
      setGender(data.gender || "");
      setAddress(data.address || "");

      setAccountName(data.bank?.accountName || "");
      setBankName(data.bank?.bankName || "");
      setAccountNumber(data.bank?.accountNumber || "");
      setIfscCode(data.bank?.ifscCode || "");

      setBloodGroup(data.bloodGroup || "");
      setAllergies(data.allergies || "");
      setEmergencyName(data.emergencyName || "");
      setEmergencyPhone(data.emergencyPhone || "");

      // Clear replace triggers
      setReplacingDocId(null);
      setCustomName("");
    } else {
      showNotification("error", res.error || "Failed to load profile details.");
    }
    setLoading(false);
  };

  // Completion calculation logic
  const stats = useMemo(() => {
    if (!profile) return { score: 0, missing: [] };

    const missing: string[] = [];
    let filledCount = 0;
    let totalItems = 0;

    // Personal details (5 items)
    totalItems += 5;
    if (profile.dob) filledCount++; else missing.push("Date of Birth");
    if (profile.gender) filledCount++; else missing.push("Gender");
    if (profile.address) filledCount++; else missing.push("Address");
    if (profile.phone) filledCount++;
    if (profile.email) filledCount++;

    // Bank details (4 items)
    totalItems += 4;
    if (profile.bank?.accountName) filledCount++; else missing.push("Bank Account Holder Name");
    if (profile.bank?.bankName) filledCount++; else missing.push("Bank Name");
    if (profile.bank?.accountNumber) filledCount++; else missing.push("Bank Account Number");
    if (profile.bank?.ifscCode) filledCount++; else missing.push("Bank IFSC Code");

    // Emergency details (3 items)
    totalItems += 3;
    if (profile.bloodGroup) filledCount++; else missing.push("Blood Group");
    if (profile.emergencyName) filledCount++; else missing.push("Emergency Contact Name");
    if (profile.emergencyPhone) filledCount++; else missing.push("Emergency Contact Number");

    // Mandatory documents check (5 items)
    totalItems += MANDATORY_DOCS.length;
    const uploadedTypes = profile.staffDocuments?.map((d: any) => d.documentType) || [];
    MANDATORY_DOCS.forEach(doc => {
      if (uploadedTypes.includes(doc)) {
        filledCount++;
      } else {
        missing.push(`${doc} (Document)`);
      }
    });

    const score = Math.round((filledCount / totalItems) * 100);
    return { score, missing };
  }, [profile]);

  const handlePersonalUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting("personal");
    const res = await updateStaffPersonalDetailsAction({ 
      targetStaffId: activeStaffId, 
      dob, 
      gender, 
      address 
    });
    if (res.success) {
      showNotification("success", "Personal details updated successfully.");
      await loadProfile(activeStaffId);
    } else {
      showNotification("error", res.error || "Failed to update personal details.");
    }
    setSubmitting(null);
  };

  const handleBankUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting("bank");
    const res = await updateStaffBankDetailsAction({ 
      targetStaffId: activeStaffId, 
      accountName, 
      bankName, 
      accountNumber, 
      ifscCode 
    });
    if (res.success) {
      showNotification("success", "Bank details updated successfully.");
      await loadProfile(activeStaffId);
    } else {
      showNotification("error", res.error || "Failed to update bank details.");
    }
    setSubmitting(null);
  };

  const handleHealthUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting("health");
    const res = await updateStaffHealthDetailsAction({ 
      targetStaffId: activeStaffId, 
      bloodGroup, 
      allergies, 
      emergencyName, 
      emergencyPhone 
    });
    if (res.success) {
      showNotification("success", "Health & emergency details updated successfully.");
      await loadProfile(activeStaffId);
    } else {
      showNotification("error", res.error || "Failed to update health details.");
    }
    setSubmitting(null);
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showNotification("error", "Passwords do not match.");
      return;
    }
    setSubmitting("password");
    const res = await updateStaffPasswordAction({
      targetStaffId: activeStaffId,
      oldPassword: (isAuthorizedAdmin && profile.email !== session.userEmail) ? undefined : oldPassword,
      newPassword
    });

    if (res.success) {
      showNotification("success", "Password updated successfully.");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } else {
      showNotification("error", res.error || "Failed to update password.");
    }
    setSubmitting(null);
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      const formData = new FormData();
      formData.append("file", file);
      formData.append("documentType", "PROFILE_PICTURE");
      if (activeStaffId) {
        formData.append("targetStaffId", activeStaffId);
      }

      setSubmitting("avatar");
      try {
        const response = await fetch("/api/staff/upload", {
          method: "POST",
          body: formData
        });
        const resData = await response.json();
        if (resData.success) {
          showNotification("success", "Profile picture updated successfully.");
          await loadProfile(activeStaffId);
        } else {
          showNotification("error", resData.error || "Failed to upload avatar.");
        }
      } catch (err) {
        showNotification("error", "Network error updating avatar.");
      }
      setSubmitting(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      showNotification("error", "Please select a file to upload.");
      return;
    }

    setUploadProgress(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("documentType", selectedDocType);
      if (customName) {
        formData.append("customName", customName);
      }
      if (replacingDocId) {
        formData.append("documentIdToReplace", replacingDocId);
      }
      if (activeStaffId) {
        formData.append("targetStaffId", activeStaffId);
      }

      const response = await fetch("/api/staff/upload", {
        method: "POST",
        body: formData
      });

      const resData = await response.json();
      if (resData.success) {
        showNotification("success", resData.message || "Upload completed successfully.");
        setSelectedFile(null);
        setCustomName("");
        setReplacingDocId(null);
        // Clear input file
        const fileInput = document.getElementById("staff-file-picker") as HTMLInputElement;
        if (fileInput) fileInput.value = "";
        await loadProfile(activeStaffId);
      } else {
        showNotification("error", resData.error || "Failed to upload document.");
      }
    } catch (err: any) {
      showNotification("error", "Network error occurred during upload.");
    }
    setUploadProgress(false);
  };

  const handleDeleteDocument = async (docId: string, docType: string) => {
    const confirmDelete = window.confirm(`Are you sure you want to permanently delete your "${docType}" document?`);
    if (!confirmDelete) return;

    setSubmitting(`delete-${docId}`);
    const res = await deleteStaffDocumentAction(docId);
    if (res.success) {
      showNotification("success", "Document deleted successfully.");
      await loadProfile(activeStaffId);
    } else {
      showNotification("error", res.error || "Failed to delete document.");
    }
    setSubmitting(null);
  };

  const formatBytes = (bytes: number, decimals = 2) => {
    if (!+bytes) return "0 Bytes";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  };

  // Filtered staff list for search selector
  const filteredStaffList = useMemo(() => {
    if (!searchQuery) return staffList;
    const q = searchQuery.toLowerCase();
    return staffList.filter(s => 
      s.firstName.toLowerCase().includes(q) || 
      s.lastName.toLowerCase().includes(q) || 
      s.staffCode.toLowerCase().includes(q)
    );
  }, [staffList, searchQuery]);

  if (loading && !profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
        <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Hydrating Profile Vault...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-8 bg-white border border-slate-100 rounded-3xl text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <h3 className="text-lg font-black text-slate-900">Profile Not Loaded</h3>
        <p className="text-sm text-slate-500">We could not resolve any active staff profiles in the database. Contact your system admin.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans">
      {/* Toast Notification */}
      {notification && (
        <div className={`fixed bottom-6 right-6 z-[9999] p-4 max-w-sm w-full rounded-2xl border shadow-xl flex gap-3 items-start animate-in slide-in-from-bottom-5 duration-300 ${
          notification.type === "success" 
            ? "bg-emerald-50/95 border-emerald-100 text-emerald-800" 
            : "bg-rose-50/95 border-rose-100 text-rose-800"
        }`}>
          {notification.type === "success" ? (
            <CheckCircle className="w-5 h-5 shrink-0 text-emerald-600" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
          )}
          <div className="text-xs font-bold leading-normal">{notification.text}</div>
        </div>
      )}

      {/* Admin Impersonation Selector bar */}
      {isAuthorizedAdmin && staffList.length > 0 && (
        <div className="bg-white border border-slate-100 rounded-3xl p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 shrink-0">
            <span className="w-2.5 h-2.5 bg-indigo-500 rounded-full animate-ping" />
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Administrative Control Room (Impersonation Mode)</h4>
          </div>
          <div className="w-full md:w-80 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <select
              value={activeStaffId}
              onChange={e => {
                setActiveStaffId(e.target.value);
                setSearchQuery("");
              }}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 transition-colors"
            >
              {staffList.map(s => (
                <option key={s.id} value={s.id}>
                  {s.firstName} {s.lastName} ({s.staffCode})
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Header Profile Dashboard Overview */}
      <div className="bg-white border border-slate-100 rounded-3xl p-6 lg:p-8 shadow-sm flex flex-col md:flex-row gap-6 md:items-center justify-between">
        <div className="flex items-center gap-5">
          {/* Avatar Area with Camera Overlay upload */}
          <div className="relative group shrink-0">
            <div className="w-20 h-20 bg-slate-100 border border-slate-200 rounded-2xl flex items-center justify-center text-indigo-600 font-black text-2xl overflow-hidden shadow-sm uppercase">
              {profile.photoUrl ? (
                <img src={profile.photoUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                (profile.firstName || "S")?.charAt(0)
              )}
            </div>
            <label className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 rounded-2xl flex items-center justify-center cursor-pointer transition-all duration-200">
              <Camera className="w-5 h-5 text-white" />
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleAvatarChange} 
                className="hidden" 
                disabled={submitting === "avatar"}
              />
            </label>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-none">
                {profile.firstName} {profile.middleName} {profile.lastName}
              </h2>
              <span className="px-2.5 py-1 bg-indigo-50 border border-indigo-100 text-indigo-700 text-[10px] font-black tracking-widest uppercase rounded-lg">
                {profile.staffCode}
              </span>
            </div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5" />
              {profile.professional?.designation || profile.role} • {profile.department?.name || "Unassigned Dept"}
            </p>
          </div>
        </div>

        {/* Progress Tracker Card */}
        <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-4 md:w-80 flex items-center gap-4 shrink-0 shadow-inner">
          <div className="w-14 h-14 bg-white border border-slate-200 rounded-xl flex flex-col items-center justify-center shrink-0 shadow-sm relative">
            <span className="text-sm font-black text-indigo-600 leading-none">{stats.score}%</span>
            <span className="text-[7px] font-black text-slate-400 uppercase tracking-wider mt-1">Done</span>
          </div>
          <div className="flex-1 space-y-1 min-w-0">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Profile Completion</h4>
            <div className="w-full bg-slate-200 rounded-full h-2">
              <div 
                className="bg-indigo-600 h-2 rounded-full transition-all duration-500" 
                style={{ width: `${stats.score}%` }} 
              />
            </div>
            {stats.missing.length > 0 ? (
              <p className="text-[9px] text-indigo-500 font-bold uppercase truncate tracking-wide">
                Missing: {stats.missing[0]} {stats.missing.length > 1 && `+ ${stats.missing.length - 1} more`}
              </p>
            ) : (
              <p className="text-[9px] text-emerald-600 font-bold uppercase tracking-wide flex items-center gap-1">
                <FileCheck className="w-3 h-3" /> Fully Documented
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Details Cards (2 Cols in layout) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Personal Details Form */}
          <form onSubmit={handlePersonalUpdate} className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-5">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600">
                <User className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Personal details</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Editable profile defaults</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Date of Birth</label>
                <input 
                  type="date" 
                  value={dob}
                  onChange={e => setDob(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border-2 border-slate-100 rounded-xl outline-none focus:border-indigo-500 focus:bg-white text-xs font-bold text-slate-800"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Gender</label>
                <select 
                  value={gender}
                  onChange={e => setGender(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border-2 border-slate-100 rounded-xl outline-none focus:border-indigo-500 focus:bg-white text-xs font-bold text-slate-800"
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="md:col-span-2 space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Current Residential Address</label>
                <input 
                  type="text" 
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  placeholder="Enter current address"
                  className="w-full px-3 py-2.5 bg-slate-50 border-2 border-slate-100 rounded-xl outline-none focus:border-indigo-500 focus:bg-white text-xs font-bold text-slate-800"
                />
              </div>

              {/* Read Only Contact Fields */}
              <div className="space-y-1.5 opacity-60">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                  <Phone className="w-3 h-3" /> Registered Phone (Read-Only)
                </label>
                <input 
                  type="text" 
                  disabled
                  value={profile.phone || "Not mapped"}
                  className="w-full px-3 py-2.5 bg-slate-100 border-2 border-slate-100 rounded-xl text-xs font-bold text-slate-600 cursor-not-allowed"
                />
              </div>

              <div className="space-y-1.5 opacity-60">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                  <Mail className="w-3 h-3" /> Registered Email (Read-Only)
                </label>
                <input 
                  type="text" 
                  disabled
                  value={profile.email || "Not mapped"}
                  className="w-full px-3 py-2.5 bg-slate-100 border-2 border-slate-100 rounded-xl text-xs font-bold text-slate-600 cursor-not-allowed"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button 
                type="submit"
                disabled={submitting === "personal"}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all active:scale-[0.98]"
              >
                {submitting === "personal" && <Loader2 className="w-3 h-3 animate-spin" />}
                Save Changes
              </button>
            </div>
          </form>

          {/* Bank Details Form */}
          <form onSubmit={handleBankUpdate} className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-5">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600">
                <CreditCard className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Bank Details</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Disbursement registry</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Account Holder Name</label>
                <input 
                  type="text" 
                  value={accountName}
                  onChange={e => setAccountName(e.target.value)}
                  placeholder="Enter name as in bank passbook"
                  required
                  className="w-full px-3 py-2.5 bg-slate-50 border-2 border-slate-100 rounded-xl outline-none focus:border-indigo-500 focus:bg-white text-xs font-bold text-slate-800"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Bank Name</label>
                <input 
                  type="text" 
                  value={bankName}
                  onChange={e => setBankName(e.target.value)}
                  placeholder="e.g. State Bank of India"
                  required
                  className="w-full px-3 py-2.5 bg-slate-50 border-2 border-slate-100 rounded-xl outline-none focus:border-indigo-500 focus:bg-white text-xs font-bold text-slate-800"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Account Number</label>
                <input 
                  type="text" 
                  value={accountNumber}
                  onChange={e => setAccountNumber(e.target.value)}
                  placeholder="Enter account number"
                  required
                  className="w-full px-3 py-2.5 bg-slate-50 border-2 border-slate-100 rounded-xl outline-none focus:border-indigo-500 focus:bg-white text-xs font-bold text-slate-800"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">IFSC Code</label>
                <input 
                  type="text" 
                  value={ifscCode}
                  onChange={e => setIfscCode(e.target.value.toUpperCase())}
                  placeholder="e.g. SBIN0001234"
                  required
                  maxLength={11}
                  className="w-full px-3 py-2.5 bg-slate-50 border-2 border-slate-100 rounded-xl outline-none focus:border-indigo-500 focus:bg-white text-xs font-bold text-slate-800"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button 
                type="submit"
                disabled={submitting === "bank"}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all active:scale-[0.98]"
              >
                {submitting === "bank" && <Loader2 className="w-3 h-3 animate-spin" />}
                Update Account
              </button>
            </div>
          </form>

          {/* Health & Emergency Form */}
          <form onSubmit={handleHealthUpdate} className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-5">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600">
                <Heart className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Health & Emergency</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Critical institutional support</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Blood Group</label>
                <select 
                  value={bloodGroup}
                  onChange={e => setBloodGroup(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 bg-slate-50 border-2 border-slate-100 rounded-xl outline-none focus:border-indigo-500 focus:bg-white text-xs font-bold text-slate-800"
                >
                  <option value="">Select Blood Group</option>
                  {BLOOD_GROUPS.map(bg => (
                    <option key={bg} value={bg}>{bg}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Allergies (Optional)</label>
                <input 
                  type="text" 
                  value={allergies}
                  onChange={e => setAllergies(e.target.value)}
                  placeholder="e.g. Peanuts, Penicillin (leave blank if none)"
                  className="w-full px-3 py-2.5 bg-slate-50 border-2 border-slate-100 rounded-xl outline-none focus:border-indigo-500 focus:bg-white text-xs font-bold text-slate-800"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Emergency Contact Name</label>
                <input 
                  type="text" 
                  value={emergencyName}
                  onChange={e => setEmergencyName(e.target.value)}
                  placeholder="Enter contact person's name"
                  required
                  className="w-full px-3 py-2.5 bg-slate-50 border-2 border-slate-100 rounded-xl outline-none focus:border-indigo-500 focus:bg-white text-xs font-bold text-slate-800"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Emergency Phone Number</label>
                <input 
                  type="text" 
                  value={emergencyPhone}
                  onChange={e => setEmergencyPhone(e.target.value)}
                  placeholder="Enter 10 digit number"
                  required
                  maxLength={10}
                  className="w-full px-3 py-2.5 bg-slate-50 border-2 border-slate-100 rounded-xl outline-none focus:border-indigo-500 focus:bg-white text-xs font-bold text-slate-800"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button 
                type="submit"
                disabled={submitting === "health"}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all active:scale-[0.98]"
              >
                {submitting === "health" && <Loader2 className="w-3 h-3 animate-spin" />}
                Save Health Data
              </button>
            </div>
          </form>

          {/* Change Password Form */}
          <form onSubmit={handlePasswordUpdate} className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-5">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600">
                <Key className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Change Password</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Secure updates control</p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Only require current password if updating own profile */}
              {(!isAuthorizedAdmin || profile.email === session.userEmail) && (
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Current Password</label>
                  <input 
                    type="password" 
                    value={oldPassword}
                    onChange={e => setOldPassword(e.target.value)}
                    required
                    placeholder="Enter current password"
                    className="w-full px-3 py-2.5 bg-slate-50 border-2 border-slate-100 rounded-xl outline-none focus:border-indigo-500 focus:bg-white text-xs font-bold text-slate-800"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">New Password</label>
                  <input 
                    type="password" 
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    required
                    placeholder="Min 8 characters"
                    className="w-full px-3 py-2.5 bg-slate-50 border-2 border-slate-100 rounded-xl outline-none focus:border-indigo-500 focus:bg-white text-xs font-bold text-slate-800"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Confirm New Password</label>
                  <input 
                    type="password" 
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    required
                    placeholder="Repeat new password"
                    className="w-full px-3 py-2.5 bg-slate-50 border-2 border-slate-100 rounded-xl outline-none focus:border-indigo-500 focus:bg-white text-xs font-bold text-slate-800"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button 
                type="submit"
                disabled={submitting === "password" || !newPassword || !confirmPassword}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all active:scale-[0.98]"
              >
                {submitting === "password" && <Loader2 className="w-3 h-3 animate-spin" />}
                Change Password
              </button>
            </div>
          </form>

        </div>

        {/* Right Column: Upload Vault & Employment Details */}
        <div className="space-y-6">
          
          {/* Employment Details (Read Only) */}
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600">
                <Briefcase className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Employment Profile</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Read-only institutional audit</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center py-1.5 border-b border-slate-50">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Department</span>
                <span className="text-xs font-bold text-slate-800">{profile.department?.name || "Unassigned"}</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-slate-50">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Designation</span>
                <span className="text-xs font-bold text-slate-800">{profile.professional?.designation || "Staff"}</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-slate-50">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Date of Joining</span>
                <span className="text-xs font-bold text-slate-800">
                  {profile.professional?.dateOfJoining ? new Date(profile.professional.dateOfJoining).toLocaleDateString("en-IN", {
                    day: "numeric", month: "short", year: "numeric"
                  }) : "Not set"}
                </span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-slate-50">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Employment Type</span>
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">{profile.employmentType || "PERMANENT"}</span>
              </div>
              <div className="flex justify-between items-center py-1.5">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Status</span>
                <span className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-lg ${
                  profile.status === "Active" ? "bg-emerald-50 border border-emerald-100 text-emerald-700" : "bg-rose-50 border border-rose-100 text-rose-700"
                }`}>
                  {profile.status}
                </span>
              </div>
            </div>
          </div>

          {/* Missing Documents List Panel */}
          {stats.missing.filter(i => i.endsWith("(Document)")).length > 0 && (
            <div className="bg-amber-50/70 border border-amber-200/50 rounded-3xl p-6 space-y-3">
              <div className="flex items-center gap-2 text-amber-800">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <h4 className="text-xs font-black uppercase tracking-wider">Action Required: Missing Documents</h4>
              </div>
              <ul className="space-y-1.5 list-disc list-inside text-xs font-bold text-amber-700">
                {stats.missing
                  .filter(i => i.endsWith("(Document)"))
                  .map(item => (
                    <li key={item}>{item.replace(" (Document)", "")}</li>
                  ))}
              </ul>
            </div>
          )}

          {/* Document Upload Zone */}
          <form onSubmit={handleUpload} className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600">
                <UploadCloud className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                  {replacingDocId ? "Replace Document" : "Upload Document"}
                </h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Encrypted vault storage</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Document Type</label>
                <select 
                  value={selectedDocType}
                  onChange={e => setSelectedDocType(e.target.value)}
                  disabled={!!replacingDocId}
                  className="w-full px-3 py-2.5 bg-slate-50 border-2 border-slate-100 rounded-xl outline-none focus:border-indigo-500 focus:bg-white text-xs font-bold text-slate-800 disabled:opacity-50"
                >
                  {DOCUMENT_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              {/* Custom document name / label */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  Document Description / Custom Label
                </label>
                <input 
                  type="text"
                  value={customName}
                  onChange={e => setCustomName(e.target.value)}
                  placeholder="e.g. 1st Semester Certificate, PAN Card Back"
                  className="w-full px-3 py-2.5 bg-slate-50 border-2 border-slate-100 rounded-xl outline-none focus:border-indigo-500 focus:bg-white text-xs font-bold text-slate-800"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Select File</label>
                <div className="relative border-2 border-dashed border-slate-200 hover:border-indigo-500/50 rounded-2xl p-4 text-center cursor-pointer transition-colors bg-slate-50/50 hover:bg-slate-50">
                  <input 
                    type="file" 
                    id="staff-file-picker"
                    onChange={handleFileChange}
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="space-y-2">
                    <UploadCloud className="w-8 h-8 text-slate-400 mx-auto" />
                    <p className="text-xs font-bold text-slate-700 truncate max-w-[200px] mx-auto">
                      {selectedFile ? selectedFile.name : "Drag & drop or browse files"}
                    </p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider leading-relaxed">
                      PDF, JPG, JPEG, PNG (10KB - 10MB)
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              {replacingDocId && (
                <button 
                  type="button"
                  onClick={() => {
                    setReplacingDocId(null);
                    setSelectedFile(null);
                    setCustomName("");
                  }}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black uppercase tracking-widest transition-all active:scale-[0.98]"
                >
                  Cancel
                </button>
              )}
              <button 
                type="submit"
                disabled={uploadProgress || !selectedFile}
                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
              >
                {uploadProgress ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-3.5 h-3.5" />
                    {replacingDocId ? "Replace File" : "Submit File"}
                  </>
                )}
              </button>
            </div>
          </form>

        </div>
      </div>

      {/* Structured Documents Table */}
      <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
          <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">My Document Vault</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Secure credential mapping</p>
          </div>
        </div>

        {profile.staffDocuments && profile.staffDocuments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="py-3 px-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Document Type</th>
                  <th className="py-3 px-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Custom Label</th>
                  <th className="py-3 px-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Uploaded On</th>
                  <th className="py-3 px-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">File Size</th>
                  <th className="py-3 px-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {profile.staffDocuments.map((doc: any) => (
                  <tr key={doc.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 text-xs font-black">
                          📄
                        </div>
                        <div>
                          <span className="text-xs font-black text-slate-800 leading-none">{doc.documentType}</span>
                          <span className="block text-[8px] text-slate-400 font-bold mt-0.5 truncate max-w-xs">{doc.originalFileName}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-xs font-bold text-slate-700">
                      {doc.customName || <span className="text-slate-400 italic">No custom label</span>}
                    </td>
                    <td className="py-4 px-4 text-xs font-bold text-slate-500">
                      {new Date(doc.uploadedDate).toLocaleDateString("en-IN", {
                        day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
                      })}
                    </td>
                    <td className="py-4 px-4 text-xs font-bold text-slate-500">
                      {formatBytes(doc.fileSize)}
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="flex justify-end gap-1.5">
                        <a 
                          href={doc.fileUrl} 
                          target="_blank" 
                          rel="noreferrer"
                          className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-100 hover:bg-indigo-50 transition-all"
                          title="View Document"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </a>
                        <a 
                          href={doc.fileUrl} 
                          download={doc.originalFileName}
                          className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-100 hover:bg-indigo-50 transition-all"
                          title="Download Document"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                        <button 
                          onClick={() => {
                            setReplacingDocId(doc.id);
                            setSelectedDocType(doc.documentType);
                            setCustomName(doc.customName || "");
                            const fileInput = document.getElementById("staff-file-picker");
                            if (fileInput) fileInput.click();
                          }}
                          className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-100 hover:bg-indigo-50 transition-all"
                          title="Replace Document"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => handleDeleteDocument(doc.id, doc.documentType)}
                          disabled={submitting === `delete-${doc.id}`}
                          className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:text-rose-600 hover:border-rose-100 hover:bg-rose-50 transition-all"
                          title="Delete Document"
                        >
                          {submitting === `delete-${doc.id}` ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-8 text-center bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-200 space-y-2">
            <FileText className="w-10 h-10 text-slate-300 mx-auto" />
            <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest">No Documents Uploaded</h4>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Fill in the panel above to submit credentials</p>
          </div>
        )}
      </div>
    </div>
  );
}
