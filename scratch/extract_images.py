import os
import pypdf

pdf_path = r"E:\accounts\RCB june 2025 26.pdf"
reader = pypdf.PdfReader(pdf_path)
page = reader.pages[0]

os.makedirs("scratch/extracted_img", exist_ok=True)

print(f"Number of images on page 0: {len(page.images)}")
for idx, img in enumerate(page.images):
    filename = f"scratch/extracted_img/page_0_img_{idx}.{img.name.split('.')[-1]}"
    with open(filename, "wb") as f:
        f.write(img.data)
    print(f"Saved {filename}")
