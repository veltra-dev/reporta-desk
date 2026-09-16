import React from 'react';
import { Ticket } from '@/lib/types';
import { Inbox, Clock, CheckCircle2, AlertCircle } from 'lucide-react';

export default function StatsCards({ tickets }: { tickets: Ticket[] }) {
  const total = tickets.length;
  const emAndamento = tickets.filter(t => t.status === 'em_andamento').length;
  const novos = tickets.filter(t => t.status === 'novo').length;
  const resolvidos = tickets.filter(t => t.status === 'resolvido' || t.status === 'fechado').length;
  const urgentes = tickets.filter(t => t.priority === 'urgente' && t.status !== 'fechado' && t.status !== 'resolvido').length;

  const stats = [
    {
      label: 'Chamados Ativos',
      value: total - resolvidos,
      subtext: `${novos} novos`,
      icon: Inbox,
    },
    {
      label: 'Em Atendimento',
      value: emAndamento,
      subtext: 'Em análise técnica',
      icon: Clock,
    },
    {
      label: 'Urgentes',
      value: urgentes,
      subtext: 'Alta prioridade',
      icon: AlertCircle,
    },
    {
      label: 'Resolvidos',
      value: resolvidos,
      subtext: 'Concluídos com sucesso',
      icon: CheckCircle2,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
      {stats.map((item, idx) => {
        const Icon = item.icon;
        return (
          <div
            key={idx}
            className="rounded-xl bg-[#121215] p-4 border border-zinc-800/90 transition-colors hover:border-zinc-700"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-medium text-zinc-400">
                {item.label}
              </span>
              <Icon className="w-4 h-4 text-zinc-500" />
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-xl font-semibold text-zinc-100 tracking-tight">{item.value}</span>
            </div>
            <p className="text-[11px] text-zinc-500 mt-0.5">{item.subtext}</p>
          </div>
        );
      })}
    </div>
  );
}
