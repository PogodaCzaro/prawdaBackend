const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();

// Prostsze CORS
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    next();
});

app.use(express.json());

// Tymczasowy endpoint bez auth
app.get('/api/news', (req, res) => {
    try {
        const newsPath = path.join(__dirname, 'news.json');
        if (!fs.existsSync(newsPath)) {
            return res.json({ articles: [] });
        }
        
        const newsData = JSON.parse(fs.readFileSync(newsPath, 'utf8'));
        res.json(newsData);
    } catch (error) {
        res.json({ articles: [] });
    }
});

app.get('/', (req, res) => {
    res.json({ status: 'OK', message: 'Backend dziala' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log('Backend running on port', PORT);
});
