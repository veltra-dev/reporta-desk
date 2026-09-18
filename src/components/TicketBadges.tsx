import React from 'react';
import { 
  ArrowDown, 
  ArrowUp, 
  Minus,
  AlertCircle,
  Bug,
  HelpCircle,
  Sparkles,
  Bot
} from 'lucide-react';
import { TicketStatus, TicketPriority, TicketCategory } from '@/lib/types';

export function StatusBadge({ status }: { status: TicketStatus }) {
  const configs: Record<TicketStatus, { label: string; dot: string; style: string }> = {
    novo: {
      label: 'Novo',
      dot: 'bg-blue-400',
      style: 'bg-blue-500/20 border-blue-400/40 text-blue-300',
    },
    em_andamento: {
      label: 'Em Atendimento',
      dot: 'bg-amber-400 animate-pulse',
      style: 'bg-amber-500/20 border-amber-400/40 text-amber-300',
    },
    aguardando_cliente: {
      label: 'Aguardando Resposta',
      dot: 'bg-indigo-400',
      style: 'bg-indigo-500/20 border-indigo-400/40 text-indigo-300',
    },
    resolvido: {
      label: 'Resolvido',
      dot: 'bg-emerald-400',
      style: 'bg-emerald-500/20 border-emerald-400/40 text-emerald-300',
    },
    fechado: {
      label: 'Fechado',
      dot: 'bg-zinc-500',
      style: 'bg-zinc-800/80 border-zinc-700/80 text-zinc-400',
    },
  };

  const config = configs[status] || configs.novo;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium border ${config.style}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: TicketPriority }) {
  const configs: Record<TicketPriority, { label: string; icon: React.ElementType; style: string }> = {
    baixa: {
      label: 'Baixa',
      icon: ArrowDown,
      style: 'bg-slate-500/20 border-slate-400/40 text-slate-300',
    },
    media: {
      label: 'Média',
      icon: Minus,
      style: 'bg-blue-500/20 border-blue-400/40 text-blue-300',
    },
    alta: {
      label: 'Alta',
      icon: ArrowUp,
      style: 'bg-amber-500/20 border-amber-400/40 text-amber-300',
    },
    urgente: {
      label: 'Urgente',
      icon: AlertCircle,
      style: 'bg-rose-500/20 border-rose-400/40 text-rose-300',
    },
  };

  const config = configs[priority] || configs.media;
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border ${config.style}`}>
      <Icon className="w-3 h-3 shrink-0" />
      <span>{config.label}</span>
    </span>
  );
}

export function CategoryBadge({ category }: { category: TicketCategory }) {
  const configs: Record<TicketCategory, { label: string; icon: React.ElementType; style: string }> = {
    bug: {
      label: 'Bug / Falha',
      icon: Bug,
      style: 'bg-red-500/20 border-red-500/40 text-red-300',
    },
    duvida: {
      label: 'Dúvida',
      icon: HelpCircle,
      style: 'bg-sky-500/20 border-sky-500/40 text-sky-300',
    },
    melhoria: {
      label: 'Melhoria',
      icon: Sparkles,
      style: 'bg-purple-500/20 border-purple-500/40 text-purple-300',
    },
    lico: {
      label: 'Lico (IA WhatsApp)',
      icon: Bot,
      style: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300',
    },
  };

  const config = configs[category] || configs.duvida;
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border ${config.style}`}>
      <Icon className="w-3 h-3 shrink-0" />
      <span>{config.label}</span>
    </span>
  );
}
