const fs = require('fs');
const path = 'src/components/staff/staff-onboarding-elite.tsx';

let content = fs.readFileSync(path, 'utf8');

// 🛡️ RECOVERY 1: Repair Step 2 Header
const target1 = '<div className="space-y-6 animate-in slide-in-f                {/* Designation + Department + Qualification (3-col) */}';
const correct1 = '            <div className="space-y-6 animate-in slide-in-from-right duration-500">\n               {/* Designation + Department + Qualification (3-col) */}';

if (content.indexOf(target1) !== -1) {
    console.log("✅ Repairing Step 2 Header...");
    content = content.split(target1).join(correct1);
} else {
    console.log("⚠️ Target 1 not found by exact match. Trying line-by-line fallback...");
    let lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('animate-in slide-in-f')) {
             lines[i] = correct1;
        }
    }
    content = lines.join('\n');
}

// 🛡️ RECOVERY 2: Repair Stray Artifacts (/>)
const target2 = '   />\n                </div>\n             </div>';
const correct2 = '                </div>\n             </div>';

if (content.indexOf(target2) !== -1) {
    console.log("✅ Repairing Stray Artifacts...");
    content = content.split(target2).join(correct2);
} else {
     // Second attempt if indentation varies
     content = content.replace(/<\/div>\s+\/>\s+<\/div>/, '                </div>\n             </div>');
}

fs.writeFileSync(path, content);
console.log("✨ Sovereign Syntax Recovery Complete.");
