import React from 'react';
import Link from 'next/link';
import { MessageSquare, ExternalLink, Calendar, ArrowRight } from 'lucide-react';
import { Ticket } from '@/lib/types';
import { StatusBadge, PriorityBadge, CategoryBadge } from './TicketBadges';

function formatDateRelative(dateStr: string) {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffHours < 1) {
      const diffMinutes = Math.max(1, Math.floor(diffMs / (1000 * 60)));
      return `há ${diffMinutes} min`;
    }
    if (diffHours < 24) {
      return `há ${diffHours}h`;
    }
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'ontem';
    if (diffDays < 7) return `há ${diffDays} dias`;
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  } catch {
    return dateStr;
  }
}

export default function TicketCard({ ticket }: { ticket: Ticket }) {
  return (
    <div className="group rounded-xl bg-[#121215] p-4 sm:p-5 border border-zinc-800 hover:border-zinc-700 hover:bg-[#16161a] transition-all duration-150">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Lado Esquerdo */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="font-mono text-[11px] text-zinc-400 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">
              #{ticket.id}
            </span>
            <StatusBadge status={ticket.status} />
            <PriorityBadge priority={ticket.priority} />
            <CategoryBadge category={ticket.category} />
          </div>

          <Link href={`/tickets/${ticket.id}`} className="block group-hover:text-white transition-colors">
            <h3 className="text-sm font-medium text-zinc-200 truncate mb-1">
              {ticket.title}
            </h3>
          </Link>

          <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed mb-3">
            {ticket.body}
          </p>

          <div className="flex flex-wrap items-center gap-3 text-[11px] text-zinc-500">
            <span className="text-zinc-400 font-medium">
              {ticket.clientName}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3 text-zinc-500" />
              {formatDateRelative(ticket.createdAt)}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1 text-zinc-400">
              <MessageSquare className="w-3 h-3 text-zinc-500" />
              {ticket.commentsCount} {ticket.commentsCount === 1 ? 'resposta' : 'respostas'}
            </span>
          </div>
        </div>

        {/* Lado Direito */}
        <div className="flex items-center gap-2 self-end md:self-center shrink-0">
          {ticket.githubUrl && (
            <a
              href={ticket.githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/80 border border-transparent hover:border-zinc-700 transition-all text-xs flex items-center gap-1"
              title="Ver no GitHub"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}

          <Link
            href={`/tickets/${ticket.id}`}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-300 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 transition-all"
          >
            <span>Ver Conversa</span>
            <ArrowRight className="w-3 h-3 text-zinc-500 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

      </div>
    </div>
  );
}
