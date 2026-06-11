import { createClient, type Client, type Row } from '@libsql/client';
import * as path from 'path';
import * as crypto from 'crypto';

// Singleton pattern: giữ connection duy nhất qua các lần hot-reload
const globalForDb = globalThis as unknown as {
  db: Client | undefined;
};

const DB_PATH = path.join(process.cwd(), 'data', 'inventory.db');

function getDb(): Client {
  if (!globalForDb.db) {
    globalForDb.db = createClient({
      url: `file:${DB_PATH}`,
    });
  }
  return globalForDb.db;
}

/**
 * Helper: execute query và trả về rows (tương đương .all())
 */
async function queryAll(sql: string, ...params: unknown[]): Promise<Row[]> {
  const result = await getDb().execute({ sql, args: params as any[] });
  return result.rows;
}

/**
 * Helper: execute query và trả về row đầu tiên (tương đương .get())
 */
async function queryOne(sql: string, ...params: unknown[]): Promise<Row | null> {
  const rows = await queryAll(sql, ...params);
  return rows[0] ?? null;
}

/**
 * Helper: execute INSERT/UPDATE/DELETE, trả về lastInsertRowid + rowsAffected
 */
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

/**
 * Khởi tạo schema database: Tạo các bảng nếu chưa tồn tại.
 */
async function initSchema(): Promise<void> {
  const db = getDb();

  await db.execute(`
    -- Bảng người dùng
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      display_name TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    -- Bảng sản phẩm / hàng hóa
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

    -- Bảng lịch sử giao dịch
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

  // Seed user mặc định nếu chưa có
  const existingUser = await queryOne('SELECT id FROM users WHERE username = ?', 'admin');
  if (!existingUser) {
    const hash = crypto.createHash('sha256').update('admin123').digest('hex');
    await queryRun(
      `INSERT INTO users (username, password_hash, display_name)
       VALUES (?, ?, ?)`,
      'admin', hash, 'Quản trị viên'
    );
  }
}

export { initSchema };

// Chạy initSchema khi module được import lần đầu
initSchema().catch((error) => {
  console.error('Failed to initialize database schema:', error);
});
