"use client";

import React from "react";
import { SalaryCommandCenter } from "../salaries/v2-1/SalaryCommandCenter";
import { SalaryRegistry } from "../salaries/SalaryRegistry";
import { StaffAdvanceManager } from "../salaries/StaffAdvanceManager";
import { useTenant } from "@/context/tenant-context";

interface SalariesContentProps {
  tabId: string;
}

export function SalariesContent({ tabId }: SalariesContentProps) {
  const { branchId } = useTenant();

  if (tabId === "salaries" || tabId === "salary-dashboard") {
    return <SalaryCommandCenter />;
  }

  if (tabId === "salary-manager" || tabId === "salary-batches") {
    return <SalaryCommandCenter />;
  }

  if (tabId === "salary-payments") {
    return <SalaryRegistry />;
  }

  if (tabId === "salary-advances") {
    return <StaffAdvanceManager />;
  }

  return (
    <div className="flex flex-col items-center justify-center h-full text-foreground opacity-30 py-40">
      <h2 className="text-2xl font-bold italic text-blue-500">Salary Module Functionality</h2>
      <p>The {tabId} section is currently under development.</p>
    </div>
  );
}
