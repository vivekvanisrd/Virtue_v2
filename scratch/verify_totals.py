import json
import os

output_dir = r"J:\virtue_fb\virtue-v2\scratch\transcribed_json"
pages = [f"RCB_Dec_Jan_2025_26_p{i}_i0.jpg.json" for i in range(10)]

print(f"{'Page':<6} | {'Transactions':<12} | {'Cash Total':<12} | {'Online Total':<12}")
print("-" * 55)

for i, page_file in enumerate(pages):
    filepath = os.path.join(output_dir, page_file)
    if not os.path.exists(filepath):
        print(f"p{i:<5} | File missing")
        continue
        
    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)
        
    cash_sum = 0
    online_sum = 0
    
    for tx in data:
        for method, value in tx.get("payments", []):
            if "CASH" in method:
                cash_sum += value
            elif "ONLINE" in method:
                online_sum += value
                
    print(f"p{i:<5} | {len(data):<12} | {cash_sum:<12,} | {online_sum:<12,}")
