import pandas as pd

excel_path = r"E:\accounts\sorted fee 2025 2026.xlsx"
try:
    df = pd.read_excel(excel_path, sheet_name="Ucban", header=1)
    print("Columns:", list(df.columns))
    print("Total rows loaded:", len(df))
    
    # Filter rows where Student Name is present
    df_valid = df[df["Student Name"].notna()]
    print("Rows with valid student names:", len(df_valid))
    
    print("\nFirst 10 valid rows:")
    print(df_valid.head(10).to_string())
    
    # Let's inspect some of the column values
    print("\nUnique classes in Excel:")
    print(df_valid["Class"].unique())
except Exception as e:
    print("Error:", e)
