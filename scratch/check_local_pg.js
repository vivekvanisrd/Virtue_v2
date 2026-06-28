const { PrismaClient } = require('@prisma/client');

const ports = [5432, 5433, 5434, 5435];
const passwords = ['postgres', 'root', 'password', '123456', '1234', 'root123', 'admin123', 'postgres123', 'VivekeVani@369', 'VivekeVani%40369', 'admin', ''];

async function checkLocalPG() {
  for (const port of ports) {
    for (const password of passwords) {
      const dbNames = ['postgres', 'virtue', 'virtue_db', 'virtue_v2'];
      
      for (const dbName of dbNames) {
        const url = `postgresql://postgres:${encodeURIComponent(password)}@localhost:${port}/${dbName}`;
        const prisma = new PrismaClient({
          datasources: {
            db: { url }
          }
        });

        try {
          const count = await prisma.school.count();
          console.log(`🎉 SUCCESS! Connected to localhost:${port}/${dbName}! School count: ${count}`);
          await prisma.$disconnect();
          return;
        } catch (e) {
          const msg = e.message || '';
          if (msg.includes('does not exist') || msg.includes('relation') || msg.includes('public.')) {
            console.log(`ℹ️ Connected to localhost:${port}/${dbName}, but database is empty (schema not pushed).`);
            await prisma.$disconnect();
            return;
          }
          
          // Print connection/authentication details
          if (e.code) {
            console.log(`Port ${port} (${dbName}) password "${password}": Code ${e.code}`);
          } else {
            console.log(`Port ${port} (${dbName}) password "${password}": ${msg.split('\n')[0]}`);
          }
        } finally {
          await prisma.$disconnect();
        }
      }
    }
  }
}

checkLocalPG();
