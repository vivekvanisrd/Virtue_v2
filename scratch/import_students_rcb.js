const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: "postgresql://postgres:VivekeVani%40369@db.bmyhbgwyirvjeadpvwny.supabase.co:6543/postgres?pgbouncer=true"
        }
    }
});

const jsonPath = path.join(__dirname, 'parsed_students_csv.json');
const schoolId = 'VIVES';
const branchId = 'VIVES-RCB';
const academicYearId = 'AY-2025-26-VIVES';

// Date parser helper
function parseDate(dateStr) {
    if (!dateStr) return null;
    dateStr = dateStr.trim();
    dateStr = dateStr.replace(/-/g, '/');
    const parts = dateStr.split('/');
    if (parts.length !== 3) return null;
    
    let day = parseInt(parts[0], 10);
    let month = parseInt(parts[1], 10);
    let year = parseInt(parts[2], 10);
    
    if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
    if (month < 1 || month > 12) return null;
    if (day < 1 || day > 31) return null;
    
    if (year < 100) {
        year += 2000;
    }
    
    const date = new Date(Date.UTC(year, month - 1, day));
    if (isNaN(date.getTime())) return null;
    return date;
}

// Student name splitter
function splitName(nameStr) {
    if (!nameStr) return { firstName: "[MISSING NAME]", middleName: null, lastName: null };
    const parts = nameStr.trim().split(/\s+/);
    if (parts.length === 1) {
        return { firstName: parts[0], middleName: null, lastName: null };
    } else if (parts.length === 2) {
        return { firstName: parts[0], middleName: null, lastName: parts[1] };
    } else {
        return {
            firstName: parts[0],
            middleName: parts.slice(1, -1).join(' '),
            lastName: parts[parts.length - 1]
        };
    }
}

async function main() {
    try {
        console.log("=== STARTING IMPORT PROCESS ===");
        
        // 1. Read JSON file
        if (!fs.existsSync(jsonPath)) {
            throw new Error(`JSON file not found at: ${jsonPath}. Please run the CSV parser first.`);
        }
        const studentsData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
        console.log(`Loaded ${studentsData.length} records from parsed_students_csv.json`);

        // 2. Ensure Academic Year 2025-26 exists in DB
        let ay = await prisma.academicYear.findUnique({
            where: { id: academicYearId }
        });
        if (!ay) {
            console.log(`Academic Year ${academicYearId} not found, creating it...`);
            ay = await prisma.academicYear.create({
                data: {
                    id: academicYearId,
                    name: "2025-26",
                    startDate: new Date("2025-06-01T00:00:00Z"),
                    endDate: new Date("2026-05-31T23:59:59Z"),
                    isCurrent: false,
                    isLocked: true,
                    schoolId: schoolId
                }
            });
            console.log("Created Academic Year:", ay.name);
        } else {
            console.log("Verified Academic Year exists:", ay.name);
        }

        // 3. Fetch Class and Section maps from DB
        const dbClasses = await prisma.class.findMany({
            where: { branchId: branchId },
            select: { id: true, name: true }
        });
        const dbSections = await prisma.section.findMany({
            where: { branchId: branchId },
            select: { id: true, name: true, classId: true }
        });

        console.log(`Found ${dbClasses.length} classes and ${dbSections.length} sections in branch ${branchId}`);

        // Mapping helper for classes from CSV format to DB format
        const classMapping = {
            "NUR": "Nursery",
            "PP1": "LKG",
            "PP2": "UKG",
            "1st": "1st Grade",
            "2nd": "2nd Grade",
            "3rd": "3rd Grade",
            "4th": "4th Grade",
            "5th": "5th Grade",
            "6th": "6th Grade",
            "7th": "7th Grade",
            "8th": "8th Grade",
            "9th": "9th Grade",
            "10th": "10th Grade"
        };

        // Determine first occurrences of duplicate admission numbers
        const admissionCounts = {};
        studentsData.forEach(s => {
            const adm = s.admission_no;
            if (adm && !adm.startsWith("VR-MISSING-")) {
                admissionCounts[adm] = (admissionCounts[adm] || 0) + 1;
            }
        });

        const duplicateTracker = {};
        const importAnomalies = [];
        let successCount = 0;
        let errorCount = 0;

        // Preprocess duplicate suffixes and placeholders synchronously to avoid concurrency issues
        const processedStudents = studentsData.map(s => {
            let finalAdmissionNo = s.admission_no;
            const originalAdm = s.admission_no;
            const isPlaceholderAdm = finalAdmissionNo.startsWith("VR-MISSING-");
            
            if (!isPlaceholderAdm && admissionCounts[originalAdm] > 1) {
                duplicateTracker[originalAdm] = (duplicateTracker[originalAdm] || 0) + 1;
                const occ = duplicateTracker[originalAdm];
                if (occ > 1) {
                    finalAdmissionNo = `${originalAdm}-DUP${occ - 1}`;
                }
            }
            return {
                ...s,
                finalAdmissionNo,
                originalAdm,
                isPlaceholderAdm
            };
        });

        // 4. Loop through students and insert sequentially
        for (let i = 0; i < processedStudents.length; i++) {
            const s = processedStudents[i];
            
            // Resolve Class ID
            const csvClass = s.class || "NUR";
            const dbClassName = classMapping[csvClass] || csvClass;
            const resolvedClass = dbClasses.find(c => c.name.toLowerCase() === dbClassName.toLowerCase());
            
            if (!resolvedClass) {
                console.error(`Row ${s.raw_row_num}: Class '${csvClass}' (mapped to '${dbClassName}') not found in DB! Skipping...`);
                errorCount++;
                continue;
            }

            // Resolve Section ID (optional)
            let resolvedSectionId = null;
            if (s.section) {
                const section = dbSections.find(sec => 
                    sec.classId === resolvedClass.id && 
                    sec.name.toLowerCase() === s.section.toLowerCase()
                );
                if (section) {
                    resolvedSectionId = section.id;
                } else {
                    const classSecs = dbSections.filter(sec => sec.classId === resolvedClass.id);
                    if (classSecs.length > 0) {
                        resolvedSectionId = classSecs[0].id;
                    }
                }
            } else {
                const classSecs = dbSections.filter(sec => sec.classId === resolvedClass.id);
                if (classSecs.length > 0) {
                    resolvedSectionId = classSecs[0].id;
                }
            }

            // Prepare student fields
            const nameObj = splitName(s.student_name);
            const dobDate = parseDate(s.dob);
            const admDate = parseDate(s.admission_date) || new Date("2025-06-01T00:00:00Z");

            // Check if there are any anomalies to track
            const hasAnomalies = s.anomalies.length > 0 || s.finalAdmissionNo !== s.originalAdm || s.isPlaceholderAdm;
            if (hasAnomalies) {
                importAnomalies.push({
                    s_no: s.s_no,
                    student_name: s.student_name,
                    raw_row_num: s.raw_row_num,
                    class: csvClass,
                    section: s.section,
                    original_admission_no: s.originalAdm,
                    final_admission_no: s.finalAdmissionNo,
                    anomalies: s.anomalies,
                    dob: s.dob,
                    phone: s.phone,
                    aadhar: s.aadhar
                });
            }

            // Plain creation per student
            try {
                // Create student
                const student = await prisma.student.create({
                    data: {
                        school: { connect: { id: schoolId } },
                        branch: { connect: { id: branchId } },
                        admissionNumber: s.finalAdmissionNo,
                        firstName: nameObj.firstName,
                        middleName: nameObj.middleName,
                        lastName: nameObj.lastName,
                        dob: dobDate,
                        gender: "Male",
                        category: s.caste || "General",
                        aadhaarNumber: s.aadhar || null,
                        motherTongue: s.mother_tongue || "Telugu",
                        phone: s.phone || null,
                        status: "Active"
                    }
                });

                // Create academic record
                await prisma.academicRecord.create({
                    data: {
                        student: { connect: { id: student.id } },
                        school: schoolId ? { connect: { id: schoolId } } : undefined,
                        branch: { connect: { id: branchId } },
                        academicYear: academicYearId,
                        class: resolvedClass.id ? { connect: { id: resolvedClass.id } } : undefined,
                        section: resolvedSectionId ? { connect: { id: resolvedSectionId } } : undefined,
                        admissionDate: admDate
                    }
                });

                // Create family details
                await prisma.familyDetail.create({
                    data: {
                        student: { connect: { id: student.id } },
                        school: schoolId ? { connect: { id: schoolId } } : undefined,
                        branch: branchId ? { connect: { id: branchId } } : undefined,
                        fatherName: s.father_name || "[MISSING FATHER NAME]",
                        motherName: s.mother_name || "[MISSING MOTHER NAME]",
                        fatherPhone: s.phone || null,
                        motherPhone: s.alt_phone || null
                    }
                });

                // Create address details
                if (s.address) {
                    await prisma.address.create({
                        data: {
                            student: { connect: { id: student.id } },
                            school: schoolId ? { connect: { id: schoolId } } : undefined,
                            branch: branchId ? { connect: { id: branchId } } : undefined,
                            currentAddress: s.address,
                            permanentAddress: s.address,
                            city: "Sangareddy",
                            state: "Telangana",
                            country: "India"
                        }
                    });
                }

                successCount++;
                if (successCount % 50 === 0) {
                    console.log(`Successfully imported ${successCount}/${processedStudents.length} students...`);
                }
            } catch (err) {
                console.error(`❌ Failed to import Row ${s.raw_row_num} (S.No ${s.s_no}): ${err.message}`);
                errorCount++;
            }
        }

        // Save anomalies log to file
        const anomaliesLogPath = path.join(__dirname, 'import_anomalies_log.json');
        fs.writeFileSync(anomaliesLogPath, JSON.stringify(importAnomalies, null, 2), 'utf8');
        console.log(`Saved import anomalies log to ${anomaliesLogPath}`);

        console.log(`\n=== IMPORT SUMMARY ===`);
        console.log(`Total students successfully imported: ${successCount}`);
        console.log(`Total rows with errors/skipped: ${errorCount}`);
        console.log("=== IMPORT PROCESS COMPLETED ===");

    } catch (e) {
        console.error("❌ Fatal Import Error:", e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
