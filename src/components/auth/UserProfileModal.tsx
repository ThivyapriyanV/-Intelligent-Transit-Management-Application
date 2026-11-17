import React from 'react';
import { Mail, ShieldCheck, User, X } from 'lucide-react';
import { ROLE_LABELS, ROLE_PAGE_ACCESS, type AuthUser } from '../../types/auth';

interface UserProfileModalProps {
  user: AuthUser;
  open: boolean;
  onClose: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  user,
  open,
  onClose,
}) => {
  if (!open) return null;

  const permittedPages = ROLE_PAGE_ACCESS[user.assignedRole] || [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-modal-title"
    >
      <div className="w-full max-w-md rounded-xl bg-[#201C22] border border-[#343039] shadow-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#343039] bg-[#262128] flex items-center justify-between">
          <h2 id="profile-modal-title" className="text-sm font-semibold text-[#F4F1F3] font-display">
            Operator Profile &amp; Permissions
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close profile dialog"
            className="p-1 rounded-md text-[#AAA3AD] hover:text-[#F4F1F3]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-xs">
          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-[#151217] border border-[#343039]">
            <div className="w-10 h-10 rounded-lg bg-[#B51232]/20 border border-[#B51232]/50 flex items-center justify-center shrink-0">
              <User className="w-5 h-5 text-[#D01940]" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-[#F4F1F3] truncate">
                {user.fullName}
              </div>
              <div className="flex items-center gap-1.5 text-[#AAA3AD] truncate mt-0.5">
                <Mail className="w-3 h-3 shrink-0" />
                <span className="truncate font-mono">{user.email}</span>
              </div>
            </div>
          </div>

          <dl className="divide-y divide-[#343039]">
            <div className="py-2.5 flex items-center justify-between gap-2">
              <dt className="text-[#AAA3AD]">Assigned Role</dt>
              <dd className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-[#B51232]/20 border border-[#B51232]/40 text-[#FB7185] font-medium">
                <ShieldCheck className="w-3 h-3" />
                <span>{ROLE_LABELS[user.assignedRole]}</span>
              </dd>
            </div>
            <div className="py-2.5 flex items-center justify-between gap-2">
              <dt className="text-[#AAA3AD]">Account Status</dt>
              <dd className="text-[#4ADE80] font-medium">Approved &amp; Active</dd>
            </div>
            <div className="py-2.5 flex items-center justify-between gap-2">
              <dt className="text-[#AAA3AD]">Authentication Provider</dt>
              <dd className="text-[#F4F1F3] font-mono uppercase">{user.provider}</dd>
            </div>
            <div className="py-2.5">
              <dt className="text-[#AAA3AD] mb-2">Permitted Workspaces ({permittedPages.length})</dt>
              <dd className="flex flex-wrap gap-1.5">
                {permittedPages.map((p) => (
                  <span
                    key={p}
                    className="px-2 py-0.5 rounded bg-[#262128] border border-[#343039] text-[11px] font-mono text-[#F4F1F3]"
                  >
                    {p}
                  </span>
                ))}
              </dd>
            </div>
          </dl>
        </div>

        <div className="px-5 py-3 border-t border-[#343039] bg-[#151217] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[#B51232] hover:bg-[#D01940] text-xs font-medium text-[#F4F1F3]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
