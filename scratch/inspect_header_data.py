import openpyxl
import sys

sys.stdout.reconfigure(encoding='utf-8')

wb = openpyxl.load_workbook(r"E:\accounts\sorted fee 2025 2026.xlsx", data_only=True)
sheet = wb['Feb_Mar_Apr_2026']

print("First 20 rows in Feb_Mar_Apr_2026:")
for r in range(1, 25):
    row_vals = [sheet.cell(row=r, column=c).value for c in range(1, 20)]
    print(f"Row {r:2d}: {row_vals}")

wb.close()
