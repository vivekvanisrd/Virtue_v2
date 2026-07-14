import { EcpChannelType } from "@prisma/client";
import { ChannelProvider } from "./ChannelProvider";
import { MessagePayload, ProviderResult } from "../types";

export class SMSProvider extends ChannelProvider {
  getChannelType(): EcpChannelType {
    return EcpChannelType.SMS;
  }

  getProviderName(): string {
    return "TWILIO_MOCK";
  }

  async send(payload: MessagePayload): Promise<ProviderResult> {
    console.log(`\n--- [ECP SMS MOCK DISPATCH] ---`);
    console.log(`PHONE: ${payload.destination}`);
    console.log(`BODY: ${payload.body}`);
    console.log(`--------------------------------\n`);

    return {
      success: true,
      providerResponse: {
        messageId: `mock_sms_${Math.random().toString(36).substring(7)}`,
        timestamp: new Date().toISOString()
      }
    };
  }
}
