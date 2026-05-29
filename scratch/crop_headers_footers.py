from PIL import Image
import os

img_dir = r"J:\virtue_fb\virtue-v2\scratch\extracted_all_img"
temp_dir = r"J:\virtue_fb\virtue-v2\scratch\temp_crops"
os.makedirs(temp_dir, exist_ok=True)

for i in range(10):
    img_name = f"RCB_Dec_Jan_2025_26_p{i}_i0.jpg"
    img_path = os.path.join(img_dir, img_name)
    if not os.path.exists(img_path):
        print(f"{img_name} does not exist!")
        continue
    
    img = Image.open(img_path)
    w, h = img.size
    
    # Crop header: top 15%
    header = img.crop((0, 0, w, int(h * 0.15)))
    header.save(os.path.join(temp_dir, f"p{i}_header.jpg"))
    
    # Crop footer: bottom 15%
    footer = img.crop((0, int(h * 0.85), w, h))
    footer.save(os.path.join(temp_dir, f"p{i}_footer.jpg"))

print("Cropped headers and footers saved to", temp_dir)
