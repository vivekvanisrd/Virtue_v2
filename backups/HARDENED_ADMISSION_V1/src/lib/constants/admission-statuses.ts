/**
 * 🎓 SOVEREIGN ADMISSION STATUSES
 * 
 * Defines the canonical lifecycle stages of a student record.
 */
export const ST_ENQUIRY = "ENQUIRY";
export const ST_REGISTERED = "REGISTERED";
export const ST_PROVISIONAL = "PROVISIONAL";
export const ST_CONFIRMED = "CONFIRMED";
export const ST_CANCELLED = "CANCELLED";

export type AdmissionStatus = 
  | typeof ST_ENQUIRY 
  | typeof ST_REGISTERED 
  | typeof ST_PROVISIONAL 
  | typeof ST_CONFIRMED 
  | typeof ST_CANCELLED;
