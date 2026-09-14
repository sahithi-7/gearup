import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'blue' | 'outline' | 'outline-blue' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className = '',
  disabled,
  ...props
}) => {
  const base = "font-display uppercase tracking-wider font-bold rounded-lg transition-all duration-200 flex items-center justify-center gap-2 select-none active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none";

  const sizeClasses = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-5 py-2.5 text-sm",
    lg: "px-7 py-3.5 text-base"
  };

  const variants = {
    primary: "bg-[#5BD19B] hover:bg-[#4ec28e] text-[#0B131E] font-black shadow-[0_0_16px_rgba(91,209,155,0.3)]",
    blue: "bg-[#4D8EF7] hover:bg-[#3d7ee5] text-white font-black shadow-[0_0_16px_rgba(77,142,247,0.3)]",
    outline: "border-2 border-[#5BD19B] text-[#5BD19B] hover:bg-[#5BD19B]/10",
    'outline-blue': "border-2 border-[#4D8EF7] text-[#4D8EF7] hover:bg-[#4D8EF7]/10",
    ghost: "text-zinc-400 hover:text-white hover:bg-[#152234]",
    danger: "bg-red-500/90 hover:bg-red-500 text-white"
  };

  return (
    <button
      className={`${base} ${sizeClasses[size]} ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};
