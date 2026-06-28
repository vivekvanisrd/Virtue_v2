const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

async function main() {
  const templatePath = path.join(__dirname, '..', 'public', 'templates', 'virtue_erp_import_template.xlsx');
  
  // 1. Data for STUDENT_MASTER
  const studentMasterHeaders = [
    'Admi No',
    'Student Name',
    'Parent Name',
    'Contact',
    'Branch',
    'Class',
    'Tuition Fee',
    'Concession',
    'Admission Fee',
    'Transport Fee',
    'Status'
  ];
  
  const studentMasterData = [
    studentMasterHeaders,
    [
      'VR0001-26',
      'G. SAANVIKA',
      'G. RAM REDDY',
      '9876543210',
      'RCB',
      '2ND',
      33000,
      3000,
      0,
      12000,
      'Active'
    ],
    [
      'VR0002-26',
      'M. HARSHA',
      'M. VENKATA GOUD',
      '8765432109',
      'RCB',
      'NUR',
      25500,
      0,
      5000,
      0,
      'Active'
    ]
  ];

  // 2. Data for FEE_COLLECTION
  const feeCollectionHeaders = [
    'Receipt No',
    'Date',
    'Admi No',
    'Student Name',
    'Term',
    'Cash',
    'Online',
    'Total',
    'Reference No',
    'Status'
  ];

  const feeCollectionData = [
    feeCollectionHeaders,
    [
      '1001',
      '15/06/2026',
      'VR0001-26',
      'G. SAANVIKA',
      'Term 1',
      5000,
      10000,
      15000,
      'txn_upi_12345',
      'Success'
    ],
    [
      '1002',
      '16/06/2026',
      'VR0002-26',
      'M. HARSHA',
      'Admission Fee',
      0,
      5000,
      5000,
      'txn_card_67890',
      'Success'
    ],
    [
      '1003',
      '17/06/2026',
      'VR0001-26',
      'G. SAANVIKA',
      'Transport',
      2000,
      0,
      2000,
      '',
      'VOIDED'
    ]
  ];

  // Create workbook
  const wb = XLSX.utils.book_new();

  // Create sheets
  const wsMaster = XLSX.utils.aoa_to_sheet(studentMasterData);
  const wsCollection = XLSX.utils.aoa_to_sheet(feeCollectionData);

  // Set column widths for readability
  wsMaster['!cols'] = [
    { wch: 15 }, // Admi No
    { wch: 25 }, // Student Name
    { wch: 25 }, // Parent Name
    { wch: 15 }, // Contact
    { wch: 10 }, // Branch
    { wch: 10 }, // Class
    { wch: 12 }, // Tuition Fee
    { wch: 12 }, // Concession
    { wch: 15 }, // Admission Fee
    { wch: 15 }, // Transport Fee
    { wch: 12 }  // Status
  ];

  wsCollection['!cols'] = [
    { wch: 15 }, // Receipt No
    { wch: 15 }, // Date
    { wch: 15 }, // Admi No
    { wch: 25 }, // Student Name
    { wch: 15 }, // Term
    { wch: 10 }, // Cash
    { wch: 10 }, // Online
    { wch: 10 }, // Total
    { wch: 20 }, // Reference No
    { wch: 12 }  // Status
  ];

  // Append sheets to workbook
  XLSX.utils.book_append_sheet(wb, wsMaster, 'STUDENT_MASTER');
  XLSX.utils.book_append_sheet(wb, wsCollection, 'FEE_COLLECTION');

  // Ensure output directory exists
  const outputDir = path.dirname(templatePath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Write file
  XLSX.writeFile(wb, templatePath);
  console.log(`✅ Excel template successfully created at: ${templatePath}`);
}

main().catch(err => {
  console.error("Error creating template:", err);
});
