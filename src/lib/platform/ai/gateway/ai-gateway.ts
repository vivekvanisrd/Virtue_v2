import { prismaBypass } from "@/lib/prisma";
import { AiProviderRegistry } from "../providers/ai-registry";
import { SecurityGuard } from "./security-guard";

export interface AIGatewayRequest {
  businessId: string;
  module: string;
  promptName?: string; // Optional: resolves from database AIPromptTemplate
  rawPrompt?: string;   // Optional: fallback raw prompt
  variables?: Record<string, string>;
  options?: {
    json?: boolean;
    bypassSecurity?: boolean;
  };
}

export class AIGateway {
  static async execute(req: AIGatewayRequest): Promise<string> {
    const tStart = Date.now();
    let promptText = "";
    let promptVersion: number | null = null;
    let finalPrompt = "";

    // 1. Resolve and interpolate prompt
    if (req.promptName) {
      const template = await prismaBypass.aIPromptTemplate.findFirst({
        where: { businessId: req.businessId, name: req.promptName, status: "ACTIVE" }
      }).catch(() => null);

      if (template) {
        promptText = template.templateText;
        promptVersion = template.version;
        // Interpolate variables
        let rendered = promptText;
        if (req.variables) {
          for (const [key, val] of Object.entries(req.variables)) {
            const regex = new RegExp(`{{${key}}}`, "g");
            rendered = rendered.replace(regex, val);
          }
        }
        finalPrompt = rendered;
      }
    }

    if (!finalPrompt) {
      finalPrompt = req.rawPrompt || "";
    }

    if (!finalPrompt.trim()) {
      throw new Error("[AI_GATEWAY] Prompt content cannot be empty.");
    }

    // 2. Run Security Guard Verification
    if (!req.options?.bypassSecurity) {
      // Prompt injection check
      const injectionCheck = SecurityGuard.detectPromptInjection(finalPrompt);
      if (injectionCheck.isInjected) {
        throw new Error(`[AI_GATEWAY] Prompt Blocked: ${injectionCheck.reason}`);
      }
      // PII masking check
      finalPrompt = SecurityGuard.maskSensitiveData(finalPrompt);
    }

    // 3. Resolve active AI model and provider
    let modelName = "llama3.2";
    let providerType = "OLLAMA";

    const dbModel = await prismaBypass.aIModelRegistry.findFirst({
      where: { isEnabled: true, isDefault: true }
    }).catch(() => null);

    if (dbModel) {
      modelName = dbModel.modelName;
      providerType = dbModel.provider;
    }

    let result = "";
    let errorMsg: string | null = null;

    try {
      const provider = AiProviderRegistry.getProvider(providerType);
      result = await provider.complete(finalPrompt, { json: req.options?.json });
    } catch (e: any) {
      errorMsg = e.message;
      throw e;
    } finally {
      // 4. Log call details to database
      const latencyMs = Date.now() - tStart;
      await prismaBypass.aICallLog.create({
        data: {
          businessId: req.businessId,
          module: req.module,
          provider: providerType,
          modelName,
          promptVersion,
          latencyMs,
          responseLength: result.length,
          errors: errorMsg,
          isCacheHit: false,
          isFallbackUsed: false
        }
      }).catch(err => {
        console.error("[AI_GATEWAY] Failed to log call audit details:", err.message);
      });
    }

    return result;
  }
}
