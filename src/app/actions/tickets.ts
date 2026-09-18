'use server';

import { revalidatePath } from 'next/cache';
import { createTicket, addComment, updateTicketStatus, getTicket, addParticipantToTicket, removeParticipantFromTicket, linkTickets, unlinkTickets } from '@/lib/github';
import { sendTicketCreatedNotification, sendCommentNotification } from '@/lib/resend';
import { getSession, setSession, clearSession } from '@/lib/session';
import { TicketCategory, TicketPriority, TicketStatus, SessionUser } from '@/lib/types';

export async function createTicketAction(formData: FormData) {
  try {
    const session = await getSession();
    
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const category = (formData.get('category') as TicketCategory) || 'duvida';
    const priority = (formData.get('priority') as TicketPriority) || 'media';
    const clientName = (formData.get('clientName') as string) || session?.name || 'Cliente';
    const clientEmail = (formData.get('clientEmail') as string) || session?.email || 'cliente@reportadesk.com';

    if (!title || !description) {
      return { success: false, error: 'Título e descrição são obrigatórios.' };
    }

    // Cria a Issue no GitHub
    const newTicket = await createTicket({
      title,
      description,
      category,
      priority,
      clientName,
      clientEmail,
    });

    // Dispara notificação por e-mail via Resend (para Cliente E para Equipe Dev/Suporte)
    if (clientEmail) {
      sendTicketCreatedNotification({
        toEmail: clientEmail,
        clientName,
        ticketId: newTicket.id,
        title: newTicket.title,
        category: newTicket.category,
        priority: newTicket.priority,
        githubUrl: newTicket.githubUrl,
      }).catch(err => console.error('Erro no envio de e-mail:', err));
    }

    revalidatePath('/tickets');
    revalidatePath('/');

    return { success: true, ticketId: newTicket.id };
  } catch (error: unknown) {
    console.error('Falha ao criar chamado:', error);
    const message = error instanceof Error ? error.message : 'Erro interno ao criar chamado';
    return { success: false, error: message };
  }
}

export async function addCommentAction(ticketId: number, message: string) {
  try {
    const session = await getSession();
    const authorName = session?.name || 'Cliente';
    const authorEmail = session?.email || '';
    const isStaff = session?.role === 'admin';

    if (!message || !message.trim()) {
      return { success: false, error: 'A mensagem não pode estar vazia.' };
    }

    const comment = await addComment({
      issueNumber: ticketId,
      message,
      authorName,
      authorEmail,
      isStaff,
    });

    // Notificar todos os participantes do chamado por e-mail
    const ticket = await getTicket(ticketId);
    if (ticket) {
      const emailSet = new Set<string>();
      if (ticket.clientEmail) emailSet.add(ticket.clientEmail.toLowerCase());
      if (ticket.participants && ticket.participants.length > 0) {
        ticket.participants.forEach(p => emailSet.add(p.toLowerCase()));
      }

      if (ticket.comments) {
        ticket.comments.forEach(c => {
          if (c.authorEmail) emailSet.add(c.authorEmail.toLowerCase());
        });
      }

      // Se a resposta veio do cliente, notificar a equipe de suporte
      if (!isStaff) {
        const supportEnv = process.env.SUPPORT_NOTIFICATION_EMAILS || 'vfidelisdev@gmail.com,leopoldinodev@gmail.com';
        supportEnv.split(',').forEach(e => emailSet.add(e.trim().toLowerCase()));
      }

      // Remover o próprio autor do comentário atual para não receber seu próprio e-mail
      if (authorEmail) {
        emailSet.delete(authorEmail.toLowerCase());
      }

      const toEmails = Array.from(emailSet);

      if (toEmails.length > 0) {
        sendCommentNotification({
          toEmails,
          ticketId,
          ticketTitle: ticket.title,
          commentAuthor: authorName,
          commentBody: message,
          githubUrl: ticket.githubUrl,
        }).catch(err => console.error('Erro no envio de e-mail:', err));
      }
    }

    revalidatePath('/');
    revalidatePath('/tickets');

    return { success: true, comment };
  } catch (error: unknown) {
    console.error('Falha ao adicionar resposta:', error);
    const message = error instanceof Error ? error.message : 'Erro ao enviar comentário';
    return { success: false, error: message };
  }
}

export async function updateTicketStatusAction(ticketId: number, status: TicketStatus) {
  try {
    await updateTicketStatus(ticketId, status);
    revalidatePath('/');
    revalidatePath('/tickets');
    return { success: true };
  } catch (error: unknown) {
    console.error('Falha ao atualizar status:', error);
    const message = error instanceof Error ? error.message : 'Erro ao atualizar status';
    return { success: false, error: message };
  }
}

export async function switchUserSessionAction(user: SessionUser) {
  await setSession(user);
  revalidatePath('/');
  revalidatePath('/tickets');
  return { success: true };
}

export async function logoutAction() {
  await clearSession();
  revalidatePath('/');
  revalidatePath('/tickets');
  return { success: true };
}

export async function addParticipantAction(ticketId: number, email: string) {
  try {
    await addParticipantToTicket(ticketId, email);
    revalidatePath('/');
    revalidatePath('/tickets');
    revalidatePath(`/tickets/${ticketId}`);
    return { success: true };
  } catch (error: unknown) {
    console.error('Falha ao adicionar participante:', error);
    const message = error instanceof Error ? error.message : 'Erro ao adicionar participante';
    return { success: false, error: message };
  }
}

export async function removeParticipantAction(ticketId: number, email: string) {
  try {
    await removeParticipantFromTicket(ticketId, email);
    revalidatePath('/');
    revalidatePath('/tickets');
    revalidatePath(`/tickets/${ticketId}`);
    return { success: true };
  } catch (error: unknown) {
    console.error('Falha ao remover participante:', error);
    const message = error instanceof Error ? error.message : 'Erro ao remover participante';
    return { success: false, error: message };
  }
}

export async function linkTicketsAction(ticketId: number, targetTicketId: number) {
  try {
    const res = await linkTickets(ticketId, targetTicketId);
    if (!res.success) {
      return { success: false, error: res.error };
    }
    revalidatePath('/');
    revalidatePath('/tickets');
    revalidatePath(`/tickets/${ticketId}`);
    revalidatePath(`/tickets/${targetTicketId}`);
    return { success: true };
  } catch (error: unknown) {
    console.error('Falha ao vincular chamado:', error);
    const message = error instanceof Error ? error.message : 'Erro ao vincular chamado';
    return { success: false, error: message };
  }
}

export async function unlinkTicketsAction(ticketId: number, targetTicketId: number) {
  try {
    const res = await unlinkTickets(ticketId, targetTicketId);
    if (!res.success) {
      return { success: false, error: res.error };
    }
    revalidatePath('/');
    revalidatePath('/tickets');
    revalidatePath(`/tickets/${ticketId}`);
    revalidatePath(`/tickets/${targetTicketId}`);
    return { success: true };
  } catch (error: unknown) {
    console.error('Falha ao desvincular chamado:', error);
    const message = error instanceof Error ? error.message : 'Erro ao desvincular chamado';
    return { success: false, error: message };
  }
}
