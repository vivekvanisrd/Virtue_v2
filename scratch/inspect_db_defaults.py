import psycopg2
import json

db_url = 'postgresql://postgres.bmyhbgwyirvjeadpvwny:VivekeVani%40369@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres'
conn = psycopg2.connect(db_url)
cur = conn.cursor()

print("=== SCHOOLS ===")
cur.execute('SELECT id, name, code FROM "School" LIMIT 10;')
schools = cur.fetchall()
for s in schools:
    print(s)

print("\n=== BRANCHES ===")
cur.execute('SELECT id, name, code, "schoolId" FROM "Branch" LIMIT 10;')
branches = cur.fetchall()
for b in branches:
    print(b)

print("\n=== FINANCIAL YEARS ===")
cur.execute('SELECT id, name, "isCurrent", "schoolId" FROM "FinancialYear" LIMIT 10;')
fys = cur.fetchall()
for f in fys:
    print(f)

print("\n=== ACADEMIC YEARS ===")
cur.execute('SELECT id, name, "isCurrent", "schoolId" FROM "AcademicYear" LIMIT 10;')
ays = cur.fetchall()
for a in ays:
    print(a)

print("\n=== CLASSES ===")
cur.execute('SELECT id, name, "schoolId" FROM "Class" LIMIT 20;')
classes = cur.fetchall()
for c in classes:
    print(c)

conn.close()
