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
    <div className={`relative inline-flex items-center justify-center shrink-0 ${className}`}>
      {/* Símbolo para fundo escuro */}
      <img
        src="/brand/reportadesk-symbol-on-dark.svg"
        alt="ReportaDesk"
        className="w-full h-full dark-logo block"
      />
      {/* Símbolo para fundo claro */}
      <img
        src="/brand/reportadesk-symbol-primary.svg"
        alt="ReportaDesk"
        className="w-full h-full light-logo hidden"
      />
    </div>
  );
}

export default function Logo({ className = '', size = 'md', variant = 'full' }: LogoProps) {
  const iconSizes = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
  };

  const textSizes = {
    sm: 'text-base',
    md: 'text-xl',
    lg: 'text-2xl',
  };

  if (variant === 'symbol') {
    return <LogoSymbol className={iconSizes[size]} small={size === 'sm'} />;
  }

  return (
    <div className={`inline-flex items-center gap-2.5 shrink-0 ${className}`}>
      <LogoSymbol className={iconSizes[size]} small={size === 'sm'} />
      <span className={`font-sans tracking-tight logo-text select-none flex items-center ${textSizes[size]}`} style={{ fontFamily: 'var(--font-space-grotesk), Space Grotesk, sans-serif' }}>
        <span className="font-normal text-[#F7F7F4] logo-text">Reporta</span>
        <span className="font-bold text-[#F7F7F4] logo-text">Desk</span>
      </span>
    </div>
  );
}
