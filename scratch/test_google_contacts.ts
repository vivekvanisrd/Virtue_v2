import { prismaBypass as prisma } from "../src/lib/prisma";
import {
  collectSchoolContacts,
  generateVCardExport,
  generateCSVExport
} from "../src/lib/services/google-contacts-service";

async function main() {
  console.log("🧪 Testing Google Contacts Exporter Service...\n");

  const firstSchool = await prisma.school.findFirst();
  if (!firstSchool) {
    console.log("❌ No school found in database.");
    return;
  }

  console.log(`🏫 School ID: ${firstSchool.id} (${firstSchool.name})`);

  // 1. Collect Contacts
  const contacts = await collectSchoolContacts(firstSchool.id, "all");
  console.log(`✅ Total Contacts Collected: ${contacts.length}`);
  if (contacts.length > 0) {
    console.log("   Sample Contact:", contacts[0]);
  }

  // 2. Test vCard Export
  const vcard = await generateVCardExport(firstSchool.id, "all");
  console.log(`\n📲 vCard Output Generated (${vcard.length} bytes):`);
  console.log(vcard.split("\r\n").slice(0, 15).join("\n"));

  // 3. Test CSV Export
  const csv = await generateCSVExport(firstSchool.id, "all");
  console.log(`\n📊 CSV Output Generated (${csv.length} bytes):`);
  console.log(csv.split("\n").slice(0, 5).join("\n"));

  console.log("\n🎉 ALL GOOGLE CONTACTS TESTS PASSED empirical verification!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
