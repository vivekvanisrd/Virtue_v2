import dns from "dns";
if (dns && typeof dns.setDefaultResultOrder === "function") {
  dns.setDefaultResultOrder("ipv4first");
}

import { prismaBypass } from "../src/lib/prisma";

async function test() {
  console.log("📡 [TEST] Querying first student...");
  try {
    const student = await prismaBypass.student.findFirst({
      select: { id: true, firstName: true }
    });
    console.log("✅ Query finished! First Student Name:", student?.firstName);
  } catch (err) {
    console.error("❌ Query failed:", err);
  }
}

test();
