import os

xls_path = r"D:\shop\LIST\new\2026\June 2026\20260602\1780384702721wKofjGhe1LANPeSP.xls"
print("File exists:", os.path.exists(xls_path))
print("File size:", os.path.getsize(xls_path) if os.path.exists(xls_path) else 0)

# Try reading using pandas (which can use xlrd or openpyxl/pyxlsb depending on format)
try:
    import pandas as pd
    df = pd.read_excel(xls_path)
    print("Successfully read using pandas!")
    print("Columns:", df.columns.tolist())
    print("Shape:", df.shape)
    print("First 3 rows:")
    print(df.head(3))
except Exception as e:
    print("Error reading with pandas:", e)
    
    # Try reading as simple HTML/text since some systems export HTML as .xls
    try:
        with open(xls_path, "r", encoding="utf-8") as f:
            content = f.read(1000)
            print("First 1000 chars of file as text:")
            print(content)
    except Exception as e2:
        print("Error reading as text:", e2)
