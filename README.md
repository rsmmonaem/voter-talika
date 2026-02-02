---
title: Voter Talika
emoji: 🗳️
colorFrom: blue
colorTo: indigo
sdk: docker
app_port: 7860
pinned: false
---

# 🗳️ Voter Talika Search App

A high-performance Android-ready web application to search and filter voter data from PDF files.

## ✨ Features
- **Instant Search**: Search by Name, Voter ID, Father/Mother name, or Address.
- **Nested Filters**: Filter by Upazila, then Union, then Area Code (File Wise).
- **Bangla Support**: Fully optimized for Bangla font and character corrections.
- **Premium UI**: Modern, responsive design optimized for mobile "App" experience.
- **Fast Performance**: Powered by a local SQLite database for lightning-fast queries.

## 🚀 How to Run

### 1. Extraction (Enhanced)
We've added a **Python-based Extraction Engine** for much better Bangla text support and faster processing.
```bash
python3 voter_extractor.py
```
This script handles:
- **CID Mapping**: Fixes mangled characters from PDFs.
- **Vowel Correction**: Corrects the visual vs logical order of Bangla vowels.
- **Improved Regex**: Ensures no data mismatch between fields.
- **Comprehensive**: Extracts all pages from all PDFs in the directory.

### 2. Start the App
Run the following command in your terminal:
```bash
./start.sh
```
This will:
- Start the **API Server** on port `3001`.
- Start the **Frontend App** on port `3000`.

## 📂 Project Structure
- `voter_extractor.py`: (NEW) The enhanced Python extraction engine.
- `extract.js`: (Legacy) The original Node.js extractor.
- `voters.db`: The SQLite database containing all data.
- `voter-web/`: The React/Frontend source code.
- `voter-web/server.js`: The backend API server.
- `start.sh`: Easy startup script.
# voter-talika
