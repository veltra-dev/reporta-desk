import React from 'react';
import LoginForm from './LoginForm';
import Logo from '@/components/Logo';

export const metadata = {
  title: 'Entrar • ReportaDesk',
  description: 'Acesse a sua conta no ReportaDesk para gerenciar seus chamados.',
};

export default function LoginPage() {
  return (
    <div className="min-h-[75vh] flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-[#12141A] p-8 rounded-2xl border border-zinc-800/80 shadow-2xl shadow-black/50">
        
        {/* Cabeçalho */}
        <div className="text-center flex flex-col items-center">
          <Logo size="lg" className="mb-2" />
          <p className="mt-1.5 text-xs text-zinc-400">
            Entre com seus dados para acompanhar ou gerenciar chamados
          </p>
        </div>

        <LoginForm />

      </div>
    </div>
  );
}
