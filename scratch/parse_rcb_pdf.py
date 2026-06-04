import pypdf
import re
import json

pdf_path = r"D:\shop\LIST\new\2026\June 2026\20260602\RCB Data list.pdf"
reader = pypdf.PdfReader(pdf_path)

# Regex patterns
date_pattern = re.compile(r'^\d{1,3}[-/]\d{1,2}[-/]\d{2,4}$') # Matches 28-4-2022, 09/12/21, 080/8/2022
phone_pattern = re.compile(r'^\d{10}$')
caste_pattern = re.compile(r'^(OC|BC|BC\.A|BC\.B|BC\.C|BC\.D|BC\.E|SC|ST|SC\.B|SC\.C|BC\.D|BC\.B)$', re.IGNORECASE)
tongue_pattern = re.compile(r'^(TELUGU|TELUG|TELGU|MARATHI|MARATI|KANNADA|URUDU|URDU|HINDI|TAMIL|ENGLISH)$', re.IGNORECASE)
aadhar_sci_pattern = re.compile(r'^\d\.?\d*E\+\d+$') # Matches 2.01075E+11

# Classes we expect
class_patterns = ["NUR", "PP1", "PP2", "LKG", "UKG", "1ST", "2ND", "3RD", "4TH", "5TH", "6TH", "7TH", "8TH", "9TH", "10TH", "PLAY"]

def is_date(token):
    return bool(date_pattern.match(token))

def is_phone(token):
    return bool(phone_pattern.match(token))

def is_caste(token):
    return bool(caste_pattern.match(token))

def is_tongue(token):
    return bool(tongue_pattern.match(token))

def is_aadhar(token):
    if aadhar_sci_pattern.match(token):
        return True
    if token.isdigit() and len(token) == 12:
        return True
    return False

def parse_line(line):
    # Normalize multiple spaces to single space
    line = re.sub(r'\s+', ' ', line.strip())
    tokens = line.split(' ')
    if not tokens or not tokens[0].isdigit():
        return None
        
    s_no = int(tokens[0])
    
    # Process admission number and branch
    if len(tokens) < 2:
        return {"s_no": s_no, "error": "Only serial number found", "raw": line}
        
    adm_no = None
    branch = None
    start_idx = 1
    
    t1 = tokens[1]
    if t1 == 'RCB':
        branch = 'RCB'
        start_idx = 2
    elif t1.endswith('RCB'):
        adm_no = t1[:-3]
        branch = 'RCB'
        start_idx = 2
    elif len(tokens) > 2 and tokens[2] == 'RCB':
        adm_no = t1
        branch = 'RCB'
        start_idx = 3
    else:
        # Check if admission number matches standard pattern e.g. starts with VR/VM/VS
        if any(t1.upper().startswith(p) for p in ["VR", "VM", "VS", "VRO", "VSO", "VMO", "VRCB"]):
            adm_no = t1
            # We assume branch is RCB even if not explicitly written here
            branch = 'RCB'
            start_idx = 2
        else:
            # First token after s_no is not obviously admission no
            adm_no = None
            branch = 'RCB'
            start_idx = 1
            
    right_tokens = tokens[start_idx:]
    if not right_tokens:
        return {"s_no": s_no, "admission_no": adm_no, "branch": branch, "error": "No data tokens after header", "raw": line}
        
    # Right-to-Left parsing cursor
    idx = len(right_tokens) - 1
    
    # 1. Address is optional and collects non-field tokens at the far right
    addr_parts = []
    while idx >= 0:
        t = right_tokens[idx]
        
        # Check if this token matches any of the structured fields
        # If it matches mother tongue, aadhar, dates, caste, phone, or class, we stop collecting address
        if is_tongue(t) or is_aadhar(t) or is_date(t) or is_caste(t) or is_phone(t) or t.upper() in class_patterns or re.match(r'^\d+(ST|ND|RD|TH)$', t, re.IGNORECASE):
            break
            
        # Also check if it looks like grouped Aadhaar (three 4-digit numbers)
        if idx >= 2 and right_tokens[idx].isdigit() and len(right_tokens[idx]) == 4 and \
           right_tokens[idx-1].isdigit() and len(right_tokens[idx-1]) == 4 and \
           right_tokens[idx-2].isdigit() and len(right_tokens[idx-2]) == 4:
            break
            
        addr_parts.insert(0, t)
        idx -= 1
        
    address = " ".join(addr_parts)
    
    # 2. Aadhaar
    aadhar = None
    if idx >= 0:
        t = right_tokens[idx]
        # Check for grouped Aadhaar: e.g. "5202 1669 2535"
        if idx >= 2 and right_tokens[idx].isdigit() and len(right_tokens[idx]) == 4 and \
           right_tokens[idx-1].isdigit() and len(right_tokens[idx-1]) == 4 and \
           right_tokens[idx-2].isdigit() and len(right_tokens[idx-2]) == 4:
            aadhar = f"{right_tokens[idx-2]} {right_tokens[idx-1]} {right_tokens[idx]}"
            idx -= 3
        elif is_aadhar(t):
            aadhar = t
            idx -= 1
            
    # 3. Mother Tongue
    mother_tongue = None
    if idx >= 0:
        t = right_tokens[idx]
        if is_tongue(t):
            mother_tongue = t
            idx -= 1
            
    # 4. Admission Date
    admission_date = None
    if idx >= 0:
        t = right_tokens[idx]
        if is_date(t):
            admission_date = t
            idx -= 1
            
    # 5. Date of Birth
    dob = None
    if idx >= 0:
        t = right_tokens[idx]
        if is_date(t):
            dob = t
            idx -= 1
            
    # 6. Caste
    caste = None
    if idx >= 0:
        t = right_tokens[idx]
        if is_caste(t):
            caste = t
            idx -= 1
            
    # 7. Alternate Phone
    alt_phone = None
    if idx >= 0:
        t = right_tokens[idx]
        if is_phone(t):
            # If the token before it is ALSO a phone, then this is alternate, and the previous one is primary
            if idx >= 1 and is_phone(right_tokens[idx-1]):
                alt_phone = t
                idx -= 1
                
    # 8. Primary Phone
    phone = None
    if idx >= 0:
        t = right_tokens[idx]
        if is_phone(t):
            phone = t
            idx -= 1
            
    # Remaining tokens: [student_name, class, (section), father_name, mother_name]
    leftover = right_tokens[:idx+1]
    
    # Find Class
    class_idx = -1
    for i, t in enumerate(leftover):
        if t.upper() in class_patterns or re.match(r'^\d(ST|ND|RD|TH)$', t, re.IGNORECASE):
            class_idx = i
            break
            
    if class_idx == -1:
        # Fallback: check if we have any token matching class pattern partially
        for i, t in enumerate(leftover):
            if any(p in t.upper() for p in ["NUR", "PP1", "PP2", "LKG", "UKG"]):
                class_idx = i
                break
                
    if class_idx == -1:
        # If class still not found, we cannot parse the row structure reliably
        return {
            "s_no": s_no,
            "admission_no": adm_no,
            "branch": branch,
            "error": "Class token not found",
            "leftover": leftover,
            "phone": phone,
            "alt_phone": alt_phone,
            "caste": caste,
            "dob": dob,
            "admission_date": admission_date,
            "mother_tongue": mother_tongue,
            "aadhar": aadhar,
            "address": address,
            "raw": line
        }
        
    student_name = " ".join(leftover[:class_idx])
    class_val = leftover[class_idx]
    
    section = None
    parent_start = class_idx + 1
    if len(leftover) > class_idx + 1:
        next_t = leftover[class_idx + 1]
        if next_t.upper() in ["A", "B", "C", "D"]:
            section = next_t.upper()
            parent_start = class_idx + 2
            
    parent_tokens = leftover[parent_start:]
    
    father_name = ""
    mother_name = ""
    
    if len(parent_tokens) == 1:
        father_name = parent_tokens[0]
    elif len(parent_tokens) == 2:
        father_name = parent_tokens[0]
        mother_name = parent_tokens[1]
    elif len(parent_tokens) == 3:
        # Father might have two words, or mother two. Let's do a simple split
        father_name = parent_tokens[0]
        mother_name = " ".join(parent_tokens[1:])
    elif len(parent_tokens) >= 4:
        mid = len(parent_tokens) // 2
        father_name = " ".join(parent_tokens[:mid])
        mother_name = " ".join(parent_tokens[mid:])
        
    return {
        "s_no": s_no,
        "admission_no": adm_no,
        "branch": branch,
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
        "aadhar": aadhar,
        "address": address
    }

# Read and process all pages
all_students = []
continuation_rows = []
skipped_lines = []

for page_num in range(len(reader.pages)):
    page = reader.pages[page_num]
    text = page.extract_text()
    lines = text.split("\n")
    
    active_student = None
    
    for line_idx, line in enumerate(lines):
        line = line.strip()
        if not line:
            continue
            
        # Check if it starts with a number
        first_token = line.split(" ")[0]
        if first_token.isdigit():
            # Attempt to parse as a student row
            parsed = parse_line(line)
            if parsed:
                if "error" not in parsed:
                    all_students.append(parsed)
                    active_student = parsed
                else:
                    # It starts with a number but has parsing error
                    skipped_lines.append({"page": page_num + 1, "line_no": line_idx + 1, "line": line, "reason": parsed["error"]})
                    active_student = None
            else:
                skipped_lines.append({"page": page_num + 1, "line_no": line_idx + 1, "line": line, "reason": "First token numeric but parse returned None"})
                active_student = None
        else:
            # Doesn't start with a number. Is it a continuation of the previous active student's address?
            if active_student and not any(header in line.upper() for header in ["S.NO", "ADMISSION NO", "MOTHER TOUNG", "ADDRESS"]):
                # Append to address
                prev_addr = active_student.get("address", "")
                if prev_addr:
                    active_student["address"] = f"{prev_addr} {line}"
                else:
                    active_student["address"] = line
                continuation_rows.append({"page": page_num + 1, "line_no": line_idx + 1, "appended_to_sno": active_student["s_no"], "text": line})
            else:
                # It's a header or noise
                skipped_lines.append({"page": page_num + 1, "line_no": line_idx + 1, "line": line, "reason": "Header or noise"})

print(f"Total students parsed: {len(all_students)}")
print(f"Total address continuations appended: {len(continuation_rows)}")
print(f"Total skipped lines: {len(skipped_lines)}")

# Save to JSON
output_path = "scratch/parsed_students.json"
with open(output_path, "w", encoding="utf-8") as f:
    json.dump(all_students, f, indent=2, ensure_ascii=False)
print(f"Saved parsed data to {output_path}")

# Print classes distribution
class_counts = {}
for s in all_students:
    c = s.get("class", "UNKNOWN")
    class_counts[c] = class_counts.get(c, 0) + 1
print("\nClass Distribution:")
for c, count in sorted(class_counts.items()):
    print(f"  {c}: {count}")

# Print warnings for potential anomalies
print("\nAnomalies & Warnings:")
for s in all_students:
    warnings = []
    if not s.get("admission_no"):
        warnings.append("Missing Admission Number")
    if not s.get("student_name"):
        warnings.append("Missing Student Name")
    if not s.get("father_name") and not s.get("mother_name"):
        warnings.append("Missing Parent Names")
    if not s.get("phone"):
        warnings.append("Missing Primary Phone")
        
    if warnings:
        print(f"  S.No {s['s_no']} (Class: {s.get('class')}, Adm No: {s.get('admission_no')}): {', '.join(warnings)}")
