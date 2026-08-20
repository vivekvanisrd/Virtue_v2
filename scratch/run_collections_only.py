import openpyxl
import psycopg2
import uuid
import datetime

db_url = 'postgresql://postgres.bmyhbgwyirvjeadpvwny:VivekeVani%40369@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres'
conn = psycopg2.connect(db_url)
conn.autocommit = True
cur = conn.cursor()

def safe_float(val):
    if val is None:
        return 0.0
    s = str(val).strip()
    if not s or s.startswith('#'):
        return 0.0
    try:
        return float(s)
    except ValueError:
        return 0.0

# 1. Resolve Scope
cur.execute('SELECT id FROM "School" WHERE code = \'VIVES\' LIMIT 1;')
school_id = cur.fetchone()[0]

cur.execute('SELECT id FROM "Branch" WHERE "schoolId" = %s AND code = \'RCB\' LIMIT 1;', (school_id,))
branch_id = cur.fetchone()[0]

cur.execute('SELECT id FROM "FinancialYear" WHERE "schoolId" = %s AND "isCurrent" = true LIMIT 1;', (school_id,))
fy_id = cur.fetchone()[0]

# Load existing students map from DB
cur.execute('SELECT id, "admissionNumber", "studentCode" FROM "Student" WHERE "schoolId" = %s;', (school_id,))
student_id_by_admi = {}
for sid, adm_no, st_code in cur.fetchall():
    if adm_no:
        student_id_by_admi[adm_no.strip()] = sid
    if st_code:
        student_id_by_admi[st_code.strip()] = sid

print(f"Loaded {len(student_id_by_admi)} student mappings.")

wb = openpyxl.load_workbook('scratch/imported_sheets.xlsx', data_only=True)
ws_fc = wb['FEE_COLLECTION']
fc_rows = [r for r in ws_fc.iter_rows(values_only=True) if any(r)]

imported_collections_count = 0
now = datetime.datetime.now()

print(f"Processing {len(fc_rows)-2} collection rows...")

for row in fc_rows[2:]:
    if row[0] is None or row[3] is None:
        continue
    
    sl_no = row[0]
    date_val = row[1] if isinstance(row[1], (datetime.datetime, datetime.date)) else datetime.date.today()
    receipt_no = str(row[2]).split('.')[0] if row[2] is not None else None
    admi_no = str(row[3]).strip()
    student_name = str(row[4]).strip() if row[4] is not None else ''
    
    cash_amt = safe_float(row[5])
    online_amt = safe_float(row[6])
    total_amt = safe_float(row[7]) if (row[7] is not None and str(row[7]).strip() != '') else (cash_amt + online_amt)
    
    if total_amt <= 0:
        continue
        
    collected_by = str(row[10]).strip() if (row[10] is not None and str(row[10]).strip() != '') else 'Staff'
    txn_ref = str(row[11]).strip() if (row[11] is not None and str(row[11]).strip() != '') else None
    
    st_id = student_id_by_admi.get(admi_no)
    if not st_id:
        name_parts = student_name.split(' ', 1) if student_name else ['Unknown', 'Student']
        st_id = f"std_{uuid.uuid4().hex[:12]}"
        cur.execute('''
            INSERT INTO "Student" (
                id, "schoolId", "branchId", "admissionNumber", "studentCode", "firstName", "lastName", gender, status, "createdAt", "updatedAt"
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, 'OTHER', 'ACTIVE', %s, %s)
            ON CONFLICT ("schoolId", "branchId", "studentCode") DO UPDATE
            SET "firstName" = EXCLUDED."firstName"
            RETURNING id;
        ''', (st_id, school_id, branch_id, admi_no, admi_no, name_parts[0], name_parts[1] if len(name_parts) > 1 else '', now, now))
        res = cur.fetchone()
        if res:
            st_id = res[0]
            student_id_by_admi[admi_no] = st_id

    pmode = "Cash" if cash_amt > 0 else ("Bank QR" if online_amt > 0 else "Cash")
    sys_receipt_no = f"VIRT-RCB-GS-{receipt_no or sl_no}"
    col_id = f"col_{uuid.uuid4().hex[:12]}"

    try:
        cur.execute('''
            INSERT INTO "Collection" (
                id, "receiptNumber", "bookReceiptNo", "studentId", "financialYearId", "schoolId", "branchId",
                "amountPaid", "lateFeePaid", "convenienceFee", "totalPaid", "paymentMode", "paymentReference",
                "collectedBy", "status", "paymentDate"
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 0, 0, %s, %s, %s, %s, 'Success', %s)
            ON CONFLICT DO NOTHING;
        ''', (col_id, sys_receipt_no, receipt_no, st_id, fy_id, school_id, branch_id, total_amt, total_amt, pmode, txn_ref, collected_by, date_val))
        imported_collections_count += 1
    except Exception as e:
        print(f"Error on row {sl_no}: {e}")

print(f"COLLECTIONS IMPORT DONE: Processed {imported_collections_count} collections!")
conn.close()
