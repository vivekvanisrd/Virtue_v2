import prisma from "../src/lib/prisma";
import { IdGenerator } from "../src/lib/id-generator";
import bcrypt from "bcryptjs";

const owners = [
  {
    firstName: "Srinath",
    lastName: "Kulkarni",
    email: "prinath@virtueschool.in",
    phone: "9440080372",
    username: "9440080372",
  },
  {
    firstName: "Pavan",
    lastName: "Kumar",
    email: "pavan@virtueschool.in",
    phone: "9849957645",
    username: "9849957645",
  },
  {
    firstName: "Malikarjun",
    lastName: "Kalvemula",
    email: "malikarjun@virtueschool.in",
    phone: "9440427296",
    username: "9440427296",
  },
  {
    firstName: "Panduranga",
    lastName: "Rao",
    email: "pandurangarao@virtueschool.in",
    phone: "8790856576",
    username: "8790856576",
  },
  {
    firstName: "Manjula",
    lastName: "nori",
    email: "manjula@virtueschool.in",
    phone: "9010032550",
    username: "9010032550",
  }
];

async function run() {
  console.log("⏳ Starting owners creation...");

  const results = [];

  for (const owner of owners) {
    const passwordHash = await bcrypt.hash(owner.phone, 10);

    // Generate staff code using Golden DNA protocols
    const staffCode = await IdGenerator.generateStaffCode({
      schoolId: "VIVES",
      schoolCode: "VIVES",
      branchId: "VIVES-RCB",
      branchCode: "VIVESRCB",
      role: "OWNER"
    });

    const staff = await prisma.staff.create({
      data: {
        staffCode,
        firstName: owner.firstName,
        lastName: owner.lastName,
        email: owner.email,
        phone: owner.phone,
        username: owner.username,
        passwordHash,
        role: "OWNER",
        schoolId: "VIVES",
        branchId: "VIVES-RCB",
        status: "ACTIVE",
        onboardingStatus: "PASSWORD_CHANGE_REQUIRED"
      }
    });

    // Create activity log
    await prisma.activityLog.create({
      data: {
        schoolId: "VIVES",
        branchId: "VIVES-RCB",
        action: "OWNER_PROVISIONED",
        entityType: "Staff",
        entityId: staff.id,
        details: `Developer batch-provisioned Owner: ${owner.firstName} ${owner.lastName}`,
        userId: "57d2cbc3-ef51-436f-baaf-ea155c0f5764" // Platform developer id
      }
    });

    results.push({
      name: `${owner.firstName} ${owner.lastName}`,
      username: owner.username,
      staffCode,
      email: owner.email
    });
  }

  console.log("✅ Success! Created owners:");
  console.log(JSON.stringify(results, null, 2));
}

run().catch(console.error);
