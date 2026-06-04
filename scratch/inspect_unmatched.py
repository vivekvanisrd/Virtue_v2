import json

with open(r"J:\virtue_fb\virtue-v2\scratch\db_students.json", "r") as f:
    db = json.load(f)

print("--- Searching entire DB for 'NADH' or 'NATH' ---")
for s in db:
    first = s.get("firstName") or ""
    middle = s.get("middleName") or ""
    last = s.get("lastName") or ""
    full = f"{first} {middle} {last}".upper()
    if "NADH" in full or "NATH" in full or "MEG" in full:
        cls = s.get("academic", {}).get("class", {}).get("name", "N/A")
        print(f"- {full} ({cls}) [ID: {s.get('admissionNumber')}]")
