import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, KeyRound } from 'lucide-react';
import { AuthSplitShell } from '../../components/auth/AuthSplitShell';
import { PasswordInput } from '../../components/auth/PasswordInput';
import { PasswordStrengthMeter } from '../../components/auth/PasswordStrengthMeter';
import { useAuth } from '../../context/AuthContext';
import {
  ApiError,
  evaluatePasswordStrength,
  resetPasswordWithToken,
} from '../../services/authService';

export const ResetPasswordPage: React.FC = () => {
  const { navigate, search } = useAuth();
  const queryToken = new URLSearchParams(search).get('token') || '';

  const [token, setToken] = useState(queryToken);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    if (queryToken) {
      setToken(queryToken);
    }
  }, [queryToken]);

  const strength = evaluatePasswordStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!token.trim()) {
      setErrorMsg('Please enter your password reset token.');
      return;
    }
    if (!strength.valid) {
      setErrorMsg('Please satisfy all password security requirements.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setBusy(true);
    try {
      await resetPasswordWithToken({
        token: token.trim(),
        password,
        confirmPassword,
      });
      setCompleted(true);
    } catch (err) {
      setErrorMsg(
        err instanceof ApiError ? err.message : 'Unable to reset password right now.',
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
              Reset Password
            </h1>
            <p className="text-sm text-[#AAA3AD] mt-1">
              Set a strong new password. All existing active sessions will be invalidated upon
              completion.
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

        {completed ? (
          <div className="p-5 rounded-xl bg-[#201C22] border border-[#22C55E]/40 space-y-4">
            <div className="flex items-start gap-3 text-xs text-[#4ADE80]">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <div className="space-y-1">
                <div className="font-semibold text-sm text-[#F4F1F3]">
                  Password Updated Successfully
                </div>
                <p className="text-[#AAA3AD]">
                  Your password has been changed and prior sessions have been terminated. You may
                  now sign in with your new credentials.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate('/login', { replace: true })}
              className="w-full py-2.5 px-4 rounded-lg bg-[#B51232] hover:bg-[#D01940] text-sm font-semibold text-[#F4F1F3] transition-colors"
            >
              Continue to Sign In
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="reset-token"
                className="block text-xs font-medium text-[#AAA3AD] mb-1.5"
              >
                Reset Token
              </label>
              <input
                id="reset-token"
                type="text"
                required
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Paste reset token"
                className="w-full px-3 py-2.5 rounded-lg bg-[#262128] border border-[#343039] text-sm font-mono text-[#F4F1F3] placeholder-[#77717B] focus:outline-none focus:border-[#B51232]"
              />
            </div>

            <div>
              <PasswordInput
                id="reset-password"
                label="New Password"
                value={password}
                onChange={setPassword}
                autoComplete="new-password"
              />
              <PasswordStrengthMeter password={password} />
            </div>

            <PasswordInput
              id="reset-confirm-password"
              label="Confirm New Password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              autoComplete="new-password"
              error={
                confirmPassword.length > 0 && password !== confirmPassword
                  ? 'Passwords do not match'
                  : null
              }
            />

            <button
              type="submit"
              disabled={busy}
              className="w-full py-2.5 px-4 rounded-lg bg-[#B51232] hover:bg-[#D01940] disabled:opacity-60 text-sm font-semibold text-[#F4F1F3] transition-colors crimson-glow-sm"
            >
              {busy ? 'Updating Password...' : 'Update Password'}
            </button>
          </form>
        )}

        <p className="text-center text-xs text-[#AAA3AD]">
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="font-semibold text-[#D01940] hover:text-[#FB7185]"
          >
            &larr; Back to Sign In
          </button>
        </p>
      </div>
    </AuthSplitShell>
  );
};
