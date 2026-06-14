const fs = require('fs');
const path = require('path');

const srcDir = 'C:\\Users\\SriKriations\\.gemini\\antigravity\\brain\\9c7156a0-e1c4-462b-a3f8-70303075f29e';
const destDir = 'j:\\virtue_fb\\virtue-v2\\scratch';

const filesToCopy = [
  'implementation_plan.md',
  'task.md',
  'walkthrough.md',
  'fee_flow_audit.md',
  'migration_anomalies_report.md',
  'performance_analysis_report.md',
  'pwa_feasibility_analysis.md',
  'reconciliation_audit_report.md',
  'staff_edit_investigation_report.md'
];

filesToCopy.forEach(file => {
  const src = path.join(srcDir, file);
  const dest = path.join(destDir, 'old_' + file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`Copied ${file} -> old_${file}`);
  } else {
    console.log(`File not found: ${file}`);
  }
});
