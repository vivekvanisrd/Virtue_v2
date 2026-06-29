"use client";

import React, { createContext, useContext, ReactNode } from "react";

interface TenantContextType {
  schoolId: string;
  schoolName: string;
  branchId: string;
  userRole: string;
  userName: string;
  userEmail?: string;
  academicYear: string;
  isOperationalReady: boolean;
  capabilities: Record<string, boolean>;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export function TenantProvider({ 
  children, 
  value 
}: { 
  children: ReactNode; 
  value: TenantContextType 
}) {
  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error("useTenant must be used within a TenantProvider");
  }
  return context;
}

export function useCapability(capability: string): boolean {
  const context = useContext(TenantContext);
  if (!context) return false;
  
  // System Admins/Owners inherently have all permissions
  if (context.userRole === 'OWNER' || context.userRole === 'DEVELOPER') return true;
  
  return !!context.capabilities[capability];
}

/**
 * useOptionalTenant
 * 
 * Safe version of useTenant for public-facing components (like EnquiryForm).
 * Returns undefined if no provider is present, allowing components to fall back to defaults.
 */
export function useOptionalTenant() {
  return useContext(TenantContext);
}
