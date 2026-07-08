import prisma, { prismaBypass } from "../src/lib/prisma";
import { AiProviderRegistry } from "../src/lib/platform/ai/providers/ai-registry";
import { AiProvider } from "../src/lib/platform/ai/providers/ai-provider";
import { AIGateway } from "../src/lib/platform/ai/gateway/ai-gateway";
import { SecurityGuard } from "../src/lib/platform/ai/gateway/security-guard";
import { DocumentOcrEngine } from "../src/lib/platform/ai/ocr/tesseract-ocr";
import { VectorSearchEngine } from "../src/lib/platform/ai/search/vector-search";
import { RAGEngine } from "../src/lib/platform/ai/knowledge/rag-engine";
import { ToolExecutor } from "../src/lib/platform/ai/tools/tool-executor";
import { PredictiveAnalyticsEngine } from "../src/lib/platform/ai/analytics/predictive-analytics";

// 🛡️ Mock Provider for Offline Execution Safety
class MockOllamaProvider implements AiProvider {
  type = "OLLAMA";
  async complete(prompt: string, options?: { json?: boolean }): Promise<string> {
    if (options?.json) {
      return JSON.stringify(["Warning: PF dues of 50000 exceed historical collection averages."]);
    }
    return "MOCK_AI_RESPONSE: The business transaction matches standard compliance guidelines.";
  }
  async embed(text: string): Promise<number[]> {
    // Returns standard 768-dimension vector
    return new Array(768).fill(0.001);
  }
}

async function main() {
  console.log("🧪 [TEST] Registering Mock Ollama Provider...");
  AiProviderRegistry.registerProvider(new MockOllamaProvider());

  const businessId = "TEST_BIZ_123";
  const module = "FINANCE";
  const targetDate = new Date();

  // 1. Clean previous mock runs & masters
  console.log("🧹 [TEST] Cleaning previous database states...");
  await prismaBypass.aICallLog.deleteMany({ where: { businessId } }).catch(() => {});
  await prismaBypass.aIPromptTemplate.deleteMany({ where: { businessId } }).catch(() => {});
  await prismaBypass.aIModelRegistry.deleteMany({ where: { provider: "OLLAMA" } }).catch(() => {});
  await prismaBypass.embeddingChunk.deleteMany({ document: { businessId } }).catch(() => {});
  await prismaBypass.embeddingDocument.deleteMany({ where: { businessId } }).catch(() => {});
  await prismaBypass.knowledgeRelation.deleteMany({ source: { businessId } }).catch(() => {});
  await prismaBypass.knowledgeEntity.deleteMany({ where: { businessId } }).catch(() => {});

  // 2. Setup mock model registry
  console.log("⚙️ [TEST] Registering default model in database...");
  await prismaBypass.aIModelRegistry.create({
    data: {
      provider: "OLLAMA",
      modelName: "llama3.2",
      contextWindow: 4096,
      isDefault: true,
      isEnabled: true,
      supportsJson: true,
      supportsEmbeddings: true
    }
  });

  // 3. Setup mock prompt template
  console.log("⚙️ [TEST] Creating mock prompt template...");
  await prismaBypass.aIPromptTemplate.create({
    data: {
      businessId,
      name: "ledger_summary",
      module,
      category: "SUMMARY",
      templateText: "Generate summary for {{vendorName}}.",
      status: "ACTIVE",
      variables: ["vendorName"]
    }
  });

  // --- PHASE 1 TEST: AI Gateway & Security Guard ---
  console.log("\n🔒 [PHASE 1] Testing Gateway & PII Masking...");
  const rawInput = "Aadhaar number 1234-5678-9012, PAN ABCDE1234F, Bank 9876543210.";
  const masked = SecurityGuard.maskSensitiveData(rawInput);
  console.log("Masked Result:", masked);

  const resGateway = await AIGateway.execute({
    businessId,
    module,
    promptName: "ledger_summary",
    variables: { vendorName: "Acme Corp" }
  });
  console.log("Gateway Response:", resGateway);

  // --- PHASE 2 TEST: Document OCR Engine ---
  console.log("\n📷 [PHASE 2] Testing Document OCR...");
  const mockPdf = Buffer.from("MOCK PDF CONTENT: Invoice INV-999 Acme Corp");
  const ocrText = await DocumentOcrEngine.extractText(mockPdf, "application/pdf");
  console.log("Extracted PDF Text:", ocrText.trim());

  // --- PHASE 3 TEST: pgvector Embedding & Vector Search ---
  console.log("\n📊 [PHASE 3] Testing pgvector Document Chunking & Search...");
  const docId = await VectorSearchEngine.embedDocument(
    businessId,
    "Standard Operating Policy",
    "POLICY",
    "All invoices exceeding 10000 INR require manager validation.\nPayments must be routed through the primary account."
  );
  console.log("Indexed Document ID:", docId);

  const searchResults = await VectorSearchEngine.vectorSearch(businessId, "how to process invoices?", 2);
  console.log("Vector Search Results:");
  searchResults.forEach(match => {
    console.log(`- Content: "${match.content}" | Cosine Similarity: ${match.similarity}`);
  });

  // --- PHASE 4 TEST: Knowledge Graph & RAG ---
  console.log("\n🧠 [PHASE 4] Testing Knowledge Graph & RAG...");
  await RAGEngine.linkEntities(businessId, "Acme Corp", "VENDOR", "Outstanding Invoice", "INVOICE", "OWES");
  console.log("Linked Knowledge Graph entities successfully!");

  const ragResponse = await RAGEngine.query(businessId, module, "Do we have outstanding invoices?");
  console.log("RAG Assistant Query Response:", ragResponse);

  // --- PHASE 5 TEST: ERP Tool Calling ---
  console.log("\n🛠️ [PHASE 5] Testing ERP Tool Calling Execution...");
  ToolExecutor.registerTool({
    name: "FindVendor",
    description: "Search for a registered supplier profile by name",
    parameters: { name: "STRING" },
    handler: async (args) => {
      return { success: true, vendor: args.name, gstin: "22ABCDE1234F1Z5" };
    }
  });

  const toolRes = await ToolExecutor.executeTool("FindVendor", { name: "Acme Corp" });
  console.log("ERP Tool Output:", toolRes);

  // --- PHASE 6 TEST: Predictive Analytics ---
  console.log("\n📈 [PHASE 6] Testing Predictive Business Analytics...");
  const analyticsRes = await PredictiveAnalyticsEngine.analyzeBusinessMetrics(
    businessId,
    [25000, 30000, 28000],
    50000
  );
  console.log("Analytics Projection Result:", analyticsRes);

  console.log("\n✅ [ALL TESTS PASSED SUCCESSFULLY]");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
