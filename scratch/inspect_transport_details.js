const fs = require('fs');
const code = fs.readFileSync('src/lib/actions/transport-actions.ts', 'utf8');

const index1 = code.indexOf('function getStudentTransportAction');
if (index1 !== -1) {
  console.log('--- getStudentTransportAction ---');
  console.log(code.substring(index1, index1 + 1500));
}

const index2 = code.indexOf('function recordTransportCollectionAction');
if (index2 !== -1) {
  console.log('--- recordTransportCollectionAction ---');
  console.log(code.substring(index2, index2 + 2500));
}
