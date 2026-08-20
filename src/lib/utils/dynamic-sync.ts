/**
 * Central Dynamic Real-Time Sync Utility
 * 
 * Provides unified cross-component and cross-tab event broadcasting 
 * whenever reference data (Fee Component Masters, Discounts, Fee Structures,
 * Classes, Sections, Academic Years, Routes) is created, updated, or toggled.
 */

export function broadcastRefDataUpdate(entityName?: string) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("v2-ref-data-updated", { detail: { entity: entityName } }));
    window.dispatchEvent(new CustomEvent("v2-discount-types-updated"));
    window.dispatchEvent(new CustomEvent("v2-fee-masters-updated"));
  }
}
