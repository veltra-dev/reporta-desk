'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Plus, 
  User, 
  Shield, 
  ChevronDown,
  LogOut,
  Users,
  Key,
  CheckCircle2,
  X,
  Loader2
} from 'lucide-react';
import GithubIcon from './GithubIcon';
import Logo from './Logo';
import ThemeToggle from './ThemeToggle';
import { SessionUser } from '@/lib/types';
import { logoutAction, changeOwnPasswordAction } from '@/app/actions/auth';

interface NavbarProps {
  session: SessionUser | null;
  isGitHubConnected: boolean;
  repoName?: string;
}

export default function Navbar({ session, isGitHubConnected, repoName }: NavbarProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ type: "error" | "success"; text: string } | null>(null);

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);

    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: "error", text: "As senhas não coincidem." });
      return;
    }

    if (newPassword.length < 4) {
      setPasswordMsg({ type: "error", text: "A nova senha deve ter pelo menos 4 caracteres." });
      return;
    }

    setIsSubmittingPassword(true);
    const res = await changeOwnPasswordAction(newPassword);
    setIsSubmittingPassword(false);

    if (res.success) {
      setPasswordMsg({ type: "success", text: "Sua senha foi alterada com sucesso!" });
      setTimeout(() => {
        setPasswordModalOpen(false);
        setNewPassword("");
        setConfirmPassword("");
        setPasswordMsg(null);
      }, 1500);
    } else {
      setPasswordMsg({ type: "error", text: res.error || "Erro ao alterar senha." });
    }
  };

  const router = useRouter();

  const handleLogout = async () => {
    await logoutAction();
    setDropdownOpen(false);
    router.push('/login');
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-[#0F1115]/90 backdrop-blur-md border-b border-zinc-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        
        {/* Logo */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-3 group">
            <Logo size="md" />
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-zinc-800/80 text-zinc-400 border border-zinc-700/60 hidden sm:inline-block">
              Helpdesk
            </span>
          </Link>

          {/* Indicador de Status do Repositório */}
          <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-md bg-zinc-900/80 border border-zinc-800 text-xs">
            <GithubIcon className="w-3.5 h-3.5 text-zinc-400" />
            {isGitHubConnected ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="text-zinc-300 font-mono text-[11px]">{repoName || 'Repo Privado'}</span>
              </>
            ) : (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
                <span className="text-zinc-400 text-[11px]">Modo Sandbox</span>
              </>
            )}
          </div>
        </div>

        {/* Ações e Perfil */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          
          {/* Botão de Alternar Tema (Dark / Light) */}
          <ThemeToggle />

          {session && (
            <>
              {/* Botão Novo Chamado */}
              <Link
                href="/tickets/novo"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white bg-[#2F5BFF] hover:bg-[#2549D6] transition-colors shadow-lg shadow-[#2F5BFF]/20 active:scale-98"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Novo Chamado</span>
              </Link>

              {/* Menu de Perfil / Logout */}
              <div className="relative">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 p-1.5 pr-2.5 rounded-xl hover:bg-zinc-800/60 border border-transparent hover:border-zinc-700/60 transition-all"
                >
                  <div className="w-7 h-7 rounded-lg bg-[#2F5BFF]/20 border border-[#2F5BFF]/40 flex items-center justify-center text-[#2F5BFF] font-bold text-xs uppercase">
                    {session.name[0]}
                  </div>
                  <div className="text-left hidden sm:block">
                    <p className="text-xs font-semibold text-zinc-200 leading-tight max-w-[120px] truncate">{session.name}</p>
                    <p className="text-[10px] text-zinc-500 capitalize">
                      {session.role === 'admin' ? 'Suporte' : 'Cliente'}
                    </p>
                  </div>
                  <ChevronDown className="w-3 h-3 text-zinc-500" />
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-[#12141A] border border-zinc-800 rounded-2xl p-1.5 z-50 shadow-2xl">
                    <div className="px-3 py-2 border-b border-zinc-800/80 text-xs">
                      <p className="text-zinc-500 text-[10px]">Autenticado como:</p>
                      <p className="font-semibold text-zinc-100 truncate">{session.name}</p>
                      <p className="text-zinc-400 text-[11px] truncate font-mono">{session.email}</p>
                    </div>

                    <div className="py-1.5 space-y-1">
                      {session.role === 'admin' && (
                        <Link
                          href="/admin/usuarios"
                          onClick={() => setDropdownOpen(false)}
                          className="w-full text-left px-3 py-2 rounded-xl text-xs flex items-center gap-2 text-zinc-300 hover:bg-zinc-800/80 hover:text-white transition-colors"
                        >
                          <Users className="w-4 h-4 text-[#2F5BFF]" />
                          <span>Gerenciar Usuários</span>
                        </Link>
                      )}

                      <button
                        onClick={() => {
                          setDropdownOpen(false);
                          setPasswordModalOpen(true);
                          setPasswordMsg(null);
                        }}
                        className="w-full text-left px-3 py-2 rounded-xl text-xs flex items-center gap-2 text-zinc-300 hover:bg-zinc-800/80 hover:text-white transition-colors"
                      >
                        <Key className="w-4 h-4 text-amber-400" />
                        <span>Alterar Minha Senha</span>
                      </button>

                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-3 py-2 rounded-xl text-xs flex items-center gap-2 text-red-400 hover:bg-red-950/40 hover:text-red-300 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Sair do Sistema</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {!session && (
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-semibold text-white bg-[#2F5BFF] hover:bg-[#2549D6] transition-colors"
            >
              <span>Entrar</span>
            </Link>
          )}

        </div>

      </div>
    
      {/* Modal de Alteração de Senha */}
      {passwordModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#12141A] border border-zinc-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl relative">
            <button
              onClick={() => setPasswordModalOpen(false)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-zinc-300"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
                <Key className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-zinc-100">Alterar Minha Senha</h3>
                <p className="text-[11px] text-zinc-400">Digite sua nova senha abaixo</p>
              </div>
            </div>

            <form onSubmit={handleChangePasswordSubmit} className="space-y-4">
              {passwordMsg && (
                <div className={`p-3 rounded-xl text-xs border ${
                  passwordMsg.type === "success" 
                    ? "bg-emerald-950/50 border-emerald-800 text-emerald-300"
                    : "bg-red-950/50 border-red-800 text-red-300"
                }`}>
                  {passwordMsg.text}
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Nova Senha:</label>
                <input
                  type="password"
                  required
                  minLength={4}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-100 focus:outline-none focus:border-[#2F5BFF]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Confirmar Nova Senha:</label>
                <input
                  type="password"
                  required
                  minLength={4}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-100 focus:outline-none focus:border-[#2F5BFF]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPasswordModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-xl text-xs text-zinc-400 hover:text-zinc-200"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={isSubmittingPassword}
                  className="px-4 py-1.5 rounded-xl text-xs font-semibold text-white bg-[#2F5BFF] hover:bg-[#2549D6] disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isSubmittingPassword ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  )}
                  <span>Salvar Senha</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
}
