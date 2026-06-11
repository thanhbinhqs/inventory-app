import { cookies } from 'next/headers';
import crypto from 'crypto';
import { queryOne } from './db';

const SESSION_COOKIE_NAME = 'inventory_session';
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24h

interface User {
  id: number;
  username: string;
  display_name: string;
}

interface SessionData {
  userId: number;
  expiresAt: number; // timestamp ms
}

/**
 * Tạo session token ngẫu nhiên
 */
function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Xác thực username/password, trả về user nếu đúng
 */
export async function authenticateUser(
  username: string,
  password: string
): Promise<User | null> {
  const hash = crypto.createHash('sha256').update(password).digest('hex');

  const user = await queryOne(
    'SELECT id, username, display_name FROM users WHERE username = ? AND password_hash = ?',
    username,
    hash
  );

  if (!user) return null;
  return {
    id: user.id as number,
    username: user.username as string,
    display_name: user.display_name as string,
  };
}

/**
 * Tạo session (lưu trong cookie)
 */
export async function createSession(userId: number): Promise<string> {
  const token = generateToken();
  const expiresAt = Date.now() + SESSION_DURATION_MS;

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, JSON.stringify({ userId, expiresAt }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_DURATION_MS / 1000,
  });

  return token;
}

/**
 * Xóa session (logout)
 */
export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * Lấy user hiện tại từ session cookie
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);

    if (!sessionCookie?.value) return null;

    const session: SessionData = JSON.parse(sessionCookie.value);

    if (Date.now() > session.expiresAt) {
      return null;
    }

    const user = await queryOne(
      'SELECT id, username, display_name FROM users WHERE id = ?',
      session.userId
    );

    if (!user) return null;
    return {
      id: user.id as number,
      username: user.username as string,
      display_name: user.display_name as string,
    };
  } catch {
    return null;
  }
}
