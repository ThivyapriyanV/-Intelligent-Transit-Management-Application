import React, { useState } from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';

interface PasswordInputProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
  error?: string | null;
}

export const PasswordInput: React.FC<PasswordInputProps> = ({
  id,
  label,
  value,
  onChange,
  placeholder = '••••••••••••',
  autoComplete = 'current-password',
  required = true,
  error,
}) => {
  const [visible, setVisible] = useState(false);

  return (
    <div>
      <label
        htmlFor={id}
        className="block text-xs font-medium text-[#AAA3AD] mb-1.5"
      >
        {label}
      </label>
      <div className="relative">
        <Lock className="w-4 h-4 text-[#77717B] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required={required}
          className={`w-full pl-9 pr-10 py-2.5 rounded-lg bg-[#262128] border text-sm text-[#F4F1F3] placeholder-[#77717B] focus:outline-none transition-colors ${
            error
              ? 'border-[#B51232] focus:border-[#D01940]'
              : 'border-[#343039] focus:border-[#B51232]'
          }`}
        />
        <button
          type="button"
          onClick={() => setVisible((prev) => !prev)}
          aria-label={visible ? `Hide ${label}` : `Show ${label}`}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded text-[#77717B] hover:text-[#F4F1F3] transition-colors"
        >
          {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
      {error && <p className="mt-1 text-xs text-[#FB7185]">{error}</p>}
    </div>
  );
};
