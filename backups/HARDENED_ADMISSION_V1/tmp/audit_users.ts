import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function audit() {
    console.log("--- STARTING IDENTITY ACCESS AUDIT ---");
    
    // 1. Find the Principal (virtuetest1)
    const principal = await prisma.staff.findFirst({
        where: { 
            OR: [
                { username: "virtuetest1" },
                { email: "virtuetest1" }
            ]
        },
        select: { id: true, username: true, schoolId: true, branchId: true, role: true }
    });
    
    console.log("PRINCIPAL (virtuetest1):", principal);

    // 2. Find the Creator (vibhushree)
    // Note: If vibhushree is a user, we check staff or just look for students created by them
    const creator = await prisma.staff.findFirst({
        where: { 
            OR: [
                { username: "vibhushree" },
                { firstName: "vibhushree" }
            ]
        },
        select: { id: true, username: true, schoolId: true, branchId: true }
    });

    console.log("CREATOR (vibhushree):", creator);

    // 3. Find students in Virtue Viva Academy (or wherever principal is)
    if (principal) {
        const studentCount = await prisma.student.count({
            where: { schoolId: principal.schoolId }
        });
        console.log(`TOTAL STUDENTS IN SCHOOL ${principal.schoolId}:`, studentCount);

        const studentsWithBranches = await prisma.student.findMany({
            where: { schoolId: principal.schoolId },
            include: { academic: { select: { branchId: true } } },
            take: 10
        });

        console.log("STUDENT SAMPLE BRANCHES:", studentsWithBranches.map(s => ({ 
            id: s.id, 
            code: (s as any).studentCode, 
            branch: s.academic?.branchId 
        })));
        
        // 4. Check if Principal's branch matches students' branch
        if (principal.branchId) {
            const studentsInPrincipalBranch = await prisma.student.count({
                where: { 
                    schoolId: principal.schoolId,
                    academic: { branchId: principal.branchId }
                }
            });
            console.log(`STUDENTS IN PRINCIPAL'S BRANCH (${principal.branchId}):`, studentsInPrincipalBranch);
        }
    }

    console.log("--- AUDIT COMPLETE ---");
}

audit().catch(console.error).finally(() => prisma.$disconnect());
