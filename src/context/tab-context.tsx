"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";
import { 
  LayoutDashboard, 
  GraduationCap, 
  Users, 
  Wallet, 
  Settings,
  LucideIcon 
} from "lucide-react";

export interface Tab {
  id: string;
  title: string;
  icon: LucideIcon;
  component: string; // We'll map this to a component
}

interface TabContextType {
  tabs: Tab[];
  activeTabId: string;
  openTab: (tab: Tab) => void;
  closeTab: (id: string) => void;
  setActiveTabId: (id: string) => void;
}

const TabContext = createContext<TabContextType | undefined>(undefined);

export function TabProvider({ children }: { children: ReactNode }) {
  const [tabs, setTabs] = useState<Tab[]>([
    { id: "overview", title: "Dashboard", icon: LayoutDashboard, component: "Overview" }
  ]);
  const [activeTabId, setActiveTabId] = useState("overview");

  const openTab = (tab: Tab) => {
    if (!tabs.find(t => t.id === tab.id)) {
      setTabs([...tabs, tab]);
    }
    setActiveTabId(tab.id);
  };

  const closeTab = (id: string) => {
    const filteredTabs = tabs.filter(t => t.id !== id);
    setTabs(filteredTabs);
    
    // If we closed the active tab, switch to the last available tab
    if (activeTabId === id && filteredTabs.length > 0) {
      setActiveTabId(filteredTabs[filteredTabs.length - 1].id);
    }
  };

  return (
    <TabContext.Provider value={{ tabs, activeTabId, openTab, closeTab, setActiveTabId }}>
      {children}
    </TabContext.Provider>
  );
}

export function useTabs() {
  const context = useContext(TabContext);
  if (!context) throw new Error("useTabs must be used within a TabProvider");
  return context;
}
