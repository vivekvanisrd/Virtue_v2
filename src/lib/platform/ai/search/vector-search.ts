import { prismaBypass } from "@/lib/prisma";
import { AiProviderRegistry } from "../providers/ai-registry";

export interface SearchResultChunk {
  chunkId: string;
  content: string;
  documentId: string;
  similarity: number;
}

export class VectorSearchEngine {
  /**
   * Chunks a document text, generates vector embeddings via Ollama, and inserts them into PostgreSQL pgvector.
   */
  static async embedDocument(
    businessId: string,
    title: string,
    category: string,
    text: string
  ): Promise<string> {
    // 1. Create document header
    const document = await prismaBypass.embeddingDocument.create({
      data: {
        businessId,
        title,
        category,
        embeddingModel: "nomic-embed-text",
        dimension: 768
      }
    });

    // 2. Simple chunking: split text into paragraphs of roughly 500 characters
    const paragraphs = text.split(/\n+/).map(p => p.trim()).filter(p => p.length > 20);
    const provider = AiProviderRegistry.getProvider("OLLAMA");

    for (const paragraph of paragraphs) {
      // 3. Generate embedding vector
      let embedding: number[] = [];
      try {
        embedding = await provider.embed(paragraph);
      } catch (err: any) {
        console.error("[VECTOR_SEARCH] Failed to generate embedding chunk:", err.message);
        continue;
      }

      if (embedding.length === 0) continue;

      // 4. Create chunk record
      const chunk = await prismaBypass.embeddingChunk.create({
        data: {
          documentId: document.id,
          content: paragraph
        }
      });

      // 5. Update vector column using raw SQL pgvector casting
      const vectorString = `[${embedding.join(",")}]`;
      await prismaBypass.$executeRawUnsafe(
        `UPDATE "EmbeddingChunk" SET embedding = $1::vector WHERE id = $2`,
        vectorString,
        chunk.id
      );
    }

    return document.id;
  }

  /**
   * Performs cosine similarity matching over pgvector on PostgreSQL.
   */
  static async vectorSearch(
    businessId: string,
    queryText: string,
    topK: number = 5
  ): Promise<SearchResultChunk[]> {
    const provider = AiProviderRegistry.getProvider("OLLAMA");
    let queryVector: number[] = [];
    
    try {
      queryVector = await provider.embed(queryText);
    } catch (err: any) {
      console.error("[VECTOR_SEARCH] Failed to embed query text:", err.message);
      return [];
    }

    if (queryVector.length === 0) return [];

    const vectorString = `[${queryVector.join(",")}]`;
    const sqlQuery = `
      SELECT c.id, c.content, c."documentId", (1 - (c.embedding <=> $1::vector)) as "similarity"
      FROM "EmbeddingChunk" c
      JOIN "EmbeddingDocument" d ON c."documentId" = d.id
      WHERE d."businessId" = $2 AND c.embedding IS NOT NULL
      ORDER BY c.embedding <=> $1::vector ASC
      LIMIT $3
    `;

    try {
      const dbResults = (await prismaBypass.$queryRawUnsafe(
        sqlQuery,
        vectorString,
        businessId,
        topK
      )) as any[];

      return dbResults.map(row => ({
        chunkId: row.id,
        content: row.content,
        documentId: row.documentId,
        similarity: Number(row.similarity || 0)
      }));
    } catch (err: any) {
      console.error("[VECTOR_SEARCH] Database query execution failed:", err.message);
      return [];
    }
  }
}
