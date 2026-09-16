'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Send, 
  ExternalLink, 
  Clock, 
  CheckCircle2, 
  ChevronDown,
  Paperclip,
  Trash2
} from 'lucide-react';
import { Ticket, TicketStatus, SessionUser } from '@/lib/types';
import { StatusBadge, PriorityBadge, CategoryBadge } from './TicketBadges';
import { addCommentAction, updateTicketStatusAction } from '@/app/actions/tickets';

interface TicketDetailClientProps {
  ticket: Ticket;
  session: SessionUser | null;
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
        const maxDim = 1920; // Preserva Full HD / 2K

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

        // Qualidade HD 88% sem perda perceptível de nitidez
        resolve(canvas.toDataURL("image/jpeg", 0.88));
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
};

function renderFormattedContent(text: string, onImageClick?: (url: string) => void) {
  if (!text) return null;

  // Limpar cabeçalho de metadata do GitHub e tags de metadados ocultos se presentes
  let cleanText = text
    .replace(/^> 🛡️[\s\S]*?---\s*/m, "")
    .replace(/<!--\s*(?:reportadesk_meta|taskcloud_meta|reportadesk_author|taskcloud_author):[\s\S]*?-->/g, "")
    .trim();

  // Regex para capturar <img ... src="..." ...> de qualquer formato HTML (como o do GitHub user-attachments) ou ![alt](url)
  const imageRegex = /(?:<img\s+[^>]*?src=["']([^"']+)["'][^>]*\/?>|!\[(.*?)\]\((data:image\/[a-zA-Z]+;base64,[\s\S]+?|https?:\/\/[^\s\)]+)\))/gi;
  const parts: Array<{ type: "text" | "image"; content?: string; alt?: string; url?: string }> = [];
  const seenUrls = new Set<string>();
  let lastIndex = 0;
  let match;

  while ((match = imageRegex.exec(cleanText)) !== null) {
    if (match.index > lastIndex) {
      parts.push({
        type: "text",
        content: cleanText.slice(lastIndex, match.index),
      });
    }

    const url = match[1] || match[3];
    let alt = match[2];
    if (!alt && match[0].startsWith("<img")) {
      const altMatch = match[0].match(/alt=["']([^"']+)["']/i);
      alt = altMatch ? altMatch[1] : "Imagem do GitHub";
    }
    if (!alt) alt = "Imagem Anexada";

    if (url && !seenUrls.has(url)) {
      seenUrls.add(url);
      parts.push({
        type: "image",
        alt,
        url,
      });
    }

    lastIndex = imageRegex.lastIndex;
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

export default function TicketDetailClient({ ticket, session }: TicketDetailClientProps) {
  const router = useRouter();
  const [replyMessage, setReplyMessage] = useState('');
  const [replyAttachments, setReplyAttachments] = useState<{ name: string; url: string }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedImageModal, setSelectedImageModal] = useState<string | null>(null);

  const isStaff = session?.role === 'admin';

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) {
        setErrorMsg('Por favor selecione apenas imagens.');
        continue;
      }
      try {
        const compressedBase64 = await compressImageFile(file);
        setReplyAttachments(prev => [...prev, { name: file.name, url: compressedBase64 }]);
      } catch (err) {
        console.error('Erro ao comprimir imagem:', err);
      }
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
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-zinc-500" />
            {new Date(ticket.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
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
                className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
              >
                <CheckCircle2 className="w-3 h-3" />
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
              placeholder="Digite sua resposta..."
              className="w-full p-3 pb-10 text-xs text-zinc-100 bg-zinc-900 border border-zinc-800 rounded-lg placeholder-zinc-500 focus:outline-none focus:border-zinc-600 transition-colors font-sans resize-none"
            />

            <div className="absolute left-2.5 bottom-2.5 flex items-center gap-2">
              <label className="cursor-pointer inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] text-zinc-400 hover:text-zinc-200 bg-zinc-800 border border-zinc-700 transition-colors">
                <Paperclip className="w-3 h-3 text-zinc-400" />
                <span>Anexo</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
            </div>

            <div className="absolute right-2.5 bottom-2.5 flex items-center gap-2">
              <button
                type="submit"
                disabled={isSubmitting || (!replyMessage.trim() && replyAttachments.length === 0)}
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

          {replyAttachments.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-2">
              {replyAttachments.map((att, idx) => (
                <div key={idx} className="relative group rounded-md overflow-hidden border border-zinc-800 bg-zinc-900 w-20 h-14">
                  <img src={att.url} alt={att.name} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeReplyAttachment(idx)}
                    className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-red-400 transition-opacity"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
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