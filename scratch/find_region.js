const { PrismaClient } = require('@prisma/client');

const regions = [
  'ap-south-1',
  'ap-southeast-1',
  'ap-southeast-2',
  'ap-northeast-1',
  'ap-northeast-2',
  'ap-northeast-3',
  'us-east-1',
  'us-east-2',
  'us-west-1',
  'us-west-2',
  'eu-west-1',
  'eu-west-2',
  'eu-west-3',
  'eu-central-1',
  'ca-central-1',
  'sa-east-1'
];

async function testRegions() {
  console.log("Checking regions...");
  for (const region of regions) {
    const host = `aws-0-${region}.pooler.supabase.com`;
    const url = `postgresql://postgres.bmyhbgwyirvjeadpvwny:VivekeVani%40369@${host}:6543/postgres`;
    console.log(`\nTesting region: ${region} (${host})...`);
    
    const prisma = new PrismaClient({
      datasources: {
        db: { url }
      }
    });

    try {
      const count = await prisma.school.count();
      console.log(`🎉 SUCCESS in region ${region}! Count: ${count}`);
      await prisma.$disconnect();
      break;
    } catch (e) {
      console.log(`❌ Region ${region} failed:`);
      console.error(e);
    } finally {
      await prisma.$disconnect();
    }
  }
}

testRegions();
