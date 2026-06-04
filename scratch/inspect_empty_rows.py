import json
import re

# Load differences from json
with open("scratch/pdf_vs_excel_differences.json", "r", encoding="utf-8") as f:
    diffs = json.load(f)

excel_unmatched = diffs["only_in_excel"]
json_unmatched = diffs["only_in_dashboard"]

def normalize_name(name):
    if not name:
        return ""
    return re.sub(r"[\s\.]", "", str(name)).upper()

# Let's check spelling variations or partial name matches
# Build sets of normalized names
excel_names = set(normalize_name(x["student_name"]) for x in excel_unmatched)
json_names = set(normalize_name(x["name_in_sheet"]) for x in json_unmatched).union(
    set(normalize_name(x["student_name"]) for x in json_unmatched)
)

print(f"Total unmatched rows in Excel: {len(excel_unmatched)}")
print(f"Total unmatched rows in JSON: {len(json_unmatched)}")

# Find exact name matches that differ in details (amount, receipt, date)
detail_mismatches = []
excel_unmatched_remaining = []

for ep in excel_unmatched:
    ep_name_norm = normalize_name(ep["student_name"])
    # Find any unmatched JSON records with the same name (normalized)
    matching_jps = [jp for jp in json_unmatched if normalize_name(jp["name_in_sheet"]) == ep_name_norm or normalize_name(jp["student_name"]) == ep_name_norm]
    
    if matching_jps:
        detail_mismatches.append((ep, matching_jps))
    else:
        excel_unmatched_remaining.append(ep)

print(f"\n1. Same Student name exists in both unmatched lists but transaction details differ: {len(detail_mismatches)} instances")
# Show first 10 detail mismatches
for ep, jps in detail_mismatches[:10]:
    print(f"Excel: Row {ep['row']} | {ep['student_name']} | Date: {ep['date']} | Receipt: {ep['receipt_no']} | Total: {ep['total']} (Cash: {ep['cash']}, Online: {ep['online']})")
    for jp in jps[:2]:
        print(f"   -> JSON: Row {jp['row']} of {jp['sheet']} | {jp['name_in_sheet']} | Date: {jp['date']} | Receipt: {jp['receipt_no']} | Total: {jp['total']} (Cash: {jp['cash']}, Online: {jp['online']})")
    print("-" * 40)

# Check for spelling variations (e.g. Levansh vs Levansik, or dots/spaces, or initials)
# We can do this by checking if the Excel name is a substring of the JSON name or vice versa, or if they share significant words
spelling_variations = []
excel_unmatched_final = []

def share_words(name1, name2):
    n1 = re.sub(r"[^\w\s]", " ", name1.upper())
    n2 = re.sub(r"[^\w\s]", " ", name2.upper())
    words1 = set(w for w in n1.split() if len(w) > 2)
    words2 = set(w for w in n2.split() if len(w) > 2)
    return len(words1.intersection(words2)) > 0

for ep in excel_unmatched_remaining:
    ep_name = ep["student_name"]
    # Find if there is any JSON unmatched record that shares words
    matching_jps = [jp for jp in json_unmatched if share_words(jp["name_in_sheet"], ep_name) or share_words(jp["student_name"], ep_name)]
    if matching_jps:
        spelling_variations.append((ep, matching_jps))
    else:
        excel_unmatched_final.append(ep)

print(f"\n2. Spelling variations / Partial name matches: {len(spelling_variations)} instances")
for ep, jps in spelling_variations[:10]:
    print(f"Excel: Row {ep['row']} | {ep['student_name']} | Date: {ep['date']} | Receipt: {ep['receipt_no']} | Total: {ep['total']}")
    for jp in jps[:2]:
        print(f"   -> JSON: Row {jp['row']} of {jp['sheet']} | {jp['name_in_sheet']} | Date: {jp['date']} | Receipt: {jp['receipt_no']} | Total: {jp['total']}")
    print("-" * 40)

# Completely missing in JSON (present in Excel only)
print(f"\n3. Present in Excel but completely missing in Dashboard (No close names): {len(excel_unmatched_final)} rows")
for ep in excel_unmatched_final[:15]:
    print(f"Excel Row {ep['row']} | Name: {ep['student_name']} | Date: {ep['date']} | Receipt: {ep['receipt_no']} | Total: {ep['total']}")

# Find JSON records completely missing in Excel
json_unmatched_remaining = []
for jp in json_unmatched:
    jp_name = jp["name_in_sheet"]
    # check if matched by same normalized name or partial words in any excel unmatched or matched
    if not any(normalize_name(ep["student_name"]) == normalize_name(jp_name) for ep in excel_unmatched):
        if not any(share_words(ep["student_name"], jp_name) for ep in excel_unmatched):
            json_unmatched_remaining.append(jp)

print(f"\n4. Present in Dashboard but completely missing in Excel: {len(json_unmatched_remaining)} rows")
for jp in json_unmatched_remaining[:15]:
    print(f"JSON from {jp['sheet']} Row {jp['row']} | Name: {jp['name_in_sheet']} | Date: {jp['date']} | Receipt: {jp['receipt_no']} | Total: {jp['total']}")
