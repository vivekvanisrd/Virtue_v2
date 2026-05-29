import pandas as pd

file_path = r"C:\Users\SriKriations\Favorites\Downloads\DAILY ACCOUNTS.xlsx"

for sheet in ['RCB', 'SNB', 'MNB']:
    print(f"\n======================================")
    print(f"SHEET: {sheet}")
    print(f"======================================")
    try:
        # load sheet without headers first to see structure
        df = pd.read_excel(file_path, sheet_name=sheet, header=None, nrows=10)
        for idx, row in df.iterrows():
            print(f"Row {idx}: {row.tolist()[:15]}")
    except Exception as e:
        print(f"Error: {e}")
