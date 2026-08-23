import axios from "axios";
import fs from "fs";

async function main() {
  console.log("=== DISCOVERING ALL SHEET TABS IN WORKBOOK ===");

  const candidateNames = [
    "STUDENT_MASTER",
    "STUDENT MASTER",
    "Student Master",
    "Students",
    "STUDENTS",
    "Master",
    "Sheet1",
    "Sheet 1",
    "Fee Collection",
    "FEE_COLLECTION",
    "Collection",
    "Transactions"
  ];

  for (const name of candidateNames) {
    try {
      const url = `https://docs.google.com/spreadsheets/d/1Fr9U5jIlxLrTlNlgRxScsCqH9UwrRLipWRRRFs0K5nc/export?format=csv&sheet=${encodeURIComponent(name)}`;
      const csvRes = await axios.get(url);
      const lines = csvRes.data.split("\n");
      console.log(`Tab '${name}': SUCCESS! ${lines.length} lines. First line: ${lines[0].slice(0, 80)}`);
      fs.writeFileSync(`scratch/tab_${name.replace(/\s+/g, "_")}.csv`, csvRes.data);
    } catch (err: any) {
      // tab name not found
    }
  }
}

main().catch(console.error);
