'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Users, 
  UserPlus, 
  Shield, 
  User, 
  Search, 
  Edit, 
  Trash2, 
  Key, 
  Check, 
  X, 
  ArrowLeft,
  AlertCircle,
  Building,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { UserAccount, SessionUser } from '@/lib/types';
import { createUserAction, updateUserAction, deleteUserAction } from '@/app/actions/auth';

interface AdminUsersClientProps {
  initialUsers: UserAccount[];
  session: SessionUser;
}

export default function AdminUsersClient({ initialUsers, session }: AdminUsersClientProps) {
  const [users, setUsers] = useState<UserAccount[]>(initialUsers);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'todos' | 'client' | 'admin'>('todos');
  
  // Modal de Novo / Editar Usuário
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  
  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'client' | 'admin'>('client');
  const [company, setCompany] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  // Modal de Confirmação de Exclusão
  const [userToDelete, setUserToDelete] = useState<UserAccount | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Sistema de Toast Notification
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = 
      u.name.toLowerCase().includes(search.toLowerCase()) || 
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.company || '').toLowerCase().includes(search.toLowerCase());
    
    const matchesRole = roleFilter === 'todos' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const handleOpenCreateModal = () => {
    setEditingUser(null);
    setName('');
    setEmail('');
    setPassword('');
    setRole('client');
    setCompany('');
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (u: UserAccount) => {
    setEditingUser(u);
    setName(u.name);
    setEmail(u.email);
    setPassword(u.passwordHash);
    setRole(u.role);
    setCompany(u.company || '');
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      if (editingUser) {
        // Atualizar
        const res = await updateUserAction(editingUser.id, {
          name,
          email,
          passwordHash: password,
          role,
          company,
        });

        if (res.success && res.user) {
          setUsers(prev => prev.map(u => u.id === editingUser.id ? res.user! : u));
          setIsModalOpen(false);
        } else {
          setErrorMsg(res.error || 'Erro ao atualizar usuário.');
        }
      } else {
        // Criar
        const res = await createUserAction({
          name,
          email,
          passwordHash: password,
          role,
          company,
        });

        if (res.success && res.user) {
          setUsers(prev => [res.user!, ...prev]);
          setIsModalOpen(false);
        } else {
          setErrorMsg(res.error || 'Erro ao criar usuário.');
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro inesperado.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (u: UserAccount) => {
    const newActive = !u.active;
    const res = await updateUserAction(u.id, { active: newActive });
    if (res.success && res.user) {
      setUsers(prev => prev.map(usr => usr.id === u.id ? res.user! : usr));
      showToast(`Usuário "${u.name}" ${newActive ? "ativado" : "desativado"} com sucesso.`);
    }
  };

  const handleDelete = (u: UserAccount) => {
    setUserToDelete(u);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    setIsDeleting(true);
    const res = await deleteUserAction(userToDelete.id);
    setIsDeleting(false);
    if (res.success) {
      setUsers(prev => prev.filter(usr => usr.id !== userToDelete.id));
      showToast(`Usuário "${userToDelete.name}" excluído com sucesso.`);
      setUserToDelete(null);
    } else {
      showToast(res.error || "Erro ao excluir usuário.", "error");
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-6 space-y-6">
      
      {/* Botão Voltar */}
      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Voltar ao Dashboard</span>
        </Link>
      </div>

      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#12141A] p-6 rounded-2xl border border-zinc-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-semibold text-zinc-100 tracking-tight" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              Gestão de Usuários & Acessos
            </h1>
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#2F5BFF]/10 text-[#2F5BFF] border border-[#2F5BFF]/30">
              Admin Suporte
            </span>
          </div>
          <p className="text-xs text-zinc-400">
            Cadastre novos clientes, defina senhas de acesso e gerencie os privilégios da equipe.
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#2F5BFF] hover:bg-[#2549D6] transition-colors shadow-lg shadow-[#2F5BFF]/20 shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          <span>Novo Usuário</span>
        </button>
      </div>

      {/* Filtros e Busca */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        
        {/* Barra de Busca */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, e-mail ou empresa..."
            className="w-full pl-9 pr-3 py-2 bg-[#12141A] border border-zinc-800 rounded-xl text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-[#2F5BFF]"
          />
        </div>

        {/* Filtro por Papel */}
        <div className="flex items-center gap-1.5 p-1 bg-[#12141A] border border-zinc-800 rounded-xl text-xs w-full sm:w-auto">
          <button
            onClick={() => setRoleFilter('todos')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              roleFilter === 'todos' ? 'bg-zinc-800 text-white font-medium' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Todos ({users.length})
          </button>
          <button
            onClick={() => setRoleFilter('client')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              roleFilter === 'client' ? 'bg-zinc-800 text-white font-medium' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Clientes ({users.filter(u => u.role === 'client').length})
          </button>
          <button
            onClick={() => setRoleFilter('admin')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              roleFilter === 'admin' ? 'bg-zinc-800 text-white font-medium' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Suporte ({users.filter(u => u.role === 'admin').length})
          </button>
        </div>
      </div>

      {/* Tabela de Usuários */}
      <div className="bg-[#12141A] rounded-2xl border border-zinc-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-400 bg-zinc-900/40 text-[11px] uppercase tracking-wider">
                <th className="py-3.5 px-4">Usuário / Nome</th>
                <th className="py-3.5 px-4">E-mail de Acesso</th>
                <th className="py-3.5 px-4">Empresa / Org</th>
                <th className="py-3.5 px-4">Papel</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
              {filteredUsers.length > 0 ? (
                filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-zinc-800/30 transition-colors">
                    
                    {/* Nome */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-zinc-200 text-xs">
                          {u.name[0]?.toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-zinc-100">{u.name}</p>
                          <p className="text-[10px] text-zinc-500 font-mono">ID: {u.id}</p>
                        </div>
                      </div>
                    </td>

                    {/* Email */}
                    <td className="py-3.5 px-4 font-mono text-zinc-300">
                      {u.email}
                    </td>

                    {/* Empresa */}
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 text-[11px]">
                        <Building className="w-3 h-3" />
                        {u.company || '—'}
                      </span>
                    </td>

                    {/* Papel */}
                    <td className="py-3.5 px-4">
                      {u.role === 'admin' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#2F5BFF]/10 text-[#2F5BFF] border border-[#2F5BFF]/30 font-medium">
                          <Shield className="w-3 h-3" />
                          Suporte / Dev
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700">
                          <User className="w-3 h-3 text-zinc-400" />
                          Cliente
                        </span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => handleToggleActive(u)}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                          u.active 
                            ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-800/60 hover:bg-emerald-900/50' 
                            : 'bg-zinc-900 text-zinc-500 border border-zinc-800 hover:bg-zinc-800'
                        }`}
                      >
                        {u.active ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        <span>{u.active ? 'Ativo' : 'Inativo'}</span>
                      </button>
                    </td>

                    {/* Ações */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEditModal(u)}
                          className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 transition-colors"
                          title="Editar dados ou senha"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleDelete(u)}
                          className="p-1.5 rounded-lg hover:bg-red-950/40 text-zinc-500 hover:text-red-400 transition-colors"
                          title="Excluir usuário"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>

                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-zinc-500">
                    Nenhum usuário encontrado para os filtros selecionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Criação / Edição */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#12141A] border border-zinc-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-5">
            
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-base font-semibold text-zinc-100" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                {editingUser ? 'Editar Usuário' : 'Novo Usuário'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-zinc-500 hover:text-zinc-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-950/50 border border-red-800/80 text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Nome Completo:</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: João da Silva"
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700/80 rounded-xl text-xs text-zinc-100 focus:outline-none focus:border-[#2F5BFF]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">E-mail de Acesso:</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="joao@empresa.com"
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700/80 rounded-xl text-xs text-zinc-100 focus:outline-none focus:border-[#2F5BFF]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Empresa / Organização:</label>
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Ex: Acme Corp (ou 250k-dev)"
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700/80 rounded-xl text-xs text-zinc-100 focus:outline-none focus:border-[#2F5BFF]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Senha de Acesso:</label>
                <input
                  type="text"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Digite a senha..."
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700/80 rounded-xl text-xs text-zinc-100 focus:outline-none focus:border-[#2F5BFF] font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Papel / Nível de Acesso:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRole('client')}
                    className={`py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-2 border transition-all ${
                      role === 'client' 
                        ? 'bg-zinc-800 border-zinc-600 text-zinc-100 font-medium' 
                        : 'bg-zinc-900 border-zinc-800 text-zinc-500'
                    }`}
                  >
                    <User className="w-3.5 h-3.5" />
                    <span>Cliente</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRole('admin')}
                    className={`py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-2 border transition-all ${
                      role === 'admin' 
                        ? 'bg-[#2F5BFF]/20 border-[#2F5BFF] text-white font-medium' 
                        : 'bg-zinc-900 border-zinc-800 text-zinc-500'
                    }`}
                  >
                    <Shield className="w-3.5 h-3.5 text-[#2F5BFF]" />
                    <span>Suporte / Dev</span>
                  </button>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#2F5BFF] hover:bg-[#2549D6] transition-colors shadow-lg shadow-[#2F5BFF]/20 active:scale-98 disabled:opacity-50"
                >
                  {isSubmitting ? 'Salvando...' : 'Salvar Usuário'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* Modal Customizado de Confirmação de Exclusão */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-[#12141A] border border-zinc-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-red-950/60 border border-red-800/80 text-red-400">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-zinc-100">Excluir Usuário</h3>
                <p className="text-[11px] text-zinc-500">Esta ação é permanente</p>
              </div>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed">
              Tem certeza que deseja excluir o usuário <strong className="text-white">{userToDelete.name}</strong> ({userToDelete.email})?
            </p>

            <div className="pt-3 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={confirmDeleteUser}
                className="px-4 py-1.5 rounded-xl text-xs font-semibold text-white bg-red-600 hover:bg-red-500 active:scale-98 disabled:opacity-50 transition-all shadow-lg shadow-red-600/20"
              >
                {isDeleting ? "Excluindo..." : "Sim, Excluir"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification Flutuante */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl border shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-5 duration-200 ${
          toast.type === "success"
            ? "bg-zinc-900 border-emerald-500/50 text-emerald-300"
            : "bg-zinc-900 border-red-500/50 text-red-300"
        }`}>
          <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
          <span className="text-xs font-medium">{toast.message}</span>
          <button onClick={() => setToast(null)} className="text-zinc-500 hover:text-zinc-300 ml-2">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

    </div>
  );
}
