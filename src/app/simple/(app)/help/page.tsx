const SECTIONS = [
  { id: "getting-started", title: "Getting started" },
  { id: "dashboard", title: "The dashboard" },
  { id: "students", title: "Adding & finding students" },
  { id: "collecting", title: "Collecting a fee payment" },
  { id: "fee-terms", title: "Understanding the fee numbers" },
  { id: "receipts", title: "Receipts" },
  { id: "reports", title: "Reports, one by one" },
  { id: "sheet-sync", title: "Sheet sync" },
  { id: "faq", title: "Frequently asked questions" },
];

export default function HelpPage() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 32, alignItems: "flex-start" }}>
      <nav style={{ position: "sticky", top: 20, display: "grid", gap: 4, background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", marginBottom: 4 }}>On this page</div>
        {SECTIONS.map((s) => (
          <a key={s.id} href={`#${s.id}`} style={{ fontSize: 13, color: "#374151", textDecoration: "none", padding: "4px 0" }}>
            {s.title}
          </a>
        ))}
      </nav>

      <div style={{ display: "grid", gap: 32, maxWidth: 760 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0, color: "#111827" }}>Help &amp; guide</h1>
          <p style={{ color: "#4b5563", margin: "4px 0 0" }}>
            A plain-language walkthrough of Fees &amp; Students. Look for the <HelpBadge /> icons throughout the app too — hover one any time you're unsure what a number means.
          </p>
        </div>

        <Section id="getting-started" title="Getting started">
          <P>
            Sign in at <Code>/simple/login</Code> using the same username/password you'd use anywhere else in the school system. This
            takes you straight to Fees &amp; Students — you never need to go through the main portal first.
          </P>
          <P>
            Every page here shows only <strong>your own branch's</strong> data unless you're an Owner or Developer, in which case you
            can see every branch. This isn't just hidden in the menus — it's enforced on every single page, so there's no way to
            accidentally see or affect another branch's numbers.
          </P>
          <P>
            Most pages have a <strong>🔎 Take a tour</strong> button in the bottom-right corner. Click it any time for a guided,
            step-by-step walkthrough of that specific page.
          </P>
        </Section>

        <Section id="dashboard" title="The dashboard">
          <P>The first thing you see after signing in. Four numbers, always:</P>
          <Ul>
            <li><strong>Collected today</strong> — every payment recorded today, cash and online combined.</li>
            <li><strong>Collected this month</strong> — running total since the 1st of the month.</li>
            <li><strong>Pending dues</strong> — how much is still owed in total, and by how many students. This is the number worth checking daily.</li>
            <li><strong>Total students</strong> — how many active students you have.</li>
          </Ul>
          <P>Every one of these numbers is clickable — it takes you straight to the detailed report behind it.</P>
          <P>
            If you're an Owner or Developer, the same four numbers repeat below, once per branch, so you can compare branches at a
            glance without switching between them.
          </P>
        </Section>

        <Section id="students" title="Adding & finding students">
          <P>
            <strong>Add student</strong> in the sidebar opens a short form — just the essentials (name, class, parent contact, fee
            amount). Fees auto-fill from the Fee Master for that class if one is set up, but you can always type your own number
            instead.
          </P>
          <P>
            <strong>All students</strong> lists everyone, with search, filters (class, gender, fee status, transport), and sorting.
            Click "View as Excel" above the table to edit several students' contact details or fees at once, spreadsheet-style,
            without opening each profile.
          </P>
          <P>
            To find one specific student fast from anywhere, use the search box at the very top of the page, or the "Quick find a
            student" box on the dashboard.
          </P>
        </Section>

        <Section id="collecting" title="Collecting a fee payment">
          <P>There are two ways to collect a payment — use whichever is faster for what you're doing:</P>
          <Ul>
            <li>
              <strong>From a student's profile</strong> — open the student, scroll to "Collect a payment". Good when you're already
              looking at their details for another reason.
            </li>
            <li>
              <strong>Collect a fee</strong> in the sidebar — search for the student, take the payment, done. No need to open their
              full profile first. This is the fastest path when you're collecting payments back-to-back at a counter.
            </li>
          </Ul>
          <P>
            Pick an amount, how it was paid, and what it's for. <strong>Cash</strong> needs nothing else. Every other mode — Online,
            UPI, Card, Cheque, Bank Transfer — asks for a reference/transaction ID, since that's what you'd need later to trace or
            reconcile that payment.
          </P>
          <P>
            If you enter more than the student's balance due, you'll be asked to confirm it's a genuine advance payment before it
            saves — this catches a typo'd extra zero before it becomes a permanent record.
          </P>
          <P>
            Every payment is <strong>final</strong> the moment it saves — receipts can't be edited or deleted, only reversed by an
            admin if something was entered wrong. This is deliberate: it keeps every rupee traceable.
          </P>
          <P>
            The moment a payment is saved, every other screen watching that branch — dashboards, reports, that same student's
            profile open elsewhere — updates automatically within a second or two. No one needs to refresh their page.
          </P>
        </Section>

        <Section id="fee-terms" title="Understanding the fee numbers">
          <P>These five numbers appear together on every student's profile. In order:</P>
          <Ul>
            <li><strong>Actual (class) tuition fee</strong> — the standard rate for that student's class, before any discount.</li>
            <li><strong>Discount</strong> — any concession or scholarship applied to this specific student.</li>
            <li><strong>Net tuition fee</strong> — actual fee minus the discount. This is what they really owe for tuition.</li>
            <li><strong>Total fee</strong> — net tuition <em>plus</em> admission fee, transport fee, and anything else charged. Everything, added up.</li>
            <li><strong>Balance due</strong> — total fee minus everything paid so far. If negative, it's shown as "Overpaid / advance" instead.</li>
          </Ul>
          <P>
            <strong>Term 1 / 2 / 3</strong> split the tuition fee into three parts (50% / 25% / 25% of the gross tuition, before
            discount) so you can track which term still needs collecting, independent of the overall balance.
          </P>
          <P>
            <strong>Fee head</strong> just means "what a specific payment was for" — Term 1, Admission Fee, Transport Fee, or
            General for anything that doesn't fit those categories yet.
          </P>
        </Section>

        <Section id="receipts" title="Receipts">
          <P>
            Every payment gets a receipt number automatically (format: <Code>SCHOOL-BRANCH-YEAR-REC-00001</Code>). Right after
            saving a payment, a "View / print receipt" link appears — click it to open a clean, printable receipt in a new tab.
          </P>
          <P>
            Lost track of a receipt? Use <strong>Find a receipt</strong> in the sidebar and search by the receipt number or the
            manual (paper) receipt number if one was also written by hand.
          </P>
        </Section>

        <Section id="reports" title="Reports, one by one">
          <P>All reports live under <strong>Reports</strong> in the sidebar, grouped by category. Every one can be viewed on screen or downloaded as an Excel file.</P>

          <SubHeading>Collections</SubHeading>
          <Ul>
            <li><strong>Collection report</strong> — every payment in a date range, filterable by class, mode, fee head, or staff.</li>
            <li><strong>Day book</strong> — one day's full cash-up sheet: cash/online split, staff-wise.</li>
            <li><strong>Payment mode report</strong> — cash vs. online totals over a range, with a day-by-day trend.</li>
            <li><strong>Receipt register</strong> — every receipt issued, in receipt-number order, for cross-checking against a physical receipt book.</li>
            <li><strong>Fee head ledger</strong> — revenue split by category: Tuition, Admission, Transport, General.</li>
            <li><strong>Collected-by report</strong> — collections totalled per staff member.</li>
            <li><strong>Reversed collections</strong> — audit trail of every voided/reversed payment.</li>
            <li><strong>Advance / overpaid students</strong> — anyone who's paid more than they currently owe.</li>
          </Ul>

          <SubHeading>Dues</SubHeading>
          <Ul>
            <li><strong>Pending dues report</strong> — every student who still owes money, with term-wise status, sortable by how much is owed.</li>
            <li><strong>Term-wise collection report</strong> — Term 1/2/3 due vs. paid, rolled up per class for the whole branch.</li>
          </Ul>

          <SubHeading>Discounts</SubHeading>
          <Ul>
            <li><strong>Discount utilization report</strong> — how much concession has been given, broken down by discount type.</li>
          </Ul>

          <SubHeading>Students</SubHeading>
          <Ul>
            <li><strong>Class summary report</strong> — committed fee, collected, and dues per class/section — the same layout as the Excel "COLLECTION DETAILS" sheet.</li>
            <li><strong>Branch-wise summary</strong> — the class summary rolled up one level, side by side across every branch.</li>
            <li><strong>New admissions report</strong> — students admitted in a date range.</li>
            <li><strong>Student master / contact directory</strong> — the full roster with contact info and current fee status.</li>
            <li><strong>Revenue leakage report</strong> — active students with no fee profile set up yet, or ₹0 tuition — a setup-gap finder.</li>
          </Ul>

          <SubHeading>Transport</SubHeading>
          <Ul>
            <li><strong>Transport fee report</strong> — everyone with a transport fee set, expected vs. collected.</li>
          </Ul>
        </Section>

        <Section id="sheet-sync" title="Sheet sync">
          <P>
            <strong>Sheet sync</strong> (Owner/Developer/Platform Admin only) brings new students and payments from the school's
            Google Sheet into the ERP — it only ever reads the <Code>STUDENT_MASTER</Code> and <Code>FEE_COLLECTION</Code> tabs,
            nothing else.
          </P>
          <P>
            Click <strong>Check sheet for updates</strong> to see what's new. Nothing is imported automatically — every row shows
            its match evidence (an exact admission number, a formatting-tolerant guess, or a phone number matching an existing
            student) so you can catch a typo'd duplicate before it becomes one. Tick only the rows you want, then click{" "}
            <strong>Sync selected</strong>. A row you don't tick stays pending — check again another day and pick up where you
            left off.
          </P>
          <P>
            The dashboard shows a small banner with when the sheet was last checked and how much is waiting for review, so
            nothing new gets missed.
          </P>
          <P>
            Use the <strong>Show</strong> filter to switch between <strong>New only</strong> (the default — never imported or
            synced), <strong>Already imported</strong>, or <strong>All</strong>. Already-imported rows can't be ticked again.
            A row shows as imported either because its receipt number is already on file, or — for payments from before this
            tool existed — because the same student already has a same-amount, same-term payment recorded (that original
            import didn't keep receipt numbers, so this is the only way to recognize those as already done). Click any
            column header to sort by it; click again to reverse the order.
          </P>
          <P>
            Beyond the Show filter, there's a search box (name, admission number, receipt, or phone), a{" "}
            <strong>Branch</strong> filter, a <strong>Duplicates / uncertain</strong> filter — "Only these" isolates rows
            flagged as a possible duplicate student (student list) or an unconfirmed/guessed match (payment list), and
            "Ignore" hides them so you can focus on the clean ones — and a <strong>Missing a field</strong> checkbox for
            rows with an unrecognized branch or class, no phone number, or (for payments) no collector name or no
            transaction reference. Students also get a <strong>Class</strong> filter, and payments get a{" "}
            <strong>Mode</strong> filter (Cash/Online) and a min–max <strong>Amount</strong> range. All of these combine
            with each other and with the Show filter at the same time.
          </P>
          <P>
            The checkbox in each table's header row selects (or clears) every row currently visible and eligible under
            whatever filters are active — handy for ticking a whole class or branch at once instead of one row at a time.
            A row can't be ticked at all if its sheet Status/Entry Status is anything other than blank or "Active" — shown
            as a red ⛔ warning — since that's the sheet's own signal that the row shouldn't be treated as a normal active
            record.
          </P>
        </Section>

        <Section id="faq" title="Frequently asked questions">
          <Faq q="I entered the wrong amount — how do I fix it?">
            You can't edit or delete a saved payment — that's deliberate, so every receipt stays trustworthy. Tell an admin, who
            can reverse it (it'll show up in the Reversed Collections report), then record the correct payment fresh.
          </Faq>
          <Faq q="Why can't I see another branch's numbers?">
            That's by design — every page is locked to your own branch unless you're an Owner or Developer. It's enforced on the
            server, not just hidden in the menu, so there's no way around it from the browser.
          </Faq>
          <Faq q="A parent paid by UPI but I forgot to note the reference — what now?">
            You'll need it before the payment can save — that field is required for every non-cash mode specifically so this can't
            happen. Check the parent's UPI app or bank SMS for the transaction ID if you don't have it handy.
          </Faq>
          <Faq q="Someone else just collected a payment for a student I have open — will I know?">
            Yes — the page updates itself automatically within a second or two, no refresh needed.
          </Faq>
          <Faq q="Do I still need to keep using Excel?">
            Not for anything this system already covers — every report here can be downloaded as Excel if you need the file
            itself. Keep using Excel only for anything genuinely not tracked here yet.
          </Faq>
        </Section>
      </div>
    </div>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} style={{ display: "grid", gap: 12, scrollMarginTop: 20 }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: "#111827", borderBottom: "2px solid #e5e7eb", paddingBottom: 8 }}>{title}</h2>
      {children}
    </section>
  );
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return <h3 style={{ fontSize: 14, fontWeight: 700, color: "#374151", margin: "8px 0 -4px" }}>{children}</h3>;
}

function P({ children }: { children: React.ReactNode }) {
  return <p style={{ margin: 0, fontSize: 14, color: "#374151", lineHeight: 1.6 }}>{children}</p>;
}

function Ul({ children }: { children: React.ReactNode }) {
  return <ul style={{ margin: 0, paddingLeft: 20, display: "grid", gap: 6, fontSize: 14, color: "#374151", lineHeight: 1.5 }}>{children}</ul>;
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code style={{ background: "#f3f4f6", padding: "2px 6px", borderRadius: 4, fontSize: 13, color: "#111827" }}>{children}</code>
  );
}

function HelpBadge() {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 16,
        height: 16,
        borderRadius: "50%",
        background: "#e5e7eb",
        color: "#4b5563",
        fontSize: 11,
        fontWeight: 700,
        verticalAlign: "middle",
      }}
    >
      ?
    </span>
  );
}

function Faq({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 10, padding: 16, display: "grid", gap: 6 }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>{q}</div>
      <div style={{ fontSize: 14, color: "#4b5563", lineHeight: 1.5 }}>{children}</div>
    </div>
  );
}
