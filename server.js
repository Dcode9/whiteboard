import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import chatHandler from './api/chat.js';
import imageHandler from './api/image.js';
import interfaceHandler from './api/interface.js';
import searchHandler from './api/search.js';
import uploadHandler from './api/upload.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env.local, .env, and /home/codespace/.cloud_tokens.env
for (const envFile of ['.env.local', '.env', '/home/codespace/.cloud_tokens.env']) {
  const envPath = envFile.startsWith('/') ? envFile : path.join(__dirname, envFile);
  if (fs.existsSync(envPath)) {
    try {
      const content = fs.readFileSync(envPath, 'utf8');
      content.split('\n').forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx === -1) return;
        const key = trimmed.slice(0, eqIdx).trim();
        let val = trimmed.slice(eqIdx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = val;
        }
      });
    } catch (e) {
      console.warn(`Failed to parse ${envFile}:`, e.message);
    }
  }
}

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

function createWebRequest(req) {
  const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  const host = req.headers['host'] || `localhost:${PORT}`;
  const url = `${protocol}://${host}${req.originalUrl || req.url}`;

  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value !== undefined) {
      if (Array.isArray(value)) {
        value.forEach(v => headers.append(key, v));
      } else {
        headers.set(key, value);
      }
    }
  }

  const init = {
    method: req.method,
    headers
  };

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    init.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
  }

  return new Request(url, init);
}

function adaptWebHandler(handler) {
  return async (req, res) => {
    try {
      const webReq = createWebRequest(req);
      const webRes = await handler(webReq);

      res.status(webRes.status);
      webRes.headers.forEach((val, key) => {
        res.setHeader(key, val);
      });

      if (webRes.body) {
        const reader = webRes.body.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(value);
        }
        res.end();
      } else {
        res.end();
      }
    } catch (err) {
      console.error('API Error:', err);
      res.status(500).json({ error: err.message || 'Internal Server Error' });
    }
  };
}

// D'Ai Agent API Routes
app.all('/api/chat', chatHandler);
app.all('/api/upload', uploadHandler);
app.all('/api/image', adaptWebHandler(imageHandler));
app.all('/api/interface', adaptWebHandler(interfaceHandler));
app.all('/api/search', adaptWebHandler(searchHandler));

// In-Memory Document & Board storage fallback (when Supabase credentials are not yet configured)
const localDocStore = new Map();

app.post('/api/save', (req, res) => {
  const body = req.body || {};
  const id = body.id || 'doc-' + Date.now();
  const doc = {
    id,
    title: body.title || 'Untitled Document',
    data: body.drawingData || body.documentData || body,
    updated_at: new Date().toISOString(),
  };
  localDocStore.set(id, doc);
  res.json({ success: true, id, message: 'Saved successfully' });
});

app.get('/api/load/:id', (req, res) => {
  const id = req.params.id;
  const doc = localDocStore.get(id);
  if (!doc) {
    return res.status(404).json({ error: 'Document not found' });
  }
  res.json({ success: true, document: doc });
});

app.get('/api/list', (req, res) => {
  const list = Array.from(localDocStore.values()).map(d => ({
    id: d.id,
    title: d.title,
    updated_at: d.updated_at,
  }));
  res.json({ success: true, documents: list });
});

// Serve static files from Vite dist build
const distDir = path.join(__dirname, 'dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`D'Note Server running on http://0.0.0.0:${PORT}`);
});
