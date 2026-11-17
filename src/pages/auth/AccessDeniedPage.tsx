import React from 'react';
import { Ban, ShieldX } from 'lucide-react';
import { AuthSplitShell } from '../../components/auth/AuthSplitShell';
import { useAuth } from '../../context/AuthContext';

export const AccessDeniedPage: React.FC = () => {
  const { user, navigate, accountNotice, logout } = useAuth();

  const status = accountNotice?.status;
  const isSuspended = status === 'suspended';
  const isRejected = status === 'rejected';

  const heading = isSuspended
    ? 'Account Suspended'
    : isRejected
      ? 'Access Request Declined'
      : 'Access Denied';

  const description = isSuspended
    ? 'This operator account has been suspended by a Transit System Administrator.'
    : isRejected
      ? 'Your registration or access request was rejected by a Transit System Administrator.'
      : 'Your current role permissions do not authorize access to the requested resource.';

  return (
    <AuthSplitShell>
      <div className="space-y-6">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl bg-[#B51232]/20 border border-[#B51232]/50 flex items-center justify-center shrink-0">
            {isSuspended || isRejected ? (
              <Ban className="w-5 h-5 text-[#FB7185]" />
            ) : (
              <ShieldX className="w-5 h-5 text-[#FB7185]" />
            )}
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-[#F4F1F3] font-display tracking-tight">
              {heading}
            </h1>
            <p className="text-sm text-[#AAA3AD] mt-1">{description}</p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#201C22] border border-[#343039] space-y-2.5 text-xs">
          {accountNotice?.email && (
            <div className="flex items-center justify-between gap-2">
              <span className="text-[#AAA3AD]">Account</span>
              <span className="font-mono text-[#F4F1F3]">{accountNotice.email}</span>
            </div>
          )}
          <div className="flex items-center justify-between gap-2">
            <span className="text-[#AAA3AD]">Status</span>
            <span className="px-2 py-0.5 rounded bg-[#B51232]/20 border border-[#B51232]/40 text-[#FB7185] font-medium">
              {isSuspended ? 'Suspended' : isRejected ? 'Rejected' : 'Restricted'}
            </span>
          </div>
          {accountNotice?.reason && (
            <div className="pt-2 border-t border-[#343039] text-[#AAA3AD]">
              <span className="block text-[11px] text-[#77717B] mb-1">Administrator Note</span>
              <p className="text-[#F4F1F3]">{accountNotice.reason}</p>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          {user ? (
            <>
              <button
                type="button"
                onClick={() => navigate('/dashboard', { replace: true })}
                className="flex-1 py-2.5 px-4 rounded-lg bg-[#B51232] hover:bg-[#D01940] text-sm font-semibold text-[#F4F1F3] transition-colors"
              >
                Go to Dashboard
              </button>
              <button
                type="button"
                onClick={() => logout()}
                className="py-2.5 px-4 rounded-lg bg-[#201C22] hover:bg-[#262128] border border-[#343039] text-sm font-medium text-[#AAA3AD]"
              >
                Sign Out
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => navigate('/login', { replace: true })}
              className="w-full py-2.5 px-4 rounded-lg bg-[#B51232] hover:bg-[#D01940] text-sm font-semibold text-[#F4F1F3] transition-colors"
            >
              Return to Sign In
            </button>
          )}
        </div>
      </div>
    </AuthSplitShell>
  );
};
