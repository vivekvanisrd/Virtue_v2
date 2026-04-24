import fs from 'fs';
import path from 'path';

const sourceFile = 'temp_source.csv';
const targetFile = 'staff_march_2026_READY.csv';

function transform() {
    try {
        const deepSanitize = (val) => {
            if (typeof val !== 'string') return val;
            return val
                .replace(/\s+/g, ' ')       // Collapse multiple spaces
                .replace(/[.!]/g, '')       // Remove unwanted symbols
                .trim()
                .split(' ')
                .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
                .join(' ');
        };

        const content = fs.readFileSync(sourceFile, 'utf8');
        const lines = content.split(/\r?\n/).filter(line => line.trim());
        
        // Find the header row (the one containing 'name' or 'ac no')
        let dataStartIndex = 0;
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].toLowerCase().includes('name') && lines[i].toLowerCase().includes('ac no')) {
                dataStartIndex = i + 1;
                break;
            }
        }

        const headers = "firstName,middleName,lastName,email,phone,dob,gender,address,role,department,designation,qualification,experienceYears,dateOfJoining,basicSalary,panNumber,aadhaarNumber,pfNumber,uanNumber,esiNumber,accountName,accountNumber,ifscCode,bankName";
        const resultRows = [headers];

        for (let i = dataStartIndex; i < lines.length; i++) {
            const line = lines[i];
            const cols = line.split(',').map(c => c.trim());
            const rowIndex = i - dataStartIndex;
            
            // Expected columns from user sample: ,,,Name,AcNo,IFSC,Salary,
            if (cols.length < 7) continue;

            const fullName = cols[3] || "";
            const acNo = cols[4] || "";
            const ifsc = cols[5] || "";
            const salary = cols[6] || "0";

            if (!fullName) continue;

            // Name splitting
            const nameParts = fullName.split(' ');
            const firstName = deepSanitize(nameParts[0]);
            const lastName = deepSanitize(nameParts.slice(1).join(' ')) || ".";

            // Mapping to Golden Template with Unique Dummy Data (Pillar 1: Data Integrity)
            const row = [
                firstName,                                      // firstName
                "",                                              // middleName
                lastName,                                       // lastName
                `staff.${rowIndex}@virtue.pava.com`,            // email (Unique)
                `91000${rowIndex.toString().padStart(5, '0')}`, // phone (Unique 10-digit style)
                "2000-01-01",                                   // dob
                "Female",                                       // gender
                "Pava Virtue Main Campus",                     // address
                "Teacher",                                      // role
                "Academics",                                    // department
                "Assistant Teacher",                            // designation
                "B.Ed / Specialized Degree",                    // qualification
                "2",                                            // experienceYears
                "2026-03-01",                                   // dateOfJoining
                salary,                                         // basicSalary
                `PANV2${rowIndex.toString().padStart(5, '0')}`, // panNumber (Unique)
                `1000000${rowIndex.toString().padStart(5, '0')}`,// aadhaarNumber (Unique 12-digit)
                `PFV2${rowIndex}`,                              // pfNumber
                `UANV2${rowIndex}`,                             // uanNumber
                `ESIV2${rowIndex}`,                             // esiNumber
                fullName,                                       // accountName
                acNo,                                           // accountNumber
                ifsc,                                           // ifscCode
                "Virtue Central Bank"                           // bankName
            ];

            resultRows.push(row.map(val => `"${val}"`).join(','));
        }

        fs.writeFileSync(targetFile, resultRows.join('\n'));
        console.log(`✅ Successfully transformed ${resultRows.length - 1} records into ${targetFile}`);

    } catch (e) {
        console.error("❌ Transformation failed:", e.message);
    }
}

transform();
