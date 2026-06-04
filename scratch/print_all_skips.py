import pypdf
import sys

pdf_path = r"D:\shop\LIST\new\2026\June 2026\20260602\RCB Data list.pdf"
reader = pypdf.PdfReader(pdf_path)

from parse_rcb_pdf import parse_line

skipped = []
for page_num in range(len(reader.pages)):
    page = reader.pages[page_num]
    text = page.extract_text()
    lines = text.split("\n")
    
    for line_idx, line in enumerate(lines):
        line = line.strip()
        if not line:
            continue
            
        first_token = line.split(" ")[0]
        if first_token.isdigit():
            parsed = parse_line(line)
            if parsed and "error" in parsed:
                skipped.append({"page": page_num + 1, "line_no": line_idx + 1, "line": line, "reason": parsed["error"]})

print(f"Total numeric-started lines skipped: {len(skipped)}")
for s in skipped:
    print(f"Page {s['page']} L{s['line_no']}: {repr(s['line'])} | Reason: {s['reason']}")
