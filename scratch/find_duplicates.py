import json
from collections import Counter

with open("scratch/parsed_students.json", "r", encoding="utf-8") as f:
    students = json.load(f)

# Count admission numbers
adm_nos = [s.get("admission_no") for s in students if s.get("admission_no")]

counts = Counter(adm_nos)
duplicates = {k: v for k, v in counts.items() if v > 1}

print("=== DUPLICATE ADMISSION NUMBERS IN PARSED JSON ===")
print(f"Total parsed records: {len(students)}")
print(f"Total unique non-null admission numbers: {len(set(adm_nos))}")
print(f"Number of duplicate keys: {len(duplicates)}")
print("\nList of duplicates and their rows:")
for adm, cnt in duplicates.items():
    matching_students = [s for s in students if s.get("admission_no") == adm]
    print(f"  Admission No: {adm} (appears {cnt} times):")
    for s in matching_students:
        print(f"    S.No {s['s_no']} | Class: {s['class']} {s.get('section') or ''} | Name: {s['student_name']}")
