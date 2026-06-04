import pypdf

pdf_path = r"D:\shop\LIST\new\2026\June 2026\20260602\RCB Data list.pdf"
reader = pypdf.PdfReader(pdf_path)

# Print first 20 lines of page 1
print("=== PAGE 1 TEXT ===")
lines = reader.pages[0].extract_text().split("\n")
for idx, line in enumerate(lines[:35]):
    print(f"Line {idx+1}: {repr(line)}")
