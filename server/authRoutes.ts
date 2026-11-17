import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import type {
  AccountStatus,
  RequestedRole,
  UserRecord,
  UserRole,
} from './types.ts';
import { AuthStore, sanitizeUser } from './authStore.ts';
import {
  buildCookieOptions,
  CSRF_COOKIE_NAME,
  generateOpaqueToken,
  hashPassword,
  parseCookies,
  safeEqual,
  SESSION_COOKIE_NAME,
  SlidingRateLimiter,
  validatePasswordStrength,
  verifyPassword,
} from './security.ts';
import {
  dispatchPasswordResetEmail,
  isSmtpConfigured,
  resolveBaseAppUrl,
} from './emailService.ts';

interface AuthenticatedRequest extends Request {
  authUser?: UserRecord;
  authSessionCsrf?: string;
}

const VALID_ROLES: UserRole[] = ['ADMINISTRATOR', 'TRANSIT_OPERATOR', 'OBSERVER'];
const ALLOWED_REGISTRATION_ROLES: RequestedRole[] = ['TRANSIT_OPERATOR', 'OBSERVER'];
const SESSION_TTL_SHORT_MS = 12 * 60 * 60 * 1000; // 12 hours
const SESSION_TTL_REMEMBER_MS = 14 * 24 * 60 * 60 * 1000; // 14 days
const PASSWORD_RESET_TTL_MS = 30 * 60 * 1000; // 30 minutes

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const SERVER_ROLE_PERMISSIONS: Record<
  UserRole,
  { pages: string[]; readOnlyPages: string[] }
> = {
  ADMINISTRATOR: {
    pages: [
      'dashboard',
      'live-monitoring',
      'crowd-analytics',
      'crowd-prediction',
      'alert-centre',
      'bus-recommendations',
      'bus-fleet',
      'reports',
      'settings',
    ],
    readOnlyPages: [],
  },
  TRANSIT_OPERATOR: {
    pages: [
      'dashboard',
      'live-monitoring',
      'crowd-analytics',
      'crowd-prediction',
      'alert-centre',
      'bus-recommendations',
      'bus-fleet',
      'reports',
    ],
    readOnlyPages: [],
  },
  OBSERVER: {
    pages: [
      'dashboard',
      'live-monitoring',
      'crowd-analytics',
      'crowd-prediction',
      'reports',
    ],
    readOnlyPages: ['live-monitoring', 'reports'],
  },
};

function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || 'unknown';
}

function resolveRequestOrigin(req: Request): string {
  const proto = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const fallback = typeof host === 'string' ? `${proto}://${host}` : undefined;
  return resolveBaseAppUrl(fallback);
}

export function createAuthRouter(store: AuthStore): express.Router {
  const router = express.Router();

  const loginLimiter = new SlidingRateLimiter(15 * 60 * 1000, 12);
  const registerLimiter = new SlidingRateLimiter(15 * 60 * 1000, 10);
  const recoveryLimiter = new SlidingRateLimiter(15 * 60 * 1000, 8);

  const attachSession = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');

    const cookies = parseCookies(req);
    const rawSession = cookies[SESSION_COOKIE_NAME];
    if (!rawSession) {
      next();
      return;
    }
    const session = store.findSessionByToken(rawSession);
    if (!session) {
      next();
      return;
    }
    const user = store.findUserById(session.userId);
    if (!user || user.status !== 'approved') {
      store.deleteSessionByToken(rawSession);
      next();
      return;
    }
    req.authUser = user;
    req.authSessionCsrf = session.csrfToken;
    next();
  };

  const requireCsrf = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const cookies = parseCookies(req);
    const cookieToken = cookies[CSRF_COOKIE_NAME];
    const headerToken = req.headers['x-csrf-token'];
    const tokenValue = typeof headerToken === 'string' ? headerToken : '';

    if (!cookieToken || !tokenValue || !safeEqual(cookieToken, tokenValue)) {
      res.status(403).json({
        error: 'Security verification failed (invalid or missing CSRF token). Please refresh and retry.',
        code: 'CSRF_INVALID',
      });
      return;
    }
    if (req.authSessionCsrf && !safeEqual(req.authSessionCsrf, tokenValue)) {
      res.status(403).json({
        error: 'Session CSRF mismatch. Please refresh your session.',
        code: 'CSRF_SESSION_MISMATCH',
      });
      return;
    }
    next();
  };

  const requireAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.authUser) {
      res.status(401).json({
        error: 'Authentication required. Please sign in.',
        code: 'UNAUTHENTICATED',
      });
      return;
    }
    next();
  };

  const requireRole =
    (...allowedRoles: UserRole[]) =>
    (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      if (!req.authUser) {
        res.status(401).json({ error: 'Authentication required.', code: 'UNAUTHENTICATED' });
        return;
      }
      if (!allowedRoles.includes(req.authUser.assignedRole)) {
        res.status(403).json({
          error: 'You do not have permission to access this resource.',
          code: 'FORBIDDEN_ROLE',
        });
        return;
      }
      next();
    };

  const requireAdmin = requireRole('ADMINISTRATOR');

  router.use('/api', attachSession);

  // Issue or return double-submit CSRF token
  router.get('/api/auth/csrf', (req: AuthenticatedRequest, res: Response) => {
    const cookies = parseCookies(req);
    const token = req.authSessionCsrf || cookies[CSRF_COOKIE_NAME] || generateOpaqueToken(24);
    res.cookie(
      CSRF_COOKIE_NAME,
      token,
      buildCookieOptions(req, { httpOnly: false, maxAgeMs: SESSION_TTL_REMEMBER_MS }),
    );
    res.json({ csrfToken: token });
  });

  // Session inspection
  router.get('/api/auth/me', (req: AuthenticatedRequest, res: Response) => {
    if (!req.authUser) {
      const cookies = parseCookies(req);
      if (cookies[SESSION_COOKIE_NAME]) {
        res.clearCookie(SESSION_COOKIE_NAME, buildCookieOptions(req, { httpOnly: true }));
      }
      res.status(200).json({
        authenticated: false,
        user: null,
      });
      return;
    }

    res.json({
      authenticated: true,
      user: sanitizeUser(req.authUser),
    });
  });

  // Server-authoritative RBAC permissions & module authorization check
  router.get(
    '/api/auth/permissions',
    requireAuth,
    (req: AuthenticatedRequest, res: Response) => {
      const role = req.authUser!.assignedRole;
      const perms = SERVER_ROLE_PERMISSIONS[role];
      res.json({
        role,
        permittedPages: perms.pages,
        readOnlyPages: perms.readOnlyPages,
      });
    },
  );

  router.get(
    '/api/auth/module-access/:moduleId',
    requireAuth,
    (req: AuthenticatedRequest, res: Response) => {
      const role = req.authUser!.assignedRole;
      const moduleId = req.params.moduleId;
      const perms = SERVER_ROLE_PERMISSIONS[role];
      if (!perms.pages.includes(moduleId)) {
        res.status(403).json({
          error: `Role ${role} is not authorized to access module "${moduleId}".`,
          code: 'FORBIDDEN_ROLE',
        });
        return;
      }
      res.json({
        allowed: true,
        readOnly: perms.readOnlyPages.includes(moduleId),
      });
    },
  );

  // Disabled OAuth routes for this local email/password build
  router.all(['/api/auth/oauth', '/api/auth/oauth/*'], (_req: Request, res: Response) => {
    res.status(404).json({
      error: 'External OAuth authentication is disabled. Use email and password sign-in.',
      code: 'OAUTH_DISABLED',
    });
  });

  // Registration -> directly enters PENDING_APPROVAL (NEVER ADMINISTRATOR)
  router.post(
    '/api/auth/register',
    requireCsrf,
    async (req: Request, res: Response) => {
      const ip = getClientIp(req);
      const limit = registerLimiter.consume(`reg:${ip}`);
      if (!limit.allowed) {
        res.status(429).json({
          error: `Too many registration attempts. Please try again in ${limit.retryAfterSeconds}s.`,
          code: 'RATE_LIMITED',
        });
        return;
      }

      const body = req.body as Record<string, unknown>;
      const fullName = typeof body.fullName === 'string' ? body.fullName.trim() : '';
      const email = typeof body.email === 'string' ? store.normalizeEmail(body.email) : '';
      const password = typeof body.password === 'string' ? body.password : '';
      const confirmPassword =
        typeof body.confirmPassword === 'string' ? body.confirmPassword : '';
      const requestedRole = typeof body.requestedRole === 'string' ? body.requestedRole : '';
      const acceptedTerms = body.acceptedTerms === true;

      if (fullName.length < 2 || fullName.length > 100) {
        res.status(400).json({ error: 'Full name must be between 2 and 100 characters.' });
        return;
      }
      if (!EMAIL_REGEX.test(email)) {
        res.status(400).json({ error: 'Please enter a valid email address.' });
        return;
      }
      if (!ALLOWED_REGISTRATION_ROLES.includes(requestedRole as RequestedRole)) {
        res.status(400).json({
          error: 'Requested role must be either TRANSIT_OPERATOR or OBSERVER.',
          code: 'INVALID_REQUESTED_ROLE',
        });
        return;
      }
      if (!acceptedTerms) {
        res.status(400).json({
          error: 'You must agree to the Terms of Service and Privacy Policy.',
        });
        return;
      }
      if (password !== confirmPassword) {
        res.status(400).json({ error: 'Passwords do not match.' });
        return;
      }
      const strength = validatePasswordStrength(password);
      if (!strength.valid) {
        res.status(400).json({
          error: strength.errors[0] || 'Password does not meet complexity requirements.',
          details: strength.errors,
        });
        return;
      }

      if (store.findUserByEmail(email)) {
        res.status(409).json({
          error: 'An account with this email address is already registered.',
          code: 'EMAIL_EXISTS',
        });
        return;
      }

      const passwordHash = await hashPassword(password);
      const user = store.createUser({
        fullName,
        email,
        passwordHash,
        provider: 'local',
        requestedRole: requestedRole as RequestedRole,
        assignedRole: requestedRole as RequestedRole,
        status: 'pending_approval',
        emailVerified: false,
      });

      res.status(201).json({
        message:
          'Your account registration has been submitted successfully. Your account is awaiting administrator approval.',
        user: sanitizeUser(user),
      });
    },
  );

  // Local password login (with explicit status checking for pending/rejected/suspended)
  router.post('/api/auth/login', requireCsrf, async (req: Request, res: Response) => {
    const ip = getClientIp(req);
    const body = req.body as Record<string, unknown>;
    const email = typeof body.email === 'string' ? store.normalizeEmail(body.email) : '';
    const password = typeof body.password === 'string' ? body.password : '';
    const rememberMe = body.rememberMe === true;

    const rateKey = `login:${ip}:${email}`;
    const limit = loginLimiter.consume(rateKey);
    if (!limit.allowed) {
      res.status(429).json({
        error: `Too many sign-in attempts. Please wait ${limit.retryAfterSeconds} seconds before trying again.`,
        code: 'RATE_LIMITED',
      });
      return;
    }

    if (!EMAIL_REGEX.test(email) || !password) {
      res.status(400).json({ error: 'Email address and password are required.' });
      return;
    }

    const user = store.findUserByEmail(email);
    if (!user || !user.passwordHash) {
      res.status(401).json({
        error: 'Invalid email or password. Please check your credentials or create an account.',
        code: 'INVALID_CREDENTIALS',
      });
      return;
    }

    const passwordMatches = await verifyPassword(password, user.passwordHash);
    if (!passwordMatches) {
      res.status(401).json({
        error: 'Invalid email or password. Please check your credentials or create an account.',
        code: 'INVALID_CREDENTIALS',
      });
      return;
    }

    // Credentials are valid — enforce admin approval & account status cleanly
    if (user.status === 'pending_approval' || user.status === 'email_verification_pending') {
      res.status(403).json({
        error:
          'Your account is awaiting administrator approval. You will be able to access the system after your account has been approved.',
        code: 'PENDING_APPROVAL',
        user: sanitizeUser(user),
      });
      return;
    }
    if (user.status === 'rejected') {
      res.status(403).json({
        error: 'Your access request was declined by an administrator.',
        code: 'ACCOUNT_REJECTED',
        reason: user.rejectionReason,
        user: sanitizeUser(user),
      });
      return;
    }
    if (user.status === 'suspended') {
      res.status(403).json({
        error: 'This account has been suspended by an administrator.',
        code: 'ACCOUNT_SUSPENDED',
        reason: user.rejectionReason,
        user: sanitizeUser(user),
      });
      return;
    }

    loginLimiter.reset(rateKey);

    const rawSessionToken = generateOpaqueToken(32);
    const csrfToken = generateOpaqueToken(24);
    const ttlMs = rememberMe ? SESSION_TTL_REMEMBER_MS : SESSION_TTL_SHORT_MS;

    store.createSession({
      rawToken: rawSessionToken,
      userId: user.id,
      csrfToken,
      rememberMe,
      ttlMs,
      userAgent: req.headers['user-agent'] || 'unknown',
      ip,
    });

    const updatedUser =
      store.updateUser(user.id, (u) => ({
        ...u,
        lastLoginAt: new Date().toISOString(),
      })) || user;

    res.cookie(
      SESSION_COOKIE_NAME,
      rawSessionToken,
      buildCookieOptions(req, { httpOnly: true, maxAgeMs: rememberMe ? ttlMs : undefined }),
    );
    res.cookie(
      CSRF_COOKIE_NAME,
      csrfToken,
      buildCookieOptions(req, { httpOnly: false, maxAgeMs: ttlMs }),
    );

    res.json({
      user: sanitizeUser(updatedUser),
      csrfToken,
    });
  });

  // Logout
  router.post('/api/auth/logout', requireCsrf, (req: AuthenticatedRequest, res: Response) => {
    const cookies = parseCookies(req);
    const rawSession = cookies[SESSION_COOKIE_NAME];
    if (rawSession) {
      store.deleteSessionByToken(rawSession);
    }
    res.clearCookie(SESSION_COOKIE_NAME, buildCookieOptions(req, { httpOnly: true }));
    const freshCsrf = generateOpaqueToken(24);
    res.cookie(
      CSRF_COOKIE_NAME,
      freshCsrf,
      buildCookieOptions(req, { httpOnly: false, maxAgeMs: SESSION_TTL_SHORT_MS }),
    );
    res.json({ loggedOut: true, csrfToken: freshCsrf });
  });

  // Forgot Password
  router.post(
    '/api/auth/forgot-password',
    requireCsrf,
    async (req: Request, res: Response) => {
      const ip = getClientIp(req);
      const body = req.body as Record<string, unknown>;
      const email = typeof body.email === 'string' ? store.normalizeEmail(body.email) : '';

      const limit = recoveryLimiter.consume(`forgot:${ip}`);
      if (!limit.allowed) {
        res.status(429).json({
          error: `Too many password reset requests. Please try again in ${limit.retryAfterSeconds}s.`,
          code: 'RATE_LIMITED',
        });
        return;
      }

      if (!EMAIL_REGEX.test(email)) {
        res.status(400).json({ error: 'Please enter a valid email address.' });
        return;
      }

      const user = store.findUserByEmail(email);
      let previewResetToken: string | undefined;
      let deliveryMode: 'smtp' | 'unconfigured-preview' = isSmtpConfigured()
        ? 'smtp'
        : 'unconfigured-preview';

      if (user && user.status !== 'rejected' && user.status !== 'suspended') {
        const rawToken = generateOpaqueToken(32);
        store.createAuthToken({
          userId: user.id,
          type: 'password_reset',
          rawToken,
          ttlMs: PASSWORD_RESET_TTL_MS,
        });
        const delivery = await dispatchPasswordResetEmail({
          toEmail: user.email,
          fullName: user.fullName,
          token: rawToken,
          baseUrl: resolveRequestOrigin(req),
        });
        deliveryMode = delivery.mode;
        if (!isSmtpConfigured()) {
          previewResetToken = rawToken;
        }
      }

      res.json({
        message:
          'If an eligible account is registered with that email address, password reset instructions have been issued.',
        deliveryMode,
        ...(previewResetToken ? { previewResetToken } : {}),
      });
    },
  );

  // Reset Password -> consumes token, updates hash, revokes all active sessions
  router.post(
    '/api/auth/reset-password',
    requireCsrf,
    async (req: Request, res: Response) => {
      const body = req.body as Record<string, unknown>;
      const token = typeof body.token === 'string' ? body.token.trim() : '';
      const password = typeof body.password === 'string' ? body.password : '';
      const confirmPassword =
        typeof body.confirmPassword === 'string' ? body.confirmPassword : '';

      if (!token) {
        res.status(400).json({ error: 'Reset token is required.' });
        return;
      }
      if (password !== confirmPassword) {
        res.status(400).json({ error: 'Passwords do not match.' });
        return;
      }
      const strength = validatePasswordStrength(password);
      if (!strength.valid) {
        res.status(400).json({
          error: strength.errors[0] || 'Password does not meet complexity requirements.',
          details: strength.errors,
        });
        return;
      }

      const tokenRecord = store.consumeAuthToken(token, 'password_reset');
      if (!tokenRecord) {
        res.status(400).json({
          error: 'This password reset link or token is invalid or has expired.',
          code: 'TOKEN_INVALID',
        });
        return;
      }

      const newHash = await hashPassword(password);
      const updated = store.updateUser(tokenRecord.userId, (user) => ({
        ...user,
        passwordHash: newHash,
        emailVerified: true,
      }));
      if (!updated) {
        res.status(404).json({ error: 'Account not found.' });
        return;
      }

      store.revokeUserSessions(updated.id);

      res.json({
        message: 'Your password has been updated. All active sessions were revoked.',
      });
    },
  );

  // --------------------------------------------------------------------------
  // Admin User Management APIs (ADMINISTRATOR only)
  // --------------------------------------------------------------------------
  router.get(
    '/api/admin/users',
    requireAuth,
    requireAdmin,
    (req: AuthenticatedRequest, res: Response) => {
      const statusQuery = typeof req.query.status === 'string' ? req.query.status : 'all';
      const validStatuses: Array<'all' | AccountStatus> = [
        'all',
        'email_verification_pending',
        'pending_approval',
        'approved',
        'rejected',
        'suspended',
      ];
      const filter = validStatuses.includes(statusQuery as 'all' | AccountStatus)
        ? (statusQuery as 'all' | AccountStatus)
        : 'all';

      const users = store.listUsers(filter).map(sanitizeUser);
      const counts = store.countUsersByStatus();
      res.json({ users, counts });
    },
  );

  router.patch(
    '/api/admin/users/:id/approval',
    requireAuth,
    requireAdmin,
    requireCsrf,
    (req: AuthenticatedRequest, res: Response) => {
      const targetId = req.params.id;
      const body = req.body as Record<string, unknown>;
      const decision = body.decision;
      const assignedRole = body.assignedRole;
      const reason = typeof body.reason === 'string' ? body.reason.trim() : null;

      if (decision !== 'approve' && decision !== 'reject') {
        res.status(400).json({ error: 'Decision must be approve or reject.' });
        return;
      }

      const target = store.findUserById(targetId);
      if (!target) {
        res.status(404).json({ error: 'User not found.' });
        return;
      }
      if (target.id === req.authUser!.id && decision === 'reject') {
        res.status(400).json({ error: 'You cannot reject your own administrator account.' });
        return;
      }

      if (decision === 'approve') {
        const nextRole: UserRole = VALID_ROLES.includes(assignedRole as UserRole)
          ? (assignedRole as UserRole)
          : target.requestedRole;

        const updated = store.updateUser(target.id, (u) => ({
          ...u,
          status: 'approved',
          assignedRole: nextRole,
          emailVerified: true,
          rejectionReason: null,
          approvedAt: new Date().toISOString(),
          approvedBy: req.authUser!.id,
        }));
        res.json({ user: sanitizeUser(updated!) });
        return;
      }

      if (
        target.assignedRole === 'ADMINISTRATOR' &&
        target.status === 'approved' &&
        store.countApprovedAdmins() <= 1
      ) {
        res.status(400).json({
          error: 'Cannot reject the last remaining approved Administrator.',
        });
        return;
      }

      store.revokeUserSessions(target.id);
      const updated = store.updateUser(target.id, (u) => ({
        ...u,
        status: 'rejected',
        rejectionReason: reason || 'Access request declined by administrator.',
      }));
      res.json({ user: sanitizeUser(updated!) });
    },
  );

  router.patch(
    '/api/admin/users/:id/role',
    requireAuth,
    requireAdmin,
    requireCsrf,
    (req: AuthenticatedRequest, res: Response) => {
      const targetId = req.params.id;
      const body = req.body as Record<string, unknown>;
      const assignedRole = body.assignedRole;

      if (!VALID_ROLES.includes(assignedRole as UserRole)) {
        res.status(400).json({ error: 'Invalid role specified.' });
        return;
      }

      const target = store.findUserById(targetId);
      if (!target) {
        res.status(404).json({ error: 'User not found.' });
        return;
      }

      if (
        target.assignedRole === 'ADMINISTRATOR' &&
        assignedRole !== 'ADMINISTRATOR' &&
        target.status === 'approved' &&
        store.countApprovedAdmins() <= 1
      ) {
        res.status(400).json({
          error: 'At least one approved Administrator account must remain active.',
        });
        return;
      }

      const updated = store.updateUser(target.id, (u) => ({
        ...u,
        assignedRole: assignedRole as UserRole,
      }));
      res.json({ user: sanitizeUser(updated!) });
    },
  );

  router.patch(
    '/api/admin/users/:id/status',
    requireAuth,
    requireAdmin,
    requireCsrf,
    (req: AuthenticatedRequest, res: Response) => {
      const targetId = req.params.id;
      const body = req.body as Record<string, unknown>;
      const action = body.action;
      const reason = typeof body.reason === 'string' ? body.reason.trim() : null;

      if (action !== 'suspend' && action !== 'reactivate') {
        res.status(400).json({ error: 'Action must be suspend or reactivate.' });
        return;
      }

      const target = store.findUserById(targetId);
      if (!target) {
        res.status(404).json({ error: 'User not found.' });
        return;
      }
      if (target.id === req.authUser!.id && action === 'suspend') {
        res.status(400).json({ error: 'You cannot suspend your own active session.' });
        return;
      }

      if (action === 'suspend') {
        if (
          target.assignedRole === 'ADMINISTRATOR' &&
          target.status === 'approved' &&
          store.countApprovedAdmins() <= 1
        ) {
          res.status(400).json({
            error: 'Cannot suspend the last remaining approved Administrator.',
          });
          return;
        }
        store.revokeUserSessions(target.id);
        const updated = store.updateUser(target.id, (u) => ({
          ...u,
          status: 'suspended',
          rejectionReason: reason || 'Account suspended by administrator.',
        }));
        res.json({ user: sanitizeUser(updated!) });
        return;
      }

      if (target.status !== 'suspended') {
        res.status(400).json({
          error: 'Only suspended accounts can be reactivated.',
        });
        return;
      }

      const updated = store.updateUser(target.id, (u) => ({
        ...u,
        status: 'approved',
        rejectionReason: null,
        approvedAt: u.approvedAt ?? new Date().toISOString(),
        approvedBy: req.authUser!.id,
      }));
      res.json({ user: sanitizeUser(updated!) });
    },
  );

  return router;
}
