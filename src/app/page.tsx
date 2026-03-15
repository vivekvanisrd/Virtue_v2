"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to login as the entry point
    router.push("/login");
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#1a1a2e]">
      <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
    </div>
  );
}
