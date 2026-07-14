import { EcpChannelType } from "@prisma/client";
import { ChannelProvider } from "./ChannelProvider";
import { MessagePayload, ProviderResult } from "../types";

export class PushProvider extends ChannelProvider {
  getChannelType(): EcpChannelType {
    return EcpChannelType.PUSH;
  }

  getProviderName(): string {
    return "FCM_MOCK";
  }

  async send(payload: MessagePayload): Promise<ProviderResult> {
    console.log(`\n--- [ECP PUSH MOCK DISPATCH] ---`);
    console.log(`TO: ${payload.destination}`);
    console.log(`SUBJECT: ${payload.subject || "No Subject"}`);
    console.log(`BODY: ${payload.body}`);
    console.log(`METADATA:`, payload.metadata);
    console.log(`---------------------------------\n`);

    return {
      success: true,
      providerResponse: {
        messageId: `mock_fcm_${Math.random().toString(36).substring(7)}`,
        timestamp: new Date().toISOString()
      }
    };
  }
}
