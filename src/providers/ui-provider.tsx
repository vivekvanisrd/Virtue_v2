"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { themes, Theme, getTheme } from "@/lib/themes/registry";

interface UIContextType {
  theme: Theme;
  fontScale: number;
  setTheme: (id: string) => void;
  setFontScale: (scale: number) => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export function UIProvider({ children }: { children: React.ReactNode }) {
  const [themeId, setThemeId] = useState("midnight");
  const [fontScale, setFontScale] = useState(1.0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Load preferences
    const savedTheme = localStorage.getItem("ui-theme") || "midnight";
    const savedScale = parseFloat(localStorage.getItem("ui-font-scale") || "1.0");
    setThemeId(savedTheme);
    setFontScale(savedScale);
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const theme = getTheme(themeId);
    const root = document.documentElement;

    // Apply colors
    Object.entries(theme.colors).forEach(([property, value]) => {
      root.style.setProperty(property, value);
    });

    // Apply font scale
    // This affects all 'rem' units in Tailwind/CSS
    root.style.fontSize = `${fontScale * 16}px`;

    // Save preferences
    localStorage.setItem("ui-theme", themeId);
    localStorage.setItem("ui-font-scale", fontScale.toString());
  }, [themeId, fontScale, mounted]);

  const value = {
    theme: getTheme(themeId),
    fontScale,
    setTheme: (id: string) => setThemeId(id),
    setFontScale: (scale: number) => setFontScale(scale),
  };

  return (
    <UIContext.Provider value={value}>
      {/* Add a key to force re-render on mount if needed, or handle flash of unstyled content */}
      <div className={mounted ? "visible" : "invisible"}>
        {children}
      </div>
    </UIContext.Provider>
  );
}

export function useUI() {
  const context = useContext(UIContext);
  
  // 🏁 SSR Safety: Prevent crash during server-side pre-rendering
  if (context === undefined) {
    if (typeof window === "undefined") {
      return {
        theme: themes[0],
        fontScale: 1.0,
        setTheme: () => {},
        setFontScale: () => {},
      };
    }
    throw new Error("useUI must be used within a UIProvider");
  }
  return context;
}
