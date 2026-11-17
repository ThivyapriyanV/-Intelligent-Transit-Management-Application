import React, { useState } from 'react';
import { Radar, ShieldCheck, Activity, Route } from 'lucide-react';

interface AuthSplitShellProps {
  children: React.ReactNode;
}

const HERO_IMAGE_PATH = '/src/assets/images/transit_login_visual_1794915139224.jpg';

export const AuthSplitShell: React.FC<AuthSplitShellProps> = ({ children }) => {
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <div className="min-h-screen bg-[#100E12] text-[#F4F1F3] grid grid-cols-1 lg:grid-cols-12">
      {/* Left Form Panel */}
      <div className="lg:col-span-6 xl:col-span-5 flex flex-col justify-between p-6 sm:p-10 lg:px-12 lg:py-10 bg-[#121014] border-r border-[#343039]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#B51232]/20 border border-[#B51232]/60 crimson-glow-sm flex items-center justify-center shrink-0">
            <Radar className="w-5 h-5 text-[#D01940]" />
          </div>
          <div>
            <div className="text-xs font-bold tracking-[0.14em] text-[#F4F1F3] font-display uppercase">
              INTELLIGENT TRANSIT MANAGEMENT
            </div>
            <div className="text-[11px] text-[#77717B]">
              Real-Time Crowd Detection &amp; Fleet Operations
            </div>
          </div>
        </div>

        <div className="w-full max-w-md mx-auto my-8">{children}</div>

        <div className="text-[11px] text-[#77717B] flex items-center justify-between gap-2 pt-4 border-t border-[#343039]/60">
          <span>Chennai Smart Mobility Command Prototype</span>
          <span className="font-mono text-[#AAA3AD]">RBAC Protected</span>
        </div>
      </div>

      {/* Right Brand Visual Panel */}
      <div className="hidden lg:flex lg:col-span-6 xl:col-span-7 relative overflow-hidden bg-[#151217] items-end p-10 xl:p-14">
        {/* Styled fallback gradient layer */}
        <div
          className="absolute inset-0 bg-gradient-to-br from-[#230E14] via-[#151217] to-[#100E12]"
          aria-hidden="true"
        />

        {!imageFailed && (
          <img
            src={HERO_IMAGE_PATH}
            alt="Nocturnal smart city transit command corridor"
            onError={() => setImageFailed(true)}
            className="absolute inset-0 w-full h-full object-cover object-center opacity-75"
          />
        )}

        {/* Atmospheric obsidian & subtle crimson vignette */}
        <div
          className="absolute inset-0 bg-gradient-to-t from-[#100E12] via-[#100E12]/55 to-[#100E12]/35"
          aria-hidden="true"
        />
        <div
          className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-[#B51232]/20 blur-3xl pointer-events-none"
          aria-hidden="true"
        />

        <div className="relative z-10 max-w-xl space-y-5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-[#201C22]/90 border border-[#B51232]/50 text-xs font-medium text-[#FB7185] crimson-glow-sm">
            <ShieldCheck className="w-3.5 h-3.5 text-[#D01940]" />
            <span>Controlled Operations Access</span>
          </div>

          <h2 className="text-3xl xl:text-4xl font-semibold text-[#F4F1F3] font-display tracking-tight leading-tight">
            Smarter Transit. Better Decisions.
          </h2>

          <p className="text-sm text-[#AAA3AD] leading-relaxed">
            Monitor terminal platform density, forecast commuter surges across corridors, and
            coordinate rapid bus fleet dispatch from a unified command workspace.
          </p>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="p-3.5 rounded-xl bg-[#201C22]/85 backdrop-blur-xs border border-[#343039]">
              <div className="flex items-center gap-2 text-xs font-medium text-[#F4F1F3] mb-1">
                <Activity className="w-3.5 h-3.5 text-[#D01940]" />
                <span>Station Crowd Telemetry</span>
              </div>
              <p className="text-[11px] text-[#77717B]">
                Live zone occupancy bands &amp; predictive flow alerts
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-[#201C22]/85 backdrop-blur-xs border border-[#343039]">
              <div className="flex items-center gap-2 text-xs font-medium text-[#F4F1F3] mb-1">
                <Route className="w-3.5 h-3.5 text-[#D01940]" />
                <span>Fleet &amp; Route Allocation</span>
              </div>
              <p className="text-[11px] text-[#77717B]">
                Dynamic capacity gap balancing across transit corridors
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
