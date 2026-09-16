import React from 'react';
import LoginForm from './LoginForm';

export const metadata = {
  title: 'Entrar • ReportaDesk',
  description: 'Acesse a sua conta no ReportaDesk para gerenciar seus chamados.',
};

export default function LoginPage() {
  return (
    <div className="min-h-[75vh] flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-[#12141A] p-8 rounded-2xl border border-zinc-800/80 shadow-2xl shadow-black/50">
        
        {/* Cabeçalho */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#2F5BFF] text-white font-bold text-xl mb-3 shadow-lg shadow-[#2F5BFF]/30">
            <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-7 h-7">
              <path d="M10 4H38A8 8 0 0146 12V28A8 8 0 0138 36H25L15 44V36H10A8 8 0 012 28V12A8 8 0 0110 4Z" fill="#2F5BFF" />
              <circle cx="14.5" cy="20" r="3.4" fill="#D9F24A" />
              <circle cx="24" cy="20" r="3.4" fill="#F7F7F4" />
              <circle cx="33.5" cy="20" r="3.4" fill="#7E93FF" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-[#F7F7F4]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            Reporta<span className="font-normal text-zinc-300">Desk</span>
          </h2>
          <p className="mt-1.5 text-xs text-zinc-400">
            Entre com seus dados para acompanhar ou gerenciar chamados
          </p>
        </div>

        <LoginForm />

      </div>
    </div>
  );
}
