const fs = require('fs');

const extractData = (month, filePath, nameCol, totalCol, attendedCol, netCol, accountCol, ifscCol) => {
    let content = fs.readFileSync(filePath, 'utf8');
    if (content.charCodeAt(0) === 0xFEFF) {
        content = content.slice(1);
    }
    const data = JSON.parse(content);
    return data
        .filter(row => row[nameCol] && typeof row[nameCol] === 'string' && row[nameCol] !== 'NAME' && row[nameCol] !== 'Staff Name')
        .map(row => ({
            month,
            name: row[nameCol]?.trim(),
            totalDays: row[totalCol],
            attendedDays: row[attendedCol],
            netSalary: row[netCol],
            accountNumber: row[accountCol]?.toString().trim(),
            ifscCode: row[ifscCol]?.toString().trim()
        }));
};

// Column Mappings for Axis Bank Details (based on extracted JSON structures)
const report = [
    ...extractData('Dec 2025', 'j:/virtue_fb/virtue-v2/scratch/dec_data_utf8.json', '__EMPTY_1', '__EMPTY_4', '__EMPTY_5', '__EMPTY_6', '__EMPTY_2', 'DECEMBER STAFF SALARIES'),
    ...extractData('Jan 2026', 'j:/virtue_fb/virtue-v2/scratch/jan_data_utf8.json', '__EMPTY_2', '__EMPTY_4', '__EMPTY_5', '__EMPTY_6', '                                                   RCB', 'JANUARY STAFF SALARIES'),
    ...extractData('Feb 2026', 'j:/virtue_fb/virtue-v2/scratch/feb_data_utf8.json', '__EMPTY_4', '__EMPTY_6', '__EMPTY_7', '__EMPTY_8', '                                                   RCB', 'FEBRUARY STAFF SALARIES'),
    ...extractData('Mar 2026', 'j:/virtue_fb/virtue-v2/scratch/march_data_utf8.json', '__EMPTY_1', '__EMPTY_3', '__EMPTY_4', '__EMPTY_5', '                                                   RCB', 'MARCH STAFF SALARIES')
];

fs.writeFileSync('j:/virtue_fb/virtue-v2/scratch/final_attendance_report_v2.json', JSON.stringify(report, null, 2));
console.log(`Extracted ${report.length} records with bank details.`);
