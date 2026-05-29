import os
import pypdf

pdf_dir = r"E:\accounts"
out_dir = r"J:\virtue_fb\virtue-v2\scratch\extracted_all_img"
os.makedirs(out_dir, exist_ok=True)

files = [
    "RCB june 2025 26.pdf",
    "RCB july 2025 26.pdf",
    "RCB August 2025 26.pdf",
    "RCB Sep 2025 26.pdf",
    "RCB Oct 2025 26.pdf",
    "RCB Nov 2025 26.pdf",
    "RCB Dec Jan 2025 26.pdf",
    "RCB Feb to April 2025 26.pdf"
]

total_images = 0

for filename in files:
    path = os.path.join(pdf_dir, filename)
    if not os.path.exists(path):
        print(f"Skipping {filename}: not found")
        continue
    
    print(f"Processing {filename}...")
    try:
        reader = pypdf.PdfReader(path)
        print(f"  Pages: {len(reader.pages)}")
        
        for p_idx, page in enumerate(reader.pages):
            img_count = len(page.images)
            print(f"    Page {p_idx} has {img_count} images")
            
            for i_idx, img in enumerate(page.images):
                img_name = f"{filename[:-4].replace(' ', '_')}_p{p_idx}_i{i_idx}.jpg"
                out_path = os.path.join(out_dir, img_name)
                
                with open(out_path, "wb") as f:
                    f.write(img.data)
                total_images += 1
                
    except Exception as e:
        print(f"  Error processing {filename}: {e}")

print(f"Finished extracting {total_images} total images!")
