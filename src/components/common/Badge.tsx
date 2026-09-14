import React from 'react';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'mint' | 'blue' | 'neutral' | 'danger' | 'amber';
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'md',
  className = ''
}) => {
  const sizeClasses = {
    sm: "px-2 py-0.5 text-[10px]",
    md: "px-2.5 py-1 text-xs"
  };

  const variants = {
    mint: "bg-[#5BD19B]/15 text-[#5BD19B] border border-[#5BD19B]/30",
    blue: "bg-[#4D8EF7]/15 text-[#4D8EF7] border border-[#4D8EF7]/30",
    neutral: "bg-[#152234] text-zinc-300 border border-[#1F324B]",
    danger: "bg-red-500/15 text-red-400 border border-red-500/30",
    amber: "bg-amber-500/15 text-amber-400 border border-amber-500/30"
  };

  return (
    <span className={`inline-flex items-center gap-1.5 font-semibold rounded-full font-sans tracking-wide uppercase ${sizeClasses[size]} ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
};
