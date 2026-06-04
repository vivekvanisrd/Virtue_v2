import csv
import json
import re

csv_path = r"C:\Users\SriKriations\Favorites\Downloads\Manjula maam(RCB_Details) (1).csv"
output_json_path = "scratch/parsed_students_csv.json"

# Class patterns mapping to database names
class_map = {
    "NUR": "Nursery",
    "PP1": "LKG",
    "PP2": "UKG",
    "1ST": "1st Grade",
    "2ND": "2nd Grade",
    "3RD": "3rd Grade",
    "4TH": "4th Grade",
    "5TH": "5th Grade",
    "6TH": "6th Grade",
    "7TH": "7th Grade",
    "8TH": "8th Grade",
    "9TH": "9th Grade",
    "10TH": "10th Grade"
}

def clean_value(val):
    if not val:
        return ""
    return val.strip()

parsed_students = []
skipped_rows = []

with open(csv_path, mode="r", encoding="utf-8-sig") as f:
    reader = csv.reader(f)
    header = next(reader)
    print("CSV Headers:", header)
    
    for row_idx, row in enumerate(reader):
        row_num = row_idx + 2  # 1-indexed for header + 1 for 0-index
        
        # If the row is empty or only has commas
        if not row or all(not val.strip() for val in row):
            continue
            
        # Ensure we have at least a serial number
        s_no_str = clean_value(row[0]) if len(row) > 0 else ""
        if not s_no_str.isdigit():
            skipped_rows.append({"row_num": row_num, "content": row, "reason": "Non-numeric S.No"})
            continue
            
        s_no = int(s_no_str)
        
        # Read columns with index safety
        admission_no = clean_value(row[1]) if len(row) > 1 else ""
        branch = clean_value(row[2]) if len(row) > 2 else ""
        student_name = clean_value(row[3]) if len(row) > 3 else ""
        class_val = clean_value(row[4]) if len(row) > 4 else ""
        section = clean_value(row[5]) if len(row) > 5 else ""
        father_name = clean_value(row[6]) if len(row) > 6 else ""
        mother_name = clean_value(row[7]) if len(row) > 7 else ""
        phone = clean_value(row[8]) if len(row) > 8 else ""
        alt_phone = clean_value(row[9]) if len(row) > 9 else ""
        caste = clean_value(row[10]) if len(row) > 10 else ""
        dob = clean_value(row[11]) if len(row) > 11 else ""
        admission_date = clean_value(row[12]) if len(row) > 12 else ""
        mother_tongue = clean_value(row[13]) if len(row) > 13 else ""
        aadhar = clean_value(row[14]) if len(row) > 14 else ""
        address = clean_value(row[15]) if len(row) > 15 else ""
        
        # Determine if this row is essentially blank (e.g. only serial no and class/section)
        is_empty_record = not student_name and not father_name and not mother_name and not phone and not aadhar
        
        # Generate provisional / missing flags
        anomalies = []
        
        # Flag missing name
        if not student_name:
            if is_empty_record:
                student_name = "[BLANK RECORD]"
                anomalies.append("blank_record")
            else:
                student_name = "[MISSING NAME]"
                anomalies.append("missing_student_name")
                
        # Flag missing parent names
        if not father_name and not mother_name and not is_empty_record:
            father_name = "[MISSING FATHER NAME]"
            mother_name = "[MISSING MOTHER NAME]"
            anomalies.append("missing_parent_names")
        else:
            if not father_name and not is_empty_record:
                father_name = "[MISSING FATHER NAME]"
            if not mother_name and not is_empty_record:
                mother_name = "[MISSING MOTHER NAME]"
                
        # Flag missing admission number
        if not admission_no:
            # We'll generate a unique placeholder
            admission_no = f"VR-MISSING-{class_val or 'CLASS'}-{section or 'SEC'}-{s_no}"
            anomalies.append("missing_admission_number")
            
        # Clean Aadhaar format (Excel sometimes adds spaces or text, keep digits)
        clean_aadhar = re.sub(r'\s+', '', aadhar)
        if clean_aadhar:
            # Check length
            if len(clean_aadhar) != 12:
                anomalies.append(f"invalid_aadhaar_length_{len(clean_aadhar)}")
        
        # Check phone numbers
        if phone:
            clean_phone = re.sub(r'\s+', '', phone)
            if len(clean_phone) != 10:
                anomalies.append(f"invalid_phone_length_{len(clean_phone)}")
        else:
            if not is_empty_record:
                anomalies.append("missing_primary_phone")
                
        parsed_students.append({
            "s_no": s_no,
            "admission_no": admission_no,
            "branch": branch or "RCB",
            "student_name": student_name,
            "class": class_val,
            "section": section,
            "father_name": father_name,
            "mother_name": mother_name,
            "phone": phone,
            "alt_phone": alt_phone,
            "caste": caste,
            "dob": dob,
            "admission_date": admission_date,
            "mother_tongue": mother_tongue,
            "aadhar": clean_aadhar,
            "address": address,
            "anomalies": anomalies,
            "is_empty_record": is_empty_record,
            "raw_row_num": row_num
        })

print(f"\nTotal rows processed in CSV: {len(parsed_students)}")
print(f"Total skipped rows: {len(skipped_rows)}")

# Check for duplicate admission numbers
admission_counts = {}
for s in parsed_students:
    adm = s["admission_no"]
    # Skip generated placeholders from duplicates check
    if "VR-MISSING-" in adm:
        continue
    admission_counts[adm] = admission_counts.get(adm, 0) + 1

duplicates = {k: v for k, v in admission_counts.items() if v > 1}
print(f"Number of duplicate admission numbers: {len(duplicates)}")

# Mark duplicate flags in anomalies
for s in parsed_students:
    adm = s["admission_no"]
    if adm in duplicates:
        s["anomalies"].append("duplicate_admission_number")
        s["original_admission_no"] = adm

# Write output to JSON
with open(output_json_path, "w", encoding="utf-8") as f:
    json.dump(parsed_students, f, indent=2, ensure_ascii=False)
print(f"Saved parsed CSV data to {output_json_path}")

# Class distribution
class_counts = {}
for s in parsed_students:
    c = s["class"] or "UNKNOWN"
    class_counts[c] = class_counts.get(c, 0) + 1
    
print("\nClass Distribution:")
for c, count in sorted(class_counts.items()):
    print(f"  {c}: {count}")

# Print sample anomalies
print("\nAnomalies Preview (First 10):")
count = 0
for s in parsed_students:
    if s["anomalies"]:
        print(f"  Row {s['raw_row_num']} (S.No {s['s_no']}, Class: {s['class']}): {s['student_name']} | Anomalies: {s['anomalies']}")
        count += 1
        if count >= 10:
            break
