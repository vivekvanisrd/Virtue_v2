import pypdf

pdf_path = r"D:\shop\LIST\new\2026\June 2026\20260602\RCB Data list.pdf"
reader = pypdf.PdfReader(pdf_path)

with open("scratch/raw_lines.txt", "w", encoding="utf-8") as f:
    for page_num, page in enumerate(reader.pages):
        f.write(f"\n=================== PAGE {page_num + 1} ===================\n")
        text = page.extract_text()
        for idx, line in enumerate(text.split("\n")):
            f.write(f"L{idx+1}: {repr(line)}\n")
            
print("Successfully dumped raw lines to scratch/raw_lines.txt")
