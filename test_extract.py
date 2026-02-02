
import pdfplumber
import sys

file_path = './JHENAIGATI/NALKURA/890905/890905_com_471_female_without_photo_27_2025-11-24.pdf'

try:
    with pdfplumber.open(file_path) as pdf:
        first_page = pdf.pages[0]
        text = first_page.extract_text()
        print("--- START TEXT ---")
        print(text)
        print("--- END TEXT ---")
except Exception as e:
    print(f"Error: {e}")
