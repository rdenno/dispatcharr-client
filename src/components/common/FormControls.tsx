import React from 'react';
import { Search, Loader2, Inbox } from 'lucide-react';

export const SearchField: React.FC<{
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
}> = ({ value, onChange, placeholder = 'Search...', className = '' }) => (
  <div className={`relative flex-1 ${className}`}>
    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-9 pr-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition"
    />
  </div>
);

export const TextInput: React.FC<{
  label: string;
  value: string;
  onChange: (val: string) => void;
  type?: string;
  placeholder?: string;
  description?: string;
  disabled?: boolean;
  required?: boolean;
}> = ({ label, value, onChange, type = 'text', placeholder, description, disabled, required }) => (
  <div className="space-y-1.5">
    <label className="block text-xs font-medium text-zinc-300">
      {label} {required && <span className="text-red-400">*</span>}
    </label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 disabled:opacity-50 transition"
    />
    {description && <p className="text-xs text-zinc-500">{description}</p>}
  </div>
);

export const SelectField: React.FC<{
  label: string;
  value: any;
  onChange: (val: any) => void;
  options: Array<{ value: any; label: string }>;
  noneLabel?: string;
  description?: string;
}> = ({ label, value, onChange, options, noneLabel, description }) => (
  <div className="space-y-1.5">
    <label className="block text-xs font-medium text-zinc-300">{label}</label>
    <select
      value={value ?? ''}
      onChange={(e) => {
        const v = e.target.value;
        onChange(v === '' ? null : isNaN(Number(v)) ? v : Number(v));
      }}
      className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition"
    >
      {noneLabel && <option value="">{noneLabel}</option>}
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
    {description && <p className="text-xs text-zinc-500">{description}</p>}
  </div>
);

export const SwitchRow: React.FC<{
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}> = ({ label, description, checked, onChange }) => (
  <div className="flex items-center justify-between py-2">
    <div>
      <div className="text-sm font-medium text-zinc-200">{label}</div>
      {description && <div className="text-xs text-zinc-400">{description}</div>}
    </div>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
        checked ? 'bg-teal-600' : 'bg-zinc-700'
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  </div>
);

export const LoadingBox: React.FC<{ message?: string }> = ({ message = 'Loading...' }) => (
  <div className="flex flex-col items-center justify-center p-12 space-y-3 text-zinc-400">
    <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
    <span className="text-sm">{message}</span>
  </div>
);

export const EmptyBox: React.FC<{ message: string; submessage?: string }> = ({
  message,
  submessage,
}) => (
  <div className="flex flex-col items-center justify-center p-12 space-y-2 text-center text-zinc-400 bg-zinc-800/30 border border-zinc-800 rounded-xl my-4">
    <Inbox className="w-10 h-10 text-zinc-500" />
    <div className="font-medium text-zinc-300">{message}</div>
    {submessage && <div className="text-xs text-zinc-500 max-w-sm">{submessage}</div>}
  </div>
);
