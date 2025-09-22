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
        this.symmetricKey = null;
        this.symmetricKeyExpires = null;
    }

    generateSymmetricKey() {
        this.symmetricKey = crypto.randomBytes(32);
        this.symmetricKeyExpires = Date.now() + (2 * 60 * 1000); // 2 minuty
        return this.symmetricKey;
    }

    encryptWithPublicKey(publicKeyBase64, data) {
        const publicKey = Buffer.from(publicKeyBase64, 'base64');
        const encrypted = crypto.publicEncrypt(
            {
                key: publicKey,
                padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
                oaepHash: 'sha256'
            },
            data
        );
        return encrypted.toString('base64');
    }

    encryptWithSymmetricKey(data) {
        if (!this.symmetricKey || Date.now() > this.symmetricKeyExpires) {
            this.generateSymmetricKey();
        }

        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv('aes-256-gcm', this.symmetricKey, iv);
        
        let encrypted = cipher.update(data, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        const authTag = cipher.getAuthTag();

        return {
            iv: iv.toString('hex'),
            content: encrypted,
            tag: authTag.toString('hex')
        };
    }

    encryptNews(newsData) {
        return this.encryptWithSymmetricKey(JSON.stringify(newsData));
    }
}

const encryptor = new NewsEncryptor();

// Endpoint do wymiany kluczy
app.post('/api/exchange-keys', express.text({ type: '*/*' }), (req, res) => {
    try {
        const publicKeyBase64 = req.body;
        
        if (!publicKeyBase64) {
            return res.status(400).json({ error: 'Brak klucza publicznego' });
        }

        // Wygeneruj nowy klucz symetryczny
        const symmetricKey = encryptor.generateSymmetricKey();
        
        // Zaszyfruj klucz symetryczny kluczem publicznym frontendu
        const encryptedSymmetricKey = encryptor.encryptWithPublicKey(publicKeyBase64, symmetricKey);
        
        res.json({ 
            symmetricKey: encryptedSymmetricKey,
            expiresIn: 120 // sekundy
        });
        
    } catch (error) {
        console.error('Błąd wymiany kluczy:', error);
        res.status(500).json({ error: 'Błąd wymiany kluczy' });
    }
});

// Endpoint do pobierania zaszyfrowanych newsów
app.get('/api/encrypted-news', (req, res) => {
    try {
        const newsPath = path.join(__dirname, 'news.json');
        
        if (!fs.existsSync(newsPath)) {
            return res.json({ error: 'Brak newsów' });
        }

        const newsData = JSON.parse(fs.readFileSync(newsPath, 'utf8'));
        
        if (!encryptor.symmetricKey) {
            encryptor.generateSymmetricKey();
        }

        // Zaszyfruj newsy kluczem symetrycznym
        const encryptedNews = encryptor.encryptNews(newsData);
        
        res.json(encryptedNews);
        
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Błąd serwera' });
    }
});

app.get('/', (req, res) => {
    res.json({ status: 'OK', message: 'Backend z wymianą kluczy działa' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log('Backend z wymianą kluczy running on port', PORT);
});
