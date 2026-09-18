'use client';
import { uploadFileToSupabase } from '@/lib/supabase';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Send, 
  ExternalLink, 
  CheckCircle2, 
  ChevronDown,
  Paperclip,
  Trash2,
  Download,
  Video,
  FileText,
  Users,
  UserPlus,
  Link2
} from 'lucide-react';
import { Ticket, TicketStatus, SessionUser } from '@/lib/types';
import { StatusBadge, PriorityBadge, CategoryBadge } from './TicketBadges';
import { addCommentAction, updateTicketStatusAction, addParticipantAction, removeParticipantAction, linkTicketsAction, unlinkTicketsAction } from '@/app/actions/tickets';

export interface UserOption {
  name: string;
  email: string;
  role: string;
  company?: string;
}

export interface AvailableTicketOption {
  id: number;
  title: string;
  status: TicketStatus;
}

interface TicketDetailClientProps {
  ticket: Ticket;
  session: SessionUser | null;
  availableUsers?: UserOption[];
  availableTickets?: AvailableTicketOption[];
}

const compressImageFile = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Erro ao ler arquivo"));
    reader.onload = (event) => {
      const img = new Image();
      img.onerror = () => reject(new Error("Erro ao carregar imagem"));
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;
        const maxDim = 1920;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = Math.max(width, 1);
        canvas.height = Math.max(height, 1);
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";
          ctx.drawImage(img, 0, 0, width, height);
        }

        resolve(canvas.toDataURL("image/jpeg", 0.88));
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
};

function renderFormattedContent(text: string, onImageClick?: (url: string) => void) {
  if (!text) return null;

  let cleanText = text
    .replace(/^> 🛡️[\s\S]*?---\s*/m, "")
    .replace(/<!--\s*(?:reportadesk_meta|taskcloud_meta|reportadesk_author|taskcloud_author):[\s\S]*?-->/g, "")
    .trim();

  const mediaRegex = /(?:<video\s+[^>]*?src=["']([^"']+)["'][^>]*\/?>|<img\s+[^>]*?src=["']([^"']+)["'][^>]*\/?>|!\[(.*?)\]\((data:(?:image|video|application)\/[a-zA-Z0-9+.-]+;base64,[\s\S]+?|https?:\/\/[^\s\)]+)\)|\[(.*?)\]\((https?:\/\/[^\s\)]+\.(?:mp4|webm|mov|pdf|zip|doc|docx))\))/gi;

  const parts: Array<{ type: "text" | "image" | "video" | "file"; content?: string; alt?: string; url?: string }> = [];
  const seenUrls = new Set<string>();
  let lastIndex = 0;
  let match;

  while ((match = mediaRegex.exec(cleanText)) !== null) {
    if (match.index > lastIndex) {
      parts.push({
        type: "text",
        content: cleanText.slice(lastIndex, match.index),
      });
    }

    const videoTagUrl = match[1];
    const imgTagUrl = match[2];
    const mdMediaUrl = match[4];
    const mdFileUrl = match[6];

    const url = videoTagUrl || imgTagUrl || mdMediaUrl || mdFileUrl;
    const alt = match[3] || match[5] || "Anexo";

    if (url && !seenUrls.has(url)) {
      seenUrls.add(url);
      const urlLower = url.toLowerCase();
      const isVideo = videoTagUrl || urlLower.includes('.mp4') || urlLower.includes('.webm') || urlLower.includes('.mov') || urlLower.startsWith('data:video/');
      const isFile = urlLower.includes('.pdf') || urlLower.includes('.zip') || urlLower.includes('.doc') || urlLower.startsWith('data:application/');

      if (isVideo) {
        parts.push({ type: "video", alt, url });
      } else if (isFile) {
        parts.push({ type: "file", alt, url });
      } else {
        parts.push({ type: "image", alt, url });
      }
    }

    lastIndex = mediaRegex.lastIndex;
  }

  if (lastIndex < cleanText.length) {
    parts.push({
      type: "text",
      content: cleanText.slice(lastIndex),
    });
  }

  if (parts.length === 0) {
    return <div className="whitespace-pre-wrap break-words break-all max-w-full overflow-hidden leading-relaxed text-xs text-zinc-300">{cleanText}</div>;
  }

  return (
    <div className="space-y-3 break-words max-w-full overflow-hidden text-xs text-zinc-300">
      {parts.map((part, idx) => {
        if (part.type === "text") {
          if (!part.content || !part.content.trim()) return null;
          return (
            <div key={idx} className="whitespace-pre-wrap break-words break-all max-w-full overflow-hidden leading-relaxed">
              {part.content}
            </div>
          );
        }
        const downloadUrl = (part.url && part.url.includes('supabase.co') && !part.url.includes('?download='))
          ? `${part.url}?download=${encodeURIComponent(part.alt || 'video.mp4')}`
          : part.url;

        if (part.type === "video") {
          return (
            <div key={idx} className="my-3 space-y-2 max-w-full overflow-hidden">
              <video
                src={part.url}
                controls
                preload="metadata"
                className="max-w-full max-h-96 rounded-xl border border-zinc-800 bg-black shadow-lg"
              />
              <div className="flex items-center gap-2">
                <a
                  href={downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs font-medium text-amber-400 hover:text-amber-300 hover:border-zinc-700 transition-colors shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Baixar Vídeo ({part.alt})</span>
                </a>
              </div>
            </div>
          );
        }
        if (part.type === "file") {
          return (
            <div key={idx} className="my-2">
              <a
                href={downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                download
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-medium text-blue-400 hover:text-blue-300 hover:border-zinc-700 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Baixar Arquivo ({part.alt})</span>
              </a>
            </div>
          );
        }
        return (
          <div key={idx} className="my-3 max-w-full overflow-hidden">
            <button
              type="button"
              onClick={() => onImageClick && part.url && onImageClick(part.url)}
              className="inline-block max-w-full text-left focus:outline-none group"
            >
              <img
                src={part.url}
                alt={part.alt}
                className="max-w-full max-h-96 rounded-xl border border-zinc-800 object-contain bg-zinc-950/60 shadow-lg group-hover:border-zinc-600 transition-colors cursor-zoom-in"
              />
              <p className="text-[10px] text-zinc-500 mt-1 group-hover:text-zinc-300 transition-colors">🔍 {part.alt} (Clique para ampliar)</p>
            </button>
          </div>
        );
      })}
    </div>
  );
}

export default function TicketDetailClient({ ticket, session, availableUsers, availableTickets }: TicketDetailClientProps) {
  const router = useRouter();
  const [replyMessage, setReplyMessage] = useState('');
  const [replyAttachments, setReplyAttachments] = useState<{ name: string; url: string }[]>([]);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState<boolean>(false);
  const [uploadProgressText, setUploadProgressText] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const [selectedUserToAdd, setSelectedUserToAdd] = useState('');
  const [isAddingParticipant, setIsAddingParticipant] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedImageModal, setSelectedImageModal] = useState<string | null>(null);

  const isStaff = session?.role === 'admin';

    const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.indexOf("image") !== -1 || item.type.indexOf("video") !== -1) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          setIsUploadingAttachment(true);
          setErrorMsg(null);
          try {
            const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
            setUploadProgressText(`Fazendo upload do anexo (${sizeMb} MB)...`);
            const result = await processReplyFileAttachment(file);
            setReplyAttachments(prev => [...prev, result]);
          } catch (err) {
            console.error("Erro ao colar mídia:", err);
            setErrorMsg("Falha ao enviar imagem/vídeo colado.");
          } finally {
            setIsUploadingAttachment(false);
            setUploadProgressText('');
          }
        }
      }
    }
  };

  const readFileAsDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("Erro ao ler arquivo"));
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });
  };

  const processReplyFileAttachment = async (file: File): Promise<{ url: string; name: string }> => {
    try {
      const supabaseUrl = await uploadFileToSupabase(file, file.name);
      if (supabaseUrl) {
        return { url: supabaseUrl, name: file.name };
      }
    } catch (err) {
      console.warn("Upload direto no Supabase falhou, usando fallback:", err);
    }

    if (file.type.startsWith('image/')) {
      const compressedBase64 = await compressImageFile(file);
      return { url: compressedBase64, name: file.name };
    } else {
      const dataUrl = await readFileAsDataUrl(file);
      return { url: dataUrl, name: file.name };
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploadingAttachment(true);
    setErrorMsg(null);

    try {
      for (const file of Array.from(files)) {
        const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
        setUploadProgressText(`Fazendo upload de ${file.name} (${sizeMb} MB)...`);
        const result = await processReplyFileAttachment(file);
        setReplyAttachments(prev => [...prev, result]);
      }
    } catch (err) {
      console.error('Erro ao processar anexo:', err);
      setErrorMsg("Falha ao fazer upload do anexo.");
    } finally {
      setIsUploadingAttachment(false);
      setUploadProgressText('');
    }
  };

  const removeReplyAttachment = (index: number) => {
    setReplyAttachments(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyMessage.trim() && replyAttachments.length === 0) return;

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      let finalMessage = replyMessage;
      if (replyAttachments.length > 0) {
        finalMessage += '\n\n### Anexos:\n';
        replyAttachments.forEach(att => {
          finalMessage += `\n![${att.name}](${att.url})\n`;
        });
      }

      const res = await addCommentAction(ticket.id, finalMessage);
      if (res.success) {
        setReplyMessage('');
        setReplyAttachments([]);
        router.refresh();
      } else {
        setErrorMsg(res.error || 'Falha ao enviar resposta.');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao processar resposta';
      setErrorMsg(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (newStatus: TicketStatus) => {
    setIsUpdatingStatus(true);
    setStatusMenuOpen(false);
    try {
      await updateTicketStatusAction(ticket.id, newStatus);
      router.refresh();
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleAddParticipant = async () => {
    if (!selectedUserToAdd) return;
    setIsAddingParticipant(true);
    try {
      const res = await addParticipantAction(ticket.id, selectedUserToAdd);
      if (res.success) {
        setSelectedUserToAdd('');
        router.refresh();
      }
    } catch (err) {
      console.error('Erro ao adicionar participante:', err);
    } finally {
      setIsAddingParticipant(false);
    }
  };

    const [selectedTicketToLink, setSelectedTicketToLink] = useState<string>('');
  const [isLinkingTicket, setIsLinkingTicket] = useState<boolean>(false);

  const unlinkedTicketsOptions = (availableTickets || []).filter(
    t => t.id !== ticket.id && !(ticket.linkedTickets || []).includes(t.id)
  );

  const handleLinkTicket = async () => {
    if (!selectedTicketToLink) return;
    const targetId = parseInt(selectedTicketToLink, 10);
    setIsLinkingTicket(true);
    const res = await linkTicketsAction(ticket.id, targetId);
    setIsLinkingTicket(false);
    if (res.success) {
      setSelectedTicketToLink('');
      router.refresh();
    } else if (res.error) {
      alert(res.error);
    }
  };

  const handleUnlinkTicket = async (targetId: number) => {
    if (confirm(`Deseja desvincular o chamado #${targetId}?`)) {
      const res = await unlinkTicketsAction(ticket.id, targetId);
      if (res.success) {
        router.refresh();
      } else if (res.error) {
        alert(res.error);
      }
    }
  };

  const handleRemoveParticipant = async (email: string) => {
    try {
      const res = await removeParticipantAction(ticket.id, email);
      if (res.success) {
        router.refresh();
      }
    } catch (err) {
      console.error('Erro ao remover participante:', err);
    }
  };

  const unassignedUsers = availableUsers?.filter(
    u => u.role === 'client' && u.email.toLowerCase() !== ticket.clientEmail.toLowerCase() && !ticket.participants?.includes(u.email)
  ) || [];

  return (
    <div className="max-w-4xl mx-auto py-4">
      
      {/* Navegação Superior */}
      <div className="flex items-center justify-between gap-4 mb-4">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Voltar para chamados</span>
        </Link>

        <div className="flex items-center gap-2">
          {ticket.githubUrl && (
            <a
              href={ticket.githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs text-zinc-400 hover:text-zinc-200 bg-zinc-900 border border-zinc-800 transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              <span>Ver Issue no GitHub</span>
            </a>
          )}

          {/* Menu de Status */}
          <div className="relative">
            <button
              onClick={() => setStatusMenuOpen(!statusMenuOpen)}
              disabled={isUpdatingStatus}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 transition-colors"
            >
              <StatusBadge status={ticket.status} />
              <ChevronDown className="w-3 h-3 text-zinc-500" />
            </button>

            {statusMenuOpen && (
              <div className="absolute right-0 mt-1.5 w-48 bg-[#121215] border border-zinc-800 rounded-xl p-1 z-50 shadow-xl">
                <p className="px-2.5 py-1 text-[10px] font-medium text-zinc-500 uppercase tracking-wider">
                  Alterar Status
                </p>
                {(['novo', 'em_andamento', 'aguardando_cliente', 'resolvido', 'fechado'] as TicketStatus[]).map(st => (
                  <button
                    key={st}
                    onClick={() => handleStatusChange(st)}
                    className="w-full text-left px-2 py-1.5 rounded-lg text-xs hover:bg-zinc-800/60 flex items-center justify-between transition-colors"
                  >
                    <StatusBadge status={st} />
                    {ticket.status === st && <CheckCircle2 className="w-3 h-3 text-zinc-400" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Cabeçalho do Ticket */}
      <div className="bg-[#121215] rounded-2xl p-5 sm:p-6 border border-zinc-800 mb-4">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <span className="font-mono text-[11px] text-zinc-400 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">
            #{ticket.id}
          </span>
          <StatusBadge status={ticket.status} />
          <PriorityBadge priority={ticket.priority} />
          <CategoryBadge category={ticket.category} />
        </div>

        <h1 className="text-lg sm:text-xl font-semibold text-zinc-100 tracking-tight leading-snug mb-2">
          {ticket.title}
        </h1>

        <div className="flex flex-wrap items-center gap-3 text-[11px] text-zinc-500 pt-3 border-t border-zinc-800/80">
          <span className="text-zinc-300 font-medium">{ticket.clientName}</span>
          <span>•</span>
          <span className="text-zinc-500">{ticket.clientEmail}</span>
          <span>•</span>
          <span>Aberto em {new Date(ticket.createdAt).toLocaleDateString('pt-BR')}</span>
        </div>

        {/* Seção de Participantes Notificados por E-mail */}
        <div className="mt-4 pt-4 border-t border-zinc-800/80">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-zinc-400" />
              <span className="text-xs font-semibold text-zinc-300">Participantes do Chamado</span>
              <span className="text-[10px] text-zinc-500">({(ticket.participants?.length || 0) + 1} notificados por e-mail)</span>
            </div>

            {/* Selector de Usuário Cadastrado */}
            {unassignedUsers.length > 0 && (
              <div className="flex items-center gap-1.5">
                <select
                  value={selectedUserToAdd}
                  onChange={e => setSelectedUserToAdd(e.target.value)}
                  className="px-2.5 py-1 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-zinc-700"
                >
                  <option value="">+ Adicionar Cliente / Participante</option>
                  {unassignedUsers.map(u => (
                    <option key={u.email} value={u.email}>
                      {u.name} ({u.email})
                    </option>
                  ))}
                </select>

                {selectedUserToAdd && (
                  <button
                    type="button"
                    disabled={isAddingParticipant}
                    onClick={handleAddParticipant}
                    className="px-3 py-1 bg-[#2F5BFF] hover:bg-[#2549D6] text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 flex items-center gap-1"
                  >
                    <UserPlus className="w-3 h-3" />
                    <span>{isAddingParticipant ? 'Adicionando...' : 'Adicionar'}</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Badges de Participantes */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Autor / Criador do Ticket */}
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-xs">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-zinc-200 font-medium">{ticket.clientName}</span>
              <span className="text-zinc-500 text-[10px]">({ticket.clientEmail})</span>
              <span className="text-[10px] text-blue-400 font-medium bg-blue-500/10 px-1.5 py-0.2 rounded border border-blue-500/20">Criador</span>
            </div>

            {/* Participantes Adicionados */}
            {ticket.participants && ticket.participants.map(email => {
              const matchedUser = availableUsers?.find(u => u.email.toLowerCase() === email.toLowerCase());
              const displayName = matchedUser ? matchedUser.name : email;
              return (
                <div key={email} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-900/80 border border-zinc-800 text-xs group">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-zinc-300 font-medium">{displayName}</span>
                  <span className="text-zinc-500 text-[10px]">({email})</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveParticipant(email)}
                    title="Remover participante"
                    className="text-zinc-500 hover:text-red-400 ml-1 transition-colors font-bold text-xs"
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
        {/* Seção de Chamados Vinculados / Relacionados */}
        <div className="mt-4 pt-4 border-t border-zinc-800/80">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-1.5">
              <Link2 className="w-3.5 h-3.5 text-zinc-400" />
              <span className="text-xs font-semibold text-zinc-300">Chamados Vinculados</span>
              <span className="text-[10px] text-zinc-500">({ticket.linkedTicketsDetails?.length || 0} vinculados no portal e GitHub)</span>
            </div>

            {/* Selector para Vincular Chamado Existente */}
            {unlinkedTicketsOptions.length > 0 && (
              <div className="flex items-center gap-1.5">
                <select
                  value={selectedTicketToLink}
                  onChange={e => setSelectedTicketToLink(e.target.value)}
                  className="px-2.5 py-1 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-zinc-700 max-w-[240px] truncate"
                >
                  <option value="">+ Vincular a outro chamado...</option>
                  {unlinkedTicketsOptions.map(t => (
                    <option key={t.id} value={t.id}>
                      #{t.id} - {t.title.length > 30 ? t.title.substring(0, 30) + '...' : t.title}
                    </option>
                  ))}
                </select>

                {selectedTicketToLink && (
                  <button
                    type="button"
                    disabled={isLinkingTicket}
                    onClick={handleLinkTicket}
                    className="px-3 py-1 bg-[#2F5BFF] hover:bg-[#2549D6] text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 flex items-center gap-1"
                  >
                    <Link2 className="w-3 h-3" />
                    <span>{isLinkingTicket ? 'Vinculando...' : 'Vincular'}</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Badges / Lista de Chamados Vinculados */}
          {ticket.linkedTicketsDetails && ticket.linkedTicketsDetails.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2">
              {ticket.linkedTicketsDetails.map(linked => (
                <div key={linked.id} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900/90 border border-zinc-800 text-xs">
                  <Link
                    href={`/tickets/${linked.id}`}
                    className="font-medium text-zinc-200 hover:text-white hover:underline flex items-center gap-1.5"
                  >
                    <span className="text-[#2F5BFF] font-semibold">#{linked.id}</span>
                    <span className="truncate max-w-[200px]">{linked.title}</span>
                  </Link>
                  <StatusBadge status={linked.status} />
                  <button
                    type="button"
                    onClick={() => handleUnlinkTicket(linked.id)}
                    title="Desvincular chamado"
                    className="text-zinc-500 hover:text-red-400 ml-1 transition-colors font-bold text-xs"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-zinc-500 italic">Nenhum chamado vinculado a este ticket.</p>
          )}
        </div>

      {/* Timeline de Mensagens */}
      <div className="space-y-3 mb-6">
        
        {/* Mensagem Inicial */}
        <div className="bg-[#121215] rounded-xl p-5 border border-zinc-800">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-300 text-xs font-medium">
                {ticket.clientName.charAt(0)}
              </div>
              <span className="text-xs font-medium text-zinc-200">{ticket.clientName}</span>
              <span className="text-[10px] text-zinc-500 px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800">
                Autor
              </span>
            </div>
            <span className="text-[11px] text-zinc-500">
              {new Date(ticket.createdAt).toLocaleString('pt-BR')}
            </span>
          </div>

          {renderFormattedContent(ticket.body, (url) => setSelectedImageModal(url))}
        </div>

        {/* Respostas */}
        {ticket.comments && ticket.comments.length > 0 ? (
          ticket.comments.map((comment, index) => {
            const isStaffComment = comment.isStaff;
            return (
              <div
                key={comment.id || index}
                className={`rounded-xl p-5 border transition-colors ${
                  isStaffComment
                    ? 'bg-zinc-900/80 border-zinc-700/80 ml-3 sm:ml-6'
                    : 'bg-[#121215] border-zinc-800'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-300 text-xs font-medium">
                      {comment.authorName.charAt(0)}
                    </div>
                    <span className="text-xs font-medium text-zinc-200">{comment.authorName}</span>
                    {isStaffComment ? (
                      <span className="text-[10px] text-zinc-300 px-1.5 py-0.2 rounded bg-zinc-800 border border-zinc-700">
                        Suporte
                      </span>
                    ) : (
                      <span className="text-[10px] text-zinc-500">
                        Cliente
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-zinc-500">
                    {new Date(comment.createdAt).toLocaleString('pt-BR')}
                  </span>
                </div>

                {renderFormattedContent(comment.body, (url) => setSelectedImageModal(url))}
              </div>
            );
          })
        ) : (
          <div className="text-center py-5 px-4 rounded-xl border border-dashed border-zinc-800 text-zinc-500 text-xs">
            Nenhuma resposta adicional ainda.
          </div>
        )}

      </div>

      {/* Caixa de Resposta */}
      <div className="bg-[#121215] rounded-xl p-4 border border-zinc-800">
        <form onSubmit={handleSendReply}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-zinc-400">
              Responder como <strong className="text-zinc-200">{session?.name || 'Cliente'}</strong> ({isStaff ? 'Suporte' : 'Cliente'})
            </span>

            {ticket.status !== 'resolvido' && isStaff && (
              <button
                type="button"
                onClick={() => handleStatusChange('resolvido')}
                className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-medium"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Marcar Resolvido</span>
              </button>
            )}
          </div>

          {errorMsg && (
            <p className="text-xs text-red-400 mb-2">{errorMsg}</p>
          )}

          <div className="relative">
            <textarea
              rows={3}
              value={replyMessage}
              onChange={e => setReplyMessage(e.target.value)}
              onPaste={handlePaste}
              placeholder="Digite sua resposta... (Você pode colar imagens diretamente com Ctrl+V)"
              className="w-full p-3 pb-10 text-xs text-zinc-100 bg-zinc-900 border border-zinc-800 rounded-lg placeholder-zinc-500 focus:outline-none focus:border-zinc-600 transition-colors font-sans resize-none"
            />

            <div className="absolute left-2.5 bottom-2.5 flex items-center gap-2">
              <label className="cursor-pointer inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] text-zinc-400 hover:text-zinc-200 bg-zinc-800 border border-zinc-700 transition-colors">
                <Paperclip className="w-3 h-3 text-zinc-400" />
                <span>Anexo</span>
                <input
                  type="file"
                  accept="image/*,video/*,.pdf,.zip,.doc,.docx"
                  multiple
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
            </div>

            <div className="absolute right-2.5 bottom-2.5 flex items-center gap-2">
              <button
                type="submit"
                disabled={isSubmitting || isUploadingAttachment || (!replyMessage.trim() && replyAttachments.length === 0)}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-md text-xs font-medium text-zinc-900 bg-zinc-100 hover:bg-white disabled:opacity-50 transition-colors"
              >
                {isSubmitting ? (
                  <div className="w-3 h-3 border-2 border-zinc-900/30 border-t-zinc-900 rounded-full animate-spin" />
                ) : (
                  <Send className="w-3 h-3" />
                )}
                <span>Enviar</span>
              </button>
            </div>
          </div>

          {isUploadingAttachment && (
            <div className="mt-2.5 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 flex items-center gap-2.5 text-xs animate-pulse">
              <div className="w-4 h-4 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin shrink-0" />
              <span className="font-medium">{uploadProgressText || 'Enviando anexo para o Supabase...'}</span>
            </div>
          )}

          {replyAttachments.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-2">
              {replyAttachments.map((att, idx) => {
                const nameLower = (att.name || '').toLowerCase();
                const urlLower = (att.url || '').toLowerCase();
                const isVideo = urlLower.includes('.mp4') || urlLower.includes('.webm') || urlLower.includes('.mov') || urlLower.startsWith('data:video/') || nameLower.endsWith('.mp4') || nameLower.endsWith('.webm') || nameLower.endsWith('.mov');
                const isDoc = urlLower.includes('.pdf') || urlLower.includes('.zip') || urlLower.includes('.doc') || nameLower.endsWith('.pdf') || nameLower.endsWith('.zip');

                return (
                  <div key={idx} className="relative group rounded-md overflow-hidden border border-zinc-800 bg-zinc-900 w-24 h-14 flex items-center justify-center p-1 text-center">
                    {isVideo ? (
                      <div className="flex flex-col items-center justify-center text-zinc-300">
                        <Video className="w-4 h-4 text-amber-400 mb-0.5 shrink-0" />
                        <span className="text-[9px] truncate max-w-[80px] text-zinc-400">{att.name}</span>
                      </div>
                    ) : isDoc ? (
                      <div className="flex flex-col items-center justify-center text-zinc-300">
                        <FileText className="w-4 h-4 text-blue-400 mb-0.5 shrink-0" />
                        <span className="text-[9px] truncate max-w-[80px] text-zinc-400">{att.name}</span>
                      </div>
                    ) : (
                      <img src={att.url} alt={att.name} className="w-full h-full object-cover" />
                    )}
                    <button
                      type="button"
                      onClick={() => removeReplyAttachment(idx)}
                      className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 flex items-center justify-center text-red-400 transition-opacity"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </form>
      </div>

      {/* Lightbox Modal de Imagem */}
      {selectedImageModal && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setSelectedImageModal(null)}
        >
          <div className="relative max-w-5xl w-full max-h-[90vh] flex flex-col items-center justify-center">
            <button
              onClick={() => setSelectedImageModal(null)}
              className="absolute -top-10 right-0 text-zinc-400 hover:text-white p-2 text-xs font-semibold flex items-center gap-1 bg-zinc-900/80 px-3 py-1 rounded-full border border-zinc-700"
            >
              <span>Fechar</span> ✕
            </button>
            <img
              src={selectedImageModal}
              alt="Visualização do Anexo"
              className="max-w-full max-h-[85vh] rounded-2xl object-contain border border-zinc-800 shadow-2xl bg-zinc-950"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
}
