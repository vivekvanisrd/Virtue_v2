const fs = require('fs');
const code = fs.readFileSync('src/lib/actions/student-actions.ts', 'utf8');

// Find submitStandardizedAdmissionAction definition and print it
const index = code.indexOf('function submitStandardizedAdmissionAction');
if (index !== -1) {
  console.log(code.substring(index, index + 3500));
} else {
  console.log('submitStandardizedAdmissionAction not found');
}
