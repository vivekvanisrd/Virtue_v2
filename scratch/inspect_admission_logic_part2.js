const fs = require('fs');
const code = fs.readFileSync('src/lib/actions/student-actions.ts', 'utf8');

// Find submitStandardizedAdmissionAction definition and print lines from 60 to 180 of that function
const index = code.indexOf('function submitStandardizedAdmissionAction');
if (index !== -1) {
  console.log(code.substring(index + 2000, index + 5000));
} else {
  console.log('submitStandardizedAdmissionAction not found');
}
