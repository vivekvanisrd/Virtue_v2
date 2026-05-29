import openpyxl
import sys

sys.stdout.reconfigure(encoding='utf-8')

wb = openpyxl.load_workbook(r"E:\accounts\sorted fee 2025 2026.xlsx", data_only=True)
sheet = wb['Summary']

print("Summary sheet first 35 rows:")
for r in range(1, 36):
    row_vals = [sheet.cell(row=r, column=c).value for c in range(1, 15)]
    print(f"Row {r:2d}: {row_vals}")

wb.close()
