import { PrismaClient } from "@prisma/client";
import { tenancyExtension } from "./prisma-tenancy";
import dns from "dns";

// Force Node.js to resolve IPv6 addresses first. This prevents P1001 connection errors 
// on IPv6-only database hosts like Supabase when running in local Node environments.
if (dns && typeof dns.setDefaultResultOrder === "function") {
  dns.setDefaultResultOrder("ipv6first");
}

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

const prisma = globalThis.prisma ?? baseClient.$extends(tenancyExtension);
if (process.env.NODE_ENV !== "production") globalThis.prisma = prisma;

declare global {
  var prisma: any;
  var prismaBypass: any;
}

export default prisma;


