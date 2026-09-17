import type { Metadata } from "next";

// Wraps both /simple/login and /simple/(app)/* (route groups don't break
// layout nesting) — its only job is to swap in a separate manifest so the
// Fees & Students module can be installed as its own home-screen app,
// distinct from the main "Virtue Dashboard" PWA that everything else in this
// site installs as.
export const metadata: Metadata = {
  title: "Fees & Students",
  manifest: "/simple-manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Fees & Students",
  },
};

export default function SimpleRootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
