import type { PageId } from '../types/transit';
import {
  type AccountStatus,
  type AuthUser,
  type RequestedRole,
  ROLE_PAGE_ACCESS,
  ROLE_READ_ONLY_PAGES,
  type UserRole,
} from '../types/auth';

let cachedCsrfToken: string | null = null;

export class ApiError extends Error {
  status: number;
  code?: string;
  user?: AuthUser;
  reason?: string | null;
  details?: string[];

  constructor(
    message: string,
    status: number,
    extra?: {
      code?: string;
      user?: AuthUser;
      reason?: string | null;
      details?: string[];
    },
  ) {
    super(message);
    this.status = status;
    this.code = extra?.code;
    this.user = extra?.user;
    this.reason = extra?.reason;
    this.details = extra?.details;
  }
}

export function canAccessPage(role: UserRole | undefined | null, pageId: PageId): boolean {
  if (!role) return false;
  return ROLE_PAGE_ACCESS[role]?.includes(pageId) ?? false;
}

export function isPageReadOnly(role: UserRole | undefined | null, pageId: PageId): boolean {
  if (!role) return true;
  return ROLE_READ_ONLY_PAGES[role]?.includes(pageId) ?? false;
}

export function getDefaultPageForRole(_role: UserRole): PageId {
  return 'dashboard';
}

export function canOperateDispatchAndAlerts(role: UserRole | undefined | null): boolean {
  return role === 'ADMINISTRATOR' || role === 'TRANSIT_OPERATOR';
}

export function canManageUsers(role: UserRole | undefined | null): boolean {
  return role === 'ADMINISTRATOR';
}

export interface PasswordStrengthFeedback {
  valid: boolean;
  score: number;
  label: 'Weak' | 'Fair' | 'Good' | 'Strong';
  checks: Array<{ label: string; passed: boolean }>;
}

export function evaluatePasswordStrength(password: string): PasswordStrengthFeedback {
  const checks = [
    { label: 'At least 10 characters', passed: password.length >= 10 },
    { label: 'One uppercase letter (A-Z)', passed: /[A-Z]/.test(password) },
    { label: 'One lowercase letter (a-z)', passed: /[a-z]/.test(password) },
    { label: 'One number (0-9)', passed: /[0-9]/.test(password) },
    { label: 'One special character (!@#$...)', passed: /[^A-Za-z0-9]/.test(password) },
  ];

  let score = 0;
  if (password.length >= 10) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  const label =
    score <= 1 ? 'Weak' : score === 2 ? 'Fair' : score === 3 ? 'Good' : 'Strong';

  return {
    valid: checks.every((c) => c.passed),
    score,
    label,
    checks,
  };
}

async function ensureCsrfToken(forceRefresh = false): Promise<string> {
  if (cachedCsrfToken && !forceRefresh) {
    return cachedCsrfToken;
  }
  const resp = await fetch('/api/auth/csrf', {
    method: 'GET',
    credentials: 'include',
  });
  if (!resp.ok) {
    throw new ApiError('Unable to initialize security session.', resp.status);
  }
  const data = (await resp.json()) as { csrfToken: string };
  cachedCsrfToken = data.csrfToken;
  return data.csrfToken;
}

async function apiRequest<T>(
  url: string,
  options: RequestInit & { requireCsrf?: boolean } = {},
): Promise<T> {
  const method = (options.method || 'GET').toUpperCase();
  const needsCsrf = options.requireCsrf ?? method !== 'GET';

  const headers = new Headers(options.headers || {});
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (needsCsrf) {
    const csrf = await ensureCsrfToken();
    headers.set('X-CSRF-Token', csrf);
  }

  let response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });

  // Auto-refresh CSRF once if cookie/token rotated
  if (response.status === 403 && needsCsrf) {
    const cloned = response.clone();
    try {
      const errBody = (await cloned.json()) as { code?: string };
      if (errBody.code === 'CSRF_INVALID' || errBody.code === 'CSRF_SESSION_MISMATCH') {
        const fresh = await ensureCsrfToken(true);
        headers.set('X-CSRF-Token', fresh);
        response = await fetch(url, {
          ...options,
          headers,
          credentials: 'include',
        });
      }
    } catch {
      // ignore json parse failure
    }
  }

  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) {
    throw new ApiError(
      typeof payload.error === 'string' ? payload.error : 'Request failed.',
      response.status,
      {
        code: typeof payload.code === 'string' ? payload.code : undefined,
        user: payload.user as AuthUser | undefined,
        reason: (payload.reason as string | null | undefined) ?? undefined,
        details: Array.isArray(payload.details) ? (payload.details as string[]) : undefined,
      },
    );
  }

  if (typeof payload.csrfToken === 'string') {
    cachedCsrfToken = payload.csrfToken;
  }

  return payload as T;
}

export async function fetchCurrentSession(): Promise<{
  authenticated: boolean;
  user: AuthUser | null;
}> {
  try {
    const res = await apiRequest<{ authenticated: boolean; user: AuthUser | null }>(
      '/api/auth/me',
      { method: 'GET', requireCsrf: false },
    );
    return res;
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      return { authenticated: false, user: null };
    }
    return { authenticated: false, user: null };
  }
}

export async function verifyModuleAccess(moduleId: PageId): Promise<{
  allowed: boolean;
  readOnly: boolean;
}> {
  return apiRequest(`/api/auth/module-access/${encodeURIComponent(moduleId)}`, {
    method: 'GET',
    requireCsrf: false,
  });
}

export async function loginWithPassword(input: {
  email: string;
  password: string;
  rememberMe: boolean;
}): Promise<{ user: AuthUser }> {
  return apiRequest<{ user: AuthUser }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function registerAccount(input: {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  requestedRole: RequestedRole;
  acceptedTerms: boolean;
}): Promise<{
  message: string;
  user: AuthUser;
}> {
  return apiRequest('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function requestPasswordReset(email: string): Promise<{
  message: string;
  deliveryMode: 'smtp' | 'unconfigured-preview';
  previewResetToken?: string;
}> {
  return apiRequest('/api/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function resetPasswordWithToken(input: {
  token: string;
  password: string;
  confirmPassword: string;
}): Promise<{ message: string }> {
  return apiRequest('/api/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function logoutSession(): Promise<void> {
  await apiRequest('/api/auth/logout', { method: 'POST', body: JSON.stringify({}) });
  cachedCsrfToken = null;
}

export async function fetchAdminUsers(
  status: 'all' | AccountStatus = 'all',
): Promise<{
  users: AuthUser[];
  counts: Record<'all' | AccountStatus, number>;
}> {
  return apiRequest(`/api/admin/users?status=${encodeURIComponent(status)}`, {
    method: 'GET',
    requireCsrf: false,
  });
}

export async function submitUserApproval(
  userId: string,
  payload: {
    decision: 'approve' | 'reject';
    assignedRole?: UserRole;
    reason?: string;
  },
): Promise<{ user: AuthUser }> {
  return apiRequest(`/api/admin/users/${encodeURIComponent(userId)}/approval`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function updateAdminUserRole(
  userId: string,
  assignedRole: UserRole,
): Promise<{ user: AuthUser }> {
  return apiRequest(`/api/admin/users/${encodeURIComponent(userId)}/role`, {
    method: 'PATCH',
    body: JSON.stringify({ assignedRole }),
  });
}

export async function updateAdminUserStatus(
  userId: string,
  action: 'suspend' | 'reactivate',
  reason?: string,
): Promise<{ user: AuthUser }> {
  return apiRequest(`/api/admin/users/${encodeURIComponent(userId)}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ action, reason }),
  });
}
