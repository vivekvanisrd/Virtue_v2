"use client";

import { useEffect, useState } from "react";
import { registerDeviceAction } from "../actions/registerDevice";
import { EcpPushPlatform } from "@prisma/client";

export function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [subscription, setSubscription] = useState<any>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    setPermission(Notification.permission);

    if ("permissions" in navigator) {
      navigator.permissions.query({ name: "notifications" }).then((status) => {
        status.onchange = () => setPermission(Notification.permission);
      });
    }

    // Recover subscription on load if granted
    if (Notification.permission === "granted") {
      navigator.serviceWorker.ready.then((reg) => {
        reg.pushManager.getSubscription().then((sub) => {
          if (sub) {
            setSubscription(sub);
            syncDeviceWithServer(sub);
          }
        });
      });
    }

    // Set up heartbeat interval (every 5 minutes)
    const interval = setInterval(() => {
      sendHeartbeat();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  const requestPermission = async () => {
    if (typeof window === "undefined") return;
    const perm = await Notification.requestPermission();
    setPermission(perm);
    if (perm === "granted") {
      await registerServiceWorker();
    }
  };

  const registerServiceWorker = async () => {
    try {
      const reg = await navigator.serviceWorker.register("/sw.js");
      // Use placeholder Application Server VAPID Key (replace with real one later)
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: "BEl62Obmq62TWH5W7N9NrO4Cg2nC_" // stub VAPID Key
      });
      setSubscription(sub);
      await syncDeviceWithServer(sub);
    } catch (err) {
      console.warn("Service worker registration or subscription failed:", err);
    }
  };

  const syncDeviceWithServer = async (sub: any) => {
    try {
      const token = JSON.stringify(sub);
      const deviceId = await getUniqueDeviceFingerprint();
      
      await registerDeviceAction({
        token,
        platform: EcpPushPlatform.WEB,
        deviceId,
        browser: getBrowserName()
      });
    } catch (err) {
      console.error("Failed to sync push device with server:", err);
    }
  };

  const sendHeartbeat = async () => {
    try {
      const deviceId = await getUniqueDeviceFingerprint();
      await fetch("/api/notifications/devices/heartbeat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId })
      });
    } catch (err) {
      // Bypassed silently during offline status
    }
  };

  return { permission, requestPermission, subscription };
}

async function getUniqueDeviceFingerprint(): Promise<string> {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem("device_fingerprint");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("device_fingerprint", id);
  }
  return id;
}

function getBrowserName(): string {
  if (typeof window === "undefined") return "Unknown";
  const userAgent = navigator.userAgent;
  if (userAgent.indexOf("Chrome") > -1) return "Chrome";
  if (userAgent.indexOf("Safari") > -1) return "Safari";
  if (userAgent.indexOf("Firefox") > -1) return "Firefox";
  if (userAgent.indexOf("Edge") > -1) return "Edge";
  return "Browser";
}
