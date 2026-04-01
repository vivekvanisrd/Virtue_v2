const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function backfillRRNs() {
    const data = [
        { id: "pay_SYIXAfVWPjcZu4", rrn: "325746253377" },
        { id: "pay_SYHr3rn0OGektN", rrn: "120462564543" },
        { id: "pay_SYHSRr4gDDOamo", rrn: "164112523434" },
        { id: "pay_SYHEdQArc7E1F4", rrn: "495827666474" },
        { id: "pay_SYHAbKp8deiHgw", rrn: "279362103683" }
    ];

    console.log("🚀 Backfilling Bank RRNs for the audit report...");

    for (const item of data) {
        const collection = await prisma.collection.findFirst({
            where: { paymentReference: item.id }
        });

        if (collection) {
            const currentAlloc = collection.allocatedTo || {};
            await prisma.collection.update({
                where: { id: collection.id },
                data: {
                    allocatedTo: {
                        ...currentAlloc,
                        bankRrn: item.rrn
                    }
                }
            });
            console.log(`[UPDATED] ${item.id} with RRN ${item.rrn}`);
        } else {
            console.log(`[MISSING] ${item.id} not found in DB.`);
        }
    }

    console.log("🏁 Backfill complete.");
}

backfillRRNs()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
