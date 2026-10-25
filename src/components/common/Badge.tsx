import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  color?: 'teal' | 'red' | 'blue' | 'orange' | 'green' | 'yellow' | 'zinc';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ children, color = 'teal', className = '' }) => {
  const colorStyles = {
    teal: 'bg-teal-500/20 text-teal-300 border-teal-500/40',
    red: 'bg-red-500/20 text-red-300 border-red-500/40',
    blue: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
    orange: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    green: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    yellow: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
    zinc: 'bg-zinc-700/50 text-zinc-300 border-zinc-600/50',
  }[color];

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border uppercase tracking-wider ${colorStyles} ${className}`}
    >
      {children}
    </span>
  );
};
