import { createClient, type Client, type Row } from '@libsql/client';
import * as path from 'path';
import * as crypto from 'crypto';
import * as fs from 'fs';

// ============================================================
// Turso Cloud vs Local SQLite
// - Nếu có biến môi trường TURSO_DATABASE_URL + TURSO_AUTH_TOKEN
//   → kết nối tới Turso cloud
// - Ngược lại → dùng file SQLite local (data/inventory.db)
// ============================================================

const globalForDb = globalThis as unknown as {
  db: Client | undefined;
};

function getDb(): Client {
  if (globalForDb.db) return globalForDb.db;

  const tursoUrl = process.env.TURSO_DATABASE_URL;
  const tursoToken = process.env.TURSO_AUTH_TOKEN;

  if (tursoUrl && tursoToken) {
    // --- Chế độ Turso Cloud ---
    console.log(`🔗 Connecting to Turso cloud: ${tursoUrl}`);
    globalForDb.db = createClient({
      url: tursoUrl,
      authToken: tursoToken,
    });
  } else {
    // --- Chế độ Local SQLite ---
    const dbDir = path.resolve(process.cwd(), 'data');
    fs.mkdirSync(dbDir, { recursive: true });
    const dbPath = path.join(dbDir, 'inventory.db');
    console.log(`📁 Using local SQLite: ${dbPath}`);
    globalForDb.db = createClient({
      url: `file:${dbPath}`,
    });
  }

  return globalForDb.db;
}

// ============================================================
// Helpers
// ============================================================

async function queryAll(sql: string, ...params: unknown[]): Promise<Row[]> {
  const result = await getDb().execute({ sql, args: params as any[] });
  return result.rows;
}

async function queryOne(sql: string, ...params: unknown[]): Promise<Row | null> {
  const rows = await queryAll(sql, ...params);
  return rows[0] ?? null;
}

async function queryRun(
  sql: string,
  ...params: unknown[]
): Promise<{ lastInsertRowid: number; rowsAffected: number }> {
  const result = await getDb().execute({ sql, args: params as any[] });
  return {
    lastInsertRowid: Number(result.lastInsertRowid ?? 0),
    rowsAffected: result.rowsAffected,
  };
}

export { getDb, queryAll, queryOne, queryRun };

// ============================================================
// Schema initialization
// ============================================================

async function initSchema(): Promise<void> {
  const db = getDb();

  await db.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      display_name TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      unit TEXT NOT NULL DEFAULT 'cái',
      quantity INTEGER NOT NULL DEFAULT 0,
      purchase_price REAL NOT NULL DEFAULT 0,
      selling_price REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('IN', 'OUT')),
      quantity INTEGER NOT NULL CHECK(quantity > 0),
      unit_price REAL NOT NULL DEFAULT 0,
      total_price REAL GENERATED ALWAYS AS (quantity * unit_price) STORED,
      note TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
    );

    CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);
    CREATE INDEX IF NOT EXISTS idx_transactions_product_id ON transactions(product_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
  `);

  // Seed admin user
  const existingUser = await queryOne(
    'SELECT id FROM users WHERE username = ?',
    'admin',
  );
  if (!existingUser) {
    const hash = crypto.createHash('sha256').update('admin123').digest('hex');
    await queryRun(
      `INSERT INTO users (username, password_hash, display_name)
       VALUES (?, ?, ?)`,
      'admin',
      hash,
      'Quản trị viên',
    );
  }
}

export { initSchema };

// Chạy schema khi import (idempotent — CREATE IF NOT EXISTS)
initSchema().catch((error) => {
  console.error('Failed to initialize database schema:', error);
});
