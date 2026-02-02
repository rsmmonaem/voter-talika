
import sys

try:
    import pdfplumber
    print("pdfplumber is installed")
except ImportError:
    print("pdfplumber is NOT installed")

try:
    import fitz # PyMuPDF
    print("PyMuPDF is installed")
except ImportError:
    print("PyMuPDF is NOT installed")
