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

app.use(express.text({ type: '*/*' }));

class NewsEncryptor {
    constructor() {
        this.symmetricKey = null;
        this.symmetricKeyExpires = null;
    }

    generateSymmetricKey() {
        this.symmetricKey = crypto.randomBytes(32);
        this.symmetricKeyExpires = Date.now() + (2 * 60 * 1000);
        return this.symmetricKey;
    }

    // Poprawiona funkcja szyfrowania z kluczem publicznym
    encryptWithPublicKey(publicKeyBase64, data) {
        try {
            console.log('Public key length:', publicKeyBase64.length);
            
            // Konwersja base64 do Buffer
            const publicKeyDer = Buffer.from(publicKeyBase64, 'base64');
            
            // Użyj prostszego formatu klucza
            const publicKey = crypto.createPublicKey({
                key: publicKeyDer,
                format: 'der',
                type: 'spki'
            });

            const encrypted = crypto.publicEncrypt(
                {
                    key: publicKey,
                    padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
                    oaepHash: 'sha256'
                },
                data
            );
            
            return encrypted.toString('base64');
            
        } catch (error) {
            console.error('Błąd szyfrowania RSA:', error);
            throw error;
        }
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
app.post('/api/exchange-keys', (req, res) => {
    try {
        console.log('Otrzymano request wymiany kluczy');
        
        const publicKeyBase64 = req.body;
        
        if (!publicKeyBase64) {
            return res.status(400).json({ error: 'Brak klucza publicznego' });
        }

        // Testowy klucz symetryczny (na razie bez szyfrowania RSA)
        const symmetricKey = encryptor.generateSymmetricKey();
        
        // Tymczasowo: zwróć klucz w plain text dla testów
        const testResponse = {
            status: 'success',
            symmetricKey: symmetricKey.toString('base64'), // Plain text na testy
            expiresIn: 120,
            message: 'TRYB TESTOWY - klucz niezaszyfrowany'
        };
        
        res.json(testResponse);
        
    } catch (error) {
        console.error('Błąd wymiany kluczy:', error);
        res.status(500).json({ error: 'Błąd serwera: ' + error.message });
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

// Testowy endpoint
app.get('/api/test', (req, res) => {
    res.json({ message: 'Backend działa poprawnie' });
});

app.get('/', (req, res) => {
    res.json({ status: 'OK', message: 'Backend z poprawioną wymianą kluczy' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log('Backend running on port', PORT);
});
