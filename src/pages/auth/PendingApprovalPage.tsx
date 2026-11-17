import React from 'react';
import { CheckCircle2, Clock3, ShieldAlert } from 'lucide-react';
import { AuthSplitShell } from '../../components/auth/AuthSplitShell';
import { useAuth } from '../../context/AuthContext';
import { ROLE_LABELS, type UserRole } from '../../types/auth';

export const PendingApprovalPage: React.FC = () => {
  const { navigate, accountNotice } = useAuth();

  const requestedRoleLabel =
    accountNotice?.requestedRole &&
    ROLE_LABELS[accountNotice.requestedRole as UserRole]
      ? ROLE_LABELS[accountNotice.requestedRole as UserRole]
      : 'Transit Operator';

  return (
    <AuthSplitShell>
      <div className="space-y-6">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl bg-[#F59E0B]/15 border border-[#F59E0B]/40 flex items-center justify-center shrink-0">
            <Clock3 className="w-5 h-5 text-[#FBBF24]" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-[#F4F1F3] font-display tracking-tight">
              Pending Administrator Approval
            </h1>
            <p className="text-sm text-[#AAA3AD] mt-1.5 leading-relaxed">
              Your account registration has been submitted successfully.
            </p>
            <p className="text-sm text-[#AAA3AD] mt-1 leading-relaxed">
              Your account is awaiting administrator approval. You will be able to access the
              system after your account has been approved.
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#201C22] border border-[#343039] space-y-3 text-xs">
          {accountNotice?.email && (
            <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-[#343039]">
              <span className="text-[#AAA3AD]">Account Email</span>
              <span className="font-mono text-[#F4F1F3]">{accountNotice.email}</span>
            </div>
          )}
          <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-[#343039]">
            <span className="text-[#AAA3AD]">Requested Role</span>
            <span className="font-medium text-[#F4F1F3]">{requestedRoleLabel}</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[#AAA3AD]">Current Status</span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-[#F59E0B]/15 border border-[#F59E0B]/30 text-[#FBBF24] font-medium">
              Pending Administrator Approval
            </span>
          </div>
        </div>

        <div className="space-y-2.5 text-xs">
          <div className="flex items-center gap-2.5 p-3 rounded-lg bg-[#151217] border border-[#343039]">
            <CheckCircle2 className="w-4 h-4 text-[#4ADE80] shrink-0" />
            <span className="text-[#F4F1F3]">1. Account registration submitted</span>
          </div>
          <div className="flex items-center gap-2.5 p-3 rounded-lg bg-[#151217] border border-[#F59E0B]/35">
            <Clock3 className="w-4 h-4 text-[#FBBF24] shrink-0" />
            <span className="text-[#F4F1F3]">2. Awaiting administrator review &amp; role assignment</span>
          </div>
          <div className="flex items-center gap-2.5 p-3 rounded-lg bg-[#151217] border border-[#343039] opacity-65">
            <ShieldAlert className="w-4 h-4 text-[#77717B] shrink-0" />
            <span className="text-[#AAA3AD]">3. Command dashboard access unlocked upon approval</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => navigate('/login')}
          className="w-full py-2.5 px-4 rounded-lg bg-[#B51232] hover:bg-[#D01940] text-sm font-semibold text-[#F4F1F3] transition-colors crimson-glow-sm"
        >
          Back to Login
        </button>
      </div>
    </AuthSplitShell>
  );
};
