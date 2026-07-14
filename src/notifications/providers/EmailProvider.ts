import { EcpChannelType } from "@prisma/client";
import { ChannelProvider } from "./ChannelProvider";
import { MessagePayload, ProviderResult } from "../types";

export class EmailProvider extends ChannelProvider {
  getChannelType(): EcpChannelType {
    return EcpChannelType.EMAIL;
  }

  getProviderName(): string {
    return "SES_MOCK";
  }

  async send(payload: MessagePayload): Promise<ProviderResult> {
    console.log(`\n--- [ECP EMAIL MOCK DISPATCH] ---`);
    console.log(`TO: ${payload.destination}`);
    console.log(`SUBJECT: ${payload.subject || "No Subject"}`);
    console.log(`BODY: ${payload.body}`);
    if (payload.htmlBody) {
       console.log(`HTML BODY LENGTH: ${payload.htmlBody.length} chars`);
    }
    console.log(`----------------------------------\n`);

    return {
      success: true,
      providerResponse: {
        messageId: `mock_email_${Math.random().toString(36).substring(7)}`,
        timestamp: new Date().toISOString()
      }
    };
  }
}
