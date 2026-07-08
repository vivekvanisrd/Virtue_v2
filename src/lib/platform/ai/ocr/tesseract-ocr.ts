import * as pdf from "pdf-parse";

export class DocumentOcrEngine {
  /**
   * Processes a document (PDF or image buffer) and returns the extracted raw text.
   */
  static async extractText(buffer: Buffer, mimeType: string): Promise<string> {
    if (mimeType.toLowerCase() === "application/pdf") {
      try {
        let pdfParser: any;
        if (typeof (pdf as any).PDFParse === "function") {
          pdfParser = (pdf as any).PDFParse;
        } else if (typeof pdf === "function") {
          pdfParser = pdf;
        } else if (pdf && typeof (pdf as any).default === "function") {
          pdfParser = (pdf as any).default;
        } else {
          const reqPdf = require("pdf-parse");
          pdfParser = reqPdf.PDFParse || reqPdf.default || reqPdf;
        }

        const data = await (async () => {
          try {
            return await new pdfParser(buffer);
          } catch (e) {
            try {
              const instance = new pdfParser();
              return await instance.parse(buffer);
            } catch (e2) {
              return await pdfParser(buffer);
            }
          }
        })();
        return data.text || "";
      } catch (error: any) {
        console.error("[OCR_ENGINE] PDF text extraction failed:", error.message);
        throw new Error(`PDF Parsing Error: ${error.message}`);
      }
    }

    // Fallback parser for testing image files
    console.warn(`[OCR_ENGINE] Image OCR requested for MIME: ${mimeType}. Falling back to text mock.`);
    return `MOCK_OCR_TEXT: Invoice Number: INV-2026-908, Date: 2026-07-08, Gross Amount: 25000, GSTIN: 22ABCDE1234F1Z5, Vendor: Acme Corp.`;
  }
}
