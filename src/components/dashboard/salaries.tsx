"use client";

import React from "react";
import { PayrollManager } from "../staff/PayrollManager";
import { SalaryHub } from "../salaries/SalaryHub";
import { SalaryRegistry } from "../salaries/SalaryRegistry";
import { StaffAdvanceManager } from "../salaries/StaffAdvanceManager";

interface SalariesContentProps {
  tabId: string;
}

export function SalariesContent({ tabId }: SalariesContentProps) {
  if (tabId === "salaries") {
    return <SalaryHub />;
  }

  if (tabId === "salary-dashboard") {
    return <SalaryHub />;
  }

  if (tabId === "salary-manager" || tabId === "salary-batches") {
    return <PayrollManager />;
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
