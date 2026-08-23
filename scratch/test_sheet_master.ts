import axios from "axios";
import fs from "fs";

async function main() {
  console.log("=== FETCHING TAB 'STUDENT_MASTER' VIA GOOGLE SHEET CSV EXPORT ===");

  const url = "https://docs.google.com/spreadsheets/d/1Fr9U5jIlxLrTlNlgRxScsCqH9UwrRLipWRRRFs0K5nc/export?format=csv&sheet=STUDENT_MASTER";
  
  try {
    const res = await axios.get(url);
    const csvData = res.data;
    fs.writeFileSync("scratch/student_master_tab.csv", csvData);

    const lines = csvData.split("\n");
    console.log(`Successfully fetched STUDENT_MASTER tab! Total lines in STUDENT_MASTER: ${lines.length}`);
    console.log("First 15 lines of STUDENT_MASTER:");
    console.log(lines.slice(0, 15).join("\n"));
  } catch (err: any) {
    console.error("Error fetching sheet by name:", err.message);
  }
}

main().catch(console.error);
