import xlrd

def inspect_xls(file_path):
    print(f"\n=== Inspecting: {file_path} ===")
    try:
        workbook = xlrd.open_workbook(file_path)
        print("Sheets in workbook:", workbook.sheet_names())
        for sheet_name in workbook.sheet_names():
            sheet = workbook.sheet_by_name(sheet_name)
            print(f"Sheet '{sheet_name}': {sheet.nrows} rows, {sheet.ncols} columns")
            print("First 3 rows:")
            for r in range(min(3, sheet.nrows)):
                print(sheet.row_values(r))
    except Exception as e:
        print("Error reading XLS file:", e)

inspect_xls(r"D:\shop\LIST\new\2026\June 2026\20260602\1780384702721wKofjGhe1LANPeSP.xls")
inspect_xls(r"D:\shop\LIST\new\2026\June 2026\20260602\17804551445927svvpSKQ9taxZPKO.xls")
