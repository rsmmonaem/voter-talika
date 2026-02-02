
import fitz
import sys

file_path = './JHENAIGATI/NALKURA/890905/890905_com_471_female_without_photo_27_2025-11-24.pdf'

try:
    doc = fitz.open(file_path)
    page = doc[1] # Page 2
    text = page.get_text()
    print("--- START TEXT ---")
    print(text)
    print("--- END TEXT ---")
except Exception as e:
    print(f"Error: {e}")
