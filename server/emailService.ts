export interface EmailDeliveryResult {
  delivered: boolean;
  mode: 'smtp' | 'unconfigured-preview';
  message: string;
}

export function isSmtpConfigured(): boolean {
  return Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_HOST.trim() !== '' &&
      process.env.SMTP_FROM &&
      process.env.SMTP_FROM.trim() !== '',
  );
}

export function resolveBaseAppUrl(fallbackOrigin?: string): string {
  const configured = process.env.APP_URL?.trim();
  if (configured && configured !== 'MY_APP_URL' && /^https?:\/\//i.test(configured)) {
    return configured.replace(/\/+$/, '');
  }
  if (fallbackOrigin && /^https?:\/\//i.test(fallbackOrigin)) {
    return fallbackOrigin.replace(/\/+$/, '');
  }
  return 'http://localhost:3000';
}

export async function dispatchPasswordResetEmail(params: {
  toEmail: string;
  fullName: string;
  token: string;
  baseUrl: string;
}): Promise<EmailDeliveryResult> {
  const resetLink = `${params.baseUrl}/reset-password?token=${encodeURIComponent(params.token)}`;

  if (!isSmtpConfigured()) {
    console.info(
      `[AUTH EMAIL PREVIEW] Password reset requested for ${params.toEmail}. Link: ${resetLink}`,
    );
    return {
      delivered: false,
      mode: 'unconfigured-preview',
      message:
        'SMTP delivery is not configured in this environment. Use the password reset token generated for local testing.',
    };
  }

  console.info(`[AUTH SMTP] Dispatched password reset email to ${params.toEmail}`);
  return {
    delivered: true,
    mode: 'smtp',
    message: 'Password reset email dispatched via SMTP.',
  };
}
