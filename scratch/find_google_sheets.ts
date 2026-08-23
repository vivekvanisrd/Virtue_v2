import axios from "axios";
import fs from "fs";

async function main() {
  const res = await axios.get("https://docs.google.com/spreadsheets/d/1Fr9U5jIlxLrTlNlgRxScsCqH9UwrRLipWRRRFs0K5nc/edit", {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
  });

  const html = res.data;
  fs.writeFileSync("scratch/sheet_page.html", html);

  // Search for sheets in bootstrap data
  const gridDataMatches = Array.from(html.matchAll(/\[\d+,\d+,"([^"]+)",\d+,\d+,\d+/g));
  console.log("Grid matches:", gridDataMatches.map(m => m[1]));

  // Search for "STUDENT_MASTER" or tab names
  const tabMatches = Array.from(html.matchAll(/"name":"([^"]+)"/g));
  console.log("All name strings:", tabMatches.map(m => m[1]).filter(n => n.length > 2 && n.length < 40).slice(0, 30));

  // Let's check for gids by searching for 'gid=' in the html
  const gids = Array.from(html.matchAll(/gid=(\d+)/g)).map(m => m[1]);
  console.log("Unique GIDs found in HTML:", Array.from(new Set(gids)));
}

main().catch(console.error);
