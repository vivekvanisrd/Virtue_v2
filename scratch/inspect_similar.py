import json
import difflib

with open(r"J:\virtue_fb\virtue-v2\scratch\db_students.json", "r") as f:
    db = json.load(f)

with open(r"C:\Users\SriKriations\.gemini\antigravity\brain\9c7156a0-e1c4-462b-a3f8-70303075f29e\reconciliation_report.json", "r", encoding="utf-8") as f:
    report = json.load(f)

db_names_map = {}
for s in db:
    first = s.get("firstName") or ""
    middle = s.get("middleName") or ""
    last = s.get("lastName") or ""
    full = f"{first} {middle} {last}".strip()
    full_clean = " ".join([t for t in full.split() if t.upper() != "NONE"])
    cls = s.get("academic", {}).get("class", {}).get("name", "N/A")
    sec = s.get("academic", {}).get("section", {}).get("name", "N/A")
    db_names_map[full_clean.upper()] = {
        "student": s,
        "full_name": full_clean,
        "class": cls,
        "section": sec,
        "admissionNumber": s.get("admissionNumber")
    }

db_names = list(db_names_map.keys())

unmatched_receipts = report.get("unmatched_details", [])
print(f"Total unmatched records in report: {len(unmatched_receipts)}")

# Get unique unmatched names from the Excel
unmatched_excel_names = {}
for u in unmatched_receipts:
    # Skip staff/teacher rows
    if "skipped" in u.get("reason", "").lower():
        continue
    rcpt = u["receipt"]
    name = rcpt["name"]
    cls = rcpt["class"]
    key = (name, cls)
    if key not in unmatched_excel_names:
        unmatched_excel_names[key] = []
    unmatched_excel_names[key].append(rcpt)

print(f"Unique unmatched student names in Excel: {len(unmatched_excel_names)}")
print("\nTop 30 unmatched names and their closest database matches:")
print("-" * 100)

count = 0
for (name, cls), rcpts in unmatched_excel_names.items():
    count += 1
    if count > 40:
        break
    
    # Clean excel name
    clean_ex = name.upper().replace(".", " ").strip()
    ex_tokens = [t for t in clean_ex.split() if len(t) > 2] # ignore initials
    
    # Find closest matches by difflib
    # Let's check similarity for each token or full name
    matches = difflib.get_close_matches(clean_ex, db_names, n=3, cutoff=0.4)
    
    match_details = []
    for m in matches:
        detail = db_names_map[m]
        match_details.append(f"{detail['full_name']} ({detail['class']} - {detail['section']}) [ID: {detail['admissionNumber']}]")
        
    print(f"Excel Name: '{name}' (Class: {cls}) | Count: {len(rcpts)}")
    print(f"  Closest DB Matches: {match_details}")
    print("-" * 100)
