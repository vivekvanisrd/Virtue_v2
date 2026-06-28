import { prismaBypass } from "../src/lib/prisma";
import axios from "axios";

/**
 * BioMax ADMS Push Biometric Device Emulator Script
 * ------------------------------------------------
 * Run this script to test the /api/iclock/getrequest and /api/iclock/cdata endpoints.
 * 
 * Usage:
 *   npx tsx scratch/simulate-biomax.ts
 */
async function main() {
  console.log("🚀 Starting BioMax ADMS Device Emulator...");

  // 1. Fetch a valid school & branch to map the device to
  const branch = await prismaBypass.branch.findFirst({
    include: { school: true }
  });

  if (!branch) {
    console.error("❌ No branches found in the database. Please seed the database first.");
    process.exit(1);
  }

  const school = branch.school;
  console.log(`📍 Found Campus: [${branch.name}] in School: [${school.name}]`);

  // 2. Select or update a staff member to have biometricId "999"
  const staff = await prismaBypass.staff.findFirst({
    where: {
      branchId: branch.id,
      status: { in: ["Active", "ACTIVE", "active"] }
    }
  });

  if (!staff) {
    console.error("❌ No active staff found in this branch to run biometric test against.");
    process.exit(1);
  }

  console.log(`👤 Mapped Test Staff: ${staff.firstName} ${staff.lastName} (${staff.staffCode})`);

  await prismaBypass.staff.update({
    where: { id: staff.id },
    data: { biometricId: "999" }
  });
  console.log(`✅ Temporarily set biometricId = "999" for ${staff.firstName}`);

  // 3. Register/Upsert emulator device in database
  const deviceCode = "BMAX-SIMULATOR-01";
  const device = await prismaBypass.biometricDevice.upsert({
    where: { deviceCode },
    update: { isActive: true, branchId: branch.id, schoolId: school.id },
    create: {
      deviceCode,
      deviceName: "Simulator Face Terminal",
      location: "Front Gate (Simulated)",
      model: "BioMax NT-Face L1",
      isActive: true,
      schoolId: school.id,
      branchId: branch.id
    }
  });

  console.log(`🤖 Registered Emulator Device: ${device.deviceName} (SN: ${device.deviceCode})`);

  // Define API url bases (change port if Next.js runs on a different port like 3000)
  const port = process.env.PORT || 3000;
  const baseUrl = `http://localhost:${port}`;
  console.log(`🔗 Connecting to API server at: ${baseUrl}`);

  try {
    // 4. Test GET getrequest (Heartbeat)
    console.log("\n📡 Sending GET /api/iclock/getrequest...");
    const resGetRequest = await axios.get(`${baseUrl}/api/iclock/getrequest`, {
      params: { SN: deviceCode }
    });
    console.log(`   Response Status: ${resGetRequest.status}`);
    console.log(`   Response Body: "${resGetRequest.data}"`);

    if (resGetRequest.data !== "OK") {
      throw new Error(`Unexpected getrequest response: ${resGetRequest.data}`);
    }

    // 5. Test GET cdata (Handshake)
    console.log("\n📡 Sending GET /api/iclock/cdata...");
    const resCdataGet = await axios.get(`${baseUrl}/api/iclock/cdata`, {
      params: { SN: deviceCode }
    });
    console.log(`   Response Status: ${resCdataGet.status}`);
    console.log(`   Response Body: "${resCdataGet.data}"`);

    if (resCdataGet.data !== "OK") {
      throw new Error(`Unexpected cdata GET response: ${resCdataGet.data}`);
    }

    // 6. Test POST cdata ATTLOG (Punch In)
    const todayStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    const punchInTime = `${todayStr} 08:15:22`;
    console.log(`\n📡 Sending POST /api/iclock/cdata (Punch IN at ${punchInTime})...`);
    
    const attlogIn = `999\t${punchInTime}\t0\t1\t0\t0\t0\n`;
    
    const resCdataPostIn = await axios.post(`${baseUrl}/api/iclock/cdata`, attlogIn, {
      params: { SN: deviceCode, table: "ATTLOG" },
      headers: { "Content-Type": "text/plain" }
    });
    console.log(`   Response Status: ${resCdataPostIn.status}`);
    console.log(`   Response Body: "${resCdataPostIn.data}"`);

    // Verify record was created in database
    let attendance = await prismaBypass.staffAttendance.findFirst({
      where: { staffId: staff.id, remarks: { contains: deviceCode } }
    });

    if (attendance) {
      console.log(`   ✅ DB Success: Record created for ${staff.firstName}! Check-in: ${attendance.checkIn?.toLocaleTimeString()}, Status: ${attendance.status}`);
    } else {
      console.warn("   ❌ DB Warning: Attendance record was not found in DB.");
    }

    // 7. Test POST cdata ATTLOG (Punch Out)
    const punchOutTime = `${todayStr} 17:30:10`;
    console.log(`\n📡 Sending POST /api/iclock/cdata (Punch OUT at ${punchOutTime})...`);
    
    const attlogOut = `999\t${punchOutTime}\t1\t1\t0\t0\t0\n`;
    
    const resCdataPostOut = await axios.post(`${baseUrl}/api/iclock/cdata`, attlogOut, {
      params: { SN: deviceCode, table: "ATTLOG" },
      headers: { "Content-Type": "text/plain" }
    });
    console.log(`   Response Status: ${resCdataPostOut.status}`);
    console.log(`   Response Body: "${resCdataPostOut.data}"`);

    // Verify checkout was recorded
    attendance = await prismaBypass.staffAttendance.findFirst({
      where: { staffId: staff.id, remarks: { contains: deviceCode } }
    });

    if (attendance && attendance.checkOut) {
      console.log(`   ✅ DB Success: Check-out recorded: ${attendance.checkOut?.toLocaleTimeString()}, Remarks: "${attendance.remarks}"`);
    } else {
      console.warn("   ❌ DB Warning: Check-out was not recorded in DB.");
    }

    console.log("\n⭐️ BioMax Biometric ADMS push simulator checks completed successfully!");

  } catch (err: any) {
    console.error("❌ Simulation failed during API calls:");
    if (err.response) {
      console.error(`   API Error [${err.response.status}]:`, err.response.data);
    } else {
      console.error("   Error:", err.message);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
