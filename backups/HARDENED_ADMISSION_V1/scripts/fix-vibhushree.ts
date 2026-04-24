import prisma from "../src/lib/prisma";
import { createUserAccount } from "../src/lib/actions/dev-actions";
import * as dotenv from "dotenv";
dotenv.config();

async function fix() {
  const email = "vibhushree@virtueschool.com";
  const staff = await prisma.staff.findFirst({ where: { email } });
  
  if (!staff) {
    console.log("Staff not found");
    return;
  }

  console.log(`Found staff in school: ${staff.schoolId}. Provisioning auth...`);
  const res = await createUserAccount(email, staff.schoolId, staff.role);
  console.log(JSON.stringify(res));
}

fix();
