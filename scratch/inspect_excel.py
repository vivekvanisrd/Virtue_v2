import os
import re

src_dir = r"J:\virtue_fb\virtue-v2\src"

patterns = [
    r'"Class 1"',
    r'"Class 2"',
    r'"1st Grade"',
    r'"Play Group"',
    r'"Nursery"',
    r'"LKG"',
    r'"UKG"',
    r'MOCK_CLASSES'
]

print("Scanning files for specific class nomenclatures...")

matching_files = {}

for root, dirs, files in os.walk(src_dir):
    for file in files:
        if file.endswith(('.ts', '.tsx', '.js', '.jsx')):
            filepath = os.path.join(root, file)
            try:
                with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()
                    
                found = []
                for p in patterns:
                    if re.search(p, content):
                        found.append(p)
                if found:
                    rel_path = os.path.relpath(filepath, src_dir)
                    matching_files[rel_path] = found
            except Exception as e:
                pass

for f, matches in sorted(matching_files.items()):
    print(f"File: {f} | Matches: {matches}")
