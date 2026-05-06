import pandas as pd
import re
import json

df = pd.read_excel('J:/virtue_fb/virtue-v2/sal/VIRTUE STAFF APRIL SALARIES-2026.xlsx', skiprows=4)

errors = []
ifsc_pattern = re.compile(r'^[A-Z]{4}0[A-Z0-9]{6}$')

for index, row in df.iterrows():
    name = row.get('NAME')
    if pd.isna(name): continue
    
    ifsc = str(row.get('IFSC CODE', '')).strip()
    raw_ifsc = str(row.get('IFSC CODE', ''))
    
    acc = str(row.get('ACCOUNT NUMBER', '')).strip()
    raw_acc = str(row.get('ACCOUNT NUMBER', ''))

    issues = []
    
    # Check IFSC spaces
    if raw_ifsc != ifsc:
        issues.append(f'Leading/Trailing spaces in IFSC ("{raw_ifsc}")')
        
    # Validate IFSC format
    if not ifsc or ifsc == 'nan':
        issues.append('Missing IFSC')
    elif not ifsc_pattern.match(ifsc.upper()):
        if len(ifsc) != 11:
            issues.append(f'IFSC length is {len(ifsc)}, should be 11 ("{ifsc}")')
        elif ifsc[4] != '0':
            issues.append(f'5th character must be zero "0", found "{ifsc[4]}" ("{ifsc}")')
        else:
            issues.append(f'Invalid format ("{ifsc}")')
            
    # Check Account spaces
    if raw_acc != acc:
        issues.append(f'Leading/Trailing spaces in Account Number ("{raw_acc}")')
        
    if pd.notna(acc) and acc != 'nan' and not acc.replace('.', '').replace('e+', '').isdigit():
        issues.append(f'Account number contains non-numeric characters ("{acc}")')

    if issues:
        errors.append({'Row': index + 6, 'Name': name, 'Issues': issues})

print(json.dumps(errors, indent=2))
