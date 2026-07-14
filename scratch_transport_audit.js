const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

(async () => {
  console.log("============================================");
  console.log("  TRANSPORT DEEP AUDIT");
  console.log("============================================\n");

  // 1. Routes & Stops
  const routes = await p.route.findMany({
    where: { isDeleted: false },
    include: {
      stops: { where: { isDeleted: false }, select: { id: true, stopName: true, monthlyFee: true } },
      _count: { select: { studentTransports: true } }
    },
    orderBy: { routeCode: 'asc' }
  });

  console.log("1️⃣  ROUTES & STOPS");
  const realRoutes = [];
  for (const r of routes) {
    const isDummy = r.routeCode.startsWith('DEMO') || r.routeCode.startsWith('OP-R') || r.routeCode === 'R1';
    if (isDummy) {
      console.log(`   🗑️  DUMMY: ${r.routeCode} | ${r.routeName} | ${r._count.studentTransports} students`);
      continue;
    }
    realRoutes.push(r);
    for (const s of r.stops) {
      const m = Number(s.monthlyFee);
      console.log(`   ✅ ${r.routeCode} | ${s.stopName} | ₹${m}/mo | ₹${m*10}/yr | ${r._count.studentTransports} students`);
    }
  }

  // 2. All transport assignments
  const allTransport = await p.studentTransport.findMany({
    include: {
      route: { select: { routeCode: true } },
      pickupStop: { select: { stopName: true, monthlyFee: true } },
      dropStop: { select: { stopName: true, monthlyFee: true } },
      student: { select: { id: true, firstName: true, lastName: true, studentCode: true } }
    }
  });

  // 3. Fee consistency check
  console.log("\n\n2️⃣  FEE CONSISTENCY CHECK");
  let mismatches = [];
  for (const t of allTransport) {
    const stopFee = Number(t.pickupStop.monthlyFee);
    const studentFee = Number(t.monthlyFee);
    if (Math.abs(stopFee - studentFee) > 0.01) {
      mismatches.push({ student: `${t.student.studentCode} ${t.student.firstName} ${t.student.lastName||''}`, stopFee, studentFee, route: t.route.routeCode });
    }
  }
  if (mismatches.length > 0) {
    console.log(`   ❌ ${mismatches.length} FEE MISMATCHES:`);
    for (const m of mismatches) {
      console.log(`      ${m.student} → ${m.route} | Stop: ₹${m.stopFee} vs Student: ₹${m.studentFee}`);
    }
  } else {
    console.log(`   ✅ All ${allTransport.length} student fees match their stop fees`);
  }

  // 4. Transport invoice items check
  console.log("\n\n3️⃣  TRANSPORT INVOICE CHECK");
  const transportItems = await p.feeInvoiceItem.findMany({
    where: { componentType: 'TRANSPORT' },
    include: { invoice: { select: { studentId: true } } }
  });
  console.log(`   Transport invoice items in DB: ${transportItems.length}`);
  console.log(`   Transport assignments in DB: ${allTransport.length}`);

  let noInvoice = [];
  for (const t of allTransport) {
    const has = transportItems.find(i => i.invoice.studentId === t.studentId);
    if (!has) {
      noInvoice.push(`${t.student.studentCode} ${t.student.firstName} ${t.student.lastName||''} → ${t.route.routeCode} ₹${t.monthlyFee}/mo`);
    }
  }
  if (noInvoice.length > 0) {
    console.log(`   ⚠️  ${noInvoice.length} students have transport but NO invoice item:`);
    for (const n of noInvoice) console.log(`      ${n}`);
  } else {
    console.log(`   ✅ All transport students have invoice items`);
  }

  // 5. Invoice amount vs assignment check
  console.log("\n\n4️⃣  INVOICE AMOUNT vs ANNUAL FEE");
  let amtMismatch = [];
  for (const item of transportItems) {
    const t = allTransport.find(t => t.studentId === item.invoice.studentId);
    if (t) {
      const expected = Number(t.monthlyFee) * 10;
      const actual = Number(item.amount);
      if (Math.abs(expected - actual) > 1) {
        amtMismatch.push({ sid: t.student.studentCode, name: `${t.student.firstName} ${t.student.lastName||''}`, expected, actual });
      }
    }
  }
  if (amtMismatch.length > 0) {
    console.log(`   ❌ ${amtMismatch.length} invoice amount mismatches:`);
    for (const m of amtMismatch) console.log(`      ${m.sid} ${m.name} | Expected: ₹${m.expected} | Invoice: ₹${m.actual}`);
  } else {
    console.log(`   ✅ All invoice amounts match (monthlyFee × 10)`);
  }

  // 6. Per-stop student list
  console.log("\n\n5️⃣  PER-STOP STUDENT LIST");
  for (const r of realRoutes) {
    const sts = allTransport.filter(t => t.routeId === r.id);
    const fee = r.stops[0] ? Number(r.stops[0].monthlyFee) : 0;
    console.log(`\n   ${r.routeCode} | ${r.stops[0]?.stopName || 'NO STOP'} | ₹${fee}/mo (₹${fee*10}/yr) — ${sts.length} students:`);
    for (const st of sts) {
      console.log(`      ${st.student.studentCode} ${st.student.firstName} ${st.student.lastName||''}`);
    }
  }

  // 7. Total students & transport summary
  const totalStudents = await p.student.count({ where: { isDeleted: false } });
  console.log(`\n\n6️⃣  SUMMARY`);
  console.log(`   Total students: ${totalStudents}`);
  console.log(`   With transport: ${allTransport.length}`);
  console.log(`   Without transport (SELF): ${totalStudents - allTransport.length}`);

  console.log("\n============================================");
  console.log("  AUDIT COMPLETE");
  console.log("============================================");
  await p.$disconnect();
})();
