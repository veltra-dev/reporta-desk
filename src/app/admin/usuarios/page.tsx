import React from 'react';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { getUsersList } from '@/lib/users';
import AdminUsersClient from '@/components/AdminUsersClient';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Gestão de Usuários • ReportaDesk Admin',
  description: 'Gerencie os usuários do sistema, permissões e contas de suporte.',
};

export default async function AdminUsersPage() {
  const session = await getSession();

  // Trava de segurança: apenas membros do suporte/admin podem acessar
  if (!session || session.role !== 'admin') {
    redirect('/login');
  }

  const users = await getUsersList();

  return <AdminUsersClient initialUsers={users} session={session} />;
}
