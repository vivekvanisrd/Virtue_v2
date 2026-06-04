import os
import re

ocr_dir = r"J:\virtue_fb\virtue-v2\scratch\ocr_txt"
files = sorted(os.listdir(ocr_dir))

for f in files:
    if f.endswith(".txt"):
        filepath = os.path.join(ocr_dir, f)
        with open(filepath, "r", encoding="utf-8", errors="ignore") as file:
            content = file.read()
            # Find all numbers that look like receipt numbers (3-4 digits, e.g. 5400-5999 or 001-999)
            matches = re.findall(r'\b\d{3,4}\b', content)
            # Filter matches to only keep numbers that might be receipt numbers
            valid_recs = []
            for m in matches:
                val = int(m)
                if 5000 <= val <= 6500 or 1 <= val <= 999:
                    valid_recs.append(m)
            
            if valid_recs:
                print(f"File: {f:35s} | Potential Receipts: {', '.join(sorted(list(set(valid_recs))))}")
            else:
                print(f"File: {f:35s} | No receipt-like numbers found.")
