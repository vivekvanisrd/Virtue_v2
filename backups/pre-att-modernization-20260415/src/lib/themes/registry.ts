export interface Theme {
  id: string;
  name: string;
  colors: {
    "--background": string;
    "--foreground": string;
    "--primary": string;
    "--primary-foreground": string;
    "--accent": string;
    "--muted": string;
    "--border": string;
    "--card": string;
    "--sidebar-bg": string;
    "--sidebar-foreground": string;
    "--sidebar-muted": string;
    "--header-bg": string;
    "--header-foreground": string;
  };
}

export const themes: Theme[] = [
  {
    id: "midnight",
    name: "Midnight Premium",
    colors: {
      "--background": "#020617",
      "--foreground": "#f8fafc",
      "--primary": "#6366f1",
      "--primary-foreground": "#ffffff",
      "--accent": "#8b5cf6",
      "--muted": "#1e293b",
      "--border": "rgba(255, 255, 255, 0.1)",
      "--card": "#0f172a",
      "--sidebar-bg": "#020617",
      "--sidebar-foreground": "#ffffff",
      "--sidebar-muted": "rgba(255, 255, 255, 0.5)",
      "--header-bg": "rgba(2, 6, 23, 0.8)",
      "--header-foreground": "#ffffff",
    }
  },
  {
    id: "clean-light",
    name: "Clean Light",
    colors: {
      "--background": "#f8fafc",
      "--foreground": "#0f172a",
      "--primary": "#4f46e5",
      "--primary-foreground": "#ffffff",
      "--accent": "#6366f1",
      "--muted": "#f1f5f9",
      "--border": "#e2e8f0",
      "--card": "#ffffff",
      "--sidebar-bg": "#f1f5f9",
      "--sidebar-foreground": "#0f172a",
      "--sidebar-muted": "#64748b",
      "--header-bg": "rgba(255, 255, 255, 0.8)",
      "--header-foreground": "#0f172a",
    }
  },
  {
    id: "high-contrast",
    name: "High Contrast",
    colors: {
      "--background": "#000000",
      "--foreground": "#ffffff",
      "--primary": "#ffff00",
      "--primary-foreground": "#000000",
      "--accent": "#00ffff",
      "--muted": "#1a1a1a",
      "--border": "#ffffff",
      "--card": "#000000",
      "--sidebar-bg": "#000000",
      "--sidebar-foreground": "#ffffff",
      "--sidebar-muted": "#888888",
      "--header-bg": "#000000",
      "--header-foreground": "#ffffff",
    }
  },
  {
    id: "pava-classic",
    name: "PaVa-EDUX Classic",
    colors: {
      "--background": "#ffffff",
      "--foreground": "#000000",
      "--primary": "#0047ab",
      "--primary-foreground": "#ffffff",
      "--accent": "#f7941d",
      "--muted": "#f1f5f9",
      "--border": "#e2e8f0",
      "--card": "#ffffff",
      "--sidebar-bg": "#ffffff",
      "--sidebar-foreground": "#000000",
      "--sidebar-muted": "rgba(0, 0, 0, 0.4)",
      "--header-bg": "#ffffff",
      "--header-foreground": "#000000",
    }
  },
  {
    id: "pava-bright",
    name: "PaVa-EDUX Bright (Sky & Saffron)",
    colors: {
      "--background": "#ffffff",
      "--foreground": "#333333",
      "--primary": "#4DA8DA",
      "--primary-foreground": "#ffffff",
      "--accent": "#FF9933",
      "--muted": "#F5F5F5",
      "--border": "#DDDDDD",
      "--card": "#ffffff",
      "--sidebar-bg": "#1E5F8A",
      "--sidebar-foreground": "#ffffff",
      "--sidebar-muted": "rgba(255, 255, 255, 0.6)",
      "--header-bg": "#1E5F8A",
      "--header-foreground": "#ffffff",
    }
  }
];

export const getTheme = (id: string) => themes.find(t => t.id === id) || themes[0];
