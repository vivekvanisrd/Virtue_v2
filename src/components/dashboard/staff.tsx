import React, { useState } from "react";
import { Users, UserPlus } from "lucide-react";
import { getStaffDirectoryAction, getStaffByIdAction } from "@/lib/actions/staff-actions";
import { StaffDirectory } from "../staff/staff-directory";
import { StaffForm } from "../staff/staff-form";
import { StaffOnboardingElite } from "../staff/staff-onboarding-elite";
import { StaffAttendanceSheet } from "../staff/StaffAttendanceSheet"; // Keeping import for legacy ref
import { AttendanceCommandCenter } from "../attendance/v2-1/AttendanceCommandCenter";
import { StaffRolesHub } from "./staff-roles-hub";
import { StaffBulkPortal } from "../staff/staff-bulk-portal";
import { StaffFinancialVault } from "../staff/StaffFinancialVault";

interface StaffContentProps {
  tabId?: string;
  params?: Record<string, any>;
}

export function StaffContent({ tabId, params }: StaffContentProps) {
  const [activeView, setActiveView] = useState<"directory" | "onboard" | "edit" | "pro-onboard" | "bulk-onboard" | "financial-vault">("directory");
  const [editingStaff, setEditingStaff] = useState<any>(null);
  const [experienceMode, setExperienceMode] = useState<"standard" | "elite">("elite");
  const [initializedId, setInitializedId] = useState<string | null>(null);

  const [isRefreshing, setIsRefreshing] = useState(false);

  // 🏛️ SOVEREIGN HYDRATION: Auto-load profile if params are present
  React.useEffect(() => {
    if (params?.staffId && params.staffId !== initializedId) {
        setInitializedId(params.staffId);
        
        // Split Hydration: Profile vs Financials
        if (params.view === "financials") {
           setEditingStaff({ id: params.staffId });
           setActiveView("financial-vault");
        } else {
           handleEdit({ id: params.staffId });
        }
    }
  }, [params?.staffId, params?.view]);

  const handleEdit = async (staffSummary: any) => {
    setIsRefreshing(true);
    try {
        console.log("🧬 [StaffHub] Initiating Deep-Force Retrieval for:", staffSummary.id);
        const result = await getStaffByIdAction(staffSummary.id);
        
        if (!result.success || !result.data) {
            throw new Error("RECOV_FAILURE: Could not retrieve full record depth.");
        }

        const staff = result.data;
        
        // Mapping DB model to Form structure
        const formatDate = (date: any) => {
            if (!date) return "";
            try {
                const d = new Date(date);
                if (isNaN(d.getTime())) return "";
                // Zero-Drift Strategy: Use UTC components to build YYYY-MM-DD
                const yyyy = d.getUTCFullYear();
                const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
                const dd = String(d.getUTCDate()).padStart(2, '0');
                return `${yyyy}-${mm}-${dd}`;
            } catch (e) {
                return "";
            }
        };

        // Absolute Truth Mapping
        const formData = {
            id: staff.id,
            firstName: staff.firstName?.trim() || "",
            lastName: staff.lastName?.trim() || "",
            middleName: staff.middleName?.trim() || "",
            email: staff.email?.trim() || "",
            phone: staff.phone?.trim() || "",
            gender: staff.gender || "Female",
            role: staff.role || "Teacher",
            schoolId: staff.schoolId || "",
            branchId: staff.branchId || "",
            dob: formatDate(staff.dob),
            address: staff.address || "",
            onboardingStatus: staff.onboardingStatus || "JOINED",
            // Professional Mapping (Safe Numbers)
            designation: staff.professional?.designation || "",
            department: staff.professional?.department || "",
            qualification: staff.professional?.qualification || "",
            experienceYears: Number(staff.professional?.experienceYears) || 0,
            dateOfJoining: formatDate(staff.professional?.dateOfJoining),
            basicSalary: Number(staff.professional?.basicSalary) || 0,
            // Statutory Mapping
            panNumber: staff.statutory?.panNumber || "",
            pfNumber: staff.statutory?.pfNumber || "",
            uanNumber: staff.statutory?.uanNumber || "",
            esiNumber: staff.statutory?.esiNumber || "",
            aadhaarNumber: staff.statutory?.aadhaarNumber || "",
            // Bank Mapping
            bankName: staff.bank?.bankName || "",
            accountName: staff.bank?.accountName || "",
            accountNumber: staff.bank?.accountNumber || "",
            ifscCode: staff.bank?.ifscCode || ""
        };

        // Attach raw record for transparency box
        (formData as any)._raw_incoming = staff;

        setEditingStaff(formData);
        setActiveView(experienceMode === "elite" ? "pro-onboard" : "onboard");
    } catch (e: any) {
        console.error("❌ [StaffHub_DeepFetch_Error]", e.message);
        // Fallback to summary if deep fetch fails
        setEditingStaff(staffSummary);
        setActiveView("onboard");
    } finally {
        setIsRefreshing(false);
    }
  };

  return (
    <div className="space-y-4 h-full">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            {activeView === "directory" ? "Staff Directory" : 
             activeView === "financial-vault" ? "Personnel Financial Vault" :
             (editingStaff ? "Personnel Correction" : "Enrolling Personnel")}
          </h2>
          <p className="text-foreground opacity-50 font-medium text-[10px] uppercase tracking-wider">
            {activeView === "directory" ? "Search, filter and manage all school personnel" : "Modify existing records and professional data"}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {activeView === "directory" ? (
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setExperienceMode(experienceMode === "standard" ? "elite" : "standard");
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                  experienceMode === "elite" 
                  ? "bg-indigo-50 border-indigo-200 text-indigo-600 shadow-sm" 
                  : "bg-slate-50 border-slate-200 text-slate-600 shadow-sm"
                }`}
              >
                🚀 {experienceMode === "elite" ? "Elite Mode Active" : "Standard Mode Active"}
              </button>
              <button 
                 onClick={() => {
                    setEditingStaff(null);
                    setActiveView(experienceMode === "elite" ? "pro-onboard" : "onboard");
                 }}
                 className="flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-100 transition-all"
              >
                 <UserPlus className="w-4 h-4" /> Add Personnel
              </button>
              <button 
                 onClick={() => setActiveView("bulk-onboard")}
                 className="flex items-center gap-2 px-4 py-2 border border-slate-200 hover:border-slate-300 text-slate-600 rounded-xl text-xs font-bold transition-all"
              >
                 Bulk Onboarding
              </button>
            </div>
          ) : (
            <button
               onClick={() => {
                  setActiveView("directory");
                  setEditingStaff(null);
               }}
               className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all shadow-sm active:scale-95"
            >
               <Users className="w-4 h-4" /> Back to Directory
            </button>
          )}
        </div>
      </div>
      
      {tabId === "staff-attendance" ? (
         <AttendanceCommandCenter />
      ) : tabId === "staff-roles" ? (
         <StaffRolesHub />
      ) : (
         <div className="min-h-screen pb-20">
        {activeView === "directory" ? (
            <StaffDirectory onEdit={(staff: any) => handleEdit(staff)} />
         ) : activeView === "onboard" || activeView === "edit" ? (
            <StaffForm 
                mode={activeView as any} 
                staffId={editingStaff?.id} 
                initialData={editingStaff} 
                onCancel={() => {
                    setActiveView("directory");
                    setEditingStaff(null);
                }} 
            />
         ) : activeView === "pro-onboard" ? (
            <StaffOnboardingElite 
              mode={editingStaff ? "edit" : "onboard"}
              staffId={editingStaff?.id}
              initialData={editingStaff}
              onCancel={() => {
                setActiveView("directory");
                setEditingStaff(null);
              }}
              onSuccess={() => {
                // Re-verification will happen on redirect
              }}
            />
         ) : activeView === "financial-vault" ? (
             <StaffFinancialVault 
               staffId={editingStaff?.id} 
               onBack={() => setActiveView("directory")} 
             />
         ) : activeView === "bulk-onboard" ? (
             <StaffBulkPortal onBack={() => setActiveView("directory")} />
         ) : null}
      </div>
      )}
    </div>
  );
}
