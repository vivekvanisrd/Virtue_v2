import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Virtue V2 | Enterprise School ERP",
  description: "Experience lightning-fast school management with Virtue Enterprise",
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
