import 'dotenv/config';
import { AuthStore } from '../server/authStore.ts';
import { hashPassword, validatePasswordStrength } from '../server/security.ts';

function readArg(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  if (idx !== -1 && idx + 1 < process.argv.length) {
    return process.argv[idx + 1];
  }
  return undefined;
}

async function main() {
  const email = (
    readArg('--email') ||
    process.env.ADMIN_BOOTSTRAP_EMAIL ||
    'admin@gmail.com'
  ).trim();
  const password = readArg('--password') || process.env.ADMIN_BOOTSTRAP_PASSWORD;
  const fullName =
    readArg('--name') || process.env.ADMIN_BOOTSTRAP_NAME || 'Transit System Administrator';

  if (!password) {
    console.error(
      'Usage: npx tsx scripts/seed-admin.ts --password <strong-password> [--email admin@gmail.com] [--name "Admin Name"]',
    );
    process.exit(1);
  }

  const strength = validatePasswordStrength(password);
  if (!strength.valid) {
    console.error('Password does not meet complexity requirements:', strength.errors.join(', '));
    process.exit(1);
  }

  const store = new AuthStore();
  const normEmail = store.normalizeEmail(email);
  const existing = store.findUserByEmail(normEmail);
  const existingAdmin = store.findAnyAdmin();

  if (!existing && existingAdmin) {
    console.error(
      `An administrator account (${existingAdmin.email}) already exists. Duplicate administrator creation is prevented.`,
    );
    process.exit(1);
  }

  const passwordHash = await hashPassword(password);

  if (!existing) {
    store.createUser({
      fullName,
      email: normEmail,
      passwordHash,
      provider: 'local',
      requestedRole: 'TRANSIT_OPERATOR',
      assignedRole: 'ADMINISTRATOR',
      status: 'approved',
      emailVerified: true,
      approvedBy: 'cli-seed',
    });
    console.info(`Created approved Administrator account: ${normEmail}`);
    return;
  }

  store.updateUser(existing.id, (u) => ({
    ...u,
    fullName,
    passwordHash,
    assignedRole: 'ADMINISTRATOR',
    status: 'approved',
    emailVerified: true,
    approvedAt: u.approvedAt ?? new Date().toISOString(),
    approvedBy: u.approvedBy ?? 'cli-seed',
  }));
  console.info(`Updated existing account to approved Administrator: ${normEmail}`);
}

main().catch((err) => {
  console.error('Failed to seed administrator:', err);
  process.exit(1);
});
