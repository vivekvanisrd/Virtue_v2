"use server";

import * as ifscLib from "ifsc";

export async function validateIfscBatchAction(ifscCodes: string[]) {
  // Load bank names mapping
  const bankNames = require("ifsc/src/banknames.json");

  const results = ifscCodes.map(code => {
    // Tier 1: Offline Format & Dataset Match
    const isValidOffline = ifscLib.validate(code);
    const bankCode = code.substring(0, 4);
    const isKnownBank = !!(ifscLib.bank as any)[bankCode];
    const bankName = bankNames[bankCode] || "Unknown Bank";

    return {
      code,
      isValidOffline,
      isKnownBank,
      bankCode,
      bankName
    };
  });

  return { success: true, data: results };
}

export async function fetchIfscLiveAction(code: string) {
  try {
    const details = await ifscLib.fetchDetails(code);
    return { success: true, data: details };
  } catch (error: any) {
    return { success: false, error: error.message || "Invalid IFSC or API Error" };
  }
}
