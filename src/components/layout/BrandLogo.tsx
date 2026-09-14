import React from 'react';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showImage?: boolean;
  className?: string;
  onClick?: () => void;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'md',
  showImage = true,
  className = '',
  onClick
}) => {
  const heights = {
    sm: 'h-8',
    md: 'h-10',
    lg: 'h-14'
  };

  return (
    <div
      className={`inline-flex items-center gap-2 cursor-pointer select-none group ${className}`}
      onClick={onClick}
    >
      {showImage && (
        <img
          src="/logo.png"
          alt="GearUp Esports Logo"
          className={`${heights[size]} w-auto rounded-md object-contain transition-transform duration-300 group-hover:scale-105`}
        />
      )}
      <div className="flex flex-col leading-none">
        <div className="flex items-center text-xl sm:text-2xl font-black font-display tracking-tight">
          <span className="text-[#5BD19B] drop-shadow-[0_0_12px_rgba(91,209,155,0.4)]">GEAR</span>
          <span className="text-[#4D8EF7] drop-shadow-[0_0_12px_rgba(77,142,247,0.4)]">UP</span>
        </div>
        <span className="text-[9px] sm:text-[10px] font-extrabold tracking-[0.28em] text-white/90 uppercase font-sans">
          ESPORTS
        </span>
      </div>
    </div>
  );
};
