import pandas as pd
import os

file_path = r"C:\Users\SriKriations\Favorites\Downloads\DAILY ACCOUNTS.xlsx"
if not os.path.exists(file_path):
    print("File not found")
    exit(1)

xl = pd.ExcelFile(file_path)
for sheet in xl.sheet_names:
    df = pd.read_excel(file_path, sheet_name=sheet)
    # search for columns and values
    for col in df.columns:
        matches = df[df[col].astype(str).str.contains("Dharuni|Bharuni|Dharani|Bharani|Gowtham|Vennela|Yashwanth", case=False, na=False)]
        if not matches.empty:
            print(f"Sheet: {sheet}, Col: {col}")
            print(matches[[col] + [c for c in df.columns if c != col][:5]])
