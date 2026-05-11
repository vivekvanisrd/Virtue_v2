import { PrismaClient } from "@prisma/client";
import { tenancyExtension } from "./prisma-tenancy";

const prismaClientSingleton = () => {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.warn("⚠️ [Prisma] DATABASE_URL is MISSING. Build may continue if this is static analysis.");
    // Return a dummy client or similar to prevent hard crash during build-time imports
    return new PrismaClient() as any;
  }
  
  console.log(`📡 [Prisma] Initializing Client (URL length: ${databaseUrl.length})`);

  const client = new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  });

  return client;
};

const baseClient = globalThis.prismaBypass ?? prismaClientSingleton();
if (process.env.NODE_ENV !== "production") globalThis.prismaBypass = baseClient;

export const prismaBypass = baseClient;
const prisma = baseClient.$extends(tenancyExtension);

declare global {
  var prisma: undefined | typeof prisma;
  var prismaBypass: undefined | typeof baseClient;
}

export default prisma;

if (process.env.NODE_ENV !== "production") globalThis.prisma = prisma;
