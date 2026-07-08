import { AIGateway } from "../gateway/ai-gateway";

export interface ForecastResult {
  metric: string;
  historicalAverage: number;
  projectedValue: number;
  confidenceScore: number;
  anomalies: string[];
}

export class PredictiveAnalyticsEngine {
  /**
   * AI-based Cash Flow Forecast & Payroll Anomaly detector.
   */
  static async analyzeBusinessMetrics(
    businessId: string,
    historicalCollections: number[],
    upcomingPFDues: number
  ): Promise<ForecastResult> {
    const historicalAverage = historicalCollections.length > 0 
      ? historicalCollections.reduce((a, b) => a + b, 0) / historicalCollections.length 
      : 0;

    // Use AI Gateway to calculate an anomaly analysis
    const systemPrompt = `You are a financial analyst. Given these metrics, perform anomaly detection and forecast the next cycle's cash position.
    
    Historical collections: {{historicalCollections}}
    Upcoming statutory PF dues: {{upcomingPFDues}}
    
    Analyze risks and respond with a JSON array of parsed anomalies.`;

    let anomalies: string[] = [];
    try {
      const response = await AIGateway.execute({
        businessId,
        module: "FINANCE",
        rawPrompt: systemPrompt,
        variables: {
          historicalCollections: JSON.stringify(historicalCollections),
          upcomingPFDues: upcomingPFDues.toString()
        },
        options: { json: true }
      });

      const parsed = JSON.parse(response);
      anomalies = Array.isArray(parsed) ? parsed : [];
    } catch (e: any) {
      console.warn("[PREDICTIVE_ANALYTICS] AI analysis failed, falling back to heuristic evaluation:", e.message);
      if (upcomingPFDues > historicalAverage * 1.5) {
        anomalies.push("High Alert: Upcoming statutory PF dues significantly exceed historical collections average.");
      }
    }

    const projectedValue = historicalAverage * 1.05; // Standard heuristic progression

    return {
      metric: "CASH_FLOW",
      historicalAverage,
      projectedValue,
      confidenceScore: historicalCollections.length > 5 ? 0.85 : 0.50,
      anomalies
    };
  }
}
