import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const viewport = {
  themeColor: "#0f172a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: 0,
};

export const metadata: Metadata = {
  title: "Virtue Enterprise",
  description: "Experience lightning-fast school management with Virtue Enterprise",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Virtue",
  },
};

import { UIProvider } from "@/providers/ui-provider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <UIProvider>
          <div className="min-h-screen relative overflow-x-hidden">
            {children}
          </div>
        </UIProvider>
      </body>
    </html>
  );
}
