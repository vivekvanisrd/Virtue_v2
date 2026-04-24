import prisma from "../prisma";
import { TEMPLATE_REGISTRY } from "../events/genesis-templates";
import bcrypt from "bcryptjs";

/**
 * 🏛️ SOVEREIGN GENESIS FACTORY: PROVISIONING SERVICE (v8.0)
 * 
 * Core provisioning engine for institutional instantiation.
 * - All fields validated against actual Prisma schema.
 * - Owner created with PASSWORD_CHANGE_REQUIRED flag (forced first-login change).
 * - IDs follow RULEBOOK: {SCH}-HQ, {SCH}-AY-{YEAR}
 */
export class GenesisService {

    static async instantiateSchool(
        schoolId: string,
        templateId: string,
        triggeredByStaffId: string,
        ownerData?: { firstName: string; lastName: string; email: string; username: string },
        setupData?: {
            schoolName?: string;
            schoolCode?: string;
            branchName?: string;
            branchCode?: string;
            city?: string;
            contactPhone?: string;
            affiliationBoard?: string;
            academicYear?: string;       // e.g. "2026-27"
            academicYearStart?: string;  // e.g. "2026-06-01"
        }
    ) {
        console.log(`🏗️ [GENESIS_FACTORY] Initiating provisioning for: ${schoolId}`);

        const template = TEMPLATE_REGISTRY[templateId];
        if (!template) {
            return { success: false, error: `GENESIS_FAILURE: Invalid Template ID '${templateId}'` };
        }

        const finalOwnerData = ownerData || {
            firstName: "Sovereign",
            lastName: "Owner",
            email: `owner@${schoolId.toLowerCase()}.edu`,
            username: `${schoolId.toLowerCase()}_admin`
        };

        // 🔐 Temporary password — owner MUST change on first login (onboardingStatus gate)
        const tempPasswordHash = await bcrypt.hash("InitialKey@PaVa", 10);

        // 🏗️ Deterministic IDs per RULEBOOK
        const rootBranchId = `${schoolId}-HQ`;                                          // Rule 3.1
        const academicYearLabel = setupData?.academicYear || "2026-27";
        const academicYearId = `${schoolId}-AY-${academicYearLabel}`;                   // Rule 4.1

        let currentStep = "START";

        try {
            // 🛡️ NUCLEAR PURGE — Scoped strictly to this schoolId (Rule 5: Isolation)
            currentStep = "DNA_PURGE";
            console.log(`- 🧹 Purging ghost records for: ${schoolId}...`);

            await prisma.staff.deleteMany({ where: { schoolId } });
            await prisma.academicYear.deleteMany({ where: { schoolId } });
            await prisma.branch.deleteMany({ where: { schoolId } });
            await prisma.school.deleteMany({ where: { id: schoolId } });

            // Also clear by code to prevent unique(code) conflict
            if (setupData?.schoolCode) {
                await prisma.school.deleteMany({
                    where: { code: setupData.schoolCode, NOT: { id: schoolId } }
                });
            }

            console.log(`- ✅ Canvas is clean.`);

            return await (prisma as any).$transaction(async (tx: any) => {

                // ── STEP 1: CREATE SCHOOL ──────────────────────────────────────
                currentStep = "STEP_1_SCHOOL";
                console.log(`- Creating school: ${schoolId}`);
                await tx.school.create({
                    data: {
                        id: schoolId,
                        name: setupData?.schoolName || `${schoolId} Institution`,
                        code: setupData?.schoolCode || schoolId,
                        status: "ACTIVE",
                        isGenesis: true,
                        dnaVersion: "v1",
                    }
                });

                // ── STEP 2: CREATE HQ BRANCH ───────────────────────────────────
                // ID format: {SCH}-HQ  ← Rule 3.1 (Owner Jailing anchor)
                currentStep = "STEP_2_BRANCH";
                console.log(`- Creating branch: ${rootBranchId}`);
                await tx.branch.create({
                    data: {
                        id: rootBranchId,
                        schoolId,
                        name: setupData?.branchName || "Main Campus (HQ)",
                        code: setupData?.branchCode || "MAIN",
                        address: setupData?.city,
                        isGenesis: true,
                        dnaVersion: "v1",
                        source: templateId,
                        mode: "INITIAL_PROVISIONING",
                        triggeredBy: triggeredByStaffId,
                    }
                });

                // ── STEP 3: CREATE OWNER ───────────────────────────────────────
                // onboardingStatus = "PASSWORD_CHANGE_REQUIRED" → forced change on first login
                currentStep = "STEP_3_OWNER";
                console.log(`- Creating owner: ${finalOwnerData.email}`);
                const createdOwner = await tx.staff.create({
                    data: {
                        staffCode: `OWNR-${schoolId}`,
                        firstName: finalOwnerData.firstName,
                        lastName: finalOwnerData.lastName,
                        email: finalOwnerData.email,
                        username: `owner_${schoolId.toLowerCase()}`,
                        passwordHash: tempPasswordHash,
                        role: "OWNER",
                        schoolId,
                        branchId: rootBranchId,   // Anchored to HQ (Rule 3.2)
                        status: "ACTIVE",
                        onboardingStatus: "PASSWORD_CHANGE_REQUIRED",  // 🔐 Forced change
                    }
                });
                console.log(`- ✅ Owner created: ${createdOwner.id}`);

                // ── STEP 4: CREATE ACADEMIC YEAR ──────────────────────────────
                // ID format: {SCH}-AY-{YEAR}  ← Rule 4.1
                currentStep = "STEP_4_ACADEMIC_YEAR";
                console.log(`- Creating academic year: ${academicYearId}`);
                const startDate = setupData?.academicYearStart
                    ? new Date(setupData.academicYearStart)
                    : new Date("2026-06-01");
                // Compute end date: if year is "2026-27", end is March 31 of 2027
                const endYear = parseInt(academicYearLabel.split("-")[0]) + 1;
                const endDate = new Date(`${endYear}-03-31`);

                const academicYear = await tx.academicYear.create({
                    data: {
                        id: academicYearId,
                        name: academicYearLabel,
                        schoolId,
                        startDate,
                        endDate,
                        isCurrent: true,
                        isGenesis: true,
                        dnaVersion: "v1",
                        source: templateId,
                        mode: "INITIAL_PROVISIONING",
                        triggeredBy: triggeredByStaffId,
                    }
                });

                // ── STEP 5: CREATE CLASSES & SECTIONS ─────────────────────────
                currentStep = "STEP_5_CLASSES";
                console.log(`- Building academic structure from template: ${templateId}`);
                for (const classBlueprint of template.classes) {
                    const classId = `${schoolId}-CLS-${classBlueprint.name.replace(/\s+/g, '-').toUpperCase()}`;

                    await tx.class.create({
                        data: {
                            id: classId,
                            name: classBlueprint.name,
                            level: classBlueprint.level,
                            isGenesis: true,
                            dnaVersion: "v1",
                            source: templateId,
                            mode: "INITIAL_PROVISIONING",
                            triggeredBy: triggeredByStaffId,
                        }
                    });

                    await tx.section.create({
                        data: {
                            id: `${classId}-SEC-A`,
                            name: "Section A",
                            classId,
                            isGenesis: true,
                            dnaVersion: "v1",
                            source: templateId,
                            mode: "INITIAL_PROVISIONING",
                            triggeredBy: triggeredByStaffId,
                        }
                    });
                }

                // ── STEP 6: CREATE FEE COMPONENT MASTERS ──────────────────────
                currentStep = "STEP_6_FEE_MASTERS";
                console.log(`- Injecting fee blueprints...`);
                for (const feeBlueprint of template.feeMasters) {
                    await tx.feeComponentMaster.create({
                        data: {
                            schoolId,
                            name: feeBlueprint.name,
                            type: feeBlueprint.type,
                            isOneTime: feeBlueprint.isOneTime,
                            isGenesis: true,
                            dnaVersion: "v1",
                            source: templateId,
                            mode: "INITIAL_PROVISIONING",
                            triggeredBy: triggeredByStaffId,
                        }
                    });
                }

                console.log(`✅ [GENESIS_FACTORY] PROVISIONING COMPLETE for: ${schoolId}`);

                return {
                    success: true,
                    schoolId,
                    academicYearId: academicYear.id,
                    ownerId: createdOwner.id,
                    ownerUsername: `owner_${schoolId.toLowerCase()}`,
                    message: `${setupData?.schoolName || schoolId} is now LIVE. Owner must change password on first login.`
                };

            }, { timeout: 60000 });

        } catch (error: any) {
            console.error(`❌ [GENESIS_SERVICE] FAILED at [${currentStep}]:`, error.message);
            return { success: false, error: `[${currentStep}] ${error.message}` };
        }
    }
}
