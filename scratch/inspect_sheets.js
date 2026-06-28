const XLSX = require('xlsx');

async function inspectExcel() {
  const filePath = "C:\\Users\\SriKriations\\Favorites\\Downloads\\test of accounts (1).xlsx";
  console.log(`Reading Excel file: ${filePath}`);
  
  try {
    const workbook = XLSX.readFile(filePath);
    const sheetNames = workbook.SheetNames;
    console.log(`\nSheet Names found in workbook (${sheetNames.length}):`);
    console.log(JSON.stringify(sheetNames, null, 2));

    sheetNames.forEach(sheetName => {
      const sheet = workbook.Sheets[sheetName];
      // Convert to JSON
      const data = XLSX.utils.sheet_to_json(sheet, { defval: "" });
      console.log(`\n--- Sheet: "${sheetName}" ---`);
      console.log(`Total rows: ${data.length}`);
      
      if (data.length > 0) {
        console.log("Headers / Columns:");
        console.log(Object.keys(data[0]));
        console.log("Sample Data (First 2 rows):");
        console.log(JSON.stringify(data.slice(0, 2), null, 2));
      } else {
        console.log("Sheet is empty.");
      }
    });
  } catch (error) {
    console.error("Error reading spreadsheet:", error);
  }
}

inspectExcel();
