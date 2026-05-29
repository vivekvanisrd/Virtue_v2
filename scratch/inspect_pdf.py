import os
import sys

# Try importing common PDF extraction libraries
try:
    import pypdf
    print("pypdf installed")
except ImportError:
    pypdf = None

try:
    import fitz # PyMuPDF
    print("pymupdf installed")
except ImportError:
    fitz = None

try:
    import pdfplumber
    print("pdfplumber installed")
except ImportError:
    pdfplumber = None

pdf_path = r"E:\accounts\RCB june 2025 26.pdf"

if not os.path.exists(pdf_path):
    print("PDF does not exist!")
    sys.exit(1)

print(f"Inspecting file size: {os.path.getsize(pdf_path)} bytes")

# Test text extraction with whichever is available
if fitz:
    print("Trying fitz...")
    doc = fitz.open(pdf_path)
    print(f"Pages: {len(doc)}")
    for i in range(min(5, len(doc))):
        text = doc[i].get_text()
        print(f"--- PAGE {i} ---")
        print(text[:500])
elif pypdf:
    print("Trying pypdf...")
    reader = pypdf.PdfReader(pdf_path)
    print(f"Pages: {len(reader.pages)}")
    for i in range(min(5, len(reader.pages))):
        text = reader.pages[i].extract_text()
        print(f"--- PAGE {i} ---")
        print(text[:500])
elif pdfplumber:
    print("Trying pdfplumber...")
    with pdfplumber.open(pdf_path) as pdf:
        print(f"Pages: {len(pdf.pages)}")
        for i in range(min(5, len(pdf.pages))):
            text = pdf.pages[i].extract_text()
            print(f"--- PAGE {i} ---")
            print(text[:500])
else:
    print("No PDF extraction libraries found. Trying to import them or check system.")
