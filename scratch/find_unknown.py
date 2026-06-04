import json

with open("scratch/parsed_students_csv.json", "r", encoding="utf-8") as f:
    students = json.load(f)

for s in students:
    if not s.get("class"):
        print(f"Row {s['raw_row_num']} | S.No {s['s_no']} | Name: {s['student_name']} | Raw Class: {s['class']} | Addr: {s['address']}")
