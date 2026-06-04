def check_file(file_path):
    print(f"\n=== File: {file_path} ===")
    try:
        with open(file_path, "rb") as f:
            header = f.read(200)
            print("Hex:", header.hex()[:100])
            print("Text representation (cleaned):")
            print(header.decode("utf-8", errors="ignore")[:200])
    except Exception as e:
        print("Error:", e)

check_file(r"D:\shop\LIST\new\2026\June 2026\20260602\1780384702721wKofjGhe1LANPeSP.xls")
check_file(r"D:\shop\LIST\new\2026\June 2026\20260602\17804551445927svvpSKQ9taxZPKO.xls")
