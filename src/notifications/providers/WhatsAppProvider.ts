import { EcpChannelType } from "@prisma/client";
import { ChannelProvider } from "./ChannelProvider";
import { MessagePayload, ProviderResult } from "../types";

export class WhatsAppProvider extends ChannelProvider {
  getChannelType(): EcpChannelType {
    return EcpChannelType.WHATSAPP;
  }

  getProviderName(): string {
    return "WHATSAPP_MOCK";
  }

  async send(payload: MessagePayload): Promise<ProviderResult> {
    console.log(`\n--- [ECP WHATSAPP MOCK DISPATCH] ---`);
    console.log(`PHONE: ${payload.destination}`);
    console.log(`BODY: ${payload.body}`);
    console.log(`------------------------------------\n`);

    return {
      success: true,
      providerResponse: {
        messageId: `mock_wa_${Math.random().toString(36).substring(7)}`,
        timestamp: new Date().toISOString()
      }
    };
  }
}
