import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting Demo Transport V2 Seeding...");

  // 1. Resolve test contexts
  const school = await prisma.school.findFirst();
  if (!school) {
    console.error("❌ No School found in database. Please run dev center provisioning first.");
    process.exit(1);
  }

  const branch = await prisma.branch.findFirst({ where: { schoolId: school.id } });
  if (!branch) {
    console.error("❌ No Branch found in database.");
    process.exit(1);
  }

  const students = await prisma.student.findMany({
    where: { schoolId: school.id, isDeleted: false },
    take: 5
  });

  if (students.length === 0) {
    console.warn("⚠️ No students found in database. Cannot seed StudentTransport assignments.");
  }

  const schoolId = school.id;
  const branchId = branch.id;

  console.log(`📌 Using School: ${schoolId}, Branch: ${branchId}`);

  // 2. Clear existing demo data to keep seed idempotent
  console.log("🧹 Clearing old demo data...");
  await prisma.driverDeviceLog.deleteMany({ where: { schoolId } });
  await prisma.driverLoginAudit.deleteMany({ where: { schoolId } });
  await prisma.driverRefreshSession.deleteMany({ where: { schoolId } });
  await prisma.busAttendance.deleteMany({ where: { schoolId } });
  await prisma.vehicleGPSLive.deleteMany({ where: { schoolId } });
  await prisma.vehicleGPSLog.deleteMany({ where: { schoolId } });
  await prisma.vehicleIncident.deleteMany({ where: { schoolId } });
  await prisma.vehicleMaintenance.deleteMany({ where: { schoolId } });
  await prisma.studentTransport.deleteMany({ where: { schoolId } });
  await prisma.transportAssignment.deleteMany({ where: { schoolId } });
  await prisma.tripSession.deleteMany({ where: { schoolId } });
  await prisma.driverAssignment.deleteMany({ where: { schoolId } });
  await prisma.vehicleStop.deleteMany({ where: { schoolId } });
  await prisma.vehicle.deleteMany({ where: { schoolId } });
  await prisma.driver.deleteMany({ where: { schoolId } });
  await prisma.routePolyline.deleteMany({ where: { schoolId } });
  await prisma.route.deleteMany({ where: { schoolId } });

  // 3. Create Routes
  console.log("🛣️ Seeding Routes...");
  const routeA = await prisma.route.create({
    data: {
      routeName: "Demo Route Alpha",
      routeCode: "DEMO-R-A",
      schoolId,
      branchId,
    }
  });

  const routeB = await prisma.route.create({
    data: {
      routeName: "Demo Route Beta",
      routeCode: "DEMO-R-B",
      schoolId,
      branchId,
    }
  });

  // Seed polylines for routes
  const coordsA = [
    [17.6000, 78.1000],
    [17.6020, 78.1050],
    [17.6050, 78.1100],
    [17.6090, 78.1150],
    [17.6120, 78.1200]
  ];
  await prisma.routePolyline.create({
    data: {
      routeId: routeA.id,
      schoolId,
      branchId,
      polyline: JSON.stringify(coordsA)
    }
  });

  const coordsB = [
    [17.6200, 78.1500],
    [17.6230, 78.1550],
    [17.6260, 78.1600],
    [17.6290, 78.1650]
  ];
  await prisma.routePolyline.create({
    data: {
      routeId: routeB.id,
      schoolId,
      branchId,
      polyline: JSON.stringify(coordsB)
    }
  });

  // 4. Create VehicleStops
  console.log("🏏 Seeding VehicleStops...");
  const stopA1 = await prisma.vehicleStop.create({
    data: {
      routeId: routeA.id,
      stopName: "Demo Stop A1 (Green Park)",
      pickupTime: "08:00 AM",
      dropTime: "04:30 PM",
      monthlyFee: 1200.0,
      schoolId,
      branchId,
    }
  });

  const stopA2 = await prisma.vehicleStop.create({
    data: {
      routeId: routeA.id,
      stopName: "Demo Stop A2 (Metro Mall)",
      pickupTime: "08:15 AM",
      dropTime: "04:15 PM",
      monthlyFee: 1500.0,
      schoolId,
      branchId,
    }
  });

  const stopA3 = await prisma.vehicleStop.create({
    data: {
      routeId: routeA.id,
      stopName: "Demo Stop A3 (Central Chowk)",
      pickupTime: "08:30 AM",
      dropTime: "04:00 PM",
      monthlyFee: 1800.0,
      schoolId,
      branchId,
    }
  });

  const stopB1 = await prisma.vehicleStop.create({
    data: {
      routeId: routeB.id,
      stopName: "Demo Stop B1 (Lake View)",
      pickupTime: "08:05 AM",
      dropTime: "04:45 PM",
      monthlyFee: 1100.0,
      schoolId,
      branchId,
    }
  });

  const stopB2 = await prisma.vehicleStop.create({
    data: {
      routeId: routeB.id,
      stopName: "Demo Stop B2 (Hill Station)",
      pickupTime: "08:25 AM",
      dropTime: "04:25 PM",
      monthlyFee: 1400.0,
      schoolId,
      branchId,
    }
  });

  // 5. Create Vehicles with Expiry Documents (Insurance expiring soon, fitness expired)
  console.log("🚌 Seeding Vehicles...");
  const vehicle1 = await prisma.vehicle.create({
    data: {
      registrationNo: "TS-09-DEMO-01",
      model: "Demo TATA Winger",
      capacity: 15,
      routeId: routeA.id,
      schoolId,
      branchId,
      onboardingStatus: "ACTIVE",
      documents: {
        insuranceExpiry: "2026-07-10", // Expiring soon in ~22 days
        fitnessExpiry: "2026-05-15",   // Expired a month ago
        pollutionExpiry: "2026-11-20", // Safe
      }
    }
  });

  const vehicle2 = await prisma.vehicle.create({
    data: {
      registrationNo: "TS-09-DEMO-02",
      model: "Demo Eicher Coach",
      capacity: 40,
      routeId: routeB.id,
      schoolId,
      branchId,
      onboardingStatus: "ACTIVE",
      documents: {
        insuranceExpiry: "2026-10-05", // Safe
        fitnessExpiry: "2027-02-18",   // Safe
        pollutionExpiry: "2026-06-05", // Expired recently!
      }
    }
  });

  // 6. Create Drivers
  console.log("👨‍✈️ Seeding Drivers...");
  const passwordHash = await bcrypt.hash("demo123", 10);
  const driver1 = await prisma.driver.create({
    data: {
      name: "Demo Driver 1",
      phone: "9999999901",
      licenseNo: "DL-DEMO-001",
      passwordHash,
      status: "ACTIVE",
      schoolId,
      branchId,
      documents: { photoUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150" }
    }
  });

  const driver2 = await prisma.driver.create({
    data: {
      name: "Demo Driver 2",
      phone: "9999999902",
      licenseNo: "DL-DEMO-002",
      passwordHash,
      status: "ACTIVE",
      schoolId,
      branchId,
      documents: { photoUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150" }
    }
  });

  // 7. Create Driver Assignments
  console.log("🔗 Seeding Assignments...");
  await prisma.driverAssignment.create({
    data: {
      driverId: driver1.id,
      vehicleId: vehicle1.id,
      routeId: routeA.id,
      schoolId,
      branchId,
      status: "Active"
    }
  });

  await prisma.driverAssignment.create({
    data: {
      driverId: driver2.id,
      vehicleId: vehicle2.id,
      routeId: routeB.id,
      schoolId,
      branchId,
      status: "Active"
    }
  });

  // 8. Assign Students
  if (students.length > 0) {
    console.log("🎓 Seeding Student Allocations...");
    // Allocate student 0 and 1 to route A
    await prisma.studentTransport.create({
      data: {
        studentId: students[0].id,
        routeId: routeA.id,
        pickupStopId: stopA1.id,
        dropStopId: stopA3.id,
        monthlyFee: 1500.0,
        status: "Active",
        schoolId,
        branchId,
      }
    });
    await prisma.transportAssignment.create({
      data: {
        studentId: students[0].id,
        routeId: routeA.id,
        stopId: stopA1.id,
        schoolId,
        branchId,
      }
    });

    if (students[1]) {
      await prisma.studentTransport.create({
        data: {
          studentId: students[1].id,
          routeId: routeA.id,
          pickupStopId: stopA2.id,
          dropStopId: stopA3.id,
          monthlyFee: 1500.0,
          status: "Active",
          schoolId,
          branchId,
        }
      });
      await prisma.transportAssignment.create({
        data: {
          studentId: students[1].id,
          routeId: routeA.id,
          stopId: stopA2.id,
          schoolId,
          branchId,
        }
      });
    }

    // Allocate student 2 to Route B
    if (students[2]) {
      await prisma.studentTransport.create({
        data: {
          studentId: students[2].id,
          routeId: routeB.id,
          pickupStopId: stopB1.id,
          dropStopId: stopB2.id,
          monthlyFee: 1400.0,
          status: "Active",
          schoolId,
          branchId,
        }
      });
      await prisma.transportAssignment.create({
        data: {
          studentId: students[2].id,
          routeId: routeB.id,
          stopId: stopB1.id,
          schoolId,
          branchId,
        }
      });
    }
  }

  // 9. Create Historical Trip Session & Coordinates for Playback
  console.log("🎬 Seeding Historical Playback Trip...");
  const historicalTrip = await prisma.tripSession.create({
    data: {
      routeId: routeA.id,
      vehicleId: vehicle1.id,
      driverId: driver1.id,
      tripType: "PICKUP",
      status: "COMPLETED",
      startedAt: new Date(Date.now() - 3600000 * 2), // 2 hours ago
      endedAt: new Date(Date.now() - 3600000 * 1),   // 1 hour ago
      schoolId,
      branchId,
    }
  });

  // Seed GPS logs along Route Alpha polyline
  const gpsLogs = coordsA.map((coord, index) => {
    const timeOffset = index * 10 * 60 * 1000; // 10 minutes apart
    const logTime = new Date(historicalTrip.startedAt!.getTime() + timeOffset);
    return {
      vehicleId: vehicle1.id,
      tripSessionId: historicalTrip.id,
      schoolId,
      branchId,
      latitude: coord[0],
      longitude: coord[1],
      speed: index === 3 ? 65.0 : 40.0, // Speeding violation at index 3
      heading: 45.0 * index,
      sequenceNo: index + 1,
      timestamp: logTime,
      serverTimestamp: logTime,
      clientTimestamp: logTime,
    };
  });

  for (const log of gpsLogs) {
    await prisma.vehicleGPSLog.create({ data: log });
  }

  // Seed live GPS position for Active Map demonstration (Winger currently moving)
  await prisma.vehicleGPSLive.create({
    data: {
      vehicleId: vehicle1.id,
      schoolId,
      branchId,
      latitude: 17.6080,
      longitude: 78.1130,
      speed: 35.0,
      heading: 90.0,
      sequenceNo: 10,
    }
  });

  // 10. Seed Incidents
  console.log("⚠️ Seeding Incidents...");
  await prisma.vehicleIncident.create({
    data: {
      vehicleId: vehicle1.id,
      driverId: driver1.id,
      tripSessionId: historicalTrip.id,
      severity: "MEDIUM",
      incidentType: "OVERSPEED",
      description: "Demo Vehicle 1 exceeded standard speed limit (65 km/h recorded in 40 km/h zone).",
      status: "RESOLVED",
      reportedAt: new Date(historicalTrip.startedAt!.getTime() + 30 * 60 * 1000),
      schoolId,
      branchId,
    }
  });

  await prisma.vehicleIncident.create({
    data: {
      vehicleId: vehicle2.id,
      driverId: driver2.id,
      severity: "HIGH",
      incidentType: "BREAKDOWN",
      description: "Demo Vehicle 2 alternator issues causing ignition failures. Recovered to workshop.",
      status: "PENDING",
      reportedAt: new Date(Date.now() - 3600000 * 24), // 1 day ago
      schoolId,
      branchId,
    }
  });

  // 11. Seed Vehicle Maintenance Logs
  console.log("🔧 Seeding Maintenance Logs...");
  await prisma.vehicleMaintenance.create({
    data: {
      vehicleId: vehicle1.id,
      maintenanceType: "SERVICE",
      cost: 4500.0,
      description: "Engine oil, filters replacement, and coolant top-up.",
      performedAt: new Date(Date.now() - 3600000 * 24 * 10), // 10 days ago
      nextDueDate: new Date(Date.now() + 3600000 * 24 * 80), // 80 days left
      status: "COMPLETED",
      schoolId,
      branchId,
    }
  });

  await prisma.vehicleMaintenance.create({
    data: {
      vehicleId: vehicle2.id,
      maintenanceType: "REPAIR",
      cost: 12000.0,
      description: "Brake pad replacement, disc machining, and wheel alignment.",
      performedAt: new Date(Date.now() - 3600000 * 24 * 120), // 120 days ago
      nextDueDate: new Date(Date.now() - 3600000 * 24 * 30),  // Due 30 days ago (OVERDUE!)
      status: "PENDING",
      schoolId,
      branchId,
    }
  });

  console.log("✅ Demo Transport V2 Seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
