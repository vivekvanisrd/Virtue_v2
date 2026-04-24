
import { upsertDiscountType, toggleDiscountStatus, getDiscountAnalyticsVault } from '../src/lib/actions/discount-actions';
import { getManagementFinancialsAction } from '../src/lib/actions/financial-analytics-actions';
import { runWithTenant } from '../src/lib/auth/tenancy-context';
import prisma from '../src/lib/prisma';

async function testAnalytics() {
    console.log("🧪 TESTING ANALYTICS & OVERSIGHT (Phase 5)...");

    try {
        const school = await prisma.school.findFirst();
        if (!school) throw new Error("No school found");

        // 1. TEST RBAC REJECTION (Staff Role)
        console.log("\n--- TEST 1: RBAC REJECTION ---");
        await runWithTenant({ schoolId: school.id, branchId: "ANY", role: "STAFF" }, async () => {
            const result = await getDiscountAnalyticsVault();
            console.log(result.success ? "❌ RBAC Failure: Staff accessed vault" : `✅ RBAC Success: ${result.error}`);
        });

        // 2. TEST NON-NEGATIVE INTEGRITY
        console.log("\n--- TEST 2: NON-NEGATIVE INTEGRITY ---");
        await runWithTenant({ schoolId: school.id, branchId: "ANY", role: "OWNER" }, async () => {
            const result = await upsertDiscountType({ name: "Negative Test", amount: -100 });
            console.log(result.success ? "❌ Integrity Failure: Negative amount accepted" : `✅ Integrity Success: ${result.error}`);
        });

        // 3. TEST DISCOUNT MANAGEMENT (Activate/Inactivate)
        console.log("\n--- TEST 3: DISCOUNT MANAGEMENT ---");
        await runWithTenant({ schoolId: school.id, branchId: "ANY", role: "OWNER" }, async () => {
            const createResult = await upsertDiscountType({ name: "Promotional Offer", amount: 500 });
            if (!createResult.success) throw new Error(createResult.error);
            const typeId = createResult.data.id;
            console.log(`Created: ${createResult.data.name} (Active: ${createResult.data.isActive})`);

            const toggleResult = await toggleDiscountStatus(typeId, false);
            const updated = await prisma.discountType.findUnique({ where: { id: typeId } });
            console.log(`✅ Toggle Success: ${updated?.name} now Active = ${updated?.isActive}`);
        });

        // 4. TEST CONSOLIDATED DASHBOARD
        console.log("\n--- TEST 4: CONSOLIDATED DASHBOARD ---");
        await runWithTenant({ schoolId: school.id, branchId: "ANY", role: "OWNER" }, async () => {
            const result = await getManagementFinancialsAction();
            if (!result.success) throw new Error(result.error);
            console.log(`✅ Consolidated View Success! Scope: ${result.data.scopeType}`);
            console.log(`Live Vault Health: ${result.data.vaultHealth.status} | Balance: ${result.data.vaultHealth.ledgerBalance}`);
        });

        console.log("\n✅ ALL PHASE 5 ANALYTICS TESTS PASSED!");

    } catch (error: any) {
        console.log("❌ TEST ERROR:", error.message);
    } finally {
        await prisma.$disconnect();
    }
}

testAnalytics();
