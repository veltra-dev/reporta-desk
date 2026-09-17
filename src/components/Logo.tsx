import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'full' | 'symbol' | 'small';
}

export function LogoSymbol({ className = 'w-7 h-7', small = false }: { className?: string; small?: boolean }) {
  if (small) {
    return (
      <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <path d="M10 4H38A8 8 0 0146 12V28A8 8 0 0138 36H25L15 44V36H10A8 8 0 012 28V12A8 8 0 0110 4Z" fill="#2F5BFF" />
        <circle cx="24" cy="20" r="4" fill="#D9F24A" />
      </svg>
    );
  }

  return (
    <>
      <img
        src="/brand/reportadesk-symbol-on-dark.svg"
        alt="ReportaDesk Símbolo"
        className={`${className} dark-logo`}
      />
      <img
        src="/brand/reportadesk-symbol-primary.svg"
        alt="ReportaDesk Símbolo"
        className={`${className} light-logo`}
      />
    </>
  );
}

export default function Logo({ className = '', size = 'md', variant = 'full' }: LogoProps) {
  const heights = {
    sm: 'h-6',
    md: 'h-7',
    lg: 'h-9',
  };

  if (variant === 'symbol') {
    return <LogoSymbol className={heights[size]} small={size === 'sm'} />;
  }

  return (
    <div className={`inline-flex items-center shrink-0 ${className}`}>
      {/* Lockup Oficial para fundo escuro */}
      <img
        src="/brand/reportadesk-lockup-dark-bg.svg"
        alt="ReportaDesk"
        className={`${heights[size]} w-auto dark-logo block`}
      />
      {/* Lockup Oficial para fundo claro */}
      <img
        src="/brand/reportadesk-lockup-light-bg.svg"
        alt="ReportaDesk"
        className={`${heights[size]} w-auto light-logo hidden`}
      />
    </div>
  );
}
