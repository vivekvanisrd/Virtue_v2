import dns from "dns";
if (dns && typeof dns.setDefaultResultOrder === "function") {
  dns.setDefaultResultOrder("ipv4first");
}

import { getStudentFeeStatus } from "../src/lib/actions/finance-actions";

async function main() {
  const res = await getStudentFeeStatus("82a28bc3-2f85-4ae1-8023-340f9bf9ab23");
  console.log(JSON.stringify(res, null, 2));
}

main().catch(console.error);
