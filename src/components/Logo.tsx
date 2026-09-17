import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'full' | 'symbol' | 'small';
}

export function LogoSymbol({ className = 'w-8 h-8', small = false }: { className?: string; small?: boolean }) {
  if (small) {
    return (
      <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <path d="M10 4H38A8 8 0 0146 12V28A8 8 0 0138 36H25L15 44V36H10A8 8 0 012 28V12A8 8 0 0110 4Z" fill="#2F5BFF" />
        <circle cx="24" cy="20" r="4" fill="#D9F24A" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M10 4H38A8 8 0 0146 12V28A8 8 0 0138 36H25L15 44V36H10A8 8 0 012 28V12A8 8 0 0110 4Z" fill="#2F5BFF" />
      <circle cx="14.5" cy="20" r="3.4" fill="#D9F24A" />
      <circle cx="24" cy="20" r="3.4" fill="#F7F7F4" className="logo-middle-dot transition-colors" />
      <circle cx="33.5" cy="20" r="3.4" fill="#7E93FF" />
    </svg>
  );
}

export default function Logo({ className = '', size = 'md', variant = 'full' }: LogoProps) {
  const iconSizes = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
  };

  const heights = {
    sm: 'h-6',
    md: 'h-8',
    lg: 'h-10',
  };

  if (variant === 'symbol') {
    return <LogoSymbol className={iconSizes[size]} small={size === 'sm'} />;
  }

  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      <LogoSymbol className={iconSizes[size]} small={size === 'sm'} />
      <span className={`font-sans tracking-tight text-[#F7F7F4] logo-text flex items-center ${heights[size]}`} style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
        <span className="font-normal text-lg sm:text-xl">Reporta</span>
        <span className="font-bold text-lg sm:text-xl">Desk</span>
      </span>
    </div>
  );
}
