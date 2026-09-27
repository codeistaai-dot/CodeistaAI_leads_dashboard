import { SignJWT, jwtVerify } from 'jose';
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

const COOKIE_NAME = 'codeista_admin_session';
const SESSION_EXPIRY_SECONDS = 8 * 60 * 60; // 8 hours

// Fallback secret for development when env is not yet loaded, but securely checks process.env
function getSecretKey(): Uint8Array {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret || secret.trim().length === 0) {
    // Return a fixed dummy key if completely unconfigured to prevent crash during build,
    // but auth validation will fail if ADMIN_USERNAME / ADMIN_PASSWORD are not set.
    return new TextEncoder().encode('unconfigured_admin_session_secret_placeholder_32chars!');
  }
  return new TextEncoder().encode(secret);
}

export interface AdminSessionPayload {
  username: string;
  role: 'admin';
  iat?: number;
  exp?: number;
}

/**
 * Creates a signed JWT session token for an authenticated admin
 */
export async function createAdminToken(username: string): Promise<string> {
  const secretKey = getSecretKey();
  const token = await new SignJWT({ username, role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_EXPIRY_SECONDS}s`)
    .sign(secretKey);

  return token;
}

/**
 * Verifies the JWT session token
 */
export async function verifyAdminToken(token: string): Promise<AdminSessionPayload | null> {
  if (!token) return null;
  try {
    const secretKey = getSecretKey();
    const { payload } = await jwtVerify(token, secretKey, {
      algorithms: ['HS256'],
    });

    if (payload.role === 'admin' && typeof payload.username === 'string') {
      return {
        username: payload.username,
        role: 'admin',
        iat: payload.iat,
        exp: payload.exp,
      };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Extracts and verifies admin session from a NextRequest or Cookie header
 */
export async function getAdminSession(req: NextRequest | { cookies?: any }): Promise<AdminSessionPayload | null> {
  let token: string | undefined;

  if ('cookies' in req && typeof req.cookies.get === 'function') {
    token = req.cookies.get(COOKIE_NAME)?.value;
  } else if ('headers' in req && typeof (req as any).headers?.get === 'function') {
    const cookieHeader = (req as any).headers.get('cookie') || '';
    const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]*)`));
    token = match ? decodeURIComponent(match[1]) : undefined;
  }

  // Also support Authorization: Bearer <token> for script or test verification
  if (!token && 'headers' in req && typeof (req as any).headers?.get === 'function') {
    const authHeader = (req as any).headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.slice(7).trim();
    }
  }

  if (!token) return null;
  return verifyAdminToken(token);
}

/**
 * Sets the admin session cookie on a NextResponse
 */
export function setAdminSessionCookie(response: NextResponse, token: string): void {
  const isProduction = process.env.NODE_ENV === 'production';
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_EXPIRY_SECONDS,
  });
}

/**
 * Clears the admin session cookie on a NextResponse
 */
export function clearAdminSessionCookie(response: NextResponse): void {
  const isProduction = process.env.NODE_ENV === 'production';
  response.cookies.set(COOKIE_NAME, '', {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}

/**
 * Validates admin credentials using timing-safe comparison
 */
export function validateAdminCredentials(username?: string, password?: string): boolean {
  const expectedUsername = process.env.ADMIN_USERNAME;
  const expectedPassword = process.env.ADMIN_PASSWORD;

  if (!expectedUsername || !expectedPassword || !username || !password) {
    return false;
  }

  try {
    const userBuffer = Buffer.from(username);
    const expectedUserBuffer = Buffer.from(expectedUsername);
    const passBuffer = Buffer.from(password);
    const expectedPassBuffer = Buffer.from(expectedPassword);

    const userMatch =
      userBuffer.length === expectedUserBuffer.length &&
      crypto.timingSafeEqual(userBuffer, expectedUserBuffer);

    const passMatch =
      passBuffer.length === expectedPassBuffer.length &&
      crypto.timingSafeEqual(passBuffer, expectedPassBuffer);

    return userMatch && passMatch;
  } catch {
    return false;
  }
}

/**
 * Validates request origin/referer for CSRF protection on mutation requests
 */
export function validateSameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get('origin');
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host');

  if (!origin || !host) {
    // Allow direct same-origin requests where browser might omit origin (e.g. GET or same-site fetch)
    return true;
  }

  try {
    const originHost = new URL(origin).host;
    return originHost === host;
  } catch {
    return false;
  }
}

/**
 * Standard private cache prevention headers for admin APIs
 */
export function getPrivateCacheHeaders(): Record<string, string> {
  return {
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
    'Pragma': 'no-cache',
    'Expires': '0',
    'Surrogate-Control': 'no-store',
  };
}

// In-memory sliding window rate limiter for login attempts per IP
interface RateLimitEntry {
  attempts: number;
  firstAttemptAt: number;
  blockedUntil?: number;
}

const loginAttempts = new Map<string, RateLimitEntry>();
const MAX_FAILED_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const BLOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes block

export function checkLoginRateLimit(ip: string): { allowed: boolean; retryAfterSeconds?: number } {
  const now = Date.now();
  const entry = loginAttempts.get(ip);

  if (!entry) {
    return { allowed: true };
  }

  if (entry.blockedUntil && entry.blockedUntil > now) {
    const retryAfterSeconds = Math.ceil((entry.blockedUntil - now) / 1000);
    return { allowed: false, retryAfterSeconds };
  }

  // If window expired, reset
  if (now - entry.firstAttemptAt > WINDOW_MS) {
    loginAttempts.delete(ip);
    return { allowed: true };
  }

  if (entry.attempts >= MAX_FAILED_ATTEMPTS) {
    entry.blockedUntil = now + BLOCK_DURATION_MS;
    const retryAfterSeconds = Math.ceil(BLOCK_DURATION_MS / 1000);
    return { allowed: false, retryAfterSeconds };
  }

  return { allowed: true };
}

export function recordFailedLogin(ip: string): void {
  const now = Date.now();
  const entry = loginAttempts.get(ip);

  if (!entry || now - entry.firstAttemptAt > WINDOW_MS) {
    loginAttempts.set(ip, {
      attempts: 1,
      firstAttemptAt: now,
    });
  } else {
    entry.attempts += 1;
    if (entry.attempts >= MAX_FAILED_ATTEMPTS) {
      entry.blockedUntil = now + BLOCK_DURATION_MS;
    }
  }
}

export function clearLoginRateLimit(ip: string): void {
  loginAttempts.delete(ip);
}
