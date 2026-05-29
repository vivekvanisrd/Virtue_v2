import openpyxl
import sys

sys.stdout.reconfigure(encoding='utf-8')

wb = openpyxl.load_workbook(r"E:\accounts\sorted fee 2025 2026.xlsx", data_only=True)
sheet = wb['Feb_Mar_Apr_2026']

print("Searching for Lasya Priya in sheet:")
for r in range(3, sheet.max_row + 1):
    name = str(sheet.cell(row=r, column=7).value)
    if "LASYA PRIYA" in name.upper():
        vals = [sheet.cell(row=r, column=c).value for c in range(1, 13)]
        print(f"Row {r:3d}: {vals}")
