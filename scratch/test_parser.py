import pypdf
import re

pdf_path = r"D:\shop\LIST\new\2026\June 2026\20260602\RCB Data list.pdf"
reader = pypdf.PdfReader(pdf_path)

def parse_pdf_line(line):
    # Normalize spaces
    line = re.sub(r'\s+', ' ', line.strip())
    
    # We want to extract:
    # s_no, admission_no, branch, student_name, class_val, section, father_name, mother_name, mobile, alt_mobile, caste, dob, admission_date, mother_tongue, aadhar, address
    
    # 1. Extract from the left
    tokens = line.split(' ')
    if len(tokens) < 8:
        return None
        
    s_no = tokens[0]
    # Check if s_no is a number
    if not s_no.isdigit():
        return None
        
    admission_no = tokens[1]
    branch = tokens[2]
    
    # Ensure it's a valid student row
    if not (admission_no.startswith("VR") or admission_no.startswith("VRO")):
        return None
        
    # We will strip the prefix tokens (s_no, admission_no, branch)
    # and process the rest of the tokens from right-to-left
    right_tokens = tokens[3:]
    
    # Define regexes for the right side fields
    date_regex = re.compile(r'^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}$')
    phone_regex = re.compile(r'^\d{10}$')
    tongue_regex = re.compile(r'^(TELUGU|TELUG|TELGU|MARATHI|KANNADA|URUDU|HINDI|TAMIL)$', re.IGNORECASE)
    caste_regex = re.compile(r'^(OC|BC\.B|BC\.D|BC\.C|BC\.A|BC|SC|ST|BC\.B|BC\.D)$', re.IGNORECASE)
    # Aadhaar can be scientific notation like 2.01075E+11, or 12 digit number, or grouped like 4013 8573 4301
    aadhar_regex = re.compile(r'^(\d\.?\d*E\+\d+|\d{12})$')
    
    # Let's see if we can parse from the right
    # Step-by-step extraction from the right
    address = ""
    aadhar = ""
    tongue = ""
    adm_date = ""
    dob = ""
    caste = ""
    alt_mobile = ""
    mobile = ""
    
    # Address is optional. If the last token is not Aadhaar, tongue, or date, it is part of the address.
    # We loop from the right until we find mother tongue or aadhaar or dates.
    idx = len(right_tokens) - 1
    
    # Heuristic to collect Address
    addr_parts = []
    while idx >= 0:
        t = right_tokens[idx]
        
        # Check if this token matches mother tongue, aadhaar, or dates
        is_tongue = tongue_regex.match(t)
        is_date = date_regex.match(t)
        is_aadhar = aadhar_regex.match(t)
        
        # If we hit tongue or a date, address is finished
        if is_tongue or is_date or is_aadhar:
            break
            
        addr_parts.insert(0, t)
        idx -= 1
        
    address = " ".join(addr_parts)
    
    # Next, look for Aadhaar
    if idx >= 0:
        # Check if it looks like Aadhaar
        t = right_tokens[idx]
        # In some cases Aadhaar is represented as 3 groups of digits, e.g. "4013 8573 4301"
        # Let's check if the previous 2 tokens plus this one make a 12 digit number
        if idx >= 2 and right_tokens[idx].isdigit() and len(right_tokens[idx]) == 4 and right_tokens[idx-1].isdigit() and len(right_tokens[idx-1]) == 4 and right_tokens[idx-2].isdigit() and len(right_tokens[idx-2]) == 4:
            aadhar = f"{right_tokens[idx-2]} {right_tokens[idx-1]} {right_tokens[idx]}"
            idx -= 3
        elif aadhar_regex.match(t) or (t.isdigit() and len(t) in [12, 10, 8]):  # loose digit match for Aadhaar
            aadhar = t
            idx -= 1
            
    # Next, look for Mother Tongue
    if idx >= 0:
        t = right_tokens[idx]
        if tongue_regex.match(t):
            tongue = t
            idx -= 1
            
    # Next, look for Date of Admission
    if idx >= 0:
        t = right_tokens[idx]
        if date_regex.match(t):
            adm_date = t
            idx -= 1
            
    # Next, look for Date of Birth
    if idx >= 0:
        t = right_tokens[idx]
        if date_regex.match(t):
            dob = t
            idx -= 1
            
    # Next, look for Caste
    if idx >= 0:
        t = right_tokens[idx]
        if caste_regex.match(t):
            caste = t
            idx -= 1
            
    # Next, look for Alternate Mobile
    if idx >= 0:
        t = right_tokens[idx]
        if phone_regex.match(t):
            # Is it alternate mobile? If the token before it is ALSO a mobile number, then this is alternate.
            if idx >= 1 and phone_regex.match(right_tokens[idx-1]):
                alt_mobile = t
                idx -= 1
                
    # Next, look for Primary Mobile
    if idx >= 0:
        t = right_tokens[idx]
        if phone_regex.match(t):
            mobile = t
            idx -= 1
            
    # The remaining tokens from 0 to idx contain:
    # student_name, class_val, section (optional), father_name, mother_name
    leftover = right_tokens[:idx+1]
    
    # Class is usually the first token or second, but it has a specific pattern (NUR, PP1, LKG, UKG, 1st, 2nd, etc. or numerical like 1st, 2nd, 3rd)
    # Let's find Class
    class_idx = -1
    classes_patterns = ["NUR", "PP1", "PP2", "LKG", "UKG", "1ST", "2ND", "3RD", "4TH", "5TH", "6TH", "7TH", "8TH", "9TH", "10TH", "PLAY", "PP-1", "PP-2", "N", "1ST", "VII", "VIII", "I", "II", "III", "IV", "V", "VI", "IX", "X"]
    
    # Class is near the beginning of leftover
    for i, t in enumerate(leftover):
        if t.upper() in classes_patterns or re.match(r'^\d(ST|ND|RD|TH)$', t, re.IGNORECASE):
            class_idx = i
            break
            
    if class_idx == -1:
        # Fallback: assume first token after branch is student name, and class is the token after it
        # Let's just log and see
        return {
            "s_no": s_no,
            "admission_no": admission_no,
            "branch": branch,
            "error": "Class not found",
            "leftover": leftover
        }
        
    # Student name is everything before class
    student_name = " ".join(leftover[:class_idx])
    class_val = leftover[class_idx]
    
    # Section is optional, usually A or B or C right after class
    section = ""
    rem = leftover[class_idx+1:]
    if rem and rem[0] in ["A", "B", "C"]:
        section = rem[0]
        rem = rem[1:]
        
    # Now we have father_name and mother_name in rem
    # Heuristic: father's name and mother's name are usually separated, mother's name is the last token or last few tokens
    # In general, if rem has 2 tokens: father is rem[0], mother is rem[1]
    # If rem has more, how to split? Let's check common splits
    father_name = ""
    mother_name = ""
    if len(rem) == 2:
        father_name = rem[0]
        mother_name = rem[1]
    elif len(rem) == 3:
        # Father might be 2 words, mother 1, or father 1, mother 2.
        # Let's default to split in middle
        father_name = rem[0]
        mother_name = " ".join(rem[1:])
    elif len(rem) >= 4:
        # Split in half
        half = len(rem) // 2
        father_name = " ".join(rem[:half])
        mother_name = " ".join(rem[half:])
    elif len(rem) == 1:
        father_name = rem[0]
        
    return {
        "s_no": s_no,
        "admission_no": admission_no,
        "branch": branch,
        "student_name": student_name,
        "class": class_val,
        "section": section,
        "father_name": father_name,
        "mother_name": mother_name,
        "mobile": mobile,
        "alt_mobile": alt_mobile,
        "caste": caste,
        "dob": dob,
        "admission_date": adm_date,
        "mother_tongue": tongue,
        "aadhar": aadhar,
        "address": address
    }

# Test on page 1 lines
lines = reader.pages[0].extract_text().split("\n")
parsed_count = 0
for idx, line in enumerate(lines):
    res = parse_pdf_line(line)
    if res:
        parsed_count += 1
        print(f"Row {res['s_no']}: {res['admission_no']} | Name: {res['student_name']} | Class: {res['class']} | Father: {res['father_name']} | Mother: {res['mother_name']} | Mobile: {res['mobile']} | Caste: {res['caste']} | Aadhaar: {res['aadhar']}")

print(f"Total successfully parsed on Page 1: {parsed_count}")
