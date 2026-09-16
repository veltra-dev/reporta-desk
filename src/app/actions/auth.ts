'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { setSession, clearSession, getSession } from '@/lib/session';
import { 
  authenticateUser, 
  getUsersList, 
  createUserAccount, 
  updateUserAccount, 
  deleteUserAccount 
} from '@/lib/users';
import { sendAccountCreatedNotification, sendPasswordChangedNotification } from '@/lib/resend';
import { SessionUser } from '@/lib/types';

export async function loginAction(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { success: false, error: 'Por favor preencha o e-mail e a senha.' };
  }

  const user = await authenticateUser(email, password);

  if (!user) {
    return { success: false, error: 'E-mail ou senha incorretos ou usuário inativo.' };
  }

  const sessionUser: SessionUser = {
    name: user.name,
    email: user.email,
    role: user.role,
    avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=2F5BFF&color=fff`,
  };

  await setSession(sessionUser);

  revalidatePath('/');
  revalidatePath('/tickets');

  return { success: true };
}

export async function logoutAction() {
  await clearSession();
  revalidatePath('/');
  revalidatePath('/login');
  return { success: true };
}

export async function listUsersAction() {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    throw new Error('Acesso não autorizado.');
  }

  const users = await getUsersList();
  return { success: true, users };
}

export async function createUserAction(data: {
  name: string;
  email: string;
  passwordHash: string;
  role: 'client' | 'admin';
  company?: string;
}) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return { success: false, error: 'Apenas a equipe de suporte pode criar usuários.' };
  }

  try {
    const newUser = await createUserAccount(data);

    // Dispara e-mail de boas-vindas com dados de acesso
    sendAccountCreatedNotification({
      toEmail: data.email,
      name: data.name,
      role: data.role,
      company: data.company,
      password: data.passwordHash,
    }).catch(err => console.error('Erro ao enviar e-mail de boas-vindas:', err));

    revalidatePath('/admin/usuarios');
    return { success: true, user: newUser };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro ao criar usuário.' };
  }
}

export async function updateUserAction(
  id: string,
  data: {
    name?: string;
    email?: string;
    passwordHash?: string;
    role?: 'client' | 'admin';
    active?: boolean;
    company?: string;
  }
) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return { success: false, error: 'Apenas a equipe de suporte pode alterar usuários.' };
  }

  try {
    const updated = await updateUserAccount(id, data);

    if (data.passwordHash) {
      sendPasswordChangedNotification({
        toEmail: updated.email,
        name: updated.name,
      }).catch(err => console.error('Erro ao enviar aviso de senha:', err));
    }

    revalidatePath('/admin/usuarios');
    return { success: true, user: updated };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro ao atualizar usuário.' };
  }
}

export async function deleteUserAction(id: string) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return { success: false, error: 'Apenas a equipe de suporte pode remover usuários.' };
  }

  try {
    await deleteUserAccount(id);
    revalidatePath('/admin/usuarios');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro ao remover usuário.' };
  }
}

export async function changeOwnPasswordAction(newPassword: string) {
  const session = await getSession();
  if (!session || !session.email) {
    return { success: false, error: 'Sessão inválida ou expirada.' };
  }

  if (!newPassword || newPassword.trim().length < 4) {
    return { success: false, error: 'A nova senha deve ter pelo menos 4 caracteres.' };
  }

  try {
    const users = await getUsersList();
    const currentUser = users.find(u => u.email.toLowerCase() === session.email.toLowerCase());

    if (!currentUser) {
      return { success: false, error: 'Usuário não encontrado.' };
    }

    await updateUserAccount(currentUser.id, { passwordHash: newPassword.trim() });

    sendPasswordChangedNotification({
      toEmail: currentUser.email,
      name: currentUser.name,
    }).catch(err => console.error('Erro ao enviar aviso de senha:', err));

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro ao alterar senha.' };
  }
}
