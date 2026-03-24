import { PrismaClient } from "@prisma/client";
import { tenancyExtension } from "./prisma-tenancy";

const prismaClientSingleton = () => {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("❌ [Prisma] DATABASE_URL is MISSING from process.env!");
    throw new Error("DATABASE_URL is not defined");
  }
  
  console.log(`📡 [Prisma] Initializing Client (URL length: ${databaseUrl.length})`);

  const client = new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  });

  return client.$extends(tenancyExtension);
};

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>;
}

const prisma = globalThis.prisma ?? prismaClientSingleton();

export default prisma;

if (process.env.NODE_ENV !== "production") globalThis.prisma = prisma;
