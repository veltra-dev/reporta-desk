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
  const configs: Record<TicketStatus, { label: string; dot: string; text: string }> = {
    novo: {
      label: 'Novo',
      dot: 'bg-blue-500',
      text: 'text-zinc-300',
    },
    em_andamento: {
      label: 'Em Atendimento',
      dot: 'bg-amber-500',
      text: 'text-zinc-300',
    },
    aguardando_cliente: {
      label: 'Aguardando Resposta',
      dot: 'bg-indigo-400',
      text: 'text-zinc-300',
    },
    resolvido: {
      label: 'Resolvido',
      dot: 'bg-emerald-500',
      text: 'text-zinc-300',
    },
    fechado: {
      label: 'Fechado',
      dot: 'bg-zinc-500',
      text: 'text-zinc-400',
    },
  };

  const config = configs[status] || configs.novo;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium bg-zinc-900 border border-zinc-800 ${config.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: TicketPriority }) {
  const configs: Record<TicketPriority, { label: string; icon: React.ElementType; text: string }> = {
    baixa: {
      label: 'Baixa',
      icon: ArrowDown,
      text: 'text-zinc-400',
    },
    media: {
      label: 'Média',
      icon: Minus,
      text: 'text-zinc-300',
    },
    alta: {
      label: 'Alta',
      icon: ArrowUp,
      text: 'text-amber-400',
    },
    urgente: {
      label: 'Urgente',
      icon: AlertCircle,
      text: 'text-rose-400',
    },
  };

  const config = configs[priority] || configs.media;
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-zinc-900 border border-zinc-800 ${config.text}`}>
      <Icon className="w-3 h-3" />
      <span>{config.label}</span>
    </span>
  );
}

export function CategoryBadge({ category }: { category: TicketCategory }) {
  const configs: Record<TicketCategory, { label: string; icon: React.ElementType }> = {
    bug: { label: 'Bug / Falha', icon: Bug },
    duvida: { label: 'Dúvida', icon: HelpCircle },
    melhoria: { label: 'Melhoria', icon: Sparkles },
    lico: { label: 'Lico (IA WhatsApp)', icon: Bot },
  };

  const config = configs[category] || configs.duvida;
  const Icon = config.icon;

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-zinc-900 border border-zinc-800 text-zinc-300">
      <Icon className="w-3 h-3 text-zinc-400 shrink-0" />
      <span>{config.label}</span>
    </span>
  );
}
