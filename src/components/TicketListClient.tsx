'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Search, Plus, Inbox, Users, User, Shield } from 'lucide-react';
import { Ticket, SessionUser } from '@/lib/types';
import TicketCard from './TicketCard';

interface TicketListClientProps {
  initialTickets: Ticket[];
  session: SessionUser;
}

export default function TicketListClient({
  initialTickets,
  session,
}: TicketListClientProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [priorityFilter, setPriorityFilter] = useState<string>('todas');
  
  // Por padrão, exibe a visão GERAL (falso para onlyMine) para evitar duplicação de chamados
  const [viewScope, setViewScope] = useState<'all' | 'mine'>('all');

  const filteredTickets = useMemo(() => {
    return initialTickets.filter(ticket => {
      // Se o usuário selecionou ver APENAS os dele
      if (viewScope === 'mine') {
        if (ticket.clientEmail.toLowerCase() !== session.email.toLowerCase()) {
          return false;
        }
      }

      if (statusFilter !== 'todos') {
        if (statusFilter === 'ativos') {
          if (ticket.status === 'resolvido' || ticket.status === 'fechado') return false;
        } else if (ticket.status !== statusFilter) {
          return false;
        }
      }

      if (priorityFilter !== 'todas' && ticket.priority !== priorityFilter) {
        return false;
      }

      if (search.trim()) {
        const query = search.toLowerCase();
        const matchTitle = ticket.title.toLowerCase().includes(query);
        const matchBody = ticket.body.toLowerCase().includes(query);
        const matchClient = ticket.clientName.toLowerCase().includes(query);
        const matchId = String(ticket.id).includes(query);
        if (!matchTitle && !matchBody && !matchClient && !matchId) {
          return false;
        }
      }

      return true;
    });
  }, [initialTickets, search, statusFilter, priorityFilter, viewScope, session.email]);

  return (
    <div className="space-y-4">
      
      {/* Seletor de Escopo de Visibilidade (Geral x Meus Chamados) */}
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewScope('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
              viewScope === 'all'
                ? 'bg-[#2F5BFF] text-white shadow-md shadow-[#2F5BFF]/20'
                : 'bg-[#12141A] text-zinc-400 border border-zinc-800 hover:text-zinc-200'
            }`}
          >
            {session.role === 'admin' ? (
              <>
                <Shield className="w-3.5 h-3.5" />
                <span>Todos os Chamados (Geral)</span>
              </>
            ) : (
              <>
                <Users className="w-3.5 h-3.5" />
                <span>Todos os Chamados da Empresa</span>
              </>
            )}
          </button>

          <button
            onClick={() => setViewScope('mine')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
              viewScope === 'mine'
                ? 'bg-zinc-800 text-white border border-zinc-700'
                : 'bg-[#12141A] text-zinc-400 border border-zinc-800 hover:text-zinc-200'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Criados por Mim</span>
          </button>
        </div>

        <span className="text-[11px] text-zinc-500 hidden sm:inline-block">
          {viewScope === 'all' 
            ? 'Exibindo solicitações de toda a equipe para evitar duplicidade' 
            : `Exibindo apenas chamados de ${session.email}`}
        </span>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="bg-[#12141A] p-3 rounded-2xl flex flex-col md:flex-row gap-3 items-center justify-between border border-zinc-800">
        
        {/* Input de Busca */}
        <div className="relative w-full md:w-80">
          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por título, ID ou descrição..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs text-zinc-100 bg-zinc-900 border border-zinc-800 rounded-xl placeholder-zinc-500 focus:outline-none focus:border-[#2F5BFF] transition-colors"
          />
        </div>

        {/* Abas e Filtros */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
          
          {/* Status Pills */}
          <div className="flex items-center p-0.5 bg-zinc-900 rounded-xl border border-zinc-800 text-xs">
            <button
              onClick={() => setStatusFilter('todos')}
              className={`px-2.5 py-1 rounded-lg transition-colors font-medium ${
                statusFilter === 'todos'
                  ? 'bg-zinc-800 text-zinc-100'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Todos ({initialTickets.length})
            </button>
            <button
              onClick={() => setStatusFilter('ativos')}
              className={`px-2.5 py-1 rounded-lg transition-colors font-medium ${
                statusFilter === 'ativos'
                  ? 'bg-zinc-800 text-zinc-100'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Ativos
            </button>
            <button
              onClick={() => setStatusFilter('em_andamento')}
              className={`px-2.5 py-1 rounded-lg transition-colors font-medium ${
                statusFilter === 'em_andamento'
                  ? 'bg-zinc-800 text-zinc-100'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Em Atendimento
            </button>
            <button
              onClick={() => setStatusFilter('resolvido')}
              className={`px-2.5 py-1 rounded-lg transition-colors font-medium ${
                statusFilter === 'resolvido'
                  ? 'bg-zinc-800 text-zinc-100'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Resolvidos
            </button>
          </div>

          {/* Dropdown de Prioridade */}
          <select
            value={priorityFilter}
            onChange={e => setPriorityFilter(e.target.value)}
            className="px-2.5 py-1 rounded-xl text-xs bg-zinc-900 border border-zinc-800 text-zinc-300 focus:outline-none focus:border-[#2F5BFF] cursor-pointer"
          >
            <option value="todas">Prioridade: Todas</option>
            <option value="urgente">Urgente</option>
            <option value="alta">Alta</option>
            <option value="media">Média</option>
            <option value="baixa">Baixa</option>
          </select>

        </div>

      </div>

      {/* Lista de Chamados */}
      {filteredTickets.length > 0 ? (
        <div className="space-y-2.5">
          {filteredTickets.map(ticket => (
            <TicketCard key={ticket.id} ticket={ticket} />
          ))}
        </div>
      ) : (
        <div className="bg-[#12141A] rounded-2xl p-10 text-center border border-zinc-800 my-4 shadow-lg">
          <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-500 flex items-center justify-center mx-auto mb-3">
            <Inbox className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-medium text-zinc-200 mb-1">Nenhum chamado encontrado</h3>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto mb-5">
            {search || statusFilter !== 'todos' || priorityFilter !== 'todas'
              ? 'Nenhum resultado para estes filtros de busca.'
              : 'Nenhum chamado registrado no escopo selecionado.'}
          </p>
          <div className="flex items-center justify-center gap-2">
            {(search || statusFilter !== 'todos' || priorityFilter !== 'todas') && (
              <button
                onClick={() => {
                  setSearch('');
                  setStatusFilter('todos');
                  setPriorityFilter('todas');
                }}
                className="px-3 py-1.5 rounded-xl text-xs font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 transition-colors"
              >
                Limpar Filtros
              </button>
            )}
            <Link
              href="/tickets/novo"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-[#2F5BFF] hover:bg-[#2549D6] transition-colors shadow-md shadow-[#2F5BFF]/20"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Novo Chamado</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
