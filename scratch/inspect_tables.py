import psycopg2

db_url = 'postgresql://postgres.bmyhbgwyirvjeadpvwny:VivekeVani%40369@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres'
conn = psycopg2.connect(db_url)
cur = conn.cursor()

def print_cols(table):
    cur.execute(f"SELECT column_name FROM information_schema.columns WHERE table_name = '{table}';")
    cols = [r[0] for r in cur.fetchall()]
    print(f"Table {table}:", cols)

print_cols("AcademicRecord")
print_cols("StudentFeeComponent")
print_cols("StudentTransport")
print_cols("StudentGuardian")

conn.close()
