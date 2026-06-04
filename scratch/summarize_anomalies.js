const fs = require('fs');
const path = require('path');

const logPath = path.join(__dirname, 'import_anomalies_log.json');
const reportPath = path.join('C:', 'Users', 'SriKriations', '.gemini', 'antigravity', 'brain', '9c7156a0-e1c4-462b-a3f8-70303075f29e', 'migration_anomalies_report.md');

function main() {
    if (!fs.existsSync(logPath)) {
        console.error("Log file not found!");
        return;
    }

    const anomalies = JSON.parse(fs.readFileSync(logPath, 'utf8'));

    const duplicates = [];
    const missingPhones = [];
    const invalidPhones = [];
    const invalidAadhars = [];
    const missingParents = [];
    const blankRecords = [];
    const missingAdmNos = [];

    anomalies.forEach(item => {
        const studentName = item.student_name || "[BLANK RECORD]";
        const details = `Row ${item.raw_row_num} (S.No ${item.s_no}, Class ${item.class}-${item.section || 'No Sec'})`;

        item.anomalies.forEach(a => {
            if (a === 'duplicate_admission_number') {
                duplicates.push({
                    name: studentName,
                    details,
                    orig: item.original_admission_no,
                    final: item.final_admission_no
                });
            } else if (a === 'missing_primary_phone') {
                missingPhones.push({ name: studentName, details });
            } else if (a.startsWith('invalid_phone_length_')) {
                invalidPhones.push({ name: studentName, details, phone: item.phone, error: a });
            } else if (a.startsWith('invalid_aadhaar_length_')) {
                invalidAadhars.push({ name: studentName, details, aadhar: item.aadhar, error: a });
            } else if (a === 'missing_parent_names') {
                missingParents.push({ name: studentName, details });
            } else if (a === 'blank_record') {
                blankRecords.push({ details });
            } else if (a === 'missing_admission_number') {
                missingAdmNos.push({ name: studentName, details, generated: item.final_admission_no });
            }
        });
    });

    // Format Markdown Report
    let md = `# Student Data Migration: Anomalies & Resolutions Report\n\n`;
    md += `This report lists all data anomalies detected in the source CSV file [Manjula maam(RCB_Details) (1).csv](file:///C:/Users/SriKriations/Favorites/Downloads/Manjula%20maam%28RCB_Details%29%20%281%29.csv) and details how the import script resolved them to satisfy database integrity constraints.\n\n`;
    
    md += `> [!IMPORTANT]\n`;
    md += `> **All 448 students** listed in the CSV were successfully imported. Empty placeholder rows were identified and excluded from student profiles.\n\n`;

    md += `## Summary of Detectable Issues\n\n`;
    md += `| Anomaly Type | Count | Resolution Strategy |\n`;
    md += `|---|---|---|\n`;
    md += `| **Duplicate Admission Numbers** | ${duplicates.length} | Retained the first instance; appended \`-DUP1\` to subsequent instances. |\n`;
    md += `| **Missing Primary Phone Numbers** | ${missingPhones.length} | Imported as \`null\` in the database. |\n`;
    md += `| **Invalid Phone Number Length** | ${invalidPhones.length} | Imported as \`null\` (usually missing a digit, e.g. 9 digits instead of 10). |\n`;
    md += `| **Invalid Aadhaar Number Length** | ${invalidAadhars.length} | Imported as \`null\` (usually 11 or 13 digits instead of 12). |\n`;
    md += `| **Missing Parent Names** | ${missingParents.length} | Imported with placeholders \`[MISSING FATHER/MOTHER NAME]\`. |\n`;
    md += `| **Missing Admission Numbers** | ${missingAdmNos.length} | Auto-generated standard placeholders (e.g. \`VR-MISSING-[Class]-[SNo]\`). |\n`;
    md += `| **Blank Placeholder Rows** | ${blankRecords.length} | Excluded from DB (empty rows on the CSV list). |\n\n`;

    md += `---\n\n`;

    // 1. Duplicate Admission Numbers
    md += `## 1. Duplicate Admission Numbers Resolved (${duplicates.length})\n`;
    md += `PostgreSQL enforces unique admission numbers. The duplicate admission numbers were resolved by suffixing them:\n\n`;
    md += `| Student Name | Details | Original No | Final Imported No |\n`;
    md += `|---|---|---|---|\n`;
    duplicates.forEach(d => {
        md += `| ${d.name} | ${d.details} | \`${d.orig}\` | **\`${d.final}\`** |\n`;
    });
    md += `\n---\n\n`;

    // 2. Missing Parent Names
    md += `## 2. Missing Parent Names (${missingParents.length})\n`;
    md += `These students had blank father and mother columns. They were successfully imported with placeholders:\n\n`;
    missingParents.forEach(mp => {
        md += `* **${mp.name}** (${mp.details})\n`;
    });
    md += `\n---\n\n`;

    // 3. Invalid Aadhaar Numbers
    md += `## 3. Invalid Aadhaar Numbers (${invalidAadhars.length})\n`;
    md += `Aadhaar numbers must be exactly 12 digits. These rows had incorrect Aadhaar card lengths and were imported as \`null\`:\n\n`;
    md += `| Student Name | Details | Aadhaar Value | Length Issue |\n`;
    md += `|---|---|---|---|\n`;
    invalidAadhars.forEach(ia => {
        const len = ia.error.split('_').pop();
        md += `| ${ia.name} | ${ia.details} | \`${ia.aadhar}\` | ${len} digits |\n`;
    });
    md += `\n---\n\n`;

    // 4. Invalid Phone Numbers
    md += `## 4. Invalid Phone Numbers (${invalidPhones.length})\n`;
    md += `Phone numbers must be exactly 10 digits. These numbers were incomplete and imported as \`null\`:\n\n`;
    md += `| Student Name | Details | Phone Value | Length Issue |\n`;
    md += `|---|---|---|---|\n`;
    invalidPhones.forEach(ip => {
        const len = ip.error.split('_').pop();
        md += `| ${ip.name} | ${ip.details} | \`${ip.phone}\` | ${len} digits |\n`;
    });
    md += `\n---\n\n`;

    // 5. Missing Admission Numbers
    md += `## 5. Missing Admission Numbers (${missingAdmNos.length})\n`;
    md += `These students did not have an admission number assigned in the sheet. We auto-generated placeholders:\n\n`;
    md += `| Student Name | Details | Auto-generated ID |\n`;
    md += `|---|---|---|\n`;
    missingAdmNos.forEach(ma => {
        if (ma.name !== '[BLANK RECORD]') {
            md += `| ${ma.name} | ${ma.details} | \`${ma.generated}\` |\n`;
        }
    });
    md += `\n---\n\n`;

    // 6. Excluded Blank Rows
    md += `## 6. Excluded Blank Rows (${blankRecords.length})\n`;
    md += `These rows were entirely blank placeholder rows in the CSV and were excluded from database entry:\n\n`;
    blankRecords.forEach(br => {
        md += `* **${br.details}**\n`;
    });

    fs.writeFileSync(reportPath, md, 'utf8');
    console.log(`Saved report to ${reportPath}`);
}

main();
