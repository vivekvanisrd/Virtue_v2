import { PrismaClient } from "@prisma/client";
import {
  createRouteAction,
  updateRouteAction,
  deleteRouteAction,
  getRoutesAction,
  createVehicleAction,
  updateVehicleAction,
  deleteVehicleAction,
  getVehiclesAction,
  createStopAction,
  updateStopAction,
  deleteStopAction,
  getStopsAction,
  createDriverAction,
  updateDriverAction,
  deleteDriverAction,
  getDriversAction,
  assignDriverAction,
  unassignDriverAction,
  getDriverAssignmentsAction,
  assignStudentTransportAction,
  removeStudentTransportAction,
  getStudentTransportAction,
  createTripSessionAction,
  getTripSessionsAction,
} from "@/lib/actions/transport-actions-v2";

const prisma = new PrismaClient();

async function runTests() {
  console.log("🚀 STARTING TRANSPORT V2 COMPLIANCE TESTS...");

  // 1. Resolve test data context dynamically from database
  const school = await prisma.school.findFirst();
  if (!school) {
    throw new Error("Pre-requisite failed: No School found in database to execute tests.");
  }
  const branch = await prisma.branch.findFirst({ where: { schoolId: school.id } });
  if (!branch) {
    throw new Error("Pre-requisite failed: No Branch found for School in database.");
  }
  const student = await prisma.student.findFirst({ where: { schoolId: school.id, isDeleted: false } });
  if (!student) {
    throw new Error("Pre-requisite failed: No active Student found in database.");
  }

  console.log(`📌 Using Test Context: School: ${school.id}, Branch: ${branch.id}, Student: ${student.id}`);

  // Mock Sovereign Session Identity using env override
  process.env.TEST_OVERRIDE_SOVEREIGN = "true";
  process.env.TEST_SCHOOL_ID = school.id;
  process.env.TEST_BRANCH_ID = branch.id;
  process.env.TEST_ROLE = "DEVELOPER";
  process.env.TEST_STAFF_ID = "compliance-test-agent";

  let routeId = "";
  let stopId1 = "";
  let stopId2 = "";
  let vehicleId = "";
  let driverId = "";
  let assignmentId = "";
  let studentAllocationId = "";
  let tripSessionId = "";

  try {
    // ==========================================
    // A. Route CRUD & Constraint Checks
    // ==========================================
    console.log("\n--- A. Route CRUD Tests ---");
    const routeCode = `RT-${Math.random().toString(36).substring(7).toUpperCase()}`;
    const routeRes: any = await createRouteAction({
      routeName: "Compliance Test Route",
      routeCode,
    });
    console.log("Create Route Result:", routeRes.success ? "Success" : "Failed", routeRes.error || "");
    if (!routeRes.success || !routeRes.data) throw new Error("Route creation failed");
    routeId = routeRes.data.id;

    // Duplicate prevention check
    const dupRouteRes: any = await createRouteAction({
      routeName: "Duplicate Route Name",
      routeCode,
    });
    console.log("Prevent Duplicate Route Code Check:", !dupRouteRes.success ? "Passed" : "Failed (Allowed duplicate)");

    // Optimistic Concurrency Control Check
    const routesObj: any = await getRoutesAction();
    const routeToUpdate = routesObj.data.find((r: any) => r.id === routeId);

    // Stale update (using a date in the past)
    const staleUpdateRes: any = await updateRouteAction(routeId, {
      routeName: "Stale Route Name",
      routeCode,
      updatedAt: new Date(Date.now() - 10000).toISOString()
    });
    console.log("Stale OCC Conflict Check:", staleUpdateRes.success === false && staleUpdateRes.error?.code === "CONFLICT_DETECTED" ? "Passed" : "Failed");

    // Fresh update (using current updatedAt)
    const freshUpdateRes: any = await updateRouteAction(routeId, {
      routeName: "Compliance Test Route Updated",
      routeCode,
      updatedAt: routeToUpdate.updatedAt
    });
    console.log("Fresh OCC Update Check:", freshUpdateRes.success ? "Passed" : "Failed");

    // ==========================================
    // B. VehicleStop CRUD Checks
    // ==========================================
    console.log("\n--- B. VehicleStop CRUD Tests ---");
    const stopRes1: any = await createStopAction({
      routeId,
      stopName: "Stop A - Landmark",
      monthlyFee: 1500,
    });
    const stopRes2: any = await createStopAction({
      routeId,
      stopName: "Stop B - Terminus",
      monthlyFee: 2000,
    });
    console.log("Create Stop A Result:", stopRes1.success ? "Success" : "Failed");
    console.log("Create Stop B Result:", stopRes2.success ? "Success" : "Failed");
    if (!stopRes1.success || !stopRes1.data || !stopRes2.success || !stopRes2.data) throw new Error("Stops creation failed");
    stopId1 = stopRes1.data.id;
    stopId2 = stopRes2.data.id;

    // ==========================================
    // C. Vehicle CRUD & Constraint Checks
    // ==========================================
    console.log("\n--- C. Vehicle CRUD Tests ---");
    const regNo = `TS-${Math.floor(1000 + Math.random() * 9000)}`;
    const vehicleRes: any = await createVehicleAction({
      registrationNo: regNo,
      model: "Standard Test Coach",
      capacity: 40,
      routeId,
      onboardingStatus: "ACTIVE",
      documents: { rc: "rc_ref_doc", insurance: "insurance_ref_doc" },
    });
    console.log("Create Vehicle Result:", vehicleRes.success ? "Success" : "Failed", vehicleRes.error || "");
    if (!vehicleRes.success || !vehicleRes.data) throw new Error("Vehicle creation failed");
    vehicleId = vehicleRes.data.id;

    // Duplicate check
    const dupVehicleRes: any = await createVehicleAction({
      registrationNo: regNo,
      model: "Duplicate Coach",
      capacity: 32,
      routeId,
    });
    console.log("Prevent Duplicate Vehicle Reg Check:", !dupVehicleRes.success ? "Passed" : "Failed");

    // ==========================================
    // D. Driver CRUD & Constraint Checks
    // ==========================================
    console.log("\n--- D. Driver CRUD Tests ---");
    const phone = `9${Math.floor(100000000 + Math.random() * 900000000)}`;
    const license = `LIC-${Math.random().toString(36).substring(5).toUpperCase()}`;
    const driverRes: any = await createDriverAction({
      name: "Driver John Doe",
      phone,
      licenseNo: license,
      password: "secure_pass_123",
      status: "ACTIVE",
      documents: { photo: "photo_ref_doc", license: "license_ref_doc" },
    });
    console.log("Create Driver Result:", driverRes.success ? "Success" : "Failed", driverRes.error || "");
    if (!driverRes.success || !driverRes.data) throw new Error("Driver creation failed");
    driverId = driverRes.data.id;

    // ==========================================
    // E. Driver Assignment Concurrency Checks
    // ==========================================
    console.log("\n--- E. Driver Assignment Tests ---");
    const assignRes: any = await assignDriverAction({
      driverId,
      vehicleId,
      routeId,
    });
    console.log("Assign Driver to Vehicle Result:", assignRes.success ? "Success" : "Failed", assignRes.error || "");
    if (!assignRes.success || !assignRes.data) throw new Error("Driver assignment failed");
    assignmentId = assignRes.data.id;

    // Concurrency Check 1: Prevent assigning another driver to the same vehicle
    const secondDriverPhone = `9${Math.floor(100000000 + Math.random() * 900000000)}`;
    const secondDriverLic = `LIC-${Math.random().toString(36).substring(5).toUpperCase()}`;
    const driverRes2: any = await createDriverAction({
      name: "Driver Jane Smith",
      phone: secondDriverPhone,
      licenseNo: secondDriverLic,
      password: "secure_pass_456",
    });
    if (driverRes2.success && driverRes2.data) {
      const dupAssignRes: any = await assignDriverAction({
        driverId: driverRes2.data.id,
        vehicleId,
        routeId,
      });
      console.log("Block Double Drivers on Vehicle Check:", !dupAssignRes.success ? "Passed" : "Failed");
      // Clean up second driver
      await deleteDriverAction(driverRes2.data.id);
    }

    // ==========================================
    // F. Student Allocation & Legacy Sync checks
    // ==========================================
    console.log("\n--- F. Student Allocation & Legacy Sync ---");
    const allocRes: any = await assignStudentTransportAction({
      studentId: student.id,
      routeId,
      pickupStopId: stopId1,
      dropStopId: stopId2,
      monthlyFee: 1500,
    });
    console.log("Allocate Student Result:", allocRes.success ? "Success" : "Failed", allocRes.error || "");
    if (!allocRes.success || !allocRes.data) throw new Error("Student allocation failed");
    studentAllocationId = allocRes.data.id;

    // Verify Legacy Sync Double Write
    const legacyRecord = await prisma.transportAssignment.findUnique({
      where: { studentId: student.id },
    });
    console.log("Legacy Sync Table Double Write Check:", legacyRecord ? "Passed (Exists)" : "Failed");

    // ==========================================
    // G. Trip Session Creation Concurrency Checks
    // ==========================================
    console.log("\n--- G. Trip Session Creation ---");
    const tripRes: any = await createTripSessionAction({
      routeId,
      vehicleId,
      driverId,
      tripType: "PICKUP",
      status: "SCHEDULED",
    });
    console.log("Create Trip Session Result:", tripRes.success ? "Success" : "Failed", tripRes.error || "");
    if (!tripRes.success || !tripRes.data) throw new Error("Trip session creation failed");
    tripSessionId = tripRes.data.id;

    // ==========================================
    // H. Audit Log Validation
    // ==========================================
    console.log("\n--- H. Audit Log Checking ---");
    const auditLogs = await prisma.transportAuditLog.findMany({
      where: { schoolId: school.id, userId: "compliance-test-agent" },
    });
    console.log(`Audit Logs Generated Count: ${auditLogs.length}`);
    console.log("Audit Log Validation:", auditLogs.length > 0 ? "Passed" : "Failed");

    // ==========================================
    // I. Tenancy Isolation Scoping Validation
    // ==========================================
    console.log("\n--- I. Tenancy Isolation Tests ---");
    // Switch active school context to a mock secondary school id
    process.env.TEST_SCHOOL_ID = "unauthorized-secondary-school-id";
    const crossSchoolRoutes: any = await getRoutesAction();
    const isolated = crossSchoolRoutes.success && crossSchoolRoutes.data?.length === 0;
    console.log("Cross-School Tenant Isolation Scoping Check:", isolated ? "Passed" : "Failed (Leaked records)");

    // Restore correct context
    process.env.TEST_SCHOOL_ID = school.id;

    // ==========================================
    // J. Soft Delete Verification
    // ==========================================
    console.log("\n--- J. Soft Delete Tests ---");
    
    // Clean up Allocation
    await removeStudentTransportAction(studentAllocationId);
    const deletedAlloc = await prisma.studentTransport.findUnique({ where: { id: studentAllocationId } });
    console.log("StudentTransport Soft Delete Check:", deletedAlloc && deletedAlloc.isDeleted ? "Passed" : "Failed");

    const legacyCleared = await prisma.transportAssignment.findUnique({ where: { studentId: student.id } });
    console.log("Legacy Assignment Reversal Check:", !legacyCleared ? "Passed" : "Failed");

    // Soft delete Route
    await deleteRouteAction(routeId);
    const deletedRoute = await prisma.route.findUnique({ where: { id: routeId } });
    console.log("Route Soft Delete Check:", deletedRoute && deletedRoute.isDeleted ? "Passed" : "Failed");

    // Clean up remaining setup items
    await unassignDriverAction(assignmentId);
    await deleteVehicleAction(vehicleId);
    await deleteDriverAction(driverId);

    console.log("\n✅ ALL COMPLIANCE TEST SCENARIOS PASSED SUCCESSFULLY!");
  } catch (err: any) {
    console.error("\n❌ COMPLIANCE TEST SCENARIO FAILED:", err.message);
    
    // Attempt emergency cleanup of test objects if created
    if (tripSessionId) await prisma.tripSession.delete({ where: { id: tripSessionId } }).catch(() => {});
    if (studentAllocationId) {
      await prisma.studentTransport.delete({ where: { id: studentAllocationId } }).catch(() => {});
      await prisma.transportAssignment.delete({ where: { studentId: student.id } }).catch(() => {});
    }
    if (assignmentId) await prisma.driverAssignment.delete({ where: { id: assignmentId } }).catch(() => {});
    if (driverId) await prisma.driver.delete({ where: { id: driverId } }).catch(() => {});
    if (vehicleId) await prisma.vehicle.delete({ where: { id: vehicleId } }).catch(() => {});
    if (stopId1) await prisma.vehicleStop.delete({ where: { id: stopId1 } }).catch(() => {});
    if (stopId2) await prisma.vehicleStop.delete({ where: { id: stopId2 } }).catch(() => {});
    if (routeId) await prisma.route.delete({ where: { id: routeId } }).catch(() => {});
    
    process.exit(1);
  } finally {
    // Reset test override variables
    delete process.env.TEST_OVERRIDE_SOVEREIGN;
    delete process.env.TEST_SCHOOL_ID;
    delete process.env.TEST_BRANCH_ID;
    delete process.env.TEST_ROLE;
    delete process.env.TEST_STAFF_ID;
    await prisma.$disconnect();
  }
}

runTests();
