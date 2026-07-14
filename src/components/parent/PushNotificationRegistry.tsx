"use client";

import { useEffect } from "react";
import { usePushNotifications } from "@/notifications/hooks/usePushNotifications";

export function PushNotificationRegistry() {
  const { requestPermission, permission } = usePushNotifications();

  useEffect(() => {
    // Prompt the user to allow notifications if they haven't made a selection yet
    if (permission === "default") {
      requestPermission();
    }
  }, [permission, requestPermission]);

  return null;
}
