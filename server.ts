import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import pg from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Server-side persistent file storage fallback path
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

// Check Cloud SQL / PostgreSQL environment variables
const pgConnectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
const pgHost = process.env.PGHOST;
const pgUser = process.env.PGUSER;
const pgPassword = process.env.PGPASSWORD;
const pgDatabase = process.env.PGDATABASE || process.env.POSTGRES_DATABASE;
const pgPort = process.env.PGPORT ? parseInt(process.env.PGPORT, 10) : 5432;
const cloudSqlInstance = process.env.CLOUD_SQL_CONNECTION_NAME || process.env.INSTANCE_CONNECTION_NAME;

const hasPgConfig = Boolean(pgConnectionString || pgHost);

let pgPool: pg.Pool | null = null;
let isPgConnected = false;
let pgConnectionError: string | null = null;

if (hasPgConfig) {
  try {
    if (pgConnectionString) {
      pgPool = new pg.Pool({
        connectionString: pgConnectionString,
        ssl: process.env.PGSSL === 'true' || process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
        connectionTimeoutMillis: 5000,
      });
    } else {
      pgPool = new pg.Pool({
        host: pgHost,
        user: pgUser,
        password: pgPassword,
        database: pgDatabase,
        port: pgPort,
        ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : false,
        connectionTimeoutMillis: 5000,
      });
    }

    // Initialize table in PostgreSQL if connected
    pgPool.query(`
      CREATE TABLE IF NOT EXISTS calendar_contexts (
        context_key VARCHAR(255) PRIMARY KEY,
        data JSONB NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `).then(() => {
      isPgConnected = true;
      pgConnectionError = null;
      console.log('✅ Connected to Cloud SQL / PostgreSQL database & initialized table.');
    }).catch((err) => {
      isPgConnected = false;
      pgConnectionError = err.message || String(err);
      console.warn('⚠️ Cloud SQL / PostgreSQL connection failed, falling back to local persistent store:', err.message);
    });
  } catch (err: any) {
    pgConnectionError = err.message || String(err);
    console.warn('⚠️ Could not initialize PostgreSQL pool:', err.message);
  }
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

// In-memory store initialized from disk
let memoryStore: ServerStore = readStore();

// Middleware to prevent caching on API endpoints
app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// GET calendar context data
app.get('/api/calendar', async (req, res) => {
  const contextKey = (req.query.contextKey as string) || 'default';

  // Try PostgreSQL if connected
  if (pgPool && isPgConnected) {
    try {
      const result = await pgPool.query(
        'SELECT data FROM calendar_contexts WHERE context_key = $1',
        [contextKey]
      );
      if (result.rows.length > 0) {
        return res.json({
          contextKey,
          source: 'cloudsql_postgres',
          data: result.rows[0].data,
        });
      }
    } catch (err) {
      console.error('PostgreSQL fetch error, reading memory fallback:', err);
    }
  }

  // Fallback to memory / file store
  const contextData = memoryStore.contexts[contextKey] || {
    events: [],
    avatars: {},
    updatedAt: new Date(0).toISOString(),
  };

  res.json({
    contextKey,
    source: isPgConnected ? 'cloudsql_postgres' : 'file_storage',
    data: contextData,
  });
});

// POST save calendar context data
app.post('/api/calendar', async (req, res) => {
  const { contextKey, events, avatars } = req.body || {};
  if (!contextKey || !Array.isArray(events)) {
    return res.status(400).json({ error: 'Invalid contextKey or events' });
  }

  const existing = memoryStore.contexts[contextKey] || { events: [], avatars: {}, updatedAt: '' };

  const updatedContext: ServerContextData = {
    events,
    avatars: avatars !== undefined ? avatars : (existing.avatars || {}),
    updatedAt: new Date().toISOString(),
  };

  // Always update memory store & file store fallback
  memoryStore.contexts[contextKey] = updatedContext;
  const fileSuccess = writeStore(memoryStore);

  let pgSuccess = false;
  if (pgPool && isPgConnected) {
    try {
      await pgPool.query(
        `INSERT INTO calendar_contexts (context_key, data, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (context_key)
         DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
        [contextKey, JSON.stringify(updatedContext)]
      );
      pgSuccess = true;
    } catch (err: any) {
      console.error('PostgreSQL save error:', err);
    }
  }

  res.json({
    success: true,
    contextKey,
    storageEngine: isPgConnected ? 'cloudsql_postgres' : 'file_storage',
    pgSaved: pgSuccess,
    fileSaved: fileSuccess,
    updatedAt: updatedContext.updatedAt,
    data: updatedContext,
  });
});

// GET Debug Cloud SQL / Database Status & Stored Data
app.get('/api/debug/db', async (req, res) => {
  let pgStore: Record<string, ServerContextData> = {};
  let pgCount = 0;

  if (pgPool && isPgConnected) {
    try {
      const result = await pgPool.query('SELECT context_key, data, updated_at FROM calendar_contexts');
      pgCount = result.rows.length;
      result.rows.forEach((row) => {
        pgStore[row.context_key] = row.data;
      });
    } catch (err: any) {
      console.error('Failed to query PostgreSQL debug data:', err);
    }
  }

  // Calculate file store size
  let fileSizeKb = 0;
  if (fs.existsSync(DB_FILE)) {
    const stats = fs.statSync(DB_FILE);
    fileSizeKb = Math.round((stats.size / 1024) * 10) / 10;
  }

  const detectedEnvVars = {
    DATABASE_URL: Boolean(process.env.DATABASE_URL),
    POSTGRES_URL: Boolean(process.env.POSTGRES_URL),
    PGHOST: process.env.PGHOST || null,
    PGDATABASE: process.env.PGDATABASE || process.env.POSTGRES_DATABASE || null,
    PGUSER: process.env.PGUSER || null,
    CLOUD_SQL_CONNECTION_NAME: cloudSqlInstance || null,
  };

  const totalContextsMemory = Object.keys(memoryStore.contexts).length;
  const totalEventsMemory = Object.values(memoryStore.contexts).reduce(
    (acc, ctx) => acc + (ctx.events ? ctx.events.length : 0),
    0
  );

  res.json({
    timestamp: new Date().toISOString(),
    activeEngine: isPgConnected ? 'cloudsql_postgres' : 'file_storage',
    cloudSqlStatus: {
      hasPgConfig,
      isConnected: isPgConnected,
      error: pgConnectionError,
      host: pgHost || (pgConnectionString ? 'Via DATABASE_URL' : 'None'),
      database: pgDatabase || 'Default',
      instanceName: cloudSqlInstance || 'Not specified',
      recordCount: pgCount,
    },
    fileStorageStatus: {
      filePath: DB_FILE,
      sizeKb: fileSizeKb,
      contextCount: totalContextsMemory,
      totalEvents: totalEventsMemory,
    },
    environmentVariables: detectedEnvVars,
    // The actual stored data from active engine or both
    storedData: {
      activeEngineData: isPgConnected ? pgStore : memoryStore.contexts,
      cloudSqlStore: pgStore,
      fileStore: memoryStore.contexts,
    },
  });
});

// POST Debug Test Event directly to DB
app.post('/api/debug/test-event', async (req, res) => {
  const contextKey = req.body.contextKey || 'debug_test_context';
  const testEvent = {
    id: 'test_evt_' + Date.now(),
    title: '🧪 Cloud SQL Debug Ping Event',
    description: 'Created automatically to test live database writes at ' + new Date().toLocaleTimeString(),
    location: 'Cloud Database',
    startTimeIso: new Date(Date.now() + 3600 * 1000).toISOString(),
    durationMinutes: 30,
    createdBy: 'user1',
    category: 'meeting',
    createdAt: new Date().toISOString(),
  };

  const existing = memoryStore.contexts[contextKey] || { events: [], avatars: {}, updatedAt: '' };
  const updatedEvents = [...existing.events, testEvent];

  memoryStore.contexts[contextKey] = {
    events: updatedEvents,
    avatars: existing.avatars || {},
    updatedAt: new Date().toISOString(),
  };
  writeStore(memoryStore);

  let pgSuccess = false;
  if (pgPool && isPgConnected) {
    try {
      await pgPool.query(
        `INSERT INTO calendar_contexts (context_key, data, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (context_key)
         DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
        [contextKey, JSON.stringify(memoryStore.contexts[contextKey])]
      );
      pgSuccess = true;
    } catch (err) {
      console.error('PostgreSQL test event insert failed:', err);
    }
  }

  res.json({
    success: true,
    testEvent,
    contextKey,
    pgSaved: pgSuccess,
    fileSaved: true,
  });
});

export default app;

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

if (!process.env.VERCEL) {
  start();
}

