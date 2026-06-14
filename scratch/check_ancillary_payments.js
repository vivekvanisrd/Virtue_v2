const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const collections = await prisma.collection.findMany({
    where: {
      status: 'Success'
    }
  });

  console.log('Total successful collections:', collections.length);
  
  let withAncillary = 0;
  let termCounts = {};
  
  collections.forEach(c => {
    const allocated = c.allocatedTo || {};
    const terms = allocated.terms || [];
    const ancillaryPaid = allocated.ancillaryPaid || [];
    
    terms.forEach(t => {
      termCounts[t] = (termCounts[t] || 0) + 1;
    });
    
    if (ancillaryPaid.length > 0) {
      withAncillary++;
    }
  });
  
  console.log('Collections with ancillaryPaid array populated:', withAncillary);
  console.log('Terms paid count breakdown:', termCounts);

  // Let's print some collections that paid transport or admission terms
  const transportCollections = collections.filter(c => {
    const terms = c.allocatedTo?.terms || [];
    return terms.some(t => t.toLowerCase().includes('transport') || t.toLowerCase().includes('admission') || t.toLowerCase().includes('caution'));
  });
  
  console.log('Collections with transport/admission/caution in terms:', transportCollections.length);
  transportCollections.slice(0, 10).forEach(c => {
    console.log(`Receipt: ${c.receiptNumber}, Amount: ${c.amountPaid}, Terms: ${c.allocatedTo.terms.join(', ')}`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
