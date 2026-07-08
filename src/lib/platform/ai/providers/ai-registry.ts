import { AiProvider } from "./ai-provider";

export class AiProviderRegistry {
  private static providers = new Map<string, AiProvider>();

  static registerProvider(provider: AiProvider) {
    this.providers.set(provider.type, provider);
  }

  static getProvider(type: string): AiProvider {
    const provider = this.providers.get(type);
    if (!provider) throw new Error(`AiProvider for '${type}' is not registered.`);
    return provider;
  }
}
