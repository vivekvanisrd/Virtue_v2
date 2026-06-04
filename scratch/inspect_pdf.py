import os

pdf_path = r"D:\shop\LIST\new\2026\June 2026\20260602\RCB Data list.pdf"
print("File exists:", os.path.exists(pdf_path))
print("File size:", os.path.getsize(pdf_path) if os.path.exists(pdf_path) else 0)

try:
    import pypdf
    print("pypdf is installed!")
    reader = pypdf.PdfReader(pdf_path)
    print("Number of pages:", len(reader.pages))
    for i, page in enumerate(reader.pages):
        text = page.extract_text()
        print(f"Page {i+1} character count:", len(text))
        print(f"Page {i+1} first 200 chars:")
        print(repr(text[:200]))
except Exception as e:
    print("Error with pypdf:", e)

try:
    import PyPDF2
    print("PyPDF2 is installed!")
    reader = PyPDF2.PdfReader(pdf_path)
    print("Number of pages:", len(reader.pages))
except Exception as e:
    print("Error with PyPDF2:", e)
