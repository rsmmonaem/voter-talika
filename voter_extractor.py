import os
import re
import sqlite3
import fitz  # PyMuPDF
from pathlib import Path
import time

# Replacement map for Bangla PDF extraction issues (PyMuPDF specific)
# These are common "mangled" characters in Election Commission PDFs when read as text
BANGLA_MAP = {
    'Î': 'র্',
    'Ï': 'ে',
    'Ë': '্য',
    'ƣ': 'কু',
    'ń': 'ম্ব',
    'į': 'ন্য',
    'Œ': 'ন্ট',
    'Ĵ': 'প্র',
    'Ą': 'দ্দী',
    'ŀ': 'ল্হ',
    'ľ': 'ব্দ',
    'ň': 'ন্ন',
    'Ħ': 'ম্ম',
    'Ķ': 'ফ্ফ',
    'ġ': 'দ্দি',
    '×': 'ক্ত',
    'Ř': 'শ্র',
    'Ɓ': 'রু',
    'Ů': 'স',
    'Ɔ': 'হ',
    'ƀ': 'জ',
    'ſ': 'নূ',
    'Ĩ': 'ন্ন',
    'ĺ': 'ব্দ',
    'Ž': 'ফ্ফ',
    'ķ': 'ল্হ',
    'ļ': 'দ্রে',
    'ŗ': 'প্র',
    'Ş': 'শ',
    'Ţ': 'ষ',
    'Ñ': 'ব্দু',
}

# Add CID variants if they appear
BANGLA_MAP.update({
    '(cid:206)': 'র্',
    '(cid:207)': 'ে',
    '(cid:203)': '্য',
    '(cid:419)': 'কু',
    '(cid:324)': 'ম্ব',
    '(cid:303)': 'ন্য',
    '(cid:140)': 'ন্ট',
    '(cid:308)': 'প্র',
    '(cid:215)': 'ক্ত',
    '(cid:384)': 'সু',
})

BANGLA_DIGITS = {'০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4', '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9'}

def to_arabic_digits(text):
    if not text: return ''
    return ''.join(BANGLA_DIGITS.get(c, c) for c in text)

def clean_text(text):
    if not text: return ''
    
    # 1. Apply CID and manual replacements
    for cid, replacement in BANGLA_MAP.items():
        text = text.replace(cid, replacement)
    
    # 2. Fix vowel positioning (if E-kar/I-kar/etc comes before consonant in the text stream)
    # Common vowels: ে (clean mapped from Ï), ি, ৈ, ো, ৌ
    # Note: ো is often ে + া (already handled if we move ে)
    vowels_to_swap = 'েিৈী' 
    for v in vowels_to_swap:
        text = re.sub(f'({v})([\u0985-\u09B9])', r'\2\1', text)

    # 3. Clean whitespace
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def init_db(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    print(f"Dropping and Recreating table 'voters' in {db_path}...")
    cursor.execute("DROP TABLE IF EXISTS voters")
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS voters (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            serial_no TEXT,
            voter_no TEXT,
            name TEXT,
            father TEXT,
            mother TEXT,
            occupation TEXT,
            dob TEXT,
            address TEXT,
            upazila TEXT,
            union_name TEXT,
            ward TEXT,
            area_code TEXT,
            area_name TEXT,
            district TEXT,
            file_path TEXT
        )
        ''')
    conn.commit()
    return conn

def extract_voters(pdf_path, upazila, union_name, conn):
    cursor = conn.cursor()
    try:
        doc = fitz.open(pdf_path)
        if len(doc) == 0: return 0
        
        # Extract header info from first page
        first_page_text = clean_text(doc[0].get_text())
        
        district_match = re.search(r'জেলা:\s*([^\s]+)', first_page_text)
        code_match = re.search(r'কোড:\s*(\d+|[০-৯]+)', first_page_text)
        area_name_match = re.search(r'এলাকার নাম:\s*([^\r\n]+)', first_page_text)
        ward_match = re.search(r'(?:ওয়ার্ড|ওয়াড)(?:র)?\s*(?:নম্বর|নং)?(?:\s*\(.*?\))?\s*[:\-]?\s*(\d+|[০-৯]+)', first_page_text)
        
        district = district_match.group(1) if district_match else ''
        area_code = to_arabic_digits(code_match.group(1)) if code_match else ''
        area_name = area_name_match.group(1) if area_name_match else ''
        ward = to_arabic_digits(ward_match.group(1)) if ward_match else ''
        
        if not ward:
            path_match = re.search(r'WARD NO-(\d+)', str(pdf_path), re.IGNORECASE)
            if path_match: ward = path_match.group(1)

        voter_count = 0
        for page in doc:
            page_text = clean_text(page.get_text())
            if not page_text: continue
            
            # Find all voter entries using a more robust regex
            # format: "number. নাম: ... followed by labels ... until next number. নাম:"
            entry_pattern = r'(?:\d+|[০-৯]+)\.\s*নাম:.*?(?=\s*(?:\d+|[০-৯]+)\.\s*নাম:|$)'
            entries = re.findall(entry_pattern, page_text, re.DOTALL)
            
            for entry in entries:
                # Capture serial number
                serial_match = re.search(r'(\d+|[০-৯]+)\.\s*নাম:', entry)
                serial_no = to_arabic_digits(serial_match.group(1)) if serial_match else ''
                
                label_lookahead = r'(?=\s*(?:ভোটার|ভাটার|ভোটার|পিতা|মাতা|পেশা|পশা|জন্ম\s*তারিখ|তারিখ|ঠিকানা|িঠকানা|নং|$))'
                
                name_match = re.search(r'নাম:\s*(.*?)' + label_lookahead, entry, re.DOTALL)
                voter_no_match = re.search(r'(?:ভোটার|ভাটার|ভোটার|নং:?)\s*(\d+|[০-৯]+)', entry)
                father_match = re.search(r'(?:পিতা|িপতা|পতা):\s*(.*?)' + label_lookahead, entry, re.DOTALL)
                mother_match = re.search(r'মাতা:\s*(.*?)' + label_lookahead, entry, re.DOTALL)
                occupation_match = re.search(r'(?:পেশা|পশা):\s*(.*?)' + label_lookahead, entry, re.DOTALL)
                dob_match = re.search(r'(?:জন্ম\s*তারিখ|তারিখ|তািরখ):\s*(.*?)' + label_lookahead, entry, re.DOTALL)
                address_match = re.search(r'(?:ঠিকানা|িঠকানা):\s*(.*?)' + r'(?=\s*(?:\d+|[০-৯]+)\.|$)', entry, re.DOTALL)

                if voter_no_match and voter_no_match.group(1).strip():
                    v_no = to_arabic_digits(voter_no_match.group(1))
                    name = name_match.group(1).strip() if name_match else 'নাম পাওয়া যায়নি'
                    
                    if not v_no: continue
                    if not name: name = 'নাম পাওয়া যায়নি'
                    
                    cursor.execute('''
                    INSERT INTO voters (
                        serial_no, voter_no, name, father, mother, occupation, dob, address, 
                        upazila, union_name, ward, area_code, area_name, district, file_path
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ''', (
                        serial_no,
                        v_no,
                        name,
                        father_match.group(1).strip() if father_match else '',
                        mother_match.group(1).strip() if mother_match else '',
                        occupation_match.group(1).strip() if occupation_match else '',
                        dob_match.group(1).strip() if dob_match else '',
                        address_match.group(1).strip() if address_match else '',
                        upazila,
                        union_name,
                        ward,
                        area_code,
                        area_name,
                        district,
                        str(pdf_path)
                    ))
                    voter_count += 1
        
        conn.commit()
        doc.close()
        return voter_count
    except Exception as e:
        print(f"  Error processing {pdf_path}: {e}")
        return 0

def main():
    base_dir = '/Users/rsmmonaem/Desktop/Voter Talika'
    db_path = os.path.join(base_dir, 'voters.db')
    folders = ['JHENAIGATI', 'SREEBARDI']
    
    start_time = time.time()
    print(f"Initializing database at {db_path}...")
    conn = init_db(db_path)
    
    # Get total files first for progress
    pdf_files = []
    for folder in folders:
        folder_path = Path(base_dir) / folder
        if folder_path.exists():
            pdf_files.extend(list(folder_path.rglob('*.pdf')))
    
    total_files_count = len(pdf_files)
    print(f"Found {total_files_count} PDF files.")
    
    total_voters = 0
    for i, pdf_path in enumerate(pdf_files, 1):
        # Extract metadata from path
        rel_path = pdf_path.relative_to(base_dir)
        parts = rel_path.parts
        upazila = parts[0]
        union_name = parts[1] if len(parts) > 1 else ''
        
        print(f"[{i}/{total_files_count}] Processing: {pdf_path.name} ({upazila} -> {union_name})")
        count = extract_voters(pdf_path, upazila, union_name, conn)
        total_voters += count
        
        if i % 10 == 0:
            elapsed = time.time() - start_time
            avg_speed = i / elapsed
            remaining = (total_files_count - i) / avg_speed
            print(f"  >> Progress: {i/total_files_count*100:.1f}% | Est. Remaining: {remaining/60:.1f} mins | Total Voters: {total_voters}")

    conn.close()
    duration = time.time() - start_time
    print(f"\nExtraction complete in {duration/60:.1f} minutes!")
    print(f"Total PDFs processed: {total_files_count}")
    print(f"Total Voters added: {total_voters}")

if __name__ == '__main__':
    main()
