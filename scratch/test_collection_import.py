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

# Load Scope
cur.execute('SELECT id FROM "School" WHERE code = \'VIVES\' LIMIT 1;')
school_id = cur.fetchone()[0]
cur.execute('SELECT id FROM "Branch" WHERE "schoolId" = %s AND code = \'RCB\' LIMIT 1;', (school_id,))
branch_id = cur.fetchone()[0]
cur.execute('SELECT id FROM "FinancialYear" WHERE "schoolId" = %s AND "isCurrent" = true LIMIT 1;', (school_id,))
fy_id = cur.fetchone()[0]

cur.execute('SELECT id, "admissionNumber", "studentCode" FROM "Student" WHERE "schoolId" = %s;', (school_id,))
student_id_by_admi = {}
for sid, adm_no, st_code in cur.fetchall():
    if adm_no:
        student_id_by_admi[adm_no.strip()] = sid
    if st_code:
        student_id_by_admi[st_code.strip()] = sid

wb = openpyxl.load_workbook('scratch/imported_sheets.xlsx', data_only=True)
ws_fc = wb['FEE_COLLECTION']
fc_rows = [r for r in ws_fc.iter_rows(values_only=True) if any(r)]

row2 = fc_rows[2]
print("Row 2:", row2[:10])

sl_no = row2[0]
date_val = row2[1] if isinstance(row2[1], (datetime.datetime, datetime.date)) else datetime.date.today()
receipt_no = str(row2[2]).split('.')[0] if row2[2] is not None else None
admi_no = str(row2[3]).strip()
student_name = str(row2[4]).strip() if row2[4] is not None else ''

cash_amt = safe_float(row2[5])
online_amt = safe_float(row2[6])
total_amt = safe_float(row2[7]) if (row2[7] is not None and str(row2[7]).strip() != '') else (cash_amt + online_amt)
collected_by = str(row2[10]).strip() if (row2[10] is not None and str(row2[10]).strip() != '') else 'Staff'
txn_ref = str(row2[11]).strip() if (row2[11] is not None and str(row2[11]).strip() != '') else None

st_id = student_id_by_admi.get(admi_no)
print(f"Student ID for {admi_no}: {st_id}")

pmode = "Cash" if cash_amt > 0 else ("Bank QR" if online_amt > 0 else "Cash")
sys_receipt_no = f"VIRT-RCB-GS-{receipt_no or sl_no}"
col_id = f"col_{uuid.uuid4().hex[:12]}"
now = datetime.datetime.now()

try:
    cur.execute('''
        INSERT INTO "Collection" (
            id, "receiptNumber", "bookReceiptNo", "studentId", "financialYearId", "schoolId", "branchId",
            "amountPaid", "lateFeePaid", "convenienceFee", "totalPaid", "paymentMode", "paymentReference",
            "collectedBy", "status", "paymentDate", "createdAt", "updatedAt"
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 0, 0, %s, %s, %s, %s, 'Success', %s, %s, %s)
        RETURNING id;
    ''', (col_id, sys_receipt_no, receipt_no, st_id, fy_id, school_id, branch_id, total_amt, total_amt, pmode, txn_ref, collected_by, date_val, now, now))
    print("COLLECTION INSERT SUCCESS! ID:", cur.fetchone())
except Exception as e:
    print("COLLECTION INSERT ERROR:", e)

conn.close()
