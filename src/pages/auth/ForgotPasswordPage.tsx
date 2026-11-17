import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, KeyRound, Mail } from 'lucide-react';
import { AuthSplitShell } from '../../components/auth/AuthSplitShell';
import { useAuth } from '../../context/AuthContext';
import { ApiError, requestPasswordReset } from '../../services/authService';

export const ForgotPasswordPage: React.FC = () => {
  const { navigate } = useAuth();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [previewToken, setPreviewToken] = useState<string | undefined>(undefined);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setPreviewToken(undefined);
    setBusy(true);

    try {
      const res = await requestPasswordReset(email.trim());
      setSuccessMsg(res.message);
      if (res.previewResetToken) {
        setPreviewToken(res.previewResetToken);
      }
    } catch (err) {
      setErrorMsg(
        err instanceof ApiError ? err.message : 'Unable to process password reset request.',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthSplitShell>
      <div className="space-y-6">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#B51232]/20 border border-[#B51232]/50 flex items-center justify-center shrink-0">
            <KeyRound className="w-5 h-5 text-[#D01940]" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-[#F4F1F3] font-display tracking-tight">
              Forgot Password
            </h1>
            <p className="text-sm text-[#AAA3AD] mt-1">
              Enter your registered work email to receive a single-use password reset token.
            </p>
          </div>
        </div>

        {errorMsg && (
          <div
            role="alert"
            className="p-3 rounded-lg bg-[#B51232]/15 border border-[#B51232]/50 text-xs text-[#FB7185] flex items-start gap-2.5"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3.5 rounded-lg bg-[#22C55E]/10 border border-[#22C55E]/30 text-xs text-[#4ADE80] flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {previewToken && (
          <div className="p-3.5 rounded-lg bg-[#201C22] border border-[#343039] space-y-2 text-xs">
            <div className="font-medium text-[#F4F1F3]">
              Local Reset Token Preview (SMTP not configured)
            </div>
            <div className="font-mono text-[11px] bg-[#151217] border border-[#343039] rounded p-2 break-all text-[#F4F1F3]">
              {previewToken}
            </div>
            <button
              type="button"
              onClick={() => navigate(`/reset-password?token=${encodeURIComponent(previewToken)}`)}
              className="text-xs font-semibold text-[#D01940] hover:text-[#FB7185]"
            >
              Proceed to Reset Password &rarr;
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="forgot-email"
              className="block text-xs font-medium text-[#AAA3AD] mb-1.5"
            >
              Work Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#77717B] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="forgot-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="operator@transit.gov"
                className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-[#262128] border border-[#343039] text-sm text-[#F4F1F3] placeholder-[#77717B] focus:outline-none focus:border-[#B51232]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={busy}
            className="w-full py-2.5 px-4 rounded-lg bg-[#B51232] hover:bg-[#D01940] disabled:opacity-60 text-sm font-semibold text-[#F4F1F3] transition-colors crimson-glow-sm"
          >
            {busy ? 'Submitting Request...' : 'Send Reset Instructions'}
          </button>
        </form>

        <div className="flex items-center justify-between text-xs text-[#AAA3AD]">
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="font-semibold text-[#D01940] hover:text-[#FB7185]"
          >
            &larr; Back to Sign In
          </button>
          <button
            type="button"
            onClick={() => navigate('/reset-password')}
            className="text-[#AAA3AD] hover:text-[#F4F1F3]"
          >
            Have a reset token?
          </button>
        </div>
      </div>
    </AuthSplitShell>
  );
};
