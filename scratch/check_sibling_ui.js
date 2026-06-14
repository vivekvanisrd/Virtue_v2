const fs = require('fs');
const content = fs.readFileSync('src/components/finance/FeeCollectionForm.tsx', 'utf8');

// Print lines around "findPotentialSiblings" in FeeCollectionForm
const index = content.indexOf('findPotentialSiblings');
if (index !== -1) {
  console.log('--- findPotentialSiblings usage ---');
  console.log(content.substring(index - 500, index + 1500));
} else {
  console.log('findPotentialSiblings not found in FeeCollectionForm.tsx content');
}
