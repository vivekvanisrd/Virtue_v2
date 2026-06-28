import { PrismaClient } from "@prisma/client";
import { createRouteAction, updateRouteAction, getRoutesAction } from "../src/lib/actions/transport-actions-v2";

const prisma = new PrismaClient();

async function run() {
  const school = await prisma.school.findFirst();
  if (!school) {
    console.error("No school found");
    return;
  }
  const branch = await prisma.branch.findFirst({ where: { schoolId: school.id } });
  if (!branch) {
    console.error("No branch found");
    return;
  }

  process.env.TEST_OVERRIDE_SOVEREIGN = "true";
  process.env.TEST_SCHOOL_ID = school.id;
  process.env.TEST_BRANCH_ID = branch.id;
  process.env.TEST_ROLE = "DEVELOPER";
  process.env.TEST_STAFF_ID = "compliance-test-agent";

  const routeCode = `RT-OCC-${Date.now()}`;
  const routeRes: any = await createRouteAction({
    routeName: "OCC Test Route",
    routeCode,
  });

  if (!routeRes.success || !routeRes.data) {
    console.error("Create route failed:", routeRes);
    return;
  }
  const routeId = routeRes.data.id;

  const routesObj: any = await getRoutesAction();
  const routeToUpdate = routesObj.data.find((r: any) => r.id === routeId);

  console.log("routeToUpdate fields:", {
    id: routeToUpdate.id,
    routeName: routeToUpdate.routeName,
    updatedAt: routeToUpdate.updatedAt,
    updatedAtType: typeof routeToUpdate.updatedAt,
    updatedAtIsDate: routeToUpdate.updatedAt instanceof Date
  });

  const staleUpdateRes: any = await updateRouteAction(routeId, {
    routeName: "Stale Route Name",
    routeCode,
    updatedAt: new Date(Date.now() - 10000).toISOString()
  });

  console.log("staleUpdateRes output:", JSON.stringify(staleUpdateRes, null, 2));

  const freshUpdateRes: any = await updateRouteAction(routeId, {
    routeName: "OCC Route Updated",
    routeCode,
    updatedAt: routeToUpdate.updatedAt
  });

  console.log("freshUpdateRes output:", JSON.stringify(freshUpdateRes, null, 2));

  // Clean up
  await prisma.route.delete({ where: { id: routeId } });
  await prisma.$disconnect();
}

run();
