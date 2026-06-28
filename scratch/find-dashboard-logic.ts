import fs from "fs";
import path from "path";

const filePath = path.join(__dirname, "../src/components/dashboard/transport.tsx");
const content = fs.readFileSync(filePath, "utf-8");
const lines = content.split("\n");

console.log("Searching for document expiry and alert calculations in transport.tsx:");
lines.forEach((line, index) => {
  if (
    line.includes("insuranceExpiry") ||
    line.includes("fitnessExpiry") ||
    line.includes("pollutionExpiry") ||
    line.includes("maintenanceDue") ||
    line.includes("expiry") ||
    line.includes("Expired") ||
    line.includes("expired")
  ) {
    console.log(`${index + 1}: ${line.trim()}`);
  }
});
