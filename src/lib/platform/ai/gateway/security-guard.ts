export class SecurityGuard {
  /**
   * Identifies and masks sensitive Indian PII identifiers (PAN, Aadhaar, GST, and Bank account numbers)
   */
  static maskSensitiveData(text: string): string {
    let masked = text;
    
    // Mask PAN card format
    masked = masked.replace(/\b[A-Z]{5}[0-9]{4}[A-Z]{1}\b/gi, "[PAN_MASKED]");
    
    // Mask Aadhaar card format
    masked = masked.replace(/\b\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, "[AADHAAR_MASKED]");
    
    // Mask GST identification numbers
    masked = masked.replace(/\b\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}[Z]{1}[A-Z\d]{1}\b/gi, "[GST_MASKED]");
    
    // Mask standard Bank Account numbers (9 to 18 digits)
    masked = masked.replace(/\b\d{9,18}\b/g, "[BANK_ACCOUNT_MASKED]");

    return masked;
  }

  /**
   * Performs quick prompt injection checking.
   */
  static detectPromptInjection(prompt: string): { isInjected: boolean; reason?: string } {
    const lower = prompt.toLowerCase();
    const maliciousPatterns = [
      "ignore previous",
      "ignore all instructions",
      "system override",
      "bypass safety",
      "dan mode",
      "jailbreak",
      "act as developer mode",
      "developer override",
      "do anything now"
    ];

    for (const pattern of maliciousPatterns) {
      if (lower.includes(pattern)) {
        return {
          isInjected: true,
          reason: `Suspicious injection pattern detected: '${pattern}'`
        };
      }
    }

    return { isInjected: false };
  }
}
