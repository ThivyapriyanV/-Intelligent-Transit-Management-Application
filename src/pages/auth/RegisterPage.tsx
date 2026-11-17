import React, { useState } from 'react';
import { AlertCircle, ArrowRight, Mail, Shield, User } from 'lucide-react';
import { AuthSplitShell } from '../../components/auth/AuthSplitShell';
import { PasswordInput } from '../../components/auth/PasswordInput';
import { PasswordStrengthMeter } from '../../components/auth/PasswordStrengthMeter';
import { AuthLegalModal } from '../../components/auth/AuthLegalModal';
import { useAuth } from '../../context/AuthContext';
import {
  ApiError,
  evaluatePasswordStrength,
  registerAccount,
} from '../../services/authService';
import type { RequestedRole } from '../../types/auth';

export const RegisterPage: React.FC = () => {
  const { navigate, setAccountNotice } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [requestedRole, setRequestedRole] = useState<RequestedRole>('TRANSIT_OPERATOR');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [legalDoc, setLegalDoc] = useState<'terms' | 'privacy' | null>(null);

  const strength = evaluatePasswordStrength(password);
  const passwordsMismatch = confirmPassword.length > 0 && password !== confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (fullName.trim().length < 2) {
      setErrorMsg('Please enter your full name.');
      return;
    }
    if (!strength.valid) {
      setErrorMsg('Please satisfy all password security requirements.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Password and Confirm Password do not match.');
      return;
    }
    if (!acceptedTerms) {
      setErrorMsg('Please accept the Terms of Service and Privacy Policy to continue.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await registerAccount({
        fullName: fullName.trim(),
        email: email.trim(),
        password,
        confirmPassword,
        requestedRole,
        acceptedTerms,
      });
      setAccountNotice({
        status: 'pending_approval',
        email: res.user.email,
        fullName: res.user.fullName,
        requestedRole: res.user.requestedRole,
        message: res.message,
      });
      navigate('/pending-approval', { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg('Unable to register account right now.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthSplitShell>
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-semibold text-[#F4F1F3] font-display tracking-tight">
            Create Account
          </h1>
          <p className="text-sm text-[#AAA3AD] mt-1.5">
            Request transit system access. All new registrations require administrator approval
            before sign-in.
          </p>
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

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="reg-fullname" className="block text-xs font-medium text-[#AAA3AD] mb-1.5">
              Full Name
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-[#77717B] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="reg-fullname"
                type="text"
                required
                autoComplete="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Karthik Subramanian"
                className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-[#262128] border border-[#343039] text-sm text-[#F4F1F3] placeholder-[#77717B] focus:outline-none focus:border-[#B51232]"
              />
            </div>
          </div>

          <div>
            <label htmlFor="reg-email" className="block text-xs font-medium text-[#AAA3AD] mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#77717B] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="reg-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@transit.gov"
                className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-[#262128] border border-[#343039] text-sm text-[#F4F1F3] placeholder-[#77717B] focus:outline-none focus:border-[#B51232]"
              />
            </div>
          </div>

          <div>
            <label htmlFor="reg-role" className="block text-xs font-medium text-[#AAA3AD] mb-1.5">
              Requested Role
            </label>
            <div className="relative">
              <Shield className="w-4 h-4 text-[#77717B] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                id="reg-role"
                value={requestedRole}
                onChange={(e) => setRequestedRole(e.target.value as RequestedRole)}
                className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-[#262128] border border-[#343039] text-sm text-[#F4F1F3] focus:outline-none focus:border-[#B51232]"
              >
                <option value="TRANSIT_OPERATOR">Transit Operator</option>
                <option value="OBSERVER">Observer</option>
              </select>
            </div>
            <p className="mt-1 text-[11px] text-[#77717B]">
              Administrator privileges cannot be requested via public registration.
            </p>
          </div>

          <div>
            <PasswordInput
              id="reg-password"
              label="Password"
              value={password}
              onChange={setPassword}
              autoComplete="new-password"
            />
            <PasswordStrengthMeter password={password} />
          </div>

          <PasswordInput
            id="reg-confirm-password"
            label="Confirm Password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            autoComplete="new-password"
            error={passwordsMismatch ? 'Passwords do not match' : null}
          />

          <label className="flex items-start gap-2.5 text-xs text-[#AAA3AD] cursor-pointer">
            <input
              type="checkbox"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded accent-[#B51232]"
            />
            <span>
              I agree to the{' '}
              <button
                type="button"
                onClick={() => setLegalDoc('terms')}
                className="text-[#D01940] hover:text-[#FB7185] underline"
              >
                Terms of Service
              </button>{' '}
              and{' '}
              <button
                type="button"
                onClick={() => setLegalDoc('privacy')}
                className="text-[#D01940] hover:text-[#FB7185] underline"
              >
                Privacy Policy
              </button>
              .
            </span>
          </label>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 px-4 rounded-lg bg-[#B51232] hover:bg-[#D01940] disabled:opacity-60 text-sm font-semibold text-[#F4F1F3] transition-colors crimson-glow-sm flex items-center justify-center gap-2"
          >
            <span>{submitting ? 'Submitting Request...' : 'Create Account'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <p className="text-center text-xs text-[#AAA3AD] pt-1">
          Already have an account?{' '}
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="font-semibold text-[#D01940] hover:text-[#FB7185] transition-colors"
          >
            Sign In
          </button>
        </p>
      </div>

      <AuthLegalModal doc={legalDoc} onClose={() => setLegalDoc(null)} />
    </AuthSplitShell>
  );
};
