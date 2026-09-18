import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { getTicket, listTickets } from '@/lib/github';
import { getSession } from '@/lib/session';
import { getUsersList } from '@/lib/users';
import TicketDetailClient from '@/components/TicketDetailClient';

export const dynamic = 'force-dynamic';

interface TicketDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: TicketDetailPageProps) {
  const { id } = await params;
  const ticketId = parseInt(id, 10);
  const ticket = await getTicket(ticketId);

  return {
    title: ticket ? `Ticket #${ticket.id}: ${ticket.title} • ReportaDesk` : `Ticket #${id} • ReportaDesk`,
  };
}

export default async function TicketDetailPage({ params }: TicketDetailPageProps) {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  const { id } = await params;
  const ticketId = parseInt(id, 10);
  const ticket = await getTicket(ticketId);
  const allUsers = await getUsersList();
  const allTickets = await listTickets();

  const availableTickets = allTickets.filter(t => t.id !== ticketId).map(t => ({ id: t.id, title: t.title, status: t.status }));

  const availableUsers = allUsers.filter(u => u.role === 'client').map(u => ({
    name: u.name,
    email: u.email,
    role: u.role,
    company: u.company,
  }));

  if (!ticket) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-bold text-white mb-2">Chamado não encontrado</h1>
        <p className="text-sm text-zinc-400 mb-6">
          O ticket #{id} não existe no GitHub ou foi removido.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-zinc-800 hover:bg-zinc-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar para Lista de Chamados</span>
        </Link>
      </div>
    );
  }

  return <TicketDetailClient ticket={ticket} session={session} availableUsers={availableUsers} availableTickets={availableTickets} />;
}
