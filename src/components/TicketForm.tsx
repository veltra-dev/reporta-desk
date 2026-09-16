'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Bug, 
  HelpCircle, 
  Sparkles, 
  CreditCard, 
  Key, 
  Send, 
  ArrowLeft, 
  Eye, 
  Edit3, 
  AlertCircle,
  Paperclip,
  Trash2,
  Image as ImageIcon
} from 'lucide-react';
import Link from 'next/link';
import { TicketCategory, TicketPriority, SessionUser } from '@/lib/types';
import { createTicketAction } from '@/app/actions/tickets';

const categories: { id: TicketCategory; label: string; icon: React.ElementType }[] = [
  { id: 'bug', label: 'Bug / Falha', icon: Bug },
  { id: 'duvida', label: 'Dúvida', icon: HelpCircle },
  { id: 'melhoria', label: 'Melhoria', icon: Sparkles },
  { id: 'faturamento', label: 'Faturamento', icon: CreditCard },
  { id: 'acesso', label: 'Permissões', icon: Key },
];

const priorities: { id: TicketPriority; label: string }[] = [
  { id: 'baixa', label: 'Baixa' },
  { id: 'media', label: 'Média' },
  { id: 'alta', label: 'Alta' },
  { id: 'urgente', label: 'Urgente' },
];


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

export default function TicketForm({ session }: { session: SessionUser | null }) {
  const router = useRouter();
  const [category, setCategory] = useState<TicketCategory>('bug');
  const [priority, setPriority] = useState<TicketPriority>('media');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tab, setTab] = useState<'write' | 'preview'>('write');
  const [attachments, setAttachments] = useState<{ name: string; url: string }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) {
        setErrorMsg('Por favor selecione apenas arquivos de imagem.');
        continue;
      }
      try {
        const compressedBase64 = await compressImageFile(file);
        setAttachments(prev => [...prev, { name: file.name, url: compressedBase64 }]);
      } catch (err) {
        console.error('Erro ao comprimir imagem:', err);
      }
    }
  };

  const removeAttachment = (indexToRemove: number) => {
    setAttachments(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!title.trim() || !description.trim()) {
      setErrorMsg('Por favor preencha o título e a descrição do chamado.');
      return;
    }

    setIsSubmitting(true);

    try {
      let finalDescription = description;
      if (attachments.length > 0) {
        finalDescription += '\n\n### Anexos:\n';
        attachments.forEach(att => {
          finalDescription += `\n![${att.name}](${att.url})\n`;
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
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {categories.map(cat => {
                const Icon = cat.icon;
                const isSelected = category === cat.id;
                return (
                  <button
                    type="button"
                    key={cat.id}
                    onClick={() => setCategory(cat.id)}
                    className={`p-2.5 rounded-lg text-left border transition-colors flex items-center gap-2 ${
                      isSelected
                        ? 'bg-zinc-800 border-zinc-600 text-zinc-100 font-medium'
                        : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-300'
                    }`}
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
                    className={`py-2 px-3 rounded-lg text-center text-xs border transition-colors ${
                      isSelected
                        ? 'bg-zinc-800 border-zinc-600 text-zinc-100 font-medium'
                        : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-300'
                    }`}
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
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                    tab === 'write' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  Escrever
                </button>
                <button
                  type="button"
                  onClick={() => setTab('preview')}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                    tab === 'preview' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
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
                  placeholder="Descreva o problema e os passos para reproduzir..."
                  className="w-full p-3 text-xs text-zinc-100 bg-zinc-900 border border-zinc-800 rounded-lg placeholder-zinc-500 focus:outline-none focus:border-zinc-600 transition-colors font-mono leading-relaxed"
                />

                {/* Upload de Imagens */}
                <div className="mt-2.5 p-3 rounded-lg bg-zinc-900/60 border border-zinc-800 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-zinc-400">
                    <ImageIcon className="w-3.5 h-3.5 text-zinc-500" />
                    <span>Anexar prints</span>
                  </div>

                  <label className="cursor-pointer inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 transition-colors">
                    <Paperclip className="w-3 h-3 text-zinc-400" />
                    <span>Selecionar imagem</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                {attachments.length > 0 && (
                  <div className="mt-2.5 grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {attachments.map((att, idx) => (
                      <div key={idx} className="relative group rounded-lg overflow-hidden border border-zinc-800 bg-zinc-900">
                        <img src={att.url} alt={att.name} className="w-full h-16 object-cover" />
                        <button
                          type="button"
                          onClick={() => removeAttachment(idx)}
                          className="absolute top-1 right-1 p-1 rounded bg-black/70 text-red-400 hover:text-red-300"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="w-full min-h-[140px] p-3 text-xs text-zinc-300 bg-zinc-900/40 border border-zinc-800 rounded-lg leading-relaxed whitespace-pre-wrap">
                {description.trim() ? (
                  <div>
                    <p>{description}</p>
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
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium text-zinc-900 bg-zinc-100 hover:bg-white disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3 h-3 border-2 border-zinc-900/30 border-t-zinc-900 rounded-full animate-spin" />
                  <span>Enviando...</span>
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
