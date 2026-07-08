import { prismaBypass } from "@/lib/prisma";
import { VectorSearchEngine } from "../search/vector-search";
import { AIGateway } from "../gateway/ai-gateway";

export class RAGEngine {
  /**
   * Performs Retrieval-Augmented Generation (RAG) by fetching search context and running it through the AI Gateway.
   */
  static async query(
    businessId: string,
    module: string,
    queryText: string,
    options: { categoryFilter?: string; rawSystemPrompt?: string } = {}
  ): Promise<string> {
    // 1. Fetch relevant vector chunks (Top 5 matches)
    const matches = await VectorSearchEngine.vectorSearch(businessId, queryText, 5);
    const context = matches.map(m => `- ${m.content}`).join("\n");

    const systemPrompt = options.rawSystemPrompt || "You are a helpful business ERP assistant. Use the following context to answer the query:\n\n{{context}}";
    const finalPrompt = `${systemPrompt}\n\nQuery: {{query}}`;

    // 2. Dispatch through AIGateway
    const res = await AIGateway.execute({
      businessId,
      module,
      rawPrompt: finalPrompt,
      variables: {
        context,
        query: queryText
      }
    });

    return res;
  }

  /**
   * Establishes relationships in the PostgreSQL-based Knowledge Graph.
   */
  static async linkEntities(
    businessId: string,
    sourceName: string,
    sourceType: string,
    targetName: string,
    targetType: string,
    relation: string
  ): Promise<void> {
    // 1. Resolve or create source entity
    const source = await prismaBypass.knowledgeEntity.upsert({
      where: {
        businessId_name_type: { businessId, name: sourceName, type: sourceType }
      },
      update: {},
      create: { businessId, name: sourceName, type: sourceType }
    });

    // 2. Resolve or create target entity
    const target = await prismaBypass.knowledgeEntity.upsert({
      where: {
        businessId_name_type: { businessId, name: targetName, type: targetType }
      },
      update: {},
      create: { businessId, name: targetName, type: targetType }
    });

    // 3. Establish relational link
    await prismaBypass.knowledgeRelation.upsert({
      where: {
        sourceId_targetId_relation: { sourceId: source.id, targetId: target.id, relation }
      },
      update: {},
      create: { sourceId: source.id, targetId: target.id, relation }
    });
  }
}
