import React from 'react';
import { X } from 'lucide-react';

interface AuthLegalModalProps {
  doc: 'terms' | 'privacy' | null;
  onClose: () => void;
}

export const AuthLegalModal: React.FC<AuthLegalModalProps> = ({ doc, onClose }) => {
  if (!doc) return null;

  const isTerms = doc === 'terms';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="legal-modal-title"
    >
      <div className="w-full max-w-lg rounded-xl bg-[#201C22] border border-[#343039] shadow-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#343039] bg-[#262128] flex items-center justify-between">
          <h2 id="legal-modal-title" className="text-sm font-semibold text-[#F4F1F3] font-display">
            {isTerms ? 'Terms of Service' : 'Privacy Policy'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1 rounded-md text-[#AAA3AD] hover:text-[#F4F1F3] hover:bg-[#343039]/50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-3 text-xs leading-relaxed text-[#AAA3AD] max-h-[65vh] overflow-y-auto">
          {isTerms ? (
            <>
              <p className="text-[#F4F1F3] font-medium">
                Intelligent Transit Management &amp; Real-Time Crowd Detection System
              </p>
              <p>
                Access to the Transit Operations Portal is restricted to authorized municipal
                transit operators, analysts, and administrators. All newly registered accounts
                require email verification and explicit administrator approval prior to accessing
                operational dashboards.
              </p>
              <p>
                Role assignments govern read and dispatch permissions. Users must safeguard
                credentials, never share active sessions, and promptly report unauthorized access.
              </p>
            </>
          ) : (
            <>
              <p className="text-[#F4F1F3] font-medium">Data Handling &amp; Session Privacy</p>
              <p>
                Authentication stores your full name, organizational email, role assignment,
                verification state, and hashed password credentials solely for access control and
                security auditing.
              </p>
              <p>
                Sessions use HttpOnly cookies with CSRF protection and are never persisted in
                client-side localStorage. Crowd analytics feeds shown inside this prototype use
                simulated station telemetry.
              </p>
            </>
          )}
        </div>

        <div className="px-5 py-3 border-t border-[#343039] bg-[#151217] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[#B51232] hover:bg-[#D01940] text-xs font-medium text-[#F4F1F3] transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
