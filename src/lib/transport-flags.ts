/**
 * 🚩 TRANSPORT V2 FEATURE FLAGS CONFIGURATION
 * 
 * Provides unified, tenant-safe flags for gating V2 transport modules.
 * Default values are set to `false`. Override via .env or .env.local.
 */

export const TRANSPORT_FLAGS = {
  ENABLE_TRANSPORT_V2: process.env.ENABLE_TRANSPORT_V2 === "true" || process.env.NEXT_PUBLIC_ENABLE_TRANSPORT_V2 === "true" || false,
  ENABLE_DRIVER_APP: process.env.ENABLE_DRIVER_APP === "true" || process.env.NEXT_PUBLIC_ENABLE_DRIVER_APP === "true" || false,
  ENABLE_GPS_TRACKING: process.env.ENABLE_GPS_TRACKING === "true" || process.env.NEXT_PUBLIC_ENABLE_GPS_TRACKING === "true" || false,
  ENABLE_PARENT_TRACKING: process.env.ENABLE_PARENT_TRACKING === "true" || process.env.NEXT_PUBLIC_ENABLE_PARENT_TRACKING === "true" || false,
  ENABLE_GEOFENCING: process.env.ENABLE_GEOFENCING === "true" || process.env.NEXT_PUBLIC_ENABLE_GEOFENCING === "true" || false,
  ENABLE_REALTIME_TRACKING: process.env.ENABLE_REALTIME_TRACKING === "true" || process.env.NEXT_PUBLIC_ENABLE_REALTIME_TRACKING === "true" || false,
  ENABLE_ROUTE_DEVIATION: process.env.ENABLE_ROUTE_DEVIATION === "true" || process.env.NEXT_PUBLIC_ENABLE_ROUTE_DEVIATION === "true" || false,
  ENABLE_ETA_ENGINE: process.env.ENABLE_ETA_ENGINE === "true" || process.env.NEXT_PUBLIC_ENABLE_ETA_ENGINE === "true" || false,
};
