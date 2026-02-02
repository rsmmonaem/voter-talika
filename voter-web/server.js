
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();
const port = process.env.PORT || 7860;
const DB_PATH = path.join(__dirname, 'voters.db');

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'dist')));

const db = new sqlite3.Database(DB_PATH);

const banglaToArabicMap = {
    '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
    '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9'
};

function normalizeQuery(str) {
    if (!str) return '';
    return str.split('').map(char => banglaToArabicMap[char] || char).join('');
}

// Search API
app.get('/api/voters', (req, res) => {
    const { q, upazila, union, ward, area_code, dob, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let query = `SELECT * FROM voters WHERE 1=1`;
    let params = [];

    if (q) {
        // Search by Name, Voter No, Father, Mother, Address, or Area Code
        // We normalize the query to Arabic digits so that English or Bangla numeric search works
        const normalizedQ = normalizeQuery(q);
        query += ` AND (name LIKE ? OR voter_no LIKE ? OR father LIKE ? OR mother LIKE ? OR address LIKE ? OR area_code LIKE ?)`;
        const searchParamOrig = `%${q}%`;
        const searchParamNorm = `%${normalizedQ}%`;
        
        // We use normalizedQ for numeric fields (voter_no, area_code) and original for text (name, etc.)
        // Actually, searching with normalized across all is safer if they typed Bangla digits for a name (unlikely but possible)
        params.push(searchParamOrig, searchParamNorm, searchParamOrig, searchParamOrig, searchParamOrig, searchParamNorm);
    }

    if (dob) {
        query += ` AND dob = ?`;
        params.push(dob);
    }

    if (upazila) {
        query += ` AND upazila = ?`;
        params.push(upazila);
    }

    if (union) {
        query += ` AND union_name = ?`;
        params.push(union);
    }

    if (ward) {
        query += ` AND ward = ?`;
        params.push(ward);
    }

    if (area_code) {
        query += ` AND area_code = ?`;
        params.push(area_code);
    }

    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as count');
    
    db.get(countQuery, params, (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        const total = row ? row.count : 0;

        query += ` ORDER BY id ASC LIMIT ? OFFSET ?`;
        params.push(parseInt(limit), parseInt(offset));

        db.all(query, params, (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({
                data: rows,
                total,
                page: parseInt(page),
                limit: parseInt(limit)
            });
        });
    });
});

// Get Nested Filters API
app.get('/api/filters', (req, res) => {
    // Sort by numeric ward if possible
    db.all(`SELECT DISTINCT upazila, union_name, ward, area_code, area_name 
           FROM voters 
           ORDER BY upazila, union_name, CAST(ward AS INTEGER), area_code`, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        
        const filters = {};
        rows.forEach(row => {
            const upa = row.upazila || 'Unknown';
            const uni = row.union_name || 'General';
            const wrd = row.ward || 'General';
            
            if (!filters[upa]) filters[upa] = {};
            if (!filters[upa][uni]) filters[upa][uni] = {};
            if (!filters[upa][uni][wrd]) filters[upa][uni][wrd] = [];
            
            if (!filters[upa][uni][wrd].find(a => a.code === row.area_code)) {
                filters[upa][uni][wrd].push({
                    code: row.area_code,
                    name: row.area_name
                });
            }
        });
        
        res.json(filters);
    });
});

// Serve frontend for all other routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
