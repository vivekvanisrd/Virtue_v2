self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Pass-through standard HTTP GET requests only
  // Bypass POST/PUT/DELETE, Next.js internal dev assets, HMR, and browser extensions
  if (
    event.request.method !== 'GET' ||
    !event.request.url.startsWith('http') ||
    event.request.url.includes('/_next/') ||
    event.request.url.includes('webpack-hmr')
  ) {
    return;
  }

  event.respondWith(fetch(event.request));
});

// ==========================================
// ECP (Enterprise Communication Platform)
// Background Event Listeners
// ==========================================

self.addEventListener("push", function (event) {
  if (!event.data) return;

  try {
    const payload = event.data.json();
    const options = {
      body: payload.body,
      icon: payload.icon || "/favicon.ico",
      badge: payload.badge || "/favicon.ico",
      image: payload.image || null,
      data: {
        url: payload.url || "/parent/dashboard",
        deliveryId: payload.deliveryId
      },
      actions: payload.actions || [],
      tag: payload.tag || "default-tag",
      renotify: true
    };

    event.waitUntil(
      Promise.all([
        self.registration.showNotification(payload.title, options),
        updateBadgeCount(payload.unreadCount),
        logDeliveryReceipt(payload.deliveryId, "DELIVERED")
      ])
    );
  } catch (err) {
    console.error("SW Push Parsing Error:", err);
  }
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || "/parent/dashboard";
  const deliveryId = event.notification.data?.deliveryId;

  event.waitUntil(
    Promise.all([
      logDeliveryReceipt(deliveryId, "CLICKED"),
      clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
        for (let client of windowClients) {
          if (client.url === urlToOpen && "focus" in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
    ])
  );
});

self.addEventListener("notificationclose", function (event) {
  const deliveryId = event.notification.data?.deliveryId;
  if (deliveryId) {
    event.waitUntil(logDeliveryReceipt(deliveryId, "DISMISSED"));
  }
});

async function logDeliveryReceipt(deliveryId, status) {
  if (!deliveryId) return;
  try {
    await fetch("/api/notifications/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deliveryId, status })
    });
  } catch (err) {
    console.error("SW Analytics Webhook Failed:", err);
  }
}

async function updateBadgeCount(count) {
  if ("setAppBadge" in navigator) {
    if (count > 0) {
      await navigator.setAppBadge(count);
    } else {
      await navigator.clearAppBadge();
    }
  }
}

