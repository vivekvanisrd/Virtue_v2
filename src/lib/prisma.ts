import { PrismaClient } from "@prisma/client";

const prismaClientSingleton = () => {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("❌ [Prisma] DATABASE_URL is MISSING from process.env!");
    throw new Error("DATABASE_URL is not defined");
  }
  
  console.log(`📡 [Prisma] Initializing Client (URL length: ${databaseUrl.length})`);

  // @ts-ignore - datasourceUrl/datasources are valid in Prisma 6.4.1 but lint may be stale
  return new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  });
};

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>;
}

const prisma = globalThis.prisma ?? prismaClientSingleton();

export default prisma;

if (process.env.NODE_ENV !== "production") globalThis.prisma = prisma;
