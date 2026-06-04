import pypdf

pdf_path = r"D:\shop\LIST\new\2026\June 2026\20260602\RCB Data list.pdf"
reader = pypdf.PdfReader(pdf_path)

print(f"Total pages: {len(reader.pages)}")
for page_num, page in enumerate(reader.pages):
    text = page.extract_text()
    lines = text.split("\n")
    print(f"\n--- PAGE {page_num + 1} ({len(lines)} lines) ---")
    print("FIRST 5 LINES:")
    for line in lines[:5]:
        print(repr(line))
    print("LAST 5 LINES:")
    for line in lines[-5:]:
        print(repr(line))
