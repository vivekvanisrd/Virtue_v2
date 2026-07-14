import { EcpChannelType } from "@prisma/client";
import { MessagePayload, ProviderResult } from "../types";

export abstract class ChannelProvider {
  abstract getChannelType(): EcpChannelType;
  abstract getProviderName(): string;
  abstract send(payload: MessagePayload): Promise<ProviderResult>;
}
