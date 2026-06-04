import pypdf
import sys
import re

pdf_path = r"D:\shop\LIST\new\2026\June 2026\20260602\RCB Data list.pdf"
reader = pypdf.PdfReader(pdf_path)

# Let's re-run the skipped line extraction
from parse_rcb_pdf import parse_line, is_date, is_phone, is_caste, is_tongue, is_aadhar

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
            
        first_token = line.split(" ")[0]
        if first_token.isdigit():
            parsed = parse_line(line)
            if parsed and "error" in parsed:
                skipped_lines.append({"page": page_num + 1, "line_no": line_idx + 1, "line": line, "reason": parsed["error"]})
        else:
            if not (active_student and not any(header in line.upper() for header in ["S.NO", "ADMISSION NO", "MOTHER TOUNG", "ADDRESS"])):
                skipped_lines.append({"page": page_num + 1, "line_no": line_idx + 1, "line": line, "reason": "Header or noise"})

print("--- SKIPPED LINES ---")
for s in skipped_lines:
    if "Header or noise" not in s["reason"]:
        print(f"Page {s['page']} L{s['line_no']}: {repr(s['line'])} | Reason: {s['reason']}")
    else:
        # Check if it has something that looks like it should have been parsed
        if len(s['line']) > 20 and any(kw in s['line'].upper() for kw in ["VR", "VM", "VS", "RCB"]):
            print(f"[POTENTIAL NOISE BUG] Page {s['page']} L{s['line_no']}: {repr(s['line'])}")
