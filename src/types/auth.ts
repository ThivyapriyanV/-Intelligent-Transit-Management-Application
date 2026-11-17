import type { PageId } from './transit';

export type UserRole = 'ADMINISTRATOR' | 'TRANSIT_OPERATOR' | 'OBSERVER';
export type RequestedRole = 'TRANSIT_OPERATOR' | 'OBSERVER';

export type AccountStatus =
  | 'email_verification_pending'
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'suspended';

export type AuthProvider = 'local';

export interface AuthUser {
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

export type AuthRoutePath =
  | '/login'
  | '/register'
  | '/pending-approval'
  | '/forgot-password'
  | '/reset-password'
  | '/access-denied';

export const AUTH_ROUTE_PATHS: AuthRoutePath[] = [
  '/login',
  '/register',
  '/pending-approval',
  '/forgot-password',
  '/reset-password',
  '/access-denied',
];

export const PAGE_PATH_MAP: Record<PageId, string> = {
  dashboard: '/dashboard',
  'live-monitoring': '/live-monitoring',
  'crowd-analytics': '/crowd-analytics',
  'crowd-prediction': '/crowd-prediction',
  'alert-centre': '/alert-centre',
  'bus-recommendations': '/bus-recommendations',
  'bus-fleet': '/bus-fleet',
  reports: '/reports',
  settings: '/settings',
};

export const PATH_TO_PAGE_MAP: Record<string, PageId> = Object.fromEntries(
  Object.entries(PAGE_PATH_MAP).map(([page, path]) => [path, page as PageId]),
) as Record<string, PageId>;

export const ROLE_LABELS: Record<UserRole, string> = {
  ADMINISTRATOR: 'Administrator',
  TRANSIT_OPERATOR: 'Transit Operator',
  OBSERVER: 'Observer',
};

export const ROLE_PAGE_ACCESS: Record<UserRole, PageId[]> = {
  ADMINISTRATOR: [
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
  TRANSIT_OPERATOR: [
    'dashboard',
    'live-monitoring',
    'crowd-analytics',
    'crowd-prediction',
    'alert-centre',
    'bus-recommendations',
    'bus-fleet',
    'reports',
  ],
  OBSERVER: [
    'dashboard',
    'live-monitoring',
    'crowd-analytics',
    'crowd-prediction',
    'reports',
  ],
};

export const ROLE_READ_ONLY_PAGES: Record<UserRole, PageId[]> = {
  ADMINISTRATOR: [],
  TRANSIT_OPERATOR: [],
  OBSERVER: ['live-monitoring', 'reports'],
};
