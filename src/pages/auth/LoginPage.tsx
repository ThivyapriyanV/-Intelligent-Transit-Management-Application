import React, { useState } from 'react';
import { AlertCircle, ArrowRight, Info, Mail } from 'lucide-react';
import { AuthSplitShell } from '../../components/auth/AuthSplitShell';
import { PasswordInput } from '../../components/auth/PasswordInput';
import { AuthLegalModal } from '../../components/auth/AuthLegalModal';
import { useAuth } from '../../context/AuthContext';
import {
  ApiError,
  getDefaultPageForRole,
  loginWithPassword,
} from '../../services/authService';
import { PAGE_PATH_MAP } from '../../types/auth';

export const LoginPage: React.FC = () => {
  const {
    navigate,
    setAuthenticatedUser,
    setAccountNotice,
    accountNotice,
  } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [legalDoc, setLegalDoc] = useState<'terms' | 'privacy' | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSubmitting(true);

    try {
      const res = await loginWithPassword({ email, password, rememberMe });
      setAuthenticatedUser(res.user);
      navigate(PAGE_PATH_MAP[getDefaultPageForRole(res.user.assignedRole)], {
        replace: true,
      });
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === 'PENDING_APPROVAL' || err.code === 'EMAIL_VERIFICATION_PENDING') {
          setAccountNotice({
            status: 'pending_approval',
            email: err.user?.email || email,
            fullName: err.user?.fullName,
            requestedRole: err.user?.requestedRole,
            message: err.message,
          });
          navigate('/pending-approval');
          return;
        }
        if (err.code === 'ACCOUNT_REJECTED' || err.code === 'ACCOUNT_SUSPENDED') {
          setAccountNotice({
            status: err.code === 'ACCOUNT_REJECTED' ? 'rejected' : 'suspended',
            email: err.user?.email || email,
            reason: err.reason,
          });
          navigate('/access-denied');
          return;
        }
        setErrorMsg(err.message);
      } else {
        setErrorMsg('Unable to sign in right now. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthSplitShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-[#F4F1F3] font-display tracking-tight">
            Welcome Back
          </h1>
          <p className="text-sm text-[#AAA3AD] mt-1.5">
            Sign in with your approved transit authority credentials to access monitoring &amp;
            fleet operations.
          </p>
        </div>

        {accountNotice?.message && (
          <div className="p-3 rounded-lg bg-[#201C22] border border-[#343039] text-xs text-[#AAA3AD] flex items-start gap-2.5">
            <Info className="w-4 h-4 text-[#D01940] shrink-0 mt-0.5" />
            <span>{accountNotice.message}</span>
          </div>
        )}

        {errorMsg && (
          <div
            role="alert"
            className="p-3 rounded-lg bg-[#B51232]/15 border border-[#B51232]/50 text-xs text-[#FB7185] flex items-start gap-2.5"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="login-email" className="block text-xs font-medium text-[#AAA3AD] mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#77717B] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="login-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="operator@transit.gov"
                className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-[#262128] border border-[#343039] text-sm text-[#F4F1F3] placeholder-[#77717B] focus:outline-none focus:border-[#B51232] transition-colors"
              />
            </div>
          </div>

          <PasswordInput
            id="login-password"
            label="Password"
            value={password}
            onChange={setPassword}
            autoComplete="current-password"
          />

          <div className="flex items-center justify-between gap-2 text-xs">
            <label className="inline-flex items-center gap-2 text-[#AAA3AD] cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded accent-[#B51232]"
              />
              <span>Remember Me</span>
            </label>

            <button
              type="button"
              onClick={() => navigate('/forgot-password')}
              className="font-medium text-[#D01940] hover:text-[#FB7185] transition-colors"
            >
              Forgot Password?
            </button>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 px-4 rounded-lg bg-[#B51232] hover:bg-[#D01940] disabled:opacity-60 text-sm font-semibold text-[#F4F1F3] transition-colors crimson-glow-sm flex items-center justify-center gap-2"
          >
            <span>{submitting ? 'Signing In...' : 'Sign In'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="pt-2 border-t border-[#343039]/60 text-center space-y-3">
          <p className="text-xs text-[#AAA3AD] pt-2">
            Need operational access?{' '}
            <button
              type="button"
              onClick={() => navigate('/register')}
              className="font-semibold text-[#D01940] hover:text-[#FB7185] transition-colors"
            >
              Create Account
            </button>
          </p>

          <div className="flex items-center justify-center gap-4 text-[11px] text-[#77717B]">
            <button
              type="button"
              onClick={() => setLegalDoc('terms')}
              className="hover:text-[#AAA3AD] underline-offset-2 hover:underline"
            >
              Terms of Service
            </button>
            <span aria-hidden="true">•</span>
            <button
              type="button"
              onClick={() => setLegalDoc('privacy')}
              className="hover:text-[#AAA3AD] underline-offset-2 hover:underline"
            >
              Privacy Policy
            </button>
          </div>
        </div>
      </div>

      <AuthLegalModal doc={legalDoc} onClose={() => setLegalDoc(null)} />
    </AuthSplitShell>
  );
};
