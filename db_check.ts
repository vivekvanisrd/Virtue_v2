import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("=== ADMIN / OWNER / DEVELOPER STAFF ===");
  const staff = await prisma.staff.findMany({
    where: {
      role: {
        in: ['OWNER', 'PRINCIPAL', 'ADMIN', 'DEVELOPER']
      }
    },
    include: { branch: true }
  });
  console.log(staff.map(s => ({
    name: `${s.firstName} ${s.lastName || ''}`,
    role: s.role,
    phone: s.phone,
    username: s.username,
    email: s.email,
    branch: s.branch?.name,
    passwordHint: s.phone ? s.phone : `Virtue@${s.branch?.code || '' }2026`
  })));

  console.log("\n=== PLATFORM ADMINS ===");
  const platformAdmins = await prisma.platformAdmin.findMany();
  console.log(platformAdmins);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
