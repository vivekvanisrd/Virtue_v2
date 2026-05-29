import openpyxl

wb = openpyxl.load_workbook(r"E:\accounts\sorted fee 2025 2026.xlsx", data_only=True)
sheet = wb['Feb_Mar_Apr_2026']

for r in range(790, 796):
    vals = [sheet.cell(row=r, column=c).value for c in range(1, 13)]
    print(f"Row {r}: {vals}")

wb.close()
