export type TicketStatus = 'novo' | 'em_andamento' | 'aguardando_cliente' | 'resolvido' | 'fechado';

export type TicketPriority = 'baixa' | 'media' | 'alta' | 'urgente';

export type TicketCategory = 'bug' | 'duvida' | 'melhoria' | 'faturamento' | 'acesso';

export interface ClientMetadata {
  clientName: string;
  clientEmail: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  createdAt: string;
}

export interface TicketComment {
  id: string | number;
  body: string;
  authorName: string;
  authorEmail?: string;
  authorAvatarUrl?: string;
  createdAt: string;
  isStaff: boolean; // Se foi postado pela equipe de desenvolvimento/suporte no GitHub ou pelo cliente
}

export interface Ticket {
  id: number; // GitHub issue number
  title: string;
  body: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: TicketCategory;
  clientName: string;
  clientEmail: string;
  createdAt: string;
  updatedAt: string;
  commentsCount: number;
  githubUrl: string;
  comments?: TicketComment[];
}

export interface SessionUser {
  name: string;
  email: string;
  avatarUrl?: string;
  role: 'client' | 'admin';
}

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: 'client' | 'admin';
  company?: string;
  active: boolean;
  createdAt: string;
}
