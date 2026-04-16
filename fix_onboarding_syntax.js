const fs = require('fs');
const path = 'src/components/staff/staff-onboarding-elite.tsx';

let content = fs.readFileSync(path, 'utf8');

// 🛡️ FIX 1: The Broken String Constant on Step 2
// Target: <div className="space-y-6 animate-in slide-in-f                {/* Designation + Department + Qualification (3-col) */}
const brokenLineStr = '<div className=\"space-y-6 animate-in slide-in-f                {/* Designation + Department + Qualification (3-col) */}';
const correctLineStr = '            <div className=\"space-y-6 animate-in slide-in-from-right duration-500\">\n               {/* Designation + Department + Qualification (3-col) */}';

if (content.includes(brokenLineStr)) {
    console.log("✅ [FIX_SURGERY] Found broken string constant. Repairing...");
    content = content.replace(brokenLineStr, correctLineStr);
} else {
    // Fallback: search for partial match if indentation varies
    console.log("⚠️ [FIX_SURGERY] Exact match failed. Attempting fuzzy regex recovery...");
    content = content.replace(/<div className="space-y-6 animate-in slide-in-f.*\{.*Designation.*\} \*\//, correctLineStr);
}

// 🛡️ FIX 2: The Stray JSX Artifacts (Stray />)
const strayArtifact = '   />\n                </div>';
if (content.includes(strayArtifact)) {
    console.log("✅ [FIX_SURGERY] Found stray JSX artifact. Removing...");
    content = content.replace(strayArtifact, '');
}

fs.writeFileSync(path, content);
console.log("✨ [FIX_SURGERY] Sovereign Syntax Recovery Complete.");
