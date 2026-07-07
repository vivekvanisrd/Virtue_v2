import { PrismaClient } from "@prisma/client";
import axios from "axios";

const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;
const BASE_URL = `http://127.0.0.1:${PORT}`;

async function runSimulation() {
  console.log("-----------------------------------------------------------------");
  console.log("⚡ eSSL/BioMax ADMS Biometric Push Emulator");
  console.log("-----------------------------------------------------------------\n");

  try {
    // 1. Resolve a test staff member
    console.log("🔍 Fetching active staff member to use for emulation...");
    const staff = await prisma.staff.findFirst({
      where: { status: "ACTIVE" },
      include: { branch: true }
    });

    if (!staff) {
      console.error("❌ ERROR: No active staff members found in the database. Cannot run simulation.");
      return;
    }

    console.log(`👤 Resolved: ${staff.firstName} ${staff.lastName} (Code: ${staff.staffCode})`);
    console.log(`🏢 Branch: ${staff.branch.name} (Code: ${staff.branch.code}, School: ${staff.schoolId})`);

    // 2. Set test biometricId on the staff member
    let testBiometricId = staff.biometricId;
    if (!testBiometricId) {
      let tempId = "999";
      while (true) {
        const existingStaffWithBiomId = await prisma.staff.findFirst({
          where: { biometricId: tempId }
        });
        if (!existingStaffWithBiomId) {
          testBiometricId = tempId;
          break;
        }
        tempId = Math.floor(1000 + Math.random() * 9000).toString();
      }

      console.log(`⚙️ Ensuring staff biometricId is set to "${testBiometricId}"...`);
      await prisma.staff.update({
        where: { id: staff.id },
        data: { biometricId: testBiometricId }
      });
      console.log("✅ Staff biometric ID mapped.");
    } else {
      console.log(`✅ Staff member already has biometricId "${testBiometricId}". Using it.`);
    }

    // 3. Ensure a test device exists in the database
    const testDeviceCode = "BMAX-TEST-DEVICE-01";
    console.log(`⚙️ Checking if device "${testDeviceCode}" is registered in the database...`);
    const device = await prisma.biometricDevice.findUnique({
      where: { deviceCode: testDeviceCode }
    });

    if (!device) {
      console.log(`➕ Registering device "${testDeviceCode}" in the database...`);
      await prisma.biometricDevice.create({
        data: {
          deviceCode: testDeviceCode,
          deviceName: "eSSL Emulated Terminal",
          location: "Main Gate Office",
          model: "eSSL X2000 ADMS",
          schoolId: staff.schoolId,
          branchId: staff.branchId,
          isActive: true
        }
      });
      console.log("✅ Device registered.");
    } else {
      console.log("✅ Device already exists.");
    }

    // 4. Test endpoints connection
    console.log(`\n🔗 Verifying local server is running on ${BASE_URL}...`);
    try {
      await axios.get(`${BASE_URL}/api/iclock/getrequest`, { 
        params: { SN: testDeviceCode },
        timeout: 3000 
      });
      console.log("✅ Server connection established.");
    } catch (e: any) {
      if (e.code === "ECONNREFUSED" || !e.response) {
        console.error(`\n❌ ERROR: Could not connect to the local Next.js dev server on port ${PORT}.`);
        console.error("💡 Please run 'npm run dev' in another terminal window first to start the server.");
        return;
      }
      console.log("✅ Server connection verified (received response).");
    }

    // 5. Simulate Device Heartbeat (GET /api/iclock/getrequest)
    console.log("\n📡 Simulating Device Heartbeat Ping...");
    console.log(`GET /api/iclock/getrequest?SN=${testDeviceCode}`);
    const pingRes = await axios.get(`${BASE_URL}/api/iclock/getrequest`, {
      params: { SN: testDeviceCode }
    });
    console.log(`📥 Server Response: "${pingRes.data.trim()}" (Expected: "OK")`);

    if (pingRes.data.trim() !== "OK") {
      console.error("❌ Heartbeat ping failed.");
      return;
    }

    // 6. Simulate Device Handshake check (GET /api/iclock/cdata)
    console.log("\n📡 Simulating Device Handshake Connection Check...");
    console.log(`GET /api/iclock/cdata?SN=${testDeviceCode}`);
    const handshakeRes = await axios.get(`${BASE_URL}/api/iclock/cdata`, {
      params: { SN: testDeviceCode }
    });
    console.log(`📥 Server Response: "${handshakeRes.data.trim()}" (Expected: "OK")`);

    if (handshakeRes.data.trim() !== "OK") {
      console.error("❌ Handshake connection check failed.");
      return;
    }

    // 7. Generate current date formatted strings
    const now = new Date();
    const dateStr = now.toISOString().split("T")[0]; // YYYY-MM-DD
    
    const punchInTimeStr = `${dateStr} 08:15:00`;
    const punchOutTimeStr = `${dateStr} 17:30:00`;

    // 8. Simulate Punch IN upload (POST /api/iclock/cdata?SN=...&table=ATTLOG)
    console.log(`\n📡 Pushing simulated Punch IN log (Time: ${punchInTimeStr})...`);
    // Payload format: PIN \t Timestamp \t Status (0=IN) \t VerifyCode \t Workcode \t Reserved1 \t Reserved2
    const punchInPayload = `${testBiometricId}\t${punchInTimeStr}\t0\t1\t0\t0\t0\n`;
    console.log(`POST /api/iclock/cdata?SN=${testDeviceCode}&table=ATTLOG`);
    console.log(`Body:\n${punchInPayload.trim()}`);
    
    const postInRes = await axios.post(
      `${BASE_URL}/api/iclock/cdata`,
      punchInPayload,
      {
        params: { SN: testDeviceCode, table: "ATTLOG" },
        headers: { "Content-Type": "text/plain" }
      }
    );
    console.log(`📥 Server Response: "${postInRes.data.trim()}" (Expected: "OK")`);

    // 9. Simulate Punch OUT upload (POST /api/iclock/cdata?SN=...&table=ATTLOG)
    console.log(`\n📡 Pushing simulated Punch OUT log (Time: ${punchOutTimeStr})...`);
    // Payload format: PIN \t Timestamp \t Status (1=OUT) \t VerifyCode \t Workcode \t Reserved1 \t Reserved2
    const punchOutPayload = `${testBiometricId}\t${punchOutTimeStr}\t1\t1\t0\t0\t0\n`;
    console.log(`POST /api/iclock/cdata?SN=${testDeviceCode}&table=ATTLOG`);
    console.log(`Body:\n${punchOutPayload.trim()}`);
    
    const postOutRes = await axios.post(
      `${BASE_URL}/api/iclock/cdata`,
      punchOutPayload,
      {
        params: { SN: testDeviceCode, table: "ATTLOG" },
        headers: { "Content-Type": "text/plain" }
      }
    );
    console.log(`📥 Server Response: "${postOutRes.data.trim()}" (Expected: "OK")`);

    // 10. Verify attendance records in database
    console.log("\n🔍 Querying database to verify created attendance logs...");
    
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    const attendance = await prisma.staffAttendance.findFirst({
      where: {
        staffId: staff.id,
        date: { gte: todayStart, lt: todayEnd }
      }
    });

    if (attendance) {
      console.log("\n🎉 SUCCESS: Attendance record successfully logged!");
      console.log(` - Date: ${attendance.date.toISOString().split("T")[0]}`);
      console.log(` - Check-In: ${attendance.checkIn ? attendance.checkIn.toLocaleTimeString() : "N/A"}`);
      console.log(` - Check-Out: ${attendance.checkOut ? attendance.checkOut.toLocaleTimeString() : "N/A"}`);
      console.log(` - Status: ${attendance.status}`);
      console.log(` - Remarks: "${attendance.remarks}"`);
    } else {
      console.error("\n❌ FAILED: No attendance record was created in the database.");
    }

  } catch (error: any) {
    console.error("\n❌ ERROR: Simulation failed with exception:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

runSimulation();
