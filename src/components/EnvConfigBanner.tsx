'use client';

import React, { useState } from 'react';
import { X, CheckCircle2, Copy } from 'lucide-react';
import GithubIcon from './GithubIcon';

interface EnvConfigBannerProps {
  isConfigured: boolean;
  repoName?: string;
}

export default function EnvConfigBanner({ isConfigured, repoName }: EnvConfigBannerProps) {
  const [isOpen, setIsOpen] = useState(!isConfigured);
  const [copied, setCopied] = useState(false);

  const envSnippet = `GITHUB_TOKEN=ghp_seu_token_aqui\nGITHUB_OWNER=sua-organization\nGITHUB_REPO=recomenda\nRESEND_API_KEY=re_sua_chave_resend`;

  const copyEnv = () => {
    navigator.clipboard.writeText(envSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="rounded-xl bg-[#121215] p-4 mb-6 border border-zinc-800">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 shrink-0 mt-0.5">
            <GithubIcon className="w-4 h-4" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-semibold text-zinc-200">
                {isConfigured ? `Conectado ao repositório: ${repoName}` : 'Modo Sandbox Local'}
              </h3>
              <span className={`text-[10px] font-medium px-1.5 py-0.2 rounded border ${
                isConfigured ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/60' : 'bg-zinc-800 text-zinc-400 border-zinc-700'
              }`}>
                {isConfigured ? 'GitHub Ativo' : 'Demonstração'}
              </span>
            </div>

            <p className="text-xs text-zinc-400 mt-1 max-w-xl leading-relaxed">
              {isConfigured
                ? `Todas as solicitações criadas aqui sincronizam em tempo real com as Issues do repositório ${repoName}.`
                : 'Você está no modo de demonstração. Para conectar com a Organization do seu cliente (ex: repositório recomenda), configure o `.env.local`.'}
            </p>

            {!isConfigured && (
              <div className="mt-3 p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 font-mono">
                <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-zinc-800 text-[11px] text-zinc-500 font-sans">
                  <span>Exemplo para o arquivo <strong>.env.local</strong>:</span>
                  <button
                    onClick={copyEnv}
                    className="flex items-center gap-1 text-zinc-400 hover:text-zinc-200"
                  >
                    {copied ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copied ? 'Copiado' : 'Copiar'}</span>
                  </button>
                </div>
                <pre className="text-[11px] text-zinc-300 leading-relaxed overflow-x-auto">
{envSnippet}
                </pre>
              </div>
            )}
          </div>
        </div>

        <button
          onClick={() => setIsOpen(false)}
          className="p-1 rounded-md text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
