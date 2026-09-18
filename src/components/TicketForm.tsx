'use client';
import { uploadFileToSupabase } from '@/lib/supabase';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bug,
  HelpCircle,
  Sparkles,
  Bot,
  Send,
  ArrowLeft,
  AlertCircle,
  Paperclip,
  Trash2,
  Image as ImageIcon,
  Video,
  FileText
} from 'lucide-react';
import Link from 'next/link';
import { TicketCategory, TicketPriority, SessionUser } from '@/lib/types';
import { createTicketAction } from '@/app/actions/tickets';

const categories: { id: TicketCategory; label: string; icon: React.ElementType }[] = [
  { id: 'bug', label: 'Bug / Falha', icon: Bug },
  { id: 'duvida', label: 'Dúvida', icon: HelpCircle },
  { id: 'melhoria', label: 'Melhoria', icon: Sparkles },
  { id: 'lico', label: 'Lico (IA WhatsApp)', icon: Bot },
];

const priorities: { id: TicketPriority; label: string }[] = [
  { id: 'baixa', label: 'Baixa' },
  { id: 'media', label: 'Média' },
  { id: 'alta', label: 'Alta' },
  { id: 'urgente', label: 'Urgente' },
];

const getCategoryStyle = (catId: TicketCategory, isSelected: boolean) => {
  switch (catId) {
    case 'lico':
      return isSelected
        ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 font-semibold shadow-sm shadow-emerald-500/10'
        : 'bg-emerald-950/20 border-emerald-900/40 text-emerald-400/80 hover:bg-emerald-500/15 hover:border-emerald-500/30 hover:text-emerald-300';
    case 'bug':
      return isSelected
        ? 'bg-red-500/15 border-red-500/40 text-red-300 font-semibold shadow-sm shadow-red-500/10'
        : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-300';
    case 'duvida':
      return isSelected
        ? 'bg-sky-500/15 border-sky-500/40 text-sky-300 font-semibold shadow-sm shadow-sky-500/10'
        : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-300';
    case 'melhoria':
      return isSelected
        ? 'bg-purple-500/15 border-purple-500/40 text-purple-300 font-semibold shadow-sm shadow-purple-500/10'
        : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-300';
    default:
      return isSelected
        ? 'bg-zinc-800 border-zinc-600 text-zinc-100 font-medium'
        : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-300';
  }
};

const getPriorityStyle = (prioId: TicketPriority, isSelected: boolean) => {
  switch (prioId) {
    case 'baixa':
      return isSelected
        ? 'bg-slate-500/20 border-slate-400/50 text-slate-200 font-medium'
        : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:bg-slate-500/10 hover:border-slate-500/30 hover:text-slate-300';
    case 'media':
      return isSelected
        ? 'bg-blue-500/20 border-blue-400/50 text-blue-300 font-medium'
        : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:bg-blue-500/10 hover:border-blue-500/30 hover:text-blue-300';
    case 'alta':
      return isSelected
        ? 'bg-amber-500/20 border-amber-400/50 text-amber-300 font-medium'
        : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:bg-amber-500/10 hover:border-amber-500/30 hover:text-amber-300';
    case 'urgente':
      return isSelected
        ? 'bg-rose-500/25 border-rose-500/60 text-rose-300 font-semibold'
        : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:bg-rose-500/10 hover:border-rose-500/30 hover:text-rose-300';
    default:
      return isSelected
        ? 'bg-zinc-800 border-zinc-600 text-zinc-100 font-medium'
        : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-300';
  }
};

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

export default function TicketForm({ session }: { session?: SessionUser | null }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<TicketCategory>('bug');
  const [priority, setPriority] = useState<TicketPriority>('media');
  const [attachments, setAttachments] = useState<{ url: string; name: string }[]>([]);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState<boolean>(false);
  const [uploadProgressText, setUploadProgressText] = useState<string>('');

  const [tab, setTab] = useState<'write' | 'preview'>('write');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const router = useRouter();

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
            const result = await processFileAttachment(file);
            setAttachments(prev => [...prev, result]);
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

  const processFileAttachment = async (file: File): Promise<{ url: string; name: string }> => {
    try {
      const supabaseUrl = await uploadFileToSupabase(file, file.name);
      if (supabaseUrl) {
        return { url: supabaseUrl, name: file.name };
      }
    } catch (err) {
      console.warn("Upload direto no Supabase falhou, usando fallback:", err);
    }

    if (file.type.startsWith('image/')) {
      const compressedUrl = await compressImageFile(file);
      return { url: compressedUrl, name: file.name };
    } else {
      const dataUrl = await readFileAsDataUrl(file);
      return { url: dataUrl, name: file.name };
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const files = Array.from(e.target.files);

    setIsUploadingAttachment(true);
    setErrorMsg(null);

    try {
      const processed: { url: string; name: string }[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
        setUploadProgressText(`Fazendo upload de ${file.name} (${sizeMb} MB)...`);
        const item = await processFileAttachment(file);
        processed.push(item);
      }
      setAttachments(prev => [...prev, ...processed]);
    } catch (err) {
      console.error("Erro ao processar anexo:", err);
      setErrorMsg("Falha ao enviar anexo. Tente novamente.");
    } finally {
      setIsUploadingAttachment(false);
      setUploadProgressText('');
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      let finalDescription = description;

      if (attachments.length > 0) {
        finalDescription += '\n\n---\n### 📎 Anexos ao Chamado:\n';
        attachments.forEach((att) => {
          const nameLower = (att.name || '').toLowerCase();
          const urlLower = (att.url || '').toLowerCase();
          const isVideo = urlLower.includes('.mp4') || urlLower.includes('.webm') || urlLower.includes('.mov') || urlLower.startsWith('data:video/') || nameLower.endsWith('.mp4') || nameLower.endsWith('.webm') || nameLower.endsWith('.mov');
          const isDoc = urlLower.includes('.pdf') || urlLower.includes('.zip') || urlLower.includes('.doc') || nameLower.endsWith('.pdf') || nameLower.endsWith('.zip');

          const downloadUrl = att.url.includes('supabase.co') && !att.url.includes('?download=')
            ? `${att.url}?download=${encodeURIComponent(att.name)}`
            : att.url;

          if (isVideo) {
            finalDescription += `[🎥 Assistir/Baixar Vídeo: ${att.name}](${downloadUrl})\n\n`;
          } else if (isDoc) {
            finalDescription += `[📄 Baixar Arquivo: ${att.name}](${downloadUrl})\n\n`;
          } else {
            finalDescription += `![${att.name}](${att.url})\n\n`;
          }
        });
      }

      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', finalDescription);
      formData.append('category', category);
      formData.append('priority', priority);
      formData.append('clientName', session?.name || 'Cliente');
      formData.append('clientEmail', session?.email || 'cliente@reportadesk.com');

      const result = await createTicketAction(formData);

      if (result.success && result.ticketId) {
        router.push(`/tickets/${result.ticketId}`);
      } else {
        setErrorMsg(result.error || 'Ocorreu um erro ao registrar o chamado.');
        setIsSubmitting(false);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao processar chamada';
      setErrorMsg(message);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-4">
      {/* Botão Voltar */}
      <div className="mb-4">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Voltar para chamados</span>
        </Link>
      </div>

      <div className="bg-[#121215] rounded-2xl p-6 sm:p-8 border border-zinc-800">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-zinc-100 tracking-tight">
            Abrir Novo Chamado
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Preencha os dados do chamado. O time técnico receberá a notificação diretamente no GitHub.
          </p>
        </div>

        {errorMsg && (
          <div className="mb-5 p-3 rounded-lg bg-red-950/40 border border-red-800/60 text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Identificação do Cliente */}
          <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-between text-xs">
            <div>
              <p className="font-medium text-zinc-200">{session?.name || 'Cliente'}</p>
              <p className="text-zinc-500 text-[11px]">{session?.email || 'cliente@reportadesk.com'}</p>
            </div>
            <span className="text-[11px] text-zinc-500">
              Notificações serão enviadas para este e-mail
            </span>
          </div>

          {/* 1. Seleção de Categoria */}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-2">
              Categoria
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {categories.map(cat => {
                const Icon = cat.icon;
                const isSelected = category === cat.id;
                return (
                  <button
                    type="button"
                    key={cat.id}
                    onClick={() => setCategory(cat.id)}
                    className={`p-2.5 rounded-lg text-left border transition-all flex items-center gap-2 ${getCategoryStyle(cat.id, isSelected)}`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span className="text-xs truncate">{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Prioridade */}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-2">
              Prioridade
            </label>
            <div className="grid grid-cols-4 gap-2">
              {priorities.map(prio => {
                const isSelected = priority === prio.id;
                return (
                  <button
                    type="button"
                    key={prio.id}
                    onClick={() => setPriority(prio.id)}
                    className={`py-2 px-3 rounded-lg text-center text-xs border transition-all ${getPriorityStyle(prio.id, isSelected)}`}
                  >
                    {prio.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Título */}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">
              Título do Chamado
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Ex: Falha ao exportar relatório em PDF"
              className="w-full px-3.5 py-2 text-xs text-zinc-100 bg-zinc-900 border border-zinc-800 rounded-lg placeholder-zinc-500 focus:outline-none focus:border-zinc-600 transition-colors"
            />
          </div>

          {/* 4. Descrição */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-zinc-400">
                Descrição
              </label>

              <div className="flex items-center p-0.5 bg-zinc-900 rounded-md border border-zinc-800 text-xs">
                <button
                  type="button"
                  onClick={() => setTab('write')}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${tab === 'write' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                >
                  Escrever
                </button>
                <button
                  type="button"
                  onClick={() => setTab('preview')}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${tab === 'preview' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                >
                  Prévia
                </button>
              </div>
            </div>

            {tab === 'write' ? (
              <div>
                <textarea
                  required
                  rows={6}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  onPaste={handlePaste}
                  placeholder="Descreva o problema e os passos para reproduzir... (Você pode colar imagens diretamente com Ctrl+V)"
                  className="w-full p-3 text-xs text-zinc-100 bg-zinc-900 border border-zinc-800 rounded-lg placeholder-zinc-500 focus:outline-none focus:border-zinc-600 transition-colors font-mono leading-relaxed"
                />

                {/* Upload de Imagens */}
                <div className="mt-2.5 p-3 rounded-lg bg-zinc-900/60 border border-zinc-800 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-zinc-400">
                    <ImageIcon className="w-3.5 h-3.5 text-zinc-500" />
                    <span>Anexar imagens, vídeos ou arquivos (até 50MB)</span>
                  </div>

                  <label className="cursor-pointer inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 transition-colors">
                    <Paperclip className="w-3 h-3 text-zinc-400" />
                    <span>Selecionar arquivo</span>
                    <input
                      type="file"
                      accept="image/*,video/*,.pdf,.zip,.doc,.docx"
                      multiple
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                {isUploadingAttachment && (
                  <div className="mt-2.5 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 flex items-center gap-2.5 text-xs animate-pulse">
                    <div className="w-4 h-4 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin shrink-0" />
                    <span className="font-medium">{uploadProgressText || 'Enviando arquivo para o Supabase...'}</span>
                  </div>
                )}

                {attachments.length > 0 && (
                  <div className="mt-2.5 grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {attachments.map((att, idx) => {
                      const nameLower = (att.name || '').toLowerCase();
                      const urlLower = (att.url || '').toLowerCase();
                      const isVideo = urlLower.includes('.mp4') || urlLower.includes('.webm') || urlLower.includes('.mov') || urlLower.startsWith('data:video/') || nameLower.endsWith('.mp4') || nameLower.endsWith('.webm') || nameLower.endsWith('.mov');
                      const isDoc = urlLower.includes('.pdf') || urlLower.includes('.zip') || urlLower.includes('.doc') || nameLower.endsWith('.pdf') || nameLower.endsWith('.zip');

                      return (
                        <div key={idx} className="relative group rounded-lg overflow-hidden border border-zinc-800 bg-zinc-900 h-16 flex items-center justify-center p-1 text-center">
                          {isVideo ? (
                            <div className="flex flex-col items-center justify-center text-zinc-300">
                              <Video className="w-5 h-5 text-amber-400 mb-0.5 shrink-0" />
                              <span className="text-[9px] truncate max-w-[70px] text-zinc-400">{att.name}</span>
                            </div>
                          ) : isDoc ? (
                            <div className="flex flex-col items-center justify-center text-zinc-300">
                              <FileText className="w-5 h-5 text-blue-400 mb-0.5 shrink-0" />
                              <span className="text-[9px] truncate max-w-[70px] text-zinc-400">{att.name}</span>
                            </div>
                          ) : (
                            <img src={att.url} alt={att.name} className="w-full h-16 object-cover" />
                          )}
                          <button
                            type="button"
                            onClick={() => removeAttachment(idx)}
                            className="absolute top-1 right-1 p-1 rounded bg-black/70 text-red-400 hover:text-red-300"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div className="w-full min-h-[140px] p-3 text-xs text-zinc-300 bg-zinc-900/40 border border-zinc-800 rounded-lg leading-relaxed whitespace-pre-wrap">
                {description.trim() ? (
                  <div>
                    <p>{description}</p>
                    {isUploadingAttachment && (
                  <div className="mt-2.5 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 flex items-center gap-2.5 text-xs animate-pulse">
                    <div className="w-4 h-4 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin shrink-0" />
                    <span className="font-medium">{uploadProgressText || 'Enviando arquivo para o Supabase...'}</span>
                  </div>
                )}

                {attachments.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-zinc-800">
                        <p className="text-[11px] font-medium text-zinc-500 mb-2">Imagens anexadas:</p>
                        <div className="grid grid-cols-2 gap-2">
                          {attachments.map((att, idx) => (
                            <img key={idx} src={att.url} alt={att.name} className="rounded border border-zinc-800 max-h-40 object-contain" />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <span className="text-zinc-600 italic">Nada para pré-visualizar ainda.</span>
                )}
              </div>
            )}
          </div>

          {/* Botões */}
          <div className="pt-3 border-t border-zinc-800 flex items-center justify-end gap-2">
            <Link
              href="/"
              className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              Cancelar
            </Link>

            <button
              type="submit"
              disabled={isSubmitting || isUploadingAttachment}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium text-white bg-[#2F5BFF] hover:bg-[#2549D6] disabled:opacity-50 transition-colors shadow-lg shadow-[#2F5BFF]/20"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Enviando chamado...</span>
                </>
              ) : isUploadingAttachment ? (
                <>
                  <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Aguarde o upload...</span>
                </>
              ) : (
                <>
                  <Send className="w-3 h-3" />
                  <span>Abrir Chamado</span>
                </>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
