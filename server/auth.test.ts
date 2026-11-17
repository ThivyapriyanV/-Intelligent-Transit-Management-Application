import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import express from 'express';
import { AuthStore } from './authStore.ts';
import { createAuthRouter } from './authRoutes.ts';
import { hashPassword, validatePasswordStrength, verifyPassword } from './security.ts';
import { canAccessPage, isPageReadOnly } from '../src/services/authService.ts';

function createTempStore(): { store: AuthStore; cleanup: () => void } {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'itms-auth-test-'));
  const filePath = path.join(dir, 'auth-store.json');
  const store = new AuthStore(filePath);
  return {
    store,
    cleanup: () => fs.rmSync(dir, { recursive: true, force: true }),
  };
}

class CookieJar {
  private cookies = new Map<string, string>();

  updateFromHeaders(headers: Headers) {
    const setCookies =
      typeof (headers as unknown as { getSetCookie?: () => string[] }).getSetCookie === 'function'
        ? (headers as unknown as { getSetCookie: () => string[] }).getSetCookie()
        : [];

    for (const raw of setCookies) {
      const pair = raw.split(';')[0];
      const eq = pair.indexOf('=');
      if (eq > 0) {
        const name = pair.slice(0, eq).trim();
        const val = pair.slice(eq + 1).trim();
        if (val === '') {
          this.cookies.delete(name);
        } else {
          this.cookies.set(name, val);
        }
      }
    }
  }

  getCookieHeader(): string {
    return Array.from(this.cookies.entries())
      .map(([k, v]) => `${k}=${v}`)
      .join('; ');
  }
}

test('password complexity and bcrypt hashing work accurately', async () => {
  assert.equal(validatePasswordStrength('weak').valid, false);
  assert.equal(validatePasswordStrength('StrongPass1!').valid, true);

  const hashed = await hashPassword('StrongPass1!');
  assert.ok(hashed.startsWith('$2'));
  assert.equal(await verifyPassword('StrongPass1!', hashed), true);
  assert.equal(await verifyPassword('WrongPass1!', hashed), false);
});

test('RBAC matrix enforces strict page boundaries and read-only rules across ADMINISTRATOR, TRANSIT_OPERATOR, and OBSERVER', () => {
  // ADMINISTRATOR: all 9 pages, none read-only
  assert.equal(canAccessPage('ADMINISTRATOR', 'dashboard'), true);
  assert.equal(canAccessPage('ADMINISTRATOR', 'live-monitoring'), true);
  assert.equal(canAccessPage('ADMINISTRATOR', 'alert-centre'), true);
  assert.equal(canAccessPage('ADMINISTRATOR', 'bus-recommendations'), true);
  assert.equal(canAccessPage('ADMINISTRATOR', 'bus-fleet'), true);
  assert.equal(canAccessPage('ADMINISTRATOR', 'settings'), true);
  assert.equal(isPageReadOnly('ADMINISTRATOR', 'live-monitoring'), false);

  // TRANSIT_OPERATOR: all except settings
  assert.equal(canAccessPage('TRANSIT_OPERATOR', 'dashboard'), true);
  assert.equal(canAccessPage('TRANSIT_OPERATOR', 'live-monitoring'), true);
  assert.equal(canAccessPage('TRANSIT_OPERATOR', 'alert-centre'), true);
  assert.equal(canAccessPage('TRANSIT_OPERATOR', 'bus-recommendations'), true);
  assert.equal(canAccessPage('TRANSIT_OPERATOR', 'bus-fleet'), true);
  assert.equal(canAccessPage('TRANSIT_OPERATOR', 'reports'), true);
  assert.equal(canAccessPage('TRANSIT_OPERATOR', 'settings'), false);
  assert.equal(isPageReadOnly('TRANSIT_OPERATOR', 'live-monitoring'), false);

  // OBSERVER: dashboard, live-monitoring (read-only), crowd-analytics, crowd-prediction, reports (read-only)
  assert.equal(canAccessPage('OBSERVER', 'dashboard'), true);
  assert.equal(canAccessPage('OBSERVER', 'live-monitoring'), true);
  assert.equal(canAccessPage('OBSERVER', 'crowd-analytics'), true);
  assert.equal(canAccessPage('OBSERVER', 'crowd-prediction'), true);
  assert.equal(canAccessPage('OBSERVER', 'reports'), true);
  assert.equal(canAccessPage('OBSERVER', 'alert-centre'), false);
  assert.equal(canAccessPage('OBSERVER', 'bus-recommendations'), false);
  assert.equal(canAccessPage('OBSERVER', 'bus-fleet'), false);
  assert.equal(canAccessPage('OBSERVER', 'settings'), false);
  assert.equal(isPageReadOnly('OBSERVER', 'live-monitoring'), true);
  assert.equal(isPageReadOnly('OBSERVER', 'reports'), true);
  assert.equal(isPageReadOnly('OBSERVER', 'dashboard'), false);
});

test('bootstrap admin@gmail.com prevents duplicates and requires env password', async () => {
  const { store, cleanup } = createTempStore();
  const prevEmail = process.env.ADMIN_BOOTSTRAP_EMAIL;
  const prevPassword = process.env.ADMIN_BOOTSTRAP_PASSWORD;

  try {
    process.env.ADMIN_BOOTSTRAP_EMAIL = 'admin@gmail.com';
    process.env.ADMIN_BOOTSTRAP_PASSWORD = 'InitialAdminPass1!';

    await store.ensureBootstrapAdmin();
    const adminUser = store.findUserByEmail('admin@gmail.com');
    assert.ok(adminUser);
    assert.equal(adminUser.email, 'admin@gmail.com');
    assert.equal(adminUser.assignedRole, 'ADMINISTRATOR');
    assert.equal(adminUser.status, 'approved');
    assert.equal(adminUser.emailVerified, true);

    // Calling bootstrap again MUST NOT create a duplicate admin
    process.env.ADMIN_BOOTSTRAP_EMAIL = 'secondadmin@gmail.com';
    await store.ensureBootstrapAdmin();
    assert.equal(store.listUsers().length, 1);
    assert.equal(store.findUserByEmail('secondadmin@gmail.com'), undefined);
  } finally {
    if (prevEmail === undefined) delete process.env.ADMIN_BOOTSTRAP_EMAIL;
    else process.env.ADMIN_BOOTSTRAP_EMAIL = prevEmail;
    if (prevPassword === undefined) delete process.env.ADMIN_BOOTSTRAP_PASSWORD;
    else process.env.ADMIN_BOOTSTRAP_PASSWORD = prevPassword;
    cleanup();
  }
});

test('full end-to-end auth & admin approval lifecycle across all 14 requirements', async () => {
  const { store, cleanup } = createTempStore();

  const adminHash = await hashPassword('AdminSecure1!');
  store.createUser({
    fullName: 'Chief Transit Admin',
    email: 'admin@gmail.com',
    passwordHash: adminHash,
    provider: 'local',
    requestedRole: 'TRANSIT_OPERATOR',
    assignedRole: 'ADMINISTRATOR',
    status: 'approved',
    emailVerified: true,
    approvedBy: 'test-seed',
  });

  const app = express();
  app.use(express.json());
  app.use(createAuthRouter(store));

  const server = await new Promise<ReturnType<typeof app.listen>>((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });

  try {
    const addr = server.address();
    assert.ok(addr && typeof addr !== 'string');
    const baseUrl = `http://127.0.0.1:${addr.port}`;

    const userJar = new CookieJar();
    const csrfResp = await fetch(`${baseUrl}/api/auth/csrf`);
    userJar.updateFromHeaders(csrfResp.headers);
    const { csrfToken: initialCsrf } = (await csrfResp.json()) as { csrfToken: string };
    assert.match(csrfResp.headers.get('cache-control') || '', /no-store/);

    // Scenario: OAuth routes are completely disabled
    const oauthResp = await fetch(`${baseUrl}/api/auth/oauth/google/url`);
    assert.equal(oauthResp.status, 404);

    // Scenario 2: Unregistered email login rejected with exact error and no auto-creation
    const unknownLogin = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: userJar.getCookieHeader(),
        'X-CSRF-Token': initialCsrf,
      },
      body: JSON.stringify({
        email: 'nonexistent@transit.test',
        password: 'SomePassword1!',
        rememberMe: false,
      }),
    });
    assert.equal(unknownLogin.status, 401);
    const unknownErr = (await unknownLogin.json()) as { error: string; code: string };
    assert.equal(
      unknownErr.error,
      'Invalid email or password. Please check your credentials or create an account.',
    );
    assert.equal(store.findUserByEmail('nonexistent@transit.test'), undefined);

    // Public registration MUST reject ADMINISTRATOR role
    const adminAttempt = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: userJar.getCookieHeader(),
        'X-CSRF-Token': initialCsrf,
      },
      body: JSON.stringify({
        fullName: 'Sneaky User',
        email: 'sneaky@transit.test',
        password: 'OperatorPass1!',
        confirmPassword: 'OperatorPass1!',
        requestedRole: 'ADMINISTRATOR',
        acceptedTerms: true,
      }),
    });
    assert.equal(adminAttempt.status, 400);

    // Scenario 3: Register TRANSIT_OPERATOR -> immediately enters pending_approval
    const regOpResp = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: userJar.getCookieHeader(),
        'X-CSRF-Token': initialCsrf,
      },
      body: JSON.stringify({
        fullName: 'Priya Narayanan',
        email: 'priya@transit.test',
        password: 'OperatorPass1!',
        confirmPassword: 'OperatorPass1!',
        requestedRole: 'TRANSIT_OPERATOR',
        acceptedTerms: true,
      }),
    });
    assert.equal(regOpResp.status, 201);
    const regOpData = (await regOpResp.json()) as {
      user: { id: string; status: string; requestedRole: string };
    };
    assert.equal(regOpData.user.status, 'pending_approval');
    assert.equal(regOpData.user.requestedRole, 'TRANSIT_OPERATOR');

    // Scenario 4: Register OBSERVER -> immediately enters pending_approval
    const regObsResp = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: userJar.getCookieHeader(),
        'X-CSRF-Token': initialCsrf,
      },
      body: JSON.stringify({
        fullName: 'Arjun Menon',
        email: 'arjun@transit.test',
        password: 'ObserverPass1!',
        confirmPassword: 'ObserverPass1!',
        requestedRole: 'OBSERVER',
        acceptedTerms: true,
      }),
    });
    assert.equal(regObsResp.status, 201);
    const regObsData = (await regObsResp.json()) as {
      user: { id: string; status: string; requestedRole: string };
    };
    assert.equal(regObsData.user.status, 'pending_approval');
    assert.equal(regObsData.user.requestedRole, 'OBSERVER');

    // Duplicate email rejected
    const dupResp = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: userJar.getCookieHeader(),
        'X-CSRF-Token': initialCsrf,
      },
      body: JSON.stringify({
        fullName: 'Duplicate User',
        email: 'priya@transit.test',
        password: 'OperatorPass1!',
        confirmPassword: 'OperatorPass1!',
        requestedRole: 'OBSERVER',
        acceptedTerms: true,
      }),
    });
    assert.equal(dupResp.status, 409);

    // Scenario 5: Pending approval user blocked from login
    const pendingLogin = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: userJar.getCookieHeader(),
        'X-CSRF-Token': initialCsrf,
      },
      body: JSON.stringify({
        email: 'priya@transit.test',
        password: 'OperatorPass1!',
        rememberMe: false,
      }),
    });
    assert.equal(pendingLogin.status, 403);
    const pendingErr = (await pendingLogin.json()) as { code: string };
    assert.equal(pendingErr.code, 'PENDING_APPROVAL');

    // Scenario 1 & 6: Admin logs in using admin@gmail.com and views pending requests
    const adminJar = new CookieJar();
    const adminCsrfResp = await fetch(`${baseUrl}/api/auth/csrf`);
    adminJar.updateFromHeaders(adminCsrfResp.headers);
    const { csrfToken: adminInitCsrf } = (await adminCsrfResp.json()) as { csrfToken: string };

    const adminLogin = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: adminJar.getCookieHeader(),
        'X-CSRF-Token': adminInitCsrf,
      },
      body: JSON.stringify({
        email: 'admin@gmail.com',
        password: 'AdminSecure1!',
        rememberMe: false,
      }),
    });
    assert.equal(adminLogin.status, 200);
    adminJar.updateFromHeaders(adminLogin.headers);
    const { csrfToken: adminSessionCsrf } = (await adminLogin.json()) as {
      csrfToken: string;
    };

    const listPendingResp = await fetch(`${baseUrl}/api/admin/users?status=pending_approval`, {
      headers: { Cookie: adminJar.getCookieHeader() },
    });
    assert.equal(listPendingResp.status, 200);
    const listPendingData = (await listPendingResp.json()) as {
      users: Array<{ id: string }>;
      counts: Record<string, number>;
    };
    assert.equal(listPendingData.counts.pending_approval, 2);

    // Scenario 6 & 7: Approve Priya as TRANSIT_OPERATOR and Arjun as OBSERVER
    const approveOpResp = await fetch(
      `${baseUrl}/api/admin/users/${regOpData.user.id}/approval`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Cookie: adminJar.getCookieHeader(),
          'X-CSRF-Token': adminSessionCsrf,
        },
        body: JSON.stringify({ decision: 'approve', assignedRole: 'TRANSIT_OPERATOR' }),
      },
    );
    assert.equal(approveOpResp.status, 200);

    const approveObsResp = await fetch(
      `${baseUrl}/api/admin/users/${regObsData.user.id}/approval`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Cookie: adminJar.getCookieHeader(),
          'X-CSRF-Token': adminSessionCsrf,
        },
        body: JSON.stringify({ decision: 'approve', assignedRole: 'OBSERVER' }),
      },
    );
    assert.equal(approveObsResp.status, 200);

    // Scenario 12: Approved TRANSIT_OPERATOR logs in & checks server-enforced module permissions
    const opLogin = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: userJar.getCookieHeader(),
        'X-CSRF-Token': initialCsrf,
      },
      body: JSON.stringify({
        email: 'priya@transit.test',
        password: 'OperatorPass1!',
        rememberMe: true,
      }),
    });
    assert.equal(opLogin.status, 200);
    userJar.updateFromHeaders(opLogin.headers);
    const { csrfToken: opSessionCsrf } = (await opLogin.json()) as { csrfToken: string };

    const opFleetCheck = await fetch(`${baseUrl}/api/auth/module-access/bus-fleet`, {
      headers: { Cookie: userJar.getCookieHeader() },
    });
    assert.equal(opFleetCheck.status, 200);

    const opSettingsCheck = await fetch(`${baseUrl}/api/auth/module-access/settings`, {
      headers: { Cookie: userJar.getCookieHeader() },
    });
    assert.equal(opSettingsCheck.status, 403);

    const forbiddenAdmin = await fetch(`${baseUrl}/api/admin/users`, {
      headers: { Cookie: userJar.getCookieHeader() },
    });
    assert.equal(forbiddenAdmin.status, 403);

    // Scenario 13: Approved OBSERVER logs in & checks read-only + blocked module checks
    const obsJar = new CookieJar();
    const obsCsrfResp = await fetch(`${baseUrl}/api/auth/csrf`);
    obsJar.updateFromHeaders(obsCsrfResp.headers);
    const { csrfToken: obsInitCsrf } = (await obsCsrfResp.json()) as { csrfToken: string };

    const obsLogin = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: obsJar.getCookieHeader(),
        'X-CSRF-Token': obsInitCsrf,
      },
      body: JSON.stringify({
        email: 'arjun@transit.test',
        password: 'ObserverPass1!',
        rememberMe: false,
      }),
    });
    assert.equal(obsLogin.status, 200);
    obsJar.updateFromHeaders(obsLogin.headers);

    const obsLiveCheck = await fetch(`${baseUrl}/api/auth/module-access/live-monitoring`, {
      headers: { Cookie: obsJar.getCookieHeader() },
    });
    assert.equal(obsLiveCheck.status, 200);
    const obsLiveData = (await obsLiveCheck.json()) as { allowed: boolean; readOnly: boolean };
    assert.equal(obsLiveData.allowed, true);
    assert.equal(obsLiveData.readOnly, true);

    const obsAlertsCheck = await fetch(`${baseUrl}/api/auth/module-access/alert-centre`, {
      headers: { Cookie: obsJar.getCookieHeader() },
    });
    assert.equal(obsAlertsCheck.status, 403);

    // Scenario 8: Admin changes Priya's role to OBSERVER -> verified immediately
    const changeRoleResp = await fetch(
      `${baseUrl}/api/admin/users/${regOpData.user.id}/role`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Cookie: adminJar.getCookieHeader(),
          'X-CSRF-Token': adminSessionCsrf,
        },
        body: JSON.stringify({ assignedRole: 'OBSERVER' }),
      },
    );
    assert.equal(changeRoleResp.status, 200);

    const opFleetAfterDemote = await fetch(`${baseUrl}/api/auth/module-access/bus-fleet`, {
      headers: { Cookie: userJar.getCookieHeader() },
    });
    assert.equal(opFleetAfterDemote.status, 403);

    // Scenario 9 & 10: Admin suspends Priya -> active session invalidated -> login blocked -> reactivates -> login works
    const suspendResp = await fetch(
      `${baseUrl}/api/admin/users/${regOpData.user.id}/status`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Cookie: adminJar.getCookieHeader(),
          'X-CSRF-Token': adminSessionCsrf,
        },
        body: JSON.stringify({ action: 'suspend', reason: 'Shift ended' }),
      },
    );
    assert.equal(suspendResp.status, 200);

    const meAfterSuspend = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Cookie: userJar.getCookieHeader() },
    });
    assert.equal(meAfterSuspend.status, 200);
    const meAfterSuspendData = (await meAfterSuspend.json()) as { authenticated: boolean };
    assert.equal(meAfterSuspendData.authenticated, false);

    const suspendedLogin = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: userJar.getCookieHeader(),
        'X-CSRF-Token': opSessionCsrf,
      },
      body: JSON.stringify({
        email: 'priya@transit.test',
        password: 'OperatorPass1!',
        rememberMe: false,
      }),
    });
    assert.equal(suspendedLogin.status, 403);
    assert.equal(((await suspendedLogin.json()) as { code: string }).code, 'ACCOUNT_SUSPENDED');

    const reactivateResp = await fetch(
      `${baseUrl}/api/admin/users/${regOpData.user.id}/status`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Cookie: adminJar.getCookieHeader(),
          'X-CSRF-Token': adminSessionCsrf,
        },
        body: JSON.stringify({ action: 'reactivate' }),
      },
    );
    assert.equal(reactivateResp.status, 200);

    const loginAfterReactivate = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: userJar.getCookieHeader(),
        'X-CSRF-Token': opSessionCsrf,
      },
      body: JSON.stringify({
        email: 'priya@transit.test',
        password: 'OperatorPass1!',
        rememberMe: false,
      }),
    });
    assert.equal(loginAfterReactivate.status, 200);
    userJar.updateFromHeaders(loginAfterReactivate.headers);
    const { csrfToken: priyaSessionCsrf } = (await loginAfterReactivate.json()) as {
      csrfToken: string;
    };

    // Scenario 14: Logout invalidates session
    const logoutResp = await fetch(`${baseUrl}/api/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: userJar.getCookieHeader(),
        'X-CSRF-Token': priyaSessionCsrf,
      },
      body: JSON.stringify({}),
    });
    assert.equal(logoutResp.status, 200);
    userJar.updateFromHeaders(logoutResp.headers);
    const { csrfToken: postLogoutCsrf } = (await logoutResp.json()) as { csrfToken: string };

    const meAfterLogout = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Cookie: userJar.getCookieHeader() },
    });
    assert.equal(((await meAfterLogout.json()) as { authenticated: boolean }).authenticated, false);

    // Scenario 11: Register third user and Reject -> cannot log in & cannot be reactivated
    const regRejectResp = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: userJar.getCookieHeader(),
        'X-CSRF-Token': postLogoutCsrf,
      },
      body: JSON.stringify({
        fullName: 'Rejected Applicant',
        email: 'rejected@transit.test',
        password: 'ApplicantPass1!',
        confirmPassword: 'ApplicantPass1!',
        requestedRole: 'OBSERVER',
        acceptedTerms: true,
      }),
    });
    assert.equal(regRejectResp.status, 201);
    const regRejectData = (await regRejectResp.json()) as { user: { id: string } };

    const rejectResp = await fetch(
      `${baseUrl}/api/admin/users/${regRejectData.user.id}/approval`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Cookie: adminJar.getCookieHeader(),
          'X-CSRF-Token': adminSessionCsrf,
        },
        body: JSON.stringify({ decision: 'reject', reason: 'Unverified agency ID' }),
      },
    );
    assert.equal(rejectResp.status, 200);

    const rejectedLogin = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: userJar.getCookieHeader(),
        'X-CSRF-Token': postLogoutCsrf,
      },
      body: JSON.stringify({
        email: 'rejected@transit.test',
        password: 'ApplicantPass1!',
        rememberMe: false,
      }),
    });
    assert.equal(rejectedLogin.status, 403);
    assert.equal(((await rejectedLogin.json()) as { code: string }).code, 'ACCOUNT_REJECTED');

    const reactivateRejected = await fetch(
      `${baseUrl}/api/admin/users/${regRejectData.user.id}/status`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Cookie: adminJar.getCookieHeader(),
          'X-CSRF-Token': adminSessionCsrf,
        },
        body: JSON.stringify({ action: 'reactivate' }),
      },
    );
    assert.equal(reactivateRejected.status, 400);
  } finally {
    server.close();
    cleanup();
  }
});
