"use client";

import React, { Suspense, useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams, usePathname } from "next/navigation";
import { Home, CreditCard, Calendar, BookOpen, GraduationCap, Bus, Bell, MessageSquare } from "lucide-react";
import { getUnreadParentNotificationsCountAction } from "@/lib/actions/guardian-notification-actions";

interface ParentSidebarNavProps {
  unreadCount: number;
}

function SidebarNavContent({ unreadCount }: ParentSidebarNavProps) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const studentId = searchParams.get("studentId");
  const [localUnreadCount, setLocalUnreadCount] = useState(unreadCount);

  useEffect(() => {
    setLocalUnreadCount(unreadCount);
  }, [unreadCount]);

  useEffect(() => {
    const pollUnread = async () => {
      try {
        const res = await getUnreadParentNotificationsCountAction();
        if (res && typeof res.count === "number") {
          setLocalUnreadCount(res.count);
        }
      } catch (err) {
        console.error("Failed to poll unread count:", err);
      }
    };

    const interval = setInterval(pollUnread, 15000);
    return () => clearInterval(interval);
  }, []);

  const getHref = (basePath: string) => {
    return studentId ? `${basePath}?studentId=${studentId}` : basePath;
  };

  const isActive = (path: string) => {
    return pathname === path;
  };

  const linkStyle = (path: string) => {
    return `flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all border ${
      isActive(path)
        ? "bg-primary/10 border-primary/20 text-primary"
        : "bg-card border-border/80 hover:border-primary/50 text-foreground"
    }`;
  };

  const notificationsActive = isActive("/parent/dashboard/notifications");

  const notificationsLinkStyle = () => {
    if (localUnreadCount > 0 && !notificationsActive) {
      return `flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all border bg-rose-500/10 border-rose-500/35 text-rose-600 hover:bg-rose-500/15 shadow-[0_0_12px_rgba(244,63,94,0.15)] animate-[pulse_2s_infinite]`;
    }
    return linkStyle("/parent/dashboard/notifications");
  };

  return (
    <>
      <style>{`
        @keyframes ring-bell {
          0%, 100% { transform: rotate(0); }
          10%, 30%, 50%, 70%, 90% { transform: rotate(10deg); }
          20%, 40%, 60%, 80% { transform: rotate(-10deg); }
        }
        .animate-bell-shake {
          animation: ring-bell 1.5s ease-in-out infinite;
          transform-origin: top center;
        }
      `}</style>
      <nav className="space-y-1.5">
        <Link href={getHref("/parent/dashboard")} className={linkStyle("/parent/dashboard")}>
          <Home className="w-4 h-4 text-primary" /> Dashboard
        </Link>
        <Link href={getHref("/parent/dashboard/fees")} className={linkStyle("/parent/dashboard/fees")}>
          <CreditCard className="w-4 h-4 text-primary" /> Fees & Payments
        </Link>
        <Link href={getHref("/parent/dashboard/attendance")} className={linkStyle("/parent/dashboard/attendance")}>
          <Calendar className="w-4 h-4 text-primary" /> Attendance
        </Link>
        <Link href={getHref("/parent/dashboard/homework")} className={linkStyle("/parent/dashboard/homework")}>
          <BookOpen className="w-4 h-4 text-primary" /> Timetable & Homework
        </Link>
        <Link href={getHref("/parent/dashboard/academics")} className={linkStyle("/parent/dashboard/academics")}>
          <GraduationCap className="w-4 h-4 text-primary" /> Academics & Grades
        </Link>
        <Link href={getHref("/parent/dashboard/transport")} className={linkStyle("/parent/dashboard/transport")}>
          <Bus className="w-4 h-4 text-primary" /> Transport GPS Track
        </Link>
        <Link href={getHref("/parent/dashboard/feedback")} className={linkStyle("/parent/dashboard/feedback")}>
          <MessageSquare className="w-4 h-4 text-primary" /> Suggestions & Review
        </Link>
        <Link href={getHref("/parent/dashboard/notifications")} className={notificationsLinkStyle()}>
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
              <Bell className={`w-4 h-4 ${localUnreadCount > 0 ? "animate-bell-shake text-rose-500" : "text-primary"}`} /> Notifications
            </div>
            {localUnreadCount > 0 && (
              <span className="px-2 py-0.5 bg-rose-500 text-white rounded-full text-[10px] font-black tracking-wide animate-pulse">
                {localUnreadCount}
              </span>
            )}
          </div>
        </Link>
      </nav>
    </>
  );
}

export function ParentSidebarNav({ unreadCount }: ParentSidebarNavProps) {
  return (
    <Suspense fallback={
      <nav className="space-y-1.5 animate-pulse">
        <div className="h-11 bg-card border border-border/80 rounded-xl"></div>
        <div className="h-11 bg-card border border-border/80 rounded-xl"></div>
        <div className="h-11 bg-card border border-border/80 rounded-xl"></div>
      </nav>
    }>
      <SidebarNavContent unreadCount={unreadCount} />
    </Suspense>
  );
}
