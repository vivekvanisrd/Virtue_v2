import pypdf
import sys

sys.stdout.reconfigure(encoding='utf-8')

reader = pypdf.PdfReader(r"E:\accounts\RCB Dec Jan 2025 26.pdf")
print("Total pages in PDF:", len(reader.pages))

for idx, page in enumerate(reader.pages):
    print(f"\n--- PAGE {idx} ---")
    text = page.extract_text()
    if text:
        # print first 1000 chars of extracted text
        print(text[:1000])
    else:
        print("[No text found / Image-only page]")
