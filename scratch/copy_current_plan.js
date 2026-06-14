const fs = require('fs');
const path = require('path');

const srcDir = 'C:\\Users\\SriKriations\\.gemini\\antigravity-ide\\brain\\21130d0a-19b8-446a-b187-443825e71f13';
const destDir = 'j:\\virtue_fb\\virtue-v2\\scratch';

const files = [
  { src: 'sibling_flow_audit_report.md', dest: 'current_sibling_flow_audit_report.md' },
  { src: 'fee_system_audit_report.md', dest: 'current_fee_system_audit_report.md' },
  { src: 'task.md', dest: 'current_task.md' },
  { src: 'implementation_plan.md', dest: 'current_implementation_plan.md' }
];

files.forEach(f => {
  const srcPath = path.join(srcDir, f.src);
  const destPath = path.join(destDir, f.dest);
  if (fs.existsSync(srcPath)) {
    fs.copyFileSync(srcPath, destPath);
    console.log(`Copied ${f.src} to ${f.dest}`);
  } else {
    console.log(`Source does not exist: ${srcPath}`);
  }
});
