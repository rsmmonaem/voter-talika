
import fitz
import sys

file_path = './JHENAIGATI/NALKURA/890905/890905_com_471_female_without_photo_27_2025-11-24.pdf'

try:
    doc = fitz.open(file_path)
    for i in range(len(doc)):
        page = doc[i]
        text = page.get_text()
        if "নাম:" in text:
            print(f"--- PAGE {i} ---")
            print(text[:1000])
            break
except Exception as e:
    print(f"Error: {e}")
