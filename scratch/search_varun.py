import re

with open("scratch/raw_lines.txt", "r", encoding="utf-8") as f:
    lines = f.readlines()

for idx, line in enumerate(lines):
    if "Varun" in line or "varun" in line:
        print(f"Line {idx+1}: {repr(line)}")
