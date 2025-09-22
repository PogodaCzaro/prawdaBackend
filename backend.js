const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const fs = require('fs');
require('dotenv').config();

const app = express();

// Dodaj CORS - to pozwoli frontendowi na łaczenie się
app.use(cors({
    origin: ['http://localhost:3000', 'https://twoj-frontend.vercel.app'],
    credentials: true
}));

app.use(express.json());

const PORT = process.env.PORT || 3000;

// Tymczasowo wyłącz auth dla testów
app.get('/api/news', (req, res) => {
    try {
        console.log('Request received from:', req.headers.origin);
        
        // Tymczasowo zakomentuj auth
        // const authHeader = req.headers.authorization;
        // if (!authHeader || authHeader !== process.env.PRAWDA_API_KEY) {
        //     return res.status(401).json({ error: 'Unauthorized' });
        // }

        const newsPath = require('path').join(__dirname, 'news.json');
        console.log('Reading news from:', newsPath);
        
        if (!fs.existsSync(newsPath)) {
            return res.status(500).json({ error: 'News file not found' });
        }

        const newsData = JSON.parse(fs.readFileSync(newsPath, 'utf8'));
        console.log('Sending news:', newsData.articles.length, 'articles');
        
        res.json(newsData);
        
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Server error: ' + error.message });
    }
});

app.get('/', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'Prawda backend is running with CORS',
        timestamp: new Date().toISOString()
    });
});

app.listen(PORT, () => {
    console.log(`Backend running on port ${PORT}`);
});
