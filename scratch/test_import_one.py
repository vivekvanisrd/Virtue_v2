import openpyxl
import psycopg2
import uuid
import datetime
import sys

db_url = 'postgresql://postgres.bmyhbgwyirvjeadpvwny:VivekeVani%40369@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres'
conn = psycopg2.connect(db_url)
conn.autocommit = True
cur = conn.cursor()

wb = openpyxl.load_workbook('scratch/imported_sheets.xlsx', data_only=True)
ws_students = wb['STUDENT_MASTER']
st_rows = [r for r in ws_students.iter_rows(values_only=True) if any(r)]

print(f"Total rows in STUDENT_MASTER: {len(st_rows)}")

row1 = st_rows[1]
print("Row 1:", row1[:10])

admi_no = str(row1[0]).strip()
student_name = str(row1[1]).strip()
name_parts = student_name.split(' ', 1)
first_name = name_parts[0]
last_name = name_parts[1] if len(name_parts) > 1 else ''
now = datetime.datetime.now()

st_id = f"std_{uuid.uuid4().hex[:12]}"

try:
    cur.execute('''
        INSERT INTO "Student" (
            id, "schoolId", "branchId", "admissionNumber", "studentCode", "firstName", "lastName", gender, status, "createdAt", "updatedAt"
        ) VALUES (%s, 'VIVES', 'VIVES-RCB', %s, %s, %s, %s, 'OTHER', 'ACTIVE', %s, %s)
        ON CONFLICT ("schoolId", "branchId", "studentCode") DO UPDATE
        SET "firstName" = EXCLUDED."firstName", "lastName" = EXCLUDED."lastName", "updatedAt" = EXCLUDED."updatedAt"
        RETURNING id;
    ''', (st_id, admi_no, admi_no, first_name, last_name, now, now))
    res = cur.fetchone()
    print("SUCCESS INSERTING STUDENT! ID:", res)
except Exception as e:
    print("ERROR INSERTING STUDENT:", e)

conn.close()
