import React from 'react';
import { Check, X } from 'lucide-react';
import { evaluatePasswordStrength } from '../../services/authService';

interface PasswordStrengthMeterProps {
  password: string;
}

export const PasswordStrengthMeter: React.FC<PasswordStrengthMeterProps> = ({ password }) => {
  if (!password) {
    return null;
  }

  const strength = evaluatePasswordStrength(password);

  const barColor =
    strength.score <= 1
      ? 'bg-[#EF4444]'
      : strength.score === 2
        ? 'bg-[#F59E0B]'
        : strength.score === 3
          ? 'bg-[#3B82F6]'
          : 'bg-[#22C55E]';

  const labelColor =
    strength.score <= 1
      ? 'text-[#FB7185]'
      : strength.score === 2
        ? 'text-[#FBBF24]'
        : strength.score === 3
          ? 'text-[#60A5FA]'
          : 'text-[#4ADE80]';

  return (
    <div className="mt-2 p-3 rounded-lg bg-[#151217] border border-[#343039] space-y-2.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-[#AAA3AD]">Password Strength</span>
        <span className={`font-medium font-mono ${labelColor}`}>{strength.label}</span>
      </div>

      <div className="grid grid-cols-4 gap-1.5">
        {[1, 2, 3, 4].map((step) => (
          <div
            key={step}
            className={`h-1.5 rounded-full transition-colors ${
              strength.score >= step ? barColor : 'bg-[#262128]'
            }`}
          />
        ))}
      </div>

      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-0.5">
        {strength.checks.map((item) => (
          <li
            key={item.label}
            className={`flex items-center gap-1.5 text-[11px] ${
              item.passed ? 'text-[#4ADE80]' : 'text-[#77717B]'
            }`}
          >
            {item.passed ? (
              <Check className="w-3 h-3 shrink-0" />
            ) : (
              <X className="w-3 h-3 shrink-0" />
            )}
            <span>{item.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};
