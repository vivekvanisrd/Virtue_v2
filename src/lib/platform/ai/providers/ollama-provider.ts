import { AiProvider } from "./ai-provider";

export class OllamaProvider implements AiProvider {
  type = "OLLAMA";
  private baseUrl: string;
  private defaultModel: string;
  private defaultEmbeddingModel: string;

  constructor(options: { baseUrl?: string; defaultModel?: string; defaultEmbeddingModel?: string } = {}) {
    this.baseUrl = options.baseUrl || process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434";
    this.defaultModel = options.defaultModel || process.env.OLLAMA_DEFAULT_MODEL || "llama3.2";
    this.defaultEmbeddingModel = options.defaultEmbeddingModel || process.env.OLLAMA_DEFAULT_EMBEDDING_MODEL || "nomic-embed-text";
  }

  async complete(prompt: string, options?: { json?: boolean }): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: this.defaultModel,
          prompt,
          stream: false,
          options: {
            temperature: 0.7
          },
          ...(options?.json ? { format: "json" } : {})
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ollama generation failed: ${response.statusText}. Details: ${errorText}`);
      }

      const data = await response.json();
      return data.response || "";
    } catch (error: any) {
      console.error("[OLLAMA_PROVIDER] Generation error:", error.message);
      throw error;
    }
  }

  async embed(text: string): Promise<number[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/embeddings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: this.defaultEmbeddingModel,
          prompt: text
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ollama embedding failed: ${response.statusText}. Details: ${errorText}`);
      }

      const data = await response.json();
      return data.embedding || [];
    } catch (error: any) {
      console.error("[OLLAMA_PROVIDER] Embedding error:", error.message);
      throw error;
    }
  }
}
