import { getVivesBranchesAction } from "../src/lib/actions/tenancy-actions";

async function main() {
  console.log("⚡ Calling getVivesBranchesAction...");
  const res = await getVivesBranchesAction();
  console.log("Action Result:", JSON.stringify(res));
}

main().catch(console.error);
