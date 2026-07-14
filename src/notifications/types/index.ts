import { EcpChannelType, EcpPushPlatform } from "@prisma/client";

export interface MessagePayload {
  recipientId: string;
  destination: string; // Target email address, phone number, or device UUID
  subject?: string;
  body: string;
  htmlBody?: string;
  attachments?: Array<{ fileName: string; storageUrl: string }>;
  metadata?: Record<string, any>;
}

export interface ProviderResult {
  success: boolean;
  providerResponse: Record<string, any>;
  errorMessage?: string;
  isTransient?: boolean; // True if transient network error (retry-safe)
}
