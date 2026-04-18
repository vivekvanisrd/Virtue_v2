import React from "react";
import { PublicPaymentPortal } from "@/components/finance/PublicPaymentPortal";

export const dynamic = "force-dynamic";

type Params = Promise<{ token: string }>;

export default async function PublicPaymentPage({ params }: { params: Params }) {
  const { token } = await params;
  
  return (
    <div className="min-h-screen bg-slate-50 font-sans">
       <PublicPaymentPortal token={token} />
    </div>
  );
}
