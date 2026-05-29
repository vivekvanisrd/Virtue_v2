import openpyxl

wb = openpyxl.load_workbook(r"E:\accounts\sorted fee 2025 2026.xlsx", read_only=True)
print("Sheets in sorted fee 2025 2026.xlsx:")
print(wb.sheetnames)
wb.close()
