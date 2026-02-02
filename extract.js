
const fs = require('fs-extra');
const path = require('path');
const pdf = require('pdf-extraction');
const sqlite3 = require('sqlite3').verbose();

const BASE_DIR = '/Users/rsmmonaem/Desktop/Voter Talika';
const DB_PATH = path.join(BASE_DIR, 'voters.db');

async function initDb() {
    if (fs.existsSync(DB_PATH)) fs.removeSync(DB_PATH);
    const db = new sqlite3.Database(DB_PATH);
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            db.run(`CREATE TABLE IF NOT EXISTS voters (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
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
            )`);
            resolve(db);
        });
    });
}

const banglaToArabicMap = {
    '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
    '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9'
};

function toArabicDigits(str) {
    if (!str) return '';
    return str.split('').map(char => banglaToArabicMap[char] || char).join('');
}

function cleanText(text) {
    if (!text) return '';
    return text
        .replace(/[Ï]/g, '')
        .replace(/ĥ/g, '্ম')
        .replace(/ē/g, 'ত্')
        .replace(/ĺ/g, 'ব্দ')
        .replace(/Ň/g, 'ম্ম')
        .replace(/ė/g, 'দ্দি')
        .replace(/×/g, 'ক্ত')
        .replace(/Ř/g, 'শ্র')
        .replace(/Ɓ/g, 'রু')
        .replace(/ƣ/g, 'শ')
        .replace(/Ů/g, 'স')
        .replace(/Ɔ/g, 'হ')
        .replace(/ƀ/g, 'জ')
        .replace(/\r?\n|\r/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

async function processPdf(filePath, upazila, unionName, db) {
    const dataBuffer = fs.readFileSync(filePath);
    try {
        const data = await pdf(dataBuffer);
        const text = data.text;

        const districtMatch = text.match(/জেলা:\s*([^\sু]+)/);
        const codeMatch = text.match(/কোড:\s*(\d+|[০-৯]+)/);
        const areaNameMatch = text.match(/এলাকার নাম:\s*([^\r\n]+)/);
        
        // Improved Ward extraction (matching the image text pattern)
        const wardMatch = text.match(/(?:ওয়ার্ড|ওয়াড)(?:Î)?\s*(?:নম্বর|নং)?(?:\s*\(.*?\))?\s*[:\-]?\s*(\d+|[০-৯]+)/);
        let ward = wardMatch ? toArabicDigits(wardMatch[1]) : '';

        if (!ward) {
            const pathMatch = filePath.match(/WARD NO-(\d+)/i);
            if (pathMatch) ward = pathMatch[1];
        }

        const district = districtMatch ? cleanText(districtMatch[1]) : '';
        const areaCode = codeMatch ? toArabicDigits(codeMatch[1]) : '';
        const areaName = areaNameMatch ? cleanText(areaNameMatch[1]) : '';

        // Split entries robustly
        const entries = text.split(/(?=\s*(?:\d+|[০-৯]+)\.\s*নাম:)/);

        const stmt = db.prepare(`INSERT INTO voters (
            voter_no, name, father, mother, occupation, dob, address, 
            upazila, union_name, ward, area_code, area_name, district, file_path
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

        for (let entry of entries) {
            if (!entry.includes('নাম:')) continue;

            const nameMatch = entry.match(/নাম:\s*([^\n\r]+)/);
            // Capture Voter No (handling both Arabic and Bangla digits)
            const voterNoMatch = entry.match(/(?:ভাটার নং|ভোটার নং|নং:?)\s*(\d+|[০-৯]+)/);
            const fatherMatch = entry.match(/িপতা:\s*([^\n\r]+)/);
            const motherMatch = entry.match(/মাতা:\s*([^\n\r]+)/);
            const occupationMatch = entry.match(/পশা:\s*([^,]+)/);
            const dobMatch = entry.match(/তািরখ:\s*([^\s\n\r]+)/);
            const addressMatch = entry.match(/িঠকানা:\s*([\s\S]+?)(?=\s*(?:\d+|[০-৯]+)\.|$)/);

            if (nameMatch) {
                stmt.run(
                    voterNoMatch ? toArabicDigits(voterNoMatch[1]) : '',
                    cleanText(nameMatch[1]),
                    fatherMatch ? cleanText(fatherMatch[1]) : '',
                    motherMatch ? cleanText(motherMatch[1]) : '',
                    occupationMatch ? cleanText(occupationMatch[1]) : '',
                    dobMatch ? cleanText(dobMatch[1]) : '',
                    addressMatch ? cleanText(addressMatch[1]) : '',
                    upazila,
                    unionName,
                    ward,
                    areaCode,
                    areaName,
                    district,
                    filePath
                );
            }
        }
        stmt.finalize();
    } catch (err) {
        console.error(`Error processing ${filePath}:`, err);
    }
}

async function walk(dir, upazila = '', unionName = '') {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        if (file.startsWith('.')) continue;
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            if (!upazila) await walk(fullPath, file, '');
            else if (!unionName) await walk(fullPath, upazila, file);
            else await walk(fullPath, upazila, unionName);
        } else if (file.endsWith('.pdf')) {
            await processPdf(fullPath, upazila, unionName, global.db);
        }
    }
}

async function run() {
    console.log("Starting full refined extraction (Arabic Digits & Improved Regex)...");
    global.db = await initDb();
    const folders = ['JHENAIGATI', 'SREEBARDI'];
    for (const folder of folders) {
        const folderPath = path.join(BASE_DIR, folder);
        if (fs.existsSync(folderPath)) await walk(folderPath, folder);
    }
    console.log("Extraction complete!");
    global.db.close();
}

run();
