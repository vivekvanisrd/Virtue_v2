import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';
import { 
    sanitizeAadhaar, 
    sanitizeDate, 
    sanitizePhone, 
    sanitizeEmail 
} from '../lib/utils/validations';

const prisma = new PrismaClient();

const CSV_PATH = 'j:/virtue_fb/csv/rcbBook.csv';
const SCHOOL_ID = 'VR-SCH01';
const BRANCH_ID = 'VR-RCB01';
const ACADEMIC_YEAR_ID = 'VR-AY-2026-27';

// Mapping for Classes
const CLASS_MAPPING: Record<string, string> = {
    'NUR': 'VR-CLASS-NUR',
    'PP1': 'VR-CLASS-PP1',
    'PP2': 'VR-CLASS-PP2',
    '1st': 'VR-CLASS-1',
    '2nd': 'VR-CLASS-2',
    '3rd': 'VR-CLASS-3',
    '4th': 'VR-CLASS-4',
    '5th': 'VR-CLASS-5',
    '6th': 'VR-CLASS-6',
    '7th': 'VR-CLASS-7',
    '8th': 'VR-CLASS-8',
};

const CLASS_NAMES: Record<string, string> = {
    'VR-CLASS-NUR': 'Nursery',
    'VR-CLASS-PP1': 'PP1 (LKG)',
    'VR-CLASS-PP2': 'PP2 (UKG)',
    'VR-CLASS-1': 'Class 1',
    'VR-CLASS-2': 'Class 2',
    'VR-CLASS-3': 'Class 3',
    'VR-CLASS-4': 'Class 4',
    'VR-CLASS-5': 'Class 5',
    'VR-CLASS-6': 'Class 6',
    'VR-CLASS-7': 'Class 7',
    'VR-CLASS-8': 'Class 8',
};

/**
 * Global Validations have been moved to ../lib/utils/validations
 */

async function main() {
    console.log('🚀 Starting Student CSV Import...');

    const fileContent = fs.readFileSync(CSV_PATH, 'utf-8');
    const records = parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true
    }) as any[];

    console.log(`📊 Found ${records.length} records in CSV.`);

    let successCount = 0;
    let skipCount = 0;

    for (const row of records) {
        const admissionNo = row['Admission no.'] as string;
        const studentName = row['Student name'] as string;

        if (!studentName || studentName.trim() === '') {
            skipCount++;
            continue;
        }

        const classKey = (row['Class'] as string) || '';
        const targetClassId = CLASS_MAPPING[classKey] || `VR-CLASS-${classKey || 'UNKNOWN'}`;
        const className = CLASS_NAMES[targetClassId] || `Class ${classKey}`;

        try {
            // 1. Ensure Class exists
            await prisma.class.upsert({
                where: { id: targetClassId },
                update: {},
                create: { id: targetClassId, name: className, level: parseInt(classKey) || 0 }
            });

            // 2. Ensure Section exists (if provided)
            let targetSectionId: string | null = null;
            if (row['Section']) {
                targetSectionId = `${targetClassId}-SEC-${row['Section']}`;
                await prisma.section.upsert({
                    where: { id: targetSectionId },
                    update: {},
                    create: { id: targetSectionId, name: row['Section'] as string, classId: targetClassId }
                });
            }

            // 3. Create Student Transactionally
            const firstNameParts = studentName.trim().split(/\s+/);
            const firstName = firstNameParts[0];
            const lastName = firstNameParts.slice(1).join(' ') || '.';

            const result = await prisma.$transaction(async (tx: any) => {
                const student = await tx.student.create({
                    data: {
                        admissionNumber: admissionNo || `MIG-${Math.random().toString(36).substring(7)}`,
                        firstName: firstName,
                        lastName: lastName,
                        schoolId: SCHOOL_ID,
                        dob: sanitizeDate(row['Dare of birth'] || row['Date of birth']),
                        phone: sanitizePhone(row['Mobile no:']),
                        email: sanitizeEmail(row['Email'] || row['mail id'] || ''),
                        category: row['Caste'] || null,
                        aadhaarNumber: sanitizeAadhaar(row['Aadhaar no:']),
                        motherTongue: row['mother toung'] || row['mother tongue'] || null,
                        
                        academic: {
                            create: {
                                schoolId: SCHOOL_ID,
                                branchId: BRANCH_ID,
                                academicYear: '2026-27',
                                classId: targetClassId,
                                sectionId: targetSectionId,
                                admissionDate: sanitizeDate(row['Date of admission']) || new Date(),
                            }
                        },
                        
                        family: {
                            create: {
                                fatherName: row["Father's name"] || null,
                                motherName: row["Mother's name"] || null,
                                fatherPhone: row['Mobile no:'] || null,
                                fatherAltPhone: row['Alternat No:'] || null,
                            }
                        },

                        address: {
                            create: {
                                currentAddress: row['Address'] || null,
                                city: 'Sangareddy',
                                state: 'Telangana',
                            }
                        }
                    }
                });
            });

            successCount++;
            if (successCount % 50 === 0) console.log(`✅ Progress: ${successCount} imported...`);

        } catch (error: any) {
            console.error(`❌ Error importing ${studentName} (${admissionNo}):`, error.message);
            // Check if it's a unique constraint error
            if (error.code === 'P2002') {
                console.log(`   ⏭️ Skipping duplicate Admission ID: ${admissionNo}`);
            }
            skipCount++;
        }
    }

    console.log('\n--- Import Summary ---');
    console.log(`✅ Successfully imported: ${successCount}`);
    console.log(`⏭️ Skipped/Failed: ${skipCount}`);
    console.log(`Total processed: ${records.length}`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
