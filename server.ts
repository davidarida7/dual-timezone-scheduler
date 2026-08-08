import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Server-side persistent file storage path
const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'storage.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

interface ServerContextData {
  events: any[];
  avatars?: { user1?: string; user2?: string };
  updatedAt: string;
}

interface ServerStore {
  contexts: Record<string, ServerContextData>;
}

function readStore(): ServerStore {
  try {
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      return JSON.parse(content);
    }
  } catch (err) {
    console.error('Error reading server db file:', err);
  }
  return { contexts: {} };
}

function writeStore(data: ServerStore): boolean {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Error writing server db file:', err);
    return false;
  }
}

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// GET calendar context data
app.get('/api/calendar', (req, res) => {
  const contextKey = (req.query.contextKey as string) || 'default';
  const store = readStore();
  const contextData = store.contexts[contextKey] || {
    events: [],
    avatars: {},
    updatedAt: new Date(0).toISOString(),
  };

  res.json({
    contextKey,
    data: contextData,
  });
});

// POST save calendar context data
app.post('/api/calendar', (req, res) => {
  const { contextKey, events, avatars } = req.body || {};
  if (!contextKey || !Array.isArray(events)) {
    return res.status(400).json({ error: 'Invalid contextKey or events' });
  }

  const store = readStore();
  const existing = store.contexts[contextKey] || { events: [], avatars: {}, updatedAt: '' };

  store.contexts[contextKey] = {
    events,
    avatars: avatars || existing.avatars || {},
    updatedAt: new Date().toISOString(),
  };

  const success = writeStore(store);
  if (success) {
    res.json({
      success: true,
      contextKey,
      updatedAt: store.contexts[contextKey].updatedAt,
    });
  } else {
    res.status(500).json({ error: 'Failed to write to server storage' });
  }
});

async function start() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

start();
