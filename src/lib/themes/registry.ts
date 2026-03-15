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
    }
  }
];

export const getTheme = (id: string) => themes.find(t => t.id === id) || themes[0];
