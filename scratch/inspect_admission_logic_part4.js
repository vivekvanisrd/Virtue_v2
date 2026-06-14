const fs = require('fs');
const code = fs.readFileSync('src/lib/actions/student-actions.ts', 'utf8');

// Find submitStandardizedAdmissionAction definition and print lines from 6500 characters after the declaration
const index = code.indexOf('function submitStandardizedAdmissionAction');
if (index !== -1) {
  console.log(code.substring(index + 6500, index + 9500));
} else {
  console.log('submitStandardizedAdmissionAction not found');
}
