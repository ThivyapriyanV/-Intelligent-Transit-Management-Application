import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import type {
  AccountStatus,
  AuthProvider,
  AuthStoreData,
  AuthTokenRecord,
  PublicUser,
  RequestedRole,
  SessionRecord,
  UserRecord,
  UserRole,
} from './types.ts';
import { hashOpaqueToken, hashPassword, validatePasswordStrength } from './security.ts';

const EMPTY_STORE: AuthStoreData = {
  users: [],
  sessions: [],
  tokens: [],
};

const DEFAULT_ADMIN_EMAIL = 'admin@gmail.com';

function migrateRole(role: string | undefined): UserRole {
  if (role === 'ADMINISTRATOR' || role === 'TRANSIT_OPERATOR' || role === 'OBSERVER') {
    return role;
  }
  if (role === 'ANALYST') {
    return 'OBSERVER';
  }
  return 'TRANSIT_OPERATOR';
}

function migrateRequestedRole(role: string | undefined): RequestedRole {
  if (role === 'OBSERVER' || role === 'ANALYST') {
    return 'OBSERVER';
  }
  return 'TRANSIT_OPERATOR';
}

export function sanitizeUser(user: UserRecord): PublicUser {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    provider: user.provider,
    requestedRole: user.requestedRole,
    assignedRole: user.assignedRole,
    status: user.status,
    rejectionReason: user.rejectionReason,
    emailVerified: user.emailVerified,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    approvedAt: user.approvedAt,
    lastLoginAt: user.lastLoginAt,
  };
}

export class AuthStore {
  private readonly filePath: string;

  constructor(customPath?: string) {
    this.filePath =
      customPath ||
      process.env.AUTH_STORE_PATH ||
      path.resolve(process.cwd(), '.data', 'auth-store.json');
  }

  private ensureDir(): void {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  private readStore(): AuthStoreData {
    this.ensureDir();
    if (!fs.existsSync(this.filePath)) {
      this.writeStore(EMPTY_STORE);
      return structuredClone(EMPTY_STORE);
    }
    try {
      const raw = fs.readFileSync(this.filePath, 'utf8');
      const parsed = JSON.parse(raw) as {
        users?: Array<Record<string, unknown>>;
        sessions?: SessionRecord[];
        tokens?: AuthTokenRecord[];
      };

      let migrated = false;
      const users: UserRecord[] = Array.isArray(parsed.users)
        ? parsed.users.map((rawUser) => {
            const nextAssigned = migrateRole(rawUser.assignedRole as string | undefined);
            const nextRequested = migrateRequestedRole(
              rawUser.requestedRole as string | undefined,
            );
            if (
              rawUser.assignedRole !== nextAssigned ||
              rawUser.requestedRole !== nextRequested ||
              rawUser.provider !== 'local'
            ) {
              migrated = true;
            }
            return {
              id: String(rawUser.id),
              fullName: String(rawUser.fullName ?? ''),
              email: String(rawUser.email ?? ''),
              passwordHash:
                typeof rawUser.passwordHash === 'string' ? rawUser.passwordHash : null,
              provider: 'local',
              providerSubject: null,
              requestedRole: nextRequested,
              assignedRole: nextAssigned,
              status: (rawUser.status as AccountStatus) || 'pending_approval',
              rejectionReason:
                typeof rawUser.rejectionReason === 'string'
                  ? rawUser.rejectionReason
                  : null,
              emailVerified: Boolean(rawUser.emailVerified),
              createdAt: String(rawUser.createdAt ?? new Date().toISOString()),
              updatedAt: String(rawUser.updatedAt ?? new Date().toISOString()),
              approvedAt:
                typeof rawUser.approvedAt === 'string' ? rawUser.approvedAt : null,
              approvedBy:
                typeof rawUser.approvedBy === 'string' ? rawUser.approvedBy : null,
              lastLoginAt:
                typeof rawUser.lastLoginAt === 'string' ? rawUser.lastLoginAt : null,
            };
          })
        : [];

      const storeData: AuthStoreData = {
        users,
        sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
        tokens: Array.isArray(parsed.tokens) ? parsed.tokens : [],
      };

      if (migrated) {
        this.writeStore(storeData);
      }

      return storeData;
    } catch {
      return structuredClone(EMPTY_STORE);
    }
  }

  private writeStore(data: AuthStoreData): void {
    this.ensureDir();
    const now = Date.now();
    const cleaned: AuthStoreData = {
      users: data.users,
      sessions: data.sessions.filter((s) => new Date(s.expiresAt).getTime() > now),
      tokens: data.tokens.filter(
        (t) => !t.usedAt && new Date(t.expiresAt).getTime() > now,
      ),
    };
    const tmpPath = `${this.filePath}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(cleaned, null, 2), 'utf8');
    fs.renameSync(tmpPath, this.filePath);
  }

  normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  findUserByEmail(email: string): UserRecord | undefined {
    const norm = this.normalizeEmail(email);
    return this.readStore().users.find((u) => u.email === norm);
  }

  findUserById(id: string): UserRecord | undefined {
    return this.readStore().users.find((u) => u.id === id);
  }

  listUsers(statusFilter?: AccountStatus | 'all'): UserRecord[] {
    const users = this.readStore().users;
    const sorted = [...users].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    if (!statusFilter || statusFilter === 'all') {
      return sorted;
    }
    return sorted.filter((u) => u.status === statusFilter);
  }

  countUsersByStatus(): Record<'all' | AccountStatus, number> {
    const users = this.readStore().users;
    const counts: Record<'all' | AccountStatus, number> = {
      all: users.length,
      email_verification_pending: 0,
      pending_approval: 0,
      approved: 0,
      rejected: 0,
      suspended: 0,
    };
    for (const user of users) {
      counts[user.status] += 1;
    }
    return counts;
  }

  createUser(input: {
    fullName: string;
    email: string;
    passwordHash: string | null;
    provider: AuthProvider;
    providerSubject?: string | null;
    requestedRole: RequestedRole;
    assignedRole?: UserRole;
    status: AccountStatus;
    emailVerified: boolean;
    approvedBy?: string | null;
  }): UserRecord {
    const data = this.readStore();
    const normEmail = this.normalizeEmail(input.email);
    if (data.users.some((u) => u.email === normEmail)) {
      throw new Error('EMAIL_ALREADY_EXISTS');
    }

    const nowIso = new Date().toISOString();
    const record: UserRecord = {
      id: crypto.randomUUID(),
      fullName: input.fullName.trim(),
      email: normEmail,
      passwordHash: input.passwordHash,
      provider: input.provider,
      providerSubject: input.providerSubject ?? null,
      requestedRole: input.requestedRole,
      assignedRole: input.assignedRole ?? input.requestedRole,
      status: input.status,
      rejectionReason: null,
      emailVerified: input.emailVerified,
      createdAt: nowIso,
      updatedAt: nowIso,
      approvedAt: input.status === 'approved' ? nowIso : null,
      approvedBy: input.status === 'approved' ? (input.approvedBy ?? null) : null,
      lastLoginAt: null,
    };

    data.users.push(record);
    this.writeStore(data);
    return record;
  }

  updateUser(userId: string, updater: (user: UserRecord) => UserRecord): UserRecord | null {
    const data = this.readStore();
    const idx = data.users.findIndex((u) => u.id === userId);
    if (idx === -1) {
      return null;
    }
    const updated = updater({ ...data.users[idx] });
    updated.updatedAt = new Date().toISOString();
    data.users[idx] = updated;
    this.writeStore(data);
    return updated;
  }

  countApprovedAdmins(): number {
    return this.readStore().users.filter(
      (u) => u.assignedRole === 'ADMINISTRATOR' && u.status === 'approved',
    ).length;
  }

  findAnyAdmin(): UserRecord | undefined {
    return this.readStore().users.find((u) => u.assignedRole === 'ADMINISTRATOR');
  }

  createSession(input: {
    rawToken: string;
    userId: string;
    csrfToken: string;
    rememberMe: boolean;
    ttlMs: number;
    userAgent: string;
    ip: string;
  }): SessionRecord {
    const data = this.readStore();
    const now = Date.now();
    const record: SessionRecord = {
      id: crypto.randomUUID(),
      tokenHash: hashOpaqueToken(input.rawToken),
      userId: input.userId,
      csrfToken: input.csrfToken,
      rememberMe: input.rememberMe,
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(now + input.ttlMs).toISOString(),
      userAgent: input.userAgent,
      ip: input.ip,
    };
    data.sessions.push(record);
    this.writeStore(data);
    return record;
  }

  findSessionByToken(rawToken: string): SessionRecord | undefined {
    if (!rawToken) return undefined;
    const tokenHash = hashOpaqueToken(rawToken);
    const now = Date.now();
    return this.readStore().sessions.find(
      (s) => s.tokenHash === tokenHash && new Date(s.expiresAt).getTime() > now,
    );
  }

  deleteSessionByToken(rawToken: string): void {
    if (!rawToken) return;
    const tokenHash = hashOpaqueToken(rawToken);
    const data = this.readStore();
    data.sessions = data.sessions.filter((s) => s.tokenHash !== tokenHash);
    this.writeStore(data);
  }

  revokeUserSessions(userId: string): void {
    const data = this.readStore();
    data.sessions = data.sessions.filter((s) => s.userId !== userId);
    this.writeStore(data);
  }

  createAuthToken(input: {
    userId: string;
    type: AuthTokenRecord['type'];
    rawToken: string;
    ttlMs: number;
  }): AuthTokenRecord {
    const data = this.readStore();
    const now = Date.now();
    data.tokens = data.tokens.filter(
      (t) => !(t.userId === input.userId && t.type === input.type),
    );
    const record: AuthTokenRecord = {
      id: crypto.randomUUID(),
      userId: input.userId,
      type: input.type,
      tokenHash: hashOpaqueToken(input.rawToken),
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(now + input.ttlMs).toISOString(),
      usedAt: null,
    };
    data.tokens.push(record);
    this.writeStore(data);
    return record;
  }

  consumeAuthToken(
    rawToken: string,
    type: AuthTokenRecord['type'],
  ): AuthTokenRecord | null {
    if (!rawToken) return null;
    const tokenHash = hashOpaqueToken(rawToken);
    const data = this.readStore();
    const now = Date.now();
    const idx = data.tokens.findIndex(
      (t) =>
        t.tokenHash === tokenHash &&
        t.type === type &&
        !t.usedAt &&
        new Date(t.expiresAt).getTime() > now,
    );
    if (idx === -1) {
      return null;
    }
    const token = { ...data.tokens[idx], usedAt: new Date(now).toISOString() };
    data.tokens[idx] = token;
    this.writeStore(data);
    return token;
  }

  async ensureBootstrapAdmin(): Promise<void> {
    const email = this.normalizeEmail(
      process.env.ADMIN_BOOTSTRAP_EMAIL?.trim() || DEFAULT_ADMIN_EMAIL,
    );
    const password = process.env.ADMIN_BOOTSTRAP_PASSWORD;
    const fullName =
      process.env.ADMIN_BOOTSTRAP_NAME?.trim() || 'Transit System Administrator';

    if (password) {
      const check = validatePasswordStrength(password);
      if (!check.valid) {
        console.warn(
          '[AUTH BOOTSTRAP] ADMIN_BOOTSTRAP_PASSWORD does not meet strength requirements; skipping bootstrap.',
        );
        return;
      }

      const existing = this.findUserByEmail(email);
      const existingAdmin = this.findAnyAdmin();

      // Prevent duplicate administrator creation if a different admin already exists
      if (!existing && existingAdmin) {
        console.info(
          `[AUTH BOOTSTRAP] Administrator account already exists (${existingAdmin.email}); skipping duplicate administrator creation.`,
        );
        return;
      }

      const passwordHash = await hashPassword(password);
      if (!existing) {
        this.createUser({
          fullName,
          email,
          passwordHash,
          provider: 'local',
          requestedRole: 'TRANSIT_OPERATOR',
          assignedRole: 'ADMINISTRATOR',
          status: 'approved',
          emailVerified: true,
          approvedBy: 'system-bootstrap',
        });
        console.info(`[AUTH BOOTSTRAP] Provisioned initial Administrator: ${email}`);
      } else if (existing.assignedRole !== 'ADMINISTRATOR' || existing.status !== 'approved') {
        this.updateUser(existing.id, (u) => ({
          ...u,
          fullName,
          passwordHash,
          assignedRole: 'ADMINISTRATOR',
          status: 'approved',
          emailVerified: true,
          approvedAt: u.approvedAt ?? new Date().toISOString(),
          approvedBy: u.approvedBy ?? 'system-bootstrap',
        }));
        console.info(`[AUTH BOOTSTRAP] Elevated existing account to Administrator: ${email}`);
      }
      return;
    }

    if (this.countApprovedAdmins() === 0) {
      console.info(
        `[AUTH INFO] No approved Administrator exists yet. Set ADMIN_BOOTSTRAP_PASSWORD in server environment (for ${email}) or run \`npx tsx scripts/seed-admin.ts --email ${email} --password <strong-password>\` to initialize the administrator account.`,
      );
    }
  }
}
