import React from "react";
import { getGuardianIdentity } from "@/lib/auth/guardian-backbone";
import { redirect } from "next/navigation";
import { ParentNotificationsHub } from "@/components/parent/ParentNotificationsHub";
import { getParentNotificationsAction } from "@/lib/actions/guardian-notification-actions";

export default async function ParentNotificationsPage() {
  const identity = await getGuardianIdentity();
  if (!identity) {
    redirect("/parent/login");
  }

  const notificationRes = await getParentNotificationsAction();
  const initialNotifications = notificationRes.success ? notificationRes.data || [] : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight">Notifications & Bulletins</h1>
        <p className="text-xs opacity-55 mt-1 font-semibold">Stay updated with official school communications, fee alerts, and transaction records</p>
      </div>
      <ParentNotificationsHub 
        initialNotifications={initialNotifications} 
        parentEmail={identity.email}
        parentPhone={identity.phone}
      />
    </div>
  );
}
