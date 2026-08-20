import psycopg2

db_url = 'postgresql://postgres.bmyhbgwyirvjeadpvwny:VivekeVani%40369@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres'
conn = psycopg2.connect(db_url)
cur = conn.cursor()

cur.execute('SELECT COUNT(*) FROM "School"')
school_count = cur.fetchone()[0]

cur.execute('SELECT COUNT(*) FROM "Student"')
student_count = cur.fetchone()[0]

cur.execute('SELECT COUNT(*) FROM "Collection"')
collection_count = cur.fetchone()[0]

cur.execute('SELECT COUNT(*) FROM "Class"')
class_count = cur.fetchone()[0]

print(f"DB Connection SUCCESS!")
print(f"Schools: {school_count} | Classes: {class_count} | Students: {student_count} | Collections: {collection_count}")
conn.close()
