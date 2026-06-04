import os
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

transcribed_dir = r"J:\virtue_fb\virtue-v2\scratch\transcribed_json"
output_file = r"J:\virtue_fb\virtue-v2\scratch\all_pdf_payments.json"

all_payments = []
file_count = 0

for filename in sorted(os.listdir(transcribed_dir)):
    if filename.endswith(".json"):
        filepath = os.path.join(transcribed_dir, filename)
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                data = json.load(f)
                if isinstance(data, list):
                    all_payments.extend(data)
                    file_count += 1
                else:
                    print(f"Warning: {filename} does not contain a list.")
        except Exception as e:
            print(f"Error reading {filename}: {e}")

print(f"\nConsolidated {file_count} files.")
print(f"Total transactions: {len(all_payments)}")

# Save to output file
with open(output_file, 'w', encoding='utf-8') as f:
    json.dump(all_payments, f, indent=2, ensure_ascii=False)
print(f"Saved consolidated payments to {output_file}")
