import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function runTest() {
  const staffId = "cfe827ad-d63f-4362-b637-51002ab0ac84"; // Swetha Jangampet
  const schoolId = "VIVES";
  const branchId = "VIVES-SNB";
  
  const data = {
    id: staffId,
    firstName: "Swetha",
    lastName: "Jangampet",
    middleName: "",
    email: "swetha@virtueschool.in",
    phone: "9876543210", // Test phone number
    gender: "Female",
    role: "PRINCIPAL",
    schoolId: "VIVES",
    branchId: "VIVES-SNB",
    dob: "1985-05-15",
    address: "Test Address, Shanthinagar",
    onboardingStatus: "PASSWORD_CHANGE_REQUIRED",
    designation: "Principal",
    department: "Academics",
    qualification: "M.A, B.Ed",
    experienceYears: 10,
    dateOfJoining: "2026-06-01",
    basicSalary: 45000,
    panNumber: "ABCDE1234F",
    pfNumber: "PF12345",
    uanNumber: "100987654321",
    esiNumber: "ESI12345",
    aadhaarNumber: "123456789012",
    bankName: "HDFC Bank",
    accountName: "Swetha Jangampet",
    accountNumber: "5010020304050",
    ifscCode: "HDFC0000123"
  };

  console.log("Running direct Prisma transaction simulation...");
  try {
    const result = await prisma.$transaction(async (tx: any) => {
      // A. Base Record Update
      console.log("Updating base staff record...");
      const staff = await tx.staff.update({
          where: { id: staffId },
          data: {
              ...(data.firstName?.trim() && { firstName: data.firstName.trim() }),
              ...(data.lastName?.trim() && { lastName: data.lastName.trim() }),
              ...(data.role && { role: data.role }),
              middleName: data.middleName?.trim() || null,
              email: data.email?.trim().toLowerCase() || null,
              phone: data.phone?.trim() || null,
              gender: data.gender || null,
              dob: data.dob ? new Date(data.dob) : null,
              address: data.address?.trim() || null,
              onboardingStatus: data.onboardingStatus || null,
          }
      });
      console.log("Base staff record updated successfully.");

      // B. Professional Layers
      console.log("Upserting professional layer...");
      await tx.staffProfessional.upsert({
          where: { staffId },
          update: {
              ...(data.designation?.trim() && { designation: data.designation.trim() }),
              ...(data.dateOfJoining && { dateOfJoining: new Date(data.dateOfJoining) }),
              ...(data.basicSalary !== undefined && data.basicSalary !== "" && { basicSalary: Number(data.basicSalary) }),
              department: data.department || null,
              qualification: data.qualification?.trim() || null,
              experienceYears: (data.experienceYears !== undefined && data.experienceYears !== "") ? Number(data.experienceYears) : null,
          },
          create: {
              staffId,
              schoolId,
              branchId: staff.branchId,
              designation: data.designation?.trim() || "Staff",
              department: data.department || "Academics",
              qualification: data.qualification?.trim() || null,
              experienceYears: Number(data.experienceYears) || 0,
              dateOfJoining: data.dateOfJoining ? new Date(data.dateOfJoining) : new Date(),
              basicSalary: Number(data.basicSalary) || 0
          }
      });
      console.log("Professional layer upserted successfully.");

      // C. Statutory Layer
      console.log("Upserting statutory layer...");
      await tx.staffStatutory.upsert({
          where: { staffId },
          update: {
              panNumber: data.panNumber?.trim().toUpperCase() || null,
              pfNumber: data.pfNumber?.trim() || null,
              uanNumber: data.uanNumber?.trim() || null,
              esiNumber: data.esiNumber?.trim() || null,
              aadhaarNumber: data.aadhaarNumber?.trim() || null,
          },
          create: {
              staffId,
              schoolId,
              branchId: staff.branchId,
              panNumber: data.panNumber?.trim().toUpperCase() || null,
              pfNumber: data.pfNumber?.trim() || null,
              uanNumber: data.uanNumber?.trim() || null,
              esiNumber: data.esiNumber?.trim() || null,
              aadhaarNumber: data.aadhaarNumber?.trim() || null,
          }
      });
      console.log("Statutory layer upserted successfully.");

      // D. Bank Routing
      console.log("Upserting bank layer...");
      if (data.bankName || data.accountNumber || data.ifscCode || data.accountName) {
          await tx.staffBank.upsert({
              where: { staffId },
              update: {
                  ...(data.bankName?.trim() && { bankName: data.bankName.trim() }),
                  ...(data.accountName?.trim() && { accountName: data.accountName.trim() }),
                  ...(data.accountNumber?.trim() && { accountNumber: data.accountNumber.trim() }),
                  ...(data.ifscCode?.trim() && { ifscCode: data.ifscCode.trim().toUpperCase() }),
              },
              create: {
                  staffId,
                  schoolId,
                  branchId: staff.branchId,
                  bankName: data.bankName || "Pending",
                  accountName: data.accountName || `${data.firstName} ${data.lastName}`,
                  accountNumber: data.accountNumber || "Pending",
                  ifscCode: data.ifscCode || ""
              }
          });
      }
      console.log("Bank layer upserted successfully.");

      // E. Audit Trail
      console.log("Creating activity log...");
      await tx.activityLog.create({
          data: {
              schoolId,
              userId: "57d2cbc3-ef51-436f-baaf-ea155c0f5764", // Mock user
              branchId: staff.branchId,
              entityType: "STAFF",
              entityId: staff.id,
              action: "STAFF_UPDATED",
              details: `Staff member ${staff.firstName} ${staff.lastName} record updated. Code: ${staff.staffCode}`
          }
      });
      console.log("Activity log created successfully.");

      return staff;
    }, { timeout: 20000 });

    console.log("Direct transaction COMPLETED SUCCESSFULLY! Result:", result);
  } catch (e: any) {
    console.error("Direct transaction FAILED with error:", e);
  }
}

runTest().catch(console.error).finally(() => prisma.$disconnect());
