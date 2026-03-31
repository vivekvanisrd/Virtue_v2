"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from "react";
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
  icon?: LucideIcon | any;
  component: string;
  params?: Record<string, any>;
  isDirty?: boolean;
}

interface TabContextType {
  tabs: Tab[];
  activeTabId: string;
  openTab: (tab: Tab) => void;
  closeTab: (id: string, force?: boolean) => void;
  closeAllTabs: (force?: boolean) => void;
  setTabDirty: (id: string, isDirty: boolean) => void;
  setActiveTabId: (id: string) => void;
}

const TabContext = createContext<TabContextType | undefined>(undefined);

export function TabProvider({ children }: { children: ReactNode }) {
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTabId, setActiveTabId] = useState("");
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize from cache or URL
  useEffect(() => {
    try {
      const savedTabs = localStorage.getItem("virtue_workspace_tabs_v2");
      const savedActive = localStorage.getItem("virtue_workspace_active_v2");
      
      let initialTabs: Tab[] = [{ id: "overview", title: "Dashboard", icon: LayoutDashboard, component: "Overview" }];
      let initialActive = "overview";

      if (savedTabs) {
        const parsed = JSON.parse(savedTabs);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Ensure we don't restore dirty states from cache (safety first)
          initialTabs = parsed.map((t: any) => ({ ...t, isDirty: false }));
        }
      }
      if (savedActive) {
        initialActive = savedActive;
      }

      // Sync from URL if directly linked or back/forward navigated
      const params = new URLSearchParams(window.location.search);
      const urlTab = params.get("tab");
      const studentId = params.get("studentId");

      if (urlTab) {
        initialActive = urlTab;
        const existingTab = initialTabs.find(t => t.id === urlTab);
        
        if (!existingTab) {
          const title = urlTab.startsWith("student-profile-") ? "Profile" : urlTab.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
          initialTabs.push({ 
            id: urlTab, 
            title: title, 
            component: urlTab.toLowerCase().includes("fee") ? "Finance" : (urlTab.startsWith("student-profile-") ? "Students" : "Recovery"),
            params: studentId ? { studentId } : undefined
          });
        } else if (studentId) {
          existingTab.params = { ...existingTab.params, studentId };
        }
      }

      setTabs(initialTabs);
      setActiveTabId(initialActive);
      setIsInitialized(true);
    } catch (e) {
      console.error("Workspace hydration failed:", e);
      setTabs([{ id: "overview", title: "Dashboard", icon: LayoutDashboard, component: "Overview" }]);
      setActiveTabId("overview");
      setIsInitialized(true);
    }
  }, []);

  // Save to cache and push to browser history
  useEffect(() => {
    if (!isInitialized) return;
    
    try {
      // Don't save isDirty to localStorage - state should be fresh on reload
      const serializableTabs = tabs.map(({ icon, isDirty, ...rest }) => rest);
      localStorage.setItem("virtue_workspace_tabs_v2", JSON.stringify(serializableTabs));
      localStorage.setItem("virtue_workspace_active_v2", activeTabId);
      
      const url = new URL(window.location.href);
      const activeTab = tabs.find(t => t.id === activeTabId);
      
      let paramsChanged = false;
      if (url.searchParams.get("tab") !== activeTabId) {
        url.searchParams.set("tab", activeTabId);
        paramsChanged = true;
      }

      // Sync studentId specifically for Finance/Fee modules
      if (activeTab?.params?.studentId) {
        if (url.searchParams.get("studentId") !== activeTab.params.studentId) {
          url.searchParams.set("studentId", activeTab.params.studentId);
          paramsChanged = true;
        }
      } else if (url.searchParams.has("studentId")) {
        url.searchParams.delete("studentId");
        paramsChanged = true;
      }

      if (paramsChanged) {
        window.history.pushState({ tab: activeTabId }, "", url.toString());
      }
    } catch (e) {
      console.error("Workspace sync failed:", e);
    }
  }, [tabs, activeTabId, isInitialized]);

  // Listen for back/forward browser navigation
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const urlTab = params.get("tab") || "overview";
      setActiveTabId(urlTab);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const openTab = useCallback((tab: Tab) => {
    setTabs(prev => {
      const existingIndex = prev.findIndex(t => t.id === tab.id);
      if (existingIndex > -1) {
        // Only update if something changed (avoiding shallow merge checks for now, but keeping structure)
        const updated = [...prev];
        updated[existingIndex] = { ...updated[existingIndex], ...tab };
        return updated;
      }
      return [...prev, tab];
    });
    setActiveTabId(tab.id);
  }, []);

  const setTabDirty = useCallback((id: string, isDirty: boolean) => {
    setTabs(prev => {
      const target = prev.find(t => t.id === id);
      if (!target || target.isDirty === isDirty) return prev;
      return prev.map(t => t.id === id ? { ...t, isDirty } : t);
    });
  }, []);

  const closeTab = useCallback((id: string, force?: boolean) => {
    if (id === "overview") return;

    setTabs(prev => {
      const tabToClose = prev.find(t => t.id === id);
      if (!tabToClose || (tabToClose.isDirty && !force)) return prev;

      const filtered = prev.filter(t => t.id !== id);
      
      // Handle active tab redirection if needed
      if (activeTabId === id && filtered.length > 0) {
        setActiveTabId(filtered[filtered.length - 1].id);
      }
      
      return filtered;
    });
  }, [activeTabId]);

  const closeAllTabs = useCallback((force?: boolean) => {
    setTabs(prev => {
      const dirtyTabs = prev.filter(t => t.isDirty);
      const overviewTab = prev.find(t => t.id === "overview") || { id: "overview", title: "Dashboard", icon: LayoutDashboard, component: "Overview" };
      
      if (force) {
        setActiveTabId("overview");
        return [overviewTab, ...dirtyTabs];
      }

      if (dirtyTabs.length === 0) {
        setActiveTabId("overview");
        return [overviewTab];
      }

      return prev;
    });
  }, []);

  const value = useMemo(() => ({
    tabs,
    activeTabId,
    openTab,
    closeTab,
    closeAllTabs,
    setTabDirty,
    setActiveTabId
  }), [tabs, activeTabId, openTab, closeTab, closeAllTabs, setTabDirty]);

  return (
    <TabContext.Provider value={value}>
      {children}
    </TabContext.Provider>
  );
}

export function useTabs() {
  const context = useContext(TabContext);
  if (!context) throw new Error("useTabs must be used within a TabProvider");
  return context;
}
