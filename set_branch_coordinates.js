const { PrismaClient } = require("@prisma/client");
const dotenv = require("dotenv");
dotenv.config();

const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 3) {
    console.log("Usage: node set_branch_coordinates.js <BranchCodeOrId> <Latitude> <Longitude> [GeofenceRadiusMeters]");
    console.log("Example: node set_branch_coordinates.js BRC-001 12.971598 77.594562 150");
    process.exit(1);
  }

  const [identifier, latStr, lonStr, radiusStr] = args;
  const latitude = parseFloat(latStr);
  const longitude = parseFloat(lonStr);
  const radius = radiusStr ? parseInt(radiusStr, 10) : 200;

  if (isNaN(latitude) || isNaN(longitude)) {
    console.error("Error: Latitude and Longitude must be valid numbers.");
    process.exit(1);
  }

  // Find branch
  const branch = await prisma.branch.findFirst({
    where: {
      OR: [
        { id: identifier },
        { code: identifier }
      ]
    }
  });

  if (!branch) {
    console.error(`Error: Branch with ID or Code '${identifier}' not found.`);
    process.exit(1);
  }

  const existingMetadata = branch.metadata || {};
  const updatedMetadata = {
    ...existingMetadata,
    latitude: latitude.toString(),
    longitude: longitude.toString(),
    geofenceRadius: radius
  };

  await prisma.branch.update({
    where: { id: branch.id },
    data: {
      metadata: updatedMetadata
    }
  });

  console.log(`Successfully updated coordinates for branch '${branch.name}' (${branch.code}):`);
  console.log(`- Latitude: ${latitude}`);
  console.log(`- Longitude: ${longitude}`);
  console.log(`- Geofence Radius: ${radius} meters`);
  
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("An unexpected error occurred:", err);
  process.exit(1);
});
