const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

class NewsEncryptor {
    constructor() {
        this.secretKey = process.env.ENCRYPTION_KEY;
        if (!this.secretKey) {
            console.error('BRAK ENCRYPTION_KEY w .env');
        }
        this.algorithm = 'aes-256-ctr';
    }

    encrypt(text) {
        try {
            const iv = crypto.randomBytes(16);
            const cipher = crypto.createCipher(this.algorithm, this.secretKey);
            const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
            return {
                iv: iv.toString('hex'),
                content: encrypted.toString('hex')
            };
        } catch (error) {
            console.error('Encryption error:', error);
            return null;
        }
    }

    decrypt(encryptedData) {
        try {
            const decipher = crypto.createDecipher(this.algorithm, this.secretKey);
            const decrypted = Buffer.concat([
                decipher.update(Buffer.from(encryptedData.content, 'hex')),
                decipher.final()
            ]);
            return decrypted.toString('utf8');
        } catch (error) {
            console.error('Decryption error:', error);
            return null;
        }
    }

    encryptObject(obj) {
        const encrypted = {};
        for (const [key, value] of Object.entries(obj)) {
            if (key === 'id') {
                encrypted[key] = value;
            } else {
                const encryptedValue = this.encrypt(String(value));
                if (encryptedValue) {
                    encrypted[key] = encryptedValue;
                }
            }
        }
        return encrypted;
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
        console.log('Request received:', req.headers);
        
        const authHeader = req.headers.authorization;
        if (!authHeader || authHeader !== process.env.API_KEY) {
            console.log('Unauthorized access attempt');
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const newsPath = path.join(__dirname, 'news.json');
        console.log('Looking for news at:', newsPath);
        
        if (!fs.existsSync(newsPath)) {
            console.log('news.json not found');
            return res.status(500).json({ error: 'News file not found' });
        }

        const encryptedNews = JSON.parse(fs.readFileSync(newsPath, 'utf8'));
        console.log('Decrypting', encryptedNews.articles.length, 'articles');
        
        const decryptedNews = {
            articles: encryptedNews.articles.map(article => 
                encryptor.decryptObject(article)
            )
        };

        res.json(decryptedNews);
    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ error: 'Server error: ' + error.message });
    }
});

app.get('/', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'Prawda backend is running on Render!',
        timestamp: new Date().toISOString()
    });
});

app.get('/debug', (req, res) => {
    res.json({
        port: process.env.PORT,
        hasEncryptionKey: !!process.env.ENCRYPTION_KEY,
        hasApiKey: !!process.env.API_KEY
    });
});

app.listen(PORT, () => {
    console.log(`Prawda backend running on port ${PORT}`);
    console.log(`Encryption key: ${process.env.ENCRYPTION_KEY ? 'SET' : 'MISSING'}`);
});
