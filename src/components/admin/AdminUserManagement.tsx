import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  ShieldCheck,
  UserCheck,
  UserX,
  X,
} from 'lucide-react';
import {
  type AccountStatus,
  type AuthUser,
  ROLE_LABELS,
  type UserRole,
} from '../../types/auth';
import {
  ApiError,
  fetchAdminUsers,
  submitUserApproval,
  updateAdminUserRole,
  updateAdminUserStatus,
} from '../../services/authService';
import { useAuth } from '../../context/AuthContext';

type FilterTab = 'all' | 'pending_approval' | 'approved' | 'rejected' | 'suspended';

interface PendingConfirmation {
  type: 'approve' | 'reject' | 'role' | 'suspend' | 'reactivate';
  user: AuthUser;
  nextRole?: UserRole;
}

const FILTER_TABS: Array<{ id: FilterTab; label: string }> = [
  { id: 'all', label: 'All Users' },
  { id: 'pending_approval', label: 'Pending Requests' },
  { id: 'approved', label: 'Approved Users' },
  { id: 'rejected', label: 'Rejected Users' },
  { id: 'suspended', label: 'Suspended Users' },
];

const STATUS_BADGE: Record<AccountStatus, { label: string; className: string }> = {
  email_verification_pending: {
    label: 'Pending Approval',
    className: 'bg-[#F59E0B]/15 text-[#FBBF24] border-[#F59E0B]/30',
  },
  pending_approval: {
    label: 'Pending Approval',
    className: 'bg-[#F59E0B]/15 text-[#FBBF24] border-[#F59E0B]/30',
  },
  approved: {
    label: 'Approved',
    className: 'bg-[#22C55E]/15 text-[#4ADE80] border-[#22C55E]/30',
  },
  rejected: {
    label: 'Rejected',
    className: 'bg-[#B51232]/20 text-[#FB7185] border-[#B51232]/40',
  },
  suspended: {
    label: 'Suspended',
    className: 'bg-[#EF4444]/15 text-[#F87171] border-[#EF4444]/35',
  },
};

export const AdminUserManagement: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [counts, setCounts] = useState<Record<'all' | AccountStatus, number>>({
    all: 0,
    email_verification_pending: 0,
    pending_approval: 0,
    approved: 0,
    rejected: 0,
    suspended: 0,
  });
  const [loading, setLoading] = useState(true);
  const [actionBusy, setActionBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [roleDrafts, setRoleDrafts] = useState<Record<string, UserRole>>({});
  const [confirmState, setConfirmState] = useState<PendingConfirmation | null>(null);
  const [reasonInput, setReasonInput] = useState('');

  const loadUsers = useCallback(async (tab: FilterTab) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetchAdminUsers(tab);
      setUsers(res.users);
      setCounts(res.counts);
      const drafts: Record<string, UserRole> = {};
      for (const u of res.users) {
        drafts[u.id] = u.assignedRole;
      }
      setRoleDrafts(drafts);
    } catch (err) {
      setErrorMsg(err instanceof ApiError ? err.message : 'Unable to load users.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers(activeTab);
  }, [activeTab, loadUsers]);

  const executeConfirmedAction = async () => {
    if (!confirmState) return;
    setActionBusy(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const { type, user, nextRole } = confirmState;
      if (type === 'approve') {
        const assignedRole = nextRole || roleDrafts[user.id] || user.requestedRole;
        await submitUserApproval(user.id, { decision: 'approve', assignedRole });
        setSuccessMsg(`Approved ${user.fullName} as ${ROLE_LABELS[assignedRole]}.`);
      } else if (type === 'reject') {
        await submitUserApproval(user.id, {
          decision: 'reject',
          reason: reasonInput.trim() || undefined,
        });
        setSuccessMsg(`Rejected access request for ${user.fullName}.`);
      } else if (type === 'role' && nextRole) {
        await updateAdminUserRole(user.id, nextRole);
        setSuccessMsg(`Updated role for ${user.fullName} to ${ROLE_LABELS[nextRole]}.`);
      } else if (type === 'suspend') {
        await updateAdminUserStatus(
          user.id,
          'suspend',
          reasonInput.trim() || undefined,
        );
        setSuccessMsg(`Suspended account for ${user.fullName} and revoked active sessions.`);
      } else if (type === 'reactivate') {
        await updateAdminUserStatus(user.id, 'reactivate');
        setSuccessMsg(`Reactivated account for ${user.fullName}.`);
      }

      setConfirmState(null);
      setReasonInput('');
      await loadUsers(activeTab);
    } catch (err) {
      setErrorMsg(err instanceof ApiError ? err.message : 'Failed to update user.');
    } finally {
      setActionBusy(false);
    }
  };

  return (
    <section
      aria-label="Administrator User Management"
      className="rounded-xl bg-[#201C22] border border-[#343039] overflow-hidden"
    >
      <div className="px-5 py-4 border-b border-[#343039] flex flex-wrap items-center justify-between gap-3 bg-[#262128]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#B51232]/20 border border-[#B51232]/50 flex items-center justify-center">
            <ShieldCheck className="w-4 h-4 text-[#D01940]" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-[#F4F1F3] font-display">
              User Access &amp; Approval Management
            </h2>
            <p className="text-xs text-[#AAA3AD]">
              Review pending requests, assign roles, and manage operator access
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => loadUsers(activeTab)}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#201C22] hover:bg-[#343039]/60 border border-[#343039] text-xs font-medium text-[#F4F1F3] transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="px-5 py-3 border-b border-[#343039] flex flex-wrap items-center gap-2 bg-[#151217]">
        {FILTER_TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const count = counts[tab.id] ?? 0;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-[#B51232] text-[#F4F1F3] crimson-glow-sm'
                  : 'bg-[#201C22] text-[#AAA3AD] hover:text-[#F4F1F3] border border-[#343039]'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.2 rounded font-mono text-[10px] ${
                  isActive ? 'bg-[#100E12]/40 text-[#F4F1F3]' : 'bg-[#262128] text-[#AAA3AD]'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {errorMsg && (
        <div className="mx-5 mt-4 p-3 rounded-lg bg-[#B51232]/15 border border-[#B51232]/50 text-xs text-[#FB7185] flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="mx-5 mt-4 p-3 rounded-lg bg-[#22C55E]/10 border border-[#22C55E]/30 text-xs text-[#4ADE80] flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{successMsg}</span>
        </div>
      )}

      <div className="overflow-x-auto mt-2">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#343039] text-xs font-medium text-[#AAA3AD] bg-[#262128]">
              <th className="py-3 px-4">Full Name</th>
              <th className="py-3 px-4">Email</th>
              <th className="py-3 px-4">Requested Role</th>
              <th className="py-3 px-4">Assigned Role</th>
              <th className="py-3 px-4">Registration Date</th>
              <th className="py-3 px-4">Account Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#343039] text-xs">
            {loading ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-[#77717B]">
                  Loading user directory...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-[#77717B]">
                  No accounts match the selected filter.
                </td>
              </tr>
            ) : (
              users.map((u) => {
                const isSelf = currentUser?.id === u.id;
                const badge = STATUS_BADGE[u.status];
                const draftRole = roleDrafts[u.id] || u.assignedRole;
                const isRejected = u.status === 'rejected';

                return (
                  <tr key={u.id} className="hover:bg-[#B51232]/5 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-medium text-[#F4F1F3]">
                        {u.fullName}
                        {isSelf && (
                          <span className="ml-2 text-[10px] font-mono text-[#D01940]">(You)</span>
                        )}
                      </div>
                      <div className="text-[11px] text-[#77717B] uppercase font-mono">
                        {u.provider}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-[#AAA3AD]">{u.email}</td>
                    <td className="py-3 px-4 text-[#AAA3AD]">
                      {ROLE_LABELS[u.requestedRole] || u.requestedRole}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <select
                          aria-label={`Assigned role for ${u.fullName}`}
                          value={draftRole}
                          disabled={isSelf || isRejected}
                          onChange={(e) => {
                            const nextRole = e.target.value as UserRole;
                            setRoleDrafts((prev) => ({ ...prev, [u.id]: nextRole }));
                            if (u.status === 'approved' && nextRole !== u.assignedRole) {
                              setConfirmState({ type: 'role', user: u, nextRole });
                            }
                          }}
                          className="px-2 py-1 rounded bg-[#262128] border border-[#343039] text-xs text-[#F4F1F3] focus:outline-none focus:border-[#B51232] disabled:opacity-60"
                        >
                          <option value="ADMINISTRATOR">Administrator</option>
                          <option value="TRANSIT_OPERATOR">Transit Operator</option>
                          <option value="OBSERVER">Observer</option>
                        </select>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-[#77717B]">
                      {new Date(u.createdAt).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded border text-[11px] font-medium ${badge.className}`}
                      >
                        {badge.label}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center justify-end gap-1.5 flex-wrap">
                        {(u.status === 'pending_approval' ||
                          u.status === 'email_verification_pending') && (
                          <>
                            <button
                              type="button"
                              onClick={() =>
                                setConfirmState({
                                  type: 'approve',
                                  user: u,
                                  nextRole: draftRole,
                                })
                              }
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#22C55E]/15 hover:bg-[#22C55E]/25 border border-[#22C55E]/35 text-[#4ADE80] font-medium transition-colors"
                            >
                              <UserCheck className="w-3 h-3" />
                              <span>Approve</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setReasonInput('');
                                setConfirmState({ type: 'reject', user: u });
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#B51232]/20 hover:bg-[#B51232]/30 border border-[#B51232]/45 text-[#FB7185] font-medium transition-colors"
                            >
                              <UserX className="w-3 h-3" />
                              <span>Reject</span>
                            </button>
                          </>
                        )}

                        {u.status === 'approved' && !isSelf && (
                          <button
                            type="button"
                            onClick={() => {
                              setReasonInput('');
                              setConfirmState({ type: 'suspend', user: u });
                            }}
                            className="px-2.5 py-1 rounded bg-[#EF4444]/15 hover:bg-[#EF4444]/25 border border-[#EF4444]/35 text-[#F87171] font-medium transition-colors"
                          >
                            Suspend Account
                          </button>
                        )}

                        {u.status === 'suspended' && (
                          <button
                            type="button"
                            onClick={() =>
                              setConfirmState({ type: 'reactivate', user: u })
                            }
                            className="px-2.5 py-1 rounded bg-[#3B82F6]/15 hover:bg-[#3B82F6]/25 border border-[#3B82F6]/35 text-[#60A5FA] font-medium transition-colors"
                          >
                            Reactivate Account
                          </button>
                        )}

                        {isRejected && (
                          <span className="text-[11px] text-[#77717B] italic">
                            Access Declined
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Confirmation Dialog */}
      {confirmState && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="admin-confirm-title"
        >
          <div className="w-full max-w-md rounded-xl bg-[#201C22] border border-[#343039] shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[#343039] bg-[#262128] flex items-center justify-between">
              <h3
                id="admin-confirm-title"
                className="text-sm font-semibold text-[#F4F1F3] font-display"
              >
                {confirmState.type === 'approve' && 'Confirm Account Approval'}
                {confirmState.type === 'reject' && 'Confirm Access Rejection'}
                {confirmState.type === 'role' && 'Confirm Role Assignment Change'}
                {confirmState.type === 'suspend' && 'Confirm Account Suspension'}
                {confirmState.type === 'reactivate' && 'Confirm Account Reactivation'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setConfirmState(null);
                  setRoleDrafts((prev) => ({
                    ...prev,
                    [confirmState.user.id]: confirmState.user.assignedRole,
                  }));
                }}
                className="p-1 rounded text-[#AAA3AD] hover:text-[#F4F1F3]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs text-[#AAA3AD]">
              <p>
                {confirmState.type === 'approve' && (
                  <>
                    Approve <strong className="text-[#F4F1F3]">{confirmState.user.fullName}</strong>{' '}
                    ({confirmState.user.email}) with assigned role{' '}
                    <strong className="text-[#4ADE80]">
                      {ROLE_LABELS[confirmState.nextRole || confirmState.user.assignedRole]}
                    </strong>
                    ?
                  </>
                )}
                {confirmState.type === 'reject' && (
                  <>
                    Reject the access request for{' '}
                    <strong className="text-[#F4F1F3]">{confirmState.user.fullName}</strong> (
                    {confirmState.user.email})? They will be blocked from signing in.
                  </>
                )}
                {confirmState.type === 'role' && confirmState.nextRole && (
                  <>
                    Change assigned role for{' '}
                    <strong className="text-[#F4F1F3]">{confirmState.user.fullName}</strong> from{' '}
                    <strong className="text-[#F4F1F3]">
                      {ROLE_LABELS[confirmState.user.assignedRole]}
                    </strong>{' '}
                    to <strong className="text-[#F4F1F3]">{ROLE_LABELS[confirmState.nextRole]}</strong>?
                  </>
                )}
                {confirmState.type === 'suspend' && (
                  <>
                    Suspend <strong className="text-[#F4F1F3]">{confirmState.user.fullName}</strong>?
                    All active sessions will be terminated immediately.
                  </>
                )}
                {confirmState.type === 'reactivate' && (
                  <>
                    Reactivate{' '}
                    <strong className="text-[#F4F1F3]">{confirmState.user.fullName}</strong> and
                    restore approved access with role{' '}
                    <strong className="text-[#F4F1F3]">
                      {ROLE_LABELS[confirmState.user.assignedRole]}
                    </strong>
                    ?
                  </>
                )}
              </p>

              {(confirmState.type === 'reject' || confirmState.type === 'suspend') && (
                <div>
                  <label
                    htmlFor="admin-action-reason"
                    className="block text-xs font-medium text-[#AAA3AD] mb-1.5"
                  >
                    Reason / Note (Optional)
                  </label>
                  <input
                    id="admin-action-reason"
                    type="text"
                    value={reasonInput}
                    onChange={(e) => setReasonInput(e.target.value)}
                    placeholder="Provide context for audit log..."
                    className="w-full px-3 py-2 rounded-lg bg-[#262128] border border-[#343039] text-xs text-[#F4F1F3] placeholder-[#77717B] focus:outline-none focus:border-[#B51232]"
                  />
                </div>
              )}
            </div>

            <div className="px-5 py-3 border-t border-[#343039] bg-[#151217] flex justify-end gap-2">
              <button
                type="button"
                disabled={actionBusy}
                onClick={() => {
                  setConfirmState(null);
                  setRoleDrafts((prev) => ({
                    ...prev,
                    [confirmState.user.id]: confirmState.user.assignedRole,
                  }));
                }}
                className="px-3.5 py-1.5 rounded-lg bg-[#201C22] hover:bg-[#262128] border border-[#343039] text-xs font-medium text-[#AAA3AD]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionBusy}
                onClick={executeConfirmedAction}
                className="px-4 py-1.5 rounded-lg bg-[#B51232] hover:bg-[#D01940] text-xs font-semibold text-[#F4F1F3] transition-colors disabled:opacity-60"
              >
                {actionBusy ? 'Applying...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
