import pandas as pd

excel_path = r"E:\accounts\sorted fee 2025 2026.xlsx"
try:
    xl = pd.ExcelFile(excel_path)
    print("Sheets in Excel:", xl.sheet_names)
    
    # Let's inspect each sheet's headers and first few rows
    for sheet in xl.sheet_names:
        df = xl.parse(sheet, nrows=5)
        print(f"\n--- Sheet: {sheet} ---")
        print("Columns:", list(df.columns))
        print("First 5 rows:")
        print(df.to_string())
except Exception as e:
    print("Error reading Excel:", e)
