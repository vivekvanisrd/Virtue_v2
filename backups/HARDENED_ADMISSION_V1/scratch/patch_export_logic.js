const fs = require('fs');
const filePath = 'j:/virtue_fb/virtue-v2/src/lib/actions/payroll-actions.ts';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add sanitizeBankName if not present (already added in line 454+ but I will ensure it's there)
if (!content.includes('const sanitizeBankName')) {
  content = content.replace(
    /if\s*\(!run\)\s*throw\s*new\s*Error\("Payroll Run not found\."\);/g,
    `if (!run) throw new Error("Payroll Run not found.");
    
    /** 🛡️ INSTITUTIONAL NAME NORMALIZATION ENGINE */
    const sanitizeBankName = (name: string | null | undefined): string => {
       if (!name) return "";
       return name
         .replace(/\\./g, ' ')       // 1. Convert all periods to spaces
         .replace(/\\s+/g, ' ')      // 2. Collapse all multi-spaces to single space
         .trim();                   // 3. Remove leading and trailing spaces
    };`
  );
}

// 2. Wrap names in sanitizeBankName
content = content.replace(
  /name\s*=\s*bank\.accountName\s*\|\|\s*`\${slip\.staff\.firstName}\s+\${slip\.staff\.lastName}`/g,
  'name = sanitizeBankName(bank.accountName || `${slip.staff.firstName} ${slip.staff.lastName}`)'
);

// 3. Fix nickname in external loop
content = content.replace(
  /nickname\s*=\s*\(slip\.staff\.firstName\s*\+\s*\(slip\.staff\.lastName\s*\|\|\s*""\)\)\.replace\(\/\[\^a-zA-Z0-9\]\/g,\s*""\)\.substring\(0,\s*15\)/g,
  'nickname = name.replace(/[^a-zA-Z0-9]/g, "").substring(0, 15)'
);

fs.writeFileSync(filePath, content);
console.log("✅ payroll-actions.ts patched successfully via Regex.");
