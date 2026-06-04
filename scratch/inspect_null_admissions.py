import json

with open("scratch/parsed_students.json", "r", encoding="utf-8") as f:
    students = json.load(f)

print("--- STUDENTS WITH NULL ADMISSION NO ---")
for s in students:
    if s.get("admission_no") is None:
        print(f"S.No {s['s_no']} | Class: {s.get('class')} {s.get('section') or ''} | Name: {s.get('student_name')} | Father: {s.get('father_name')} | Mother: {s.get('mother_name')} | Phone: {s.get('phone')} | Addr: {s.get('address')}")
