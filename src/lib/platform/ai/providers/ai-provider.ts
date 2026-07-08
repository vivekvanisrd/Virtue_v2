export interface AiProvider {
  type: string;
  complete(prompt: string, options?: { json?: boolean }): Promise<string>;
  embed(text: string): Promise<number[]>;
}
