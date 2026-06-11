import { createClient } from '@libsql/client';
import crypto from 'crypto';
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8');
const lines = env.split('\n');
const url = lines.find(l => l.startsWith('TURSO_DATABASE_URL')).split('=', 2)[1];
const tok = lines.find(l => l.startsWith('TURSO_AUTH_TOKEN')).split('=', 2)[1];

const db = createClient({ url, authToken: tok });

console.log('Creating schema...');
await db.execute(`CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
)`);
await db.execute(`CREATE TABLE IF NOT EXISTS products (
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
)`);
await db.execute(`CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('IN', 'OUT')),
  quantity INTEGER NOT NULL CHECK(quantity > 0),
  unit_price REAL NOT NULL DEFAULT 0,
  total_price REAL GENERATED ALWAYS AS (quantity * unit_price) STORED,
  note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
)`);
await db.execute('CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at)');
await db.execute('CREATE INDEX IF NOT EXISTS idx_transactions_product_id ON transactions(product_id)');
await db.execute('CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type)');
console.log('✅ Schema created');

const hash = crypto.createHash('sha256').update('admin123').digest('hex');
try {
  await db.execute({
    sql: 'INSERT INTO users (username, password_hash, display_name) VALUES (?, ?, ?)',
    args: ['admin', hash, 'Quản trị viên'],
  });
  console.log('✅ Admin user seeded');
} catch (e: any) {
  if (e.message?.includes('UNIQUE')) console.log('ℹ️ Admin already exists');
  else console.error('❌', e.message);
}

const r1 = await db.execute('SELECT COUNT(*) AS cnt FROM users');
const r2 = await db.execute('SELECT COUNT(*) AS cnt FROM products');
const r3 = await db.execute('SELECT COUNT(*) AS cnt FROM transactions');
console.log(`📊 Users: ${r1.rows[0].cnt} | Products: ${r2.rows[0].cnt} | Transactions: ${r3.rows[0].cnt}`);
db.close();
console.log('🎉 Turso Cloud ready!');
