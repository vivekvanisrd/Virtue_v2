import json
import re
import pandas as pd
import difflib

excel_path = r"E:\accounts\sorted fee 2025 2026.xlsx"
db_students_path = r"J:\virtue_fb\virtue-v2\scratch\db_students.json"

def normalize_name_phonetic(name):
    if not isinstance(name, str):
        return ""
    name = name.upper().strip()
    name = name.replace(".", " ").replace(",", " ").replace("-", " ")
    
    # 1. Standard Indian English spelling normalizations
    name = name.replace("SHREE", "SRI").replace("SREE", "SRI").replace("SHRI", "SRI").replace("SRE", "SRI")
    name = name.replace("EE", "I")
    name = name.replace("OO", "U")
    name = name.replace("AA", "A")
    name = name.replace("W", "V")
    name = name.replace("Y", "I") 
    
    # 2. De-aspirate consonants (remove 'H' after consonants: D, T, J, K, C, P, G, B, S)
    name = re.sub(r"(?<=[BCDFGJKPQRSTVXZ])H", "", name)
    
    # 3. Remove duplicate adjacent characters (e.g. LKG -> LKG, MANN -> MAN)
    name = re.sub(r"(.)\1+", r"\1", name)
    
    return name

def clean_name_tokens(name):
    if not isinstance(name, str):
        return [], []
    name = re.sub(r"\s*\(.*?\)\s*", " ", name)  # Remove (Provisional) etc.
    name = name.upper().strip()
    name = name.replace(".", " ").replace(",", " ").replace("-", " ")
    tokens = [t.strip() for t in name.split() if t.strip()]
    
    initials = []
    main_parts = []
    for t in tokens:
        if len(t) <= 2:  # Treat short words like K, M, CH, D as initials
            initials.append(t)
        else:
            main_parts.append(t)
    return main_parts, initials

def map_excel_class_to_db(cls_name):
    if not isinstance(cls_name, str):
        if pd.isna(cls_name):
            return ""
        return str(cls_name).strip()
    cls_name = cls_name.strip().lower()
    
    mapping = {
        "ukg": "UKG",
        "lkg": "LKG",
        "nursery": "Nursery",
        "nur": "Nursery",
        "play group": "Play Group",
        "1st": "1st Grade",
        "2nd": "2nd Grade",
        "3rd": "3rd Grade",
        "4th": "4th Grade",
        "5th": "5th Grade",
        "6th": "6th Grade",
        "7th": "7th Grade",
        "8th": "8th Grade",
        "9th": "9th Grade"
    }
    
    for k, v in mapping.items():
        if k in cls_name:
            return v
    return cls_name.capitalize()

def token_similarity(tok1, tok2):
    return difflib.SequenceMatcher(None, tok1, tok2).ratio()

def match_student_phonetic(excel_name, excel_class, db_students):
    ex_mains, ex_inits = clean_name_tokens(excel_name)
    if not ex_mains:
        return []
        
    mapped_class = map_excel_class_to_db(excel_class)
    
    # Pre-normalize excel tokens
    ex_mains_norm = [normalize_name_phonetic(t) for t in ex_mains]
    ex_inits_norm = [normalize_name_phonetic(t) for t in ex_inits]
    
    candidates = []
    
    for st in db_students:
        db_first = (st.get("firstName") or "").upper().strip()
        db_middle = (st.get("middleName") or "").upper().strip()
        db_last = (st.get("lastName") or "").upper().strip()
        
        db_full_name = f"{db_first} {db_middle} {db_last}"
        db_mains, db_inits = clean_name_tokens(db_full_name)
        db_mains = [t for t in db_mains if t != "NONE"]
        
        if not db_mains:
            continue
            
        db_mains_norm = [normalize_name_phonetic(t) for t in db_mains]
        db_inits_norm = [normalize_name_phonetic(t) for t in db_inits]
        
        # 1. Fuzzy match pre-normalized main parts
        main_match = True
        for ex_t in ex_mains_norm:
            best_ratio = 0.0
            for db_t in db_mains_norm:
                # Since names are normalized, we can use a higher similarity threshold (e.g. 0.75)
                # or even exact match if it is very close
                ratio = token_similarity(ex_t, db_t)
                if ratio > best_ratio:
                    best_ratio = ratio
            if best_ratio < 0.75:
                main_match = False
                break
                
        if not main_match:
            continue
            
        # 2. Check initials
        init_match = True
        if ex_inits_norm:
            all_db_parts_norm = db_mains_norm + db_inits_norm
            init_match = all(
                any(db_p.startswith(init) or init.startswith(db_p) for db_p in all_db_parts_norm)
                for init in ex_inits_norm
            )
            
        if main_match and init_match:
            st_class = ""
            st_sec = ""
            if st.get("academic"):
                if st["academic"].get("class"):
                    st_class = st["academic"]["class"].get("name") or ""
                if st["academic"].get("section"):
                    st_sec = st["academic"]["section"].get("name") or ""
                    
            candidates.append({
                "student": st,
                "class": st_class,
                "section": st_sec,
                "class_score": 1 if mapped_class.lower() == st_class.lower() else 0
            })
            
    if not candidates:
        return []
        
    # Filter candidates based on class matches first
    class_matched_candidates = [c for c in candidates if c["class_score"] == 1]
    if class_matched_candidates:
        return [c["student"] for c in class_matched_candidates]
        
    return [c["student"] for c in candidates]

def main():
    # Load DB Students
    with open(db_students_path, "r") as f:
        db_students = json.load(f)
    print(f"Loaded {len(db_students)} students from ERP database.")
    
    # Read Ucban sheet with header=2
    df = pd.read_excel(excel_path, sheet_name="Ucban", header=2)
    print(f"Loaded {len(df)} rows from Ucban sheet.")
    
    matched_count = 0
    unmatched_count = 0
    ambiguous_count = 0
    skipped_count = 0
    
    test_rows = []
    
    for idx, row in df.iterrows():
        name = row.get("Student Name")
        if pd.isna(name) or str(name).strip().lower() in ["", "total", "grand total"]:
            skipped_count += 1
            continue
            
        name_str = str(name).strip()
        if "teacher" in name_str.lower() or "staff" in name_str.lower():
            skipped_count += 1
            continue
            
        row_class = row.get("Class")
        candidates = match_student_phonetic(name_str, row_class, db_students)
        
        if len(candidates) == 1:
            matched_count += 1
        elif len(candidates) > 1:
            ambiguous_count += 1
            if len(test_rows) < 10:
                test_rows.append((name_str, row_class, "Ambiguous", [f"{c['firstName']} {c['lastName']} ({c['admissionNumber']})" for c in candidates]))
        else:
            unmatched_count += 1
            if len(test_rows) < 15:
                test_rows.append((name_str, row_class, "Unmatched", []))
                
    total_processed = matched_count + unmatched_count + ambiguous_count
    print("\n--- PHONETIC MATCHER PERFORMANCE ---")
    print(f"Total Processed: {total_processed}")
    print(f"Matched: {matched_count} ({matched_count/total_processed*100:.1f}%)")
    print(f"Unmatched: {unmatched_count} ({unmatched_count/total_processed*100:.1f}%)")
    print(f"Ambiguous: {ambiguous_count} ({ambiguous_count/total_processed*100:.1f}%)")
    print(f"Skipped (Staff/Empty): {skipped_count}")
    
    print("\nSample of Unmatched/Ambiguous examples from phonetic matcher:")
    for item in test_rows:
        print(f"Excel Name: '{item[0]}' (Class: {item[1]}) | Status: {item[2]} | Candidates: {item[3]}")

if __name__ == "__main__":
    main()
