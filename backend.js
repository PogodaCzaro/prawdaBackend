const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const app = express();

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    next();
});

app.use(express.json());

class NewsEncryptor {
    constructor() {
        this.secretKey = process.env.PRAWDA_ENCRYPTION_KEY || "testowy_klucz_32_znakow_123";
        this.algorithm = 'aes-256-gcm';
    }

    decrypt(encryptedData) {
        try {
            const key = crypto.scryptSync(this.secretKey, 'salt', 32);
            const decipher = crypto.createDecipheriv(this.algorithm, key, Buffer.from(encryptedData.iv, 'hex'));
            decipher.setAuthTag(Buffer.from(encryptedData.tag, 'hex'));
            
            let decrypted = decipher.update(encryptedData.content, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            return decrypted;
        } catch (error) {
            console.error('Błąd deszyfrowania:', error);
            return 'Błąd odczytu';
        }
    }

    decryptObject(encryptedObj) {
        const decrypted = {};
        for (const [key, value] of Object.entries(encryptedObj)) {
            if (key === 'id') {
                decrypted[key] = value;
            } else {
                decrypted[key] = this.decrypt(value);
            }
        }
        return decrypted;
    }
}

const encryptor = new NewsEncryptor();

app.get('/api/news', (req, res) => {
    try {
        const newsPath = path.join(__dirname, 'news.json');
        
        if (!fs.existsSync(newsPath)) {
            return res.json({ articles: [] });
        }

        const encryptedNews = JSON.parse(fs.readFileSync(newsPath, 'utf8'));
        
        const decryptedNews = {
            articles: encryptedNews.articles.map(article => 
                encryptor.decryptObject(article)
            )
        };

        res.json(decryptedNews);
        
    } catch (error) {
        console.error('Error:', error);
        res.json({ articles: [] });
    }
});

app.get('/', (req, res) => {
    res.json({ status: 'OK', message: 'Backend z nowym szyfrowaniem dziala' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log('Backend z nowym szyfrowaniem running on port', PORT);
});
