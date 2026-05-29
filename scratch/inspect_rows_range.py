import openpyxl
import sys

sys.stdout.reconfigure(encoding='utf-8')

wb = openpyxl.load_workbook(r"E:\accounts\sorted fee 2025 2026.xlsx", data_only=True)
sheet = wb['Feb_Mar_Apr_2026']

print("Row 885 to 960:")
for r in range(885, 961):
    vals = [sheet.cell(row=r, column=c).value for c in range(1, 13)]
    # Convert datetime objects to string format for neat printing
    formatted_vals = []
    for val in vals:
        if hasattr(val, 'strftime'):
            formatted_vals.append(val.strftime('%Y-%m-%d'))
        else:
            formatted_vals.append(val)
    print(f"Row {r:3d}: {formatted_vals}")

wb.close()
