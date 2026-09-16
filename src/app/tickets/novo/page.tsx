import React from 'react';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import TicketForm from '@/components/TicketForm';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Novo Chamado • ReportaDesk',
  description: 'Abra um novo chamado de suporte com integração direta ao GitHub.',
};

export default async function NewTicketPage() {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  return <TicketForm session={session} />;
}
