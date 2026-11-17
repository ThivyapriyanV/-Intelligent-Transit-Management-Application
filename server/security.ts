import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import type { CookieOptions, Request } from 'express';

const BCRYPT_ROUNDS = 12;

export const SESSION_COOKIE_NAME = 'itms_session';
export const CSRF_COOKIE_NAME = 'itms_csrf';

export interface PasswordValidationResult {
  valid: boolean;
  score: number; // 0 to 4
  label: 'Weak' | 'Fair' | 'Good' | 'Strong';
  errors: string[];
}

export function validatePasswordStrength(password: string): PasswordValidationResult {
  const errors: string[] = [];
  if (password.length < 10) {
    errors.push('Must be at least 10 characters long');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Must contain at least one uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Must contain at least one lowercase letter');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Must contain at least one number');
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push('Must contain at least one special character');
  }

  let score = 0;
  if (password.length >= 10) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  const label =
    score <= 1 ? 'Weak' : score === 2 ? 'Fair' : score === 3 ? 'Good' : 'Strong';

  return {
    valid: errors.length === 0,
    score,
    label,
    errors,
  };
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (!hash) {
    return false;
  }
  return bcrypt.compare(password, hash);
}

export function generateOpaqueToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('base64url');
}

export function hashOpaqueToken(token: string): string {
  const secret = process.env.SESSION_SECRET || 'itms-local-ephemeral-pepper';
  return crypto.createHmac('sha256', secret).update(token).digest('hex');
}

export function generatePkcePair(): { codeVerifier: string; codeChallenge: string } {
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
  return { codeVerifier, codeChallenge };
}

export function isHttpsRequest(req: Request): boolean {
  if (req.secure) {
    return true;
  }
  const forwardedProto = req.headers['x-forwarded-proto'];
  if (typeof forwardedProto === 'string') {
    return forwardedProto.split(',')[0].trim().toLowerCase() === 'https';
  }
  return false;
}

export function buildCookieOptions(
  req: Request,
  options: { httpOnly: boolean; maxAgeMs?: number },
): CookieOptions {
  const secureContext = isHttpsRequest(req);
  return {
    httpOnly: options.httpOnly,
    secure: secureContext,
    sameSite: secureContext ? 'none' : 'lax',
    path: '/',
    ...(options.maxAgeMs !== undefined ? { maxAge: options.maxAgeMs } : {}),
  };
}

export function parseCookies(req: Request): Record<string, string> {
  const raw = req.headers.cookie;
  if (!raw) {
    return {};
  }
  const result: Record<string, string> = {};
  for (const part of raw.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    if (key) {
      try {
        result[key] = decodeURIComponent(val);
      } catch {
        result[key] = val;
      }
    }
  }
  return result;
}

export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

interface RateBucket {
  count: number;
  resetAt: number;
}

export class SlidingRateLimiter {
  private buckets = new Map<string, RateBucket>();

  constructor(
    private readonly windowMs: number,
    private readonly maxAttempts: number,
  ) {}

  consume(key: string): { allowed: boolean; retryAfterSeconds: number; remaining: number } {
    const now = Date.now();
    const existing = this.buckets.get(key);

    if (!existing || existing.resetAt <= now) {
      this.buckets.set(key, { count: 1, resetAt: now + this.windowMs });
      return {
        allowed: true,
        retryAfterSeconds: 0,
        remaining: Math.max(0, this.maxAttempts - 1),
      };
    }

    if (existing.count >= this.maxAttempts) {
      return {
        allowed: false,
        retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
        remaining: 0,
      };
    }

    existing.count += 1;
    return {
      allowed: true,
      retryAfterSeconds: 0,
      remaining: Math.max(0, this.maxAttempts - existing.count),
    };
  }

  reset(key: string): void {
    this.buckets.delete(key);
  }
}
