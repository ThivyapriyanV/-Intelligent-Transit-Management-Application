export type UserRole = 'ADMINISTRATOR' | 'TRANSIT_OPERATOR' | 'OBSERVER';
export type RequestedRole = 'TRANSIT_OPERATOR' | 'OBSERVER';

export type AccountStatus =
  | 'email_verification_pending'
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'suspended';

export type AuthProvider = 'local';

export interface UserRecord {
  id: string;
  fullName: string;
  email: string;
  passwordHash: string | null;
  provider: AuthProvider;
  providerSubject: string | null;
  requestedRole: RequestedRole;
  assignedRole: UserRole;
  status: AccountStatus;
  rejectionReason: string | null;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
  approvedAt: string | null;
  approvedBy: string | null;
  lastLoginAt: string | null;
}

export interface PublicUser {
  id: string;
  fullName: string;
  email: string;
  provider: AuthProvider;
  requestedRole: RequestedRole;
  assignedRole: UserRole;
  status: AccountStatus;
  rejectionReason: string | null;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
  approvedAt: string | null;
  lastLoginAt: string | null;
}

export interface SessionRecord {
  id: string;
  tokenHash: string;
  userId: string;
  csrfToken: string;
  rememberMe: boolean;
  createdAt: string;
  expiresAt: string;
  userAgent: string;
  ip: string;
}

export interface AuthTokenRecord {
  id: string;
  userId: string;
  type: 'email_verification' | 'password_reset';
  tokenHash: string;
  expiresAt: string;
  usedAt: string | null;
  createdAt: string;
}

export interface AuthStoreData {
  users: UserRecord[];
  sessions: SessionRecord[];
  tokens: AuthTokenRecord[];
}
