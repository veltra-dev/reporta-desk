import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Plus } from 'lucide-react';
import { listTickets, getGitHubConfig } from '@/lib/github';
import { getSession } from '@/lib/session';
import StatsCards from '@/components/StatsCards';
import TicketListClient from '@/components/TicketListClient';
import EnvConfigBanner from '@/components/EnvConfigBanner';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const session = await getSession();
  
  if (!session) {
    redirect('/login');
  }

  const { isConfigured, repo } = getGitHubConfig();
  
  // Para visão geral: busca todos os tickets
  const tickets = await listTickets();

  return (
    <div className="space-y-6">
      {/* Banner de integração GitHub/Resend */}
      <EnvConfigBanner isConfigured={isConfigured} repoName={repo} />

      {/* Cabeçalho da Página */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-zinc-100 tracking-tight" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            Chamados & Atendimento
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            {session.role === 'admin' 
              ? 'Visão geral de suporte: gerencie todas as solicitações dos clientes.' 
              : `Acompanhe os chamados da sua empresa (${session.name}).`}
          </p>
        </div>

        <Link
          href="/tickets/novo"
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#2F5BFF] hover:bg-[#2549D6] transition-colors shadow-lg shadow-[#2F5BFF]/20"
        >
          <Plus className="w-4 h-4" />
          <span>Abrir Novo Chamado</span>
        </Link>
      </div>

      {/* Cards de Métricas */}
      <StatsCards tickets={tickets} />

      {/* Listagem Interativa com Filtros de Empresa/Geral */}
      <TicketListClient
        initialTickets={tickets}
        session={session}
      />
    </div>
  );
}
