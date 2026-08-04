'use client';

import { useMemo, useState } from 'react';
import { User, Tag as TagIcon, Search, X, MessageSquare, RefreshCw, AtSign, Users as UsersIcon, ShieldCheck, Globe, BadgeCheck, Loader2, Trash2, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';

interface Contact {
  id: string;
  ig_scoped_id: string;
  name?: string;
  profile_picture?: string;
  created_at: string;
  contact_tags?: any;
  custom_fields?: Record<string, any>;
  last_interaction_at?: string | null;
}

interface IgProfile {
  name: string | null;
  username: string | null;
  profile_picture_url: string | null;
  follower_count: number | null;
  is_verified: boolean;
  biography: string | null;
}

const PAGE_SIZE = 8;

const timeAgo = (dateString?: string | null) => {
  if (!dateString) return null;
  const diff = Math.floor((Date.now() - new Date(dateString).getTime()) / 60000);
  if (diff < 1) return 'agora';
  if (diff < 60) return `há ${diff} min`;
  if (diff < 1440) return `há ${Math.floor(diff / 60)}h`;
  if (diff < 10080) return `há ${Math.floor(diff / 1440)}d`;
  return new Date(dateString).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
};

export function AudienceTable({ contacts: initialContacts }: { contacts: Contact[] }) {
  const [contacts, setContacts] = useState<Contact[]>(initialContacts);
  const [searchTerm, setSearchTerm] = useState('');
  const [tagFilter, setTagFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedLead, setSelectedLead] = useState<Contact | null>(null);
  const [igProfile, setIgProfile] = useState<IgProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Contact | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    contacts.forEach((c) => (c.contact_tags || []).forEach((ct: any) => {
      if (ct.tags?.name) set.add(ct.tags.name);
    }));
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [contacts]);

  const filteredContacts = contacts.filter((c) => {
    const term = searchTerm.toLowerCase();
    const username = (c.custom_fields as Record<string, any>)?.username || '';
    const tagNames = (c.contact_tags || []).map((ct: any) => ct.tags?.name || '').join(' ').toLowerCase();
    const matchSearch =
      !term ||
      c.name?.toLowerCase().includes(term) ||
      c.ig_scoped_id.toLowerCase().includes(term) ||
      username.toLowerCase().includes(term) ||
      tagNames.includes(term);

    const matchTag = tagFilter === 'all' || (c.contact_tags || []).some((ct: any) => ct.tags?.name === tagFilter);

    return matchSearch && matchTag;
  });

  const totalPages = Math.max(1, Math.ceil(filteredContacts.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedContacts = filteredContacts.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleTagFilter = (value: string) => {
    setTagFilter(value);
    setCurrentPage(1);
  };

  const handleOpenProfile = async (contact: Contact) => {
    setSelectedLead(contact);
    setIgProfile(null);
    setLoadingProfile(true);
    try {
      const res = await fetch('/api/contacts/fetch-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactId: contact.id }),
      });
      const data = await res.json();
      if (data.success) {
        setSelectedLead(prev => prev ? {
          ...prev,
          name: data.contact?.name || prev.name,
          profile_picture: data.contact?.profile_picture || prev.profile_picture,
          custom_fields: data.contact?.custom_fields || prev.custom_fields,
        } : prev);
        if (data.ig_profile) setIgProfile(data.ig_profile);
      }
    } catch (err) {
      console.warn('Erro ao buscar perfil:', err);
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleRefreshProfile = () => {
    if (selectedLead) {
      handleOpenProfile(selectedLead);
      toast.success('Atualizando perfil...');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await fetch('/api/contacts/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactId: deleteTarget.id }),
      });
      if (res.ok) {
        setContacts(prev => prev.filter(c => c.id !== deleteTarget.id));
        toast.success(`Lead "${deleteTarget.name || 'Anônimo'}" excluído com sucesso!`);
        setDeleteTarget(null);
      } else {
        const data = await res.json();
        toast.error(data.error || 'Erro ao excluir o lead.');
      }
    } catch {
      toast.error('Erro de rede ao excluir o lead.');
    } finally {
      setIsDeleting(false);
    }
  };

  const displayName = selectedLead?.name || 'Lead Anônimo';
  const displayAvatar = igProfile?.profile_picture_url || selectedLead?.profile_picture;
  const leadData = (selectedLead as any)?.custom_fields || {};
  const displayUsername = igProfile?.username || leadData.username;
  const displayFollowers = igProfile?.follower_count ?? leadData.follower_count;
  const displayVerified = igProfile?.is_verified ?? leadData.is_verified;
  const displayBio = igProfile?.biography || leadData.biography;

  return (
    <div className="glass-panel rounded-3xl overflow-hidden">

      {/* Barra de Ferramentas */}
      <div className="p-4 border-b border-white/50 flex flex-col sm:flex-row gap-4 justify-between items-center bg-white/40">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nome ou ID..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white/60 border border-white rounded-xl focus:ring-2 focus:ring-pink-500 outline-none text-xs font-medium backdrop-blur-sm"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-500 font-medium">
            {filteredContacts.length} lead{filteredContacts.length !== 1 ? 's' : ''}
          </span>
          {allTags.length > 0 && (
            <select
              value={tagFilter}
              onChange={(e) => handleTagFilter(e.target.value)}
              className="bg-white/60 border border-white text-gray-700 font-medium text-xs rounded-xl px-3 py-2 outline-none hover:bg-white/80 transition-colors shadow-sm backdrop-blur-sm cursor-pointer"
            >
              <option value="all">Todas as tags</option>
              {allTags.map((t) => (
                <option key={t} value={t}>#{t}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Tabela */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-gray-600">
          <thead className="bg-white/50 text-gray-800 font-bold border-b border-white/50 uppercase tracking-wider text-[10px]">
            <tr>
              <th className="px-6 py-4">Lead</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Tags</th>
              <th className="px-6 py-4">Cadastrado em</th>
              <th className="px-6 py-4">Última interação</th>
              <th className="px-6 py-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {paginatedContacts.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                  Nenhum lead encontrado.
                </td>
              </tr>
            ) : (
              paginatedContacts.map((contact) => (
                <tr key={contact.id} className="hover:bg-blue-50/30 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {contact.profile_picture ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={contact.profile_picture} alt={contact.name} className="w-10 h-10 rounded-full object-cover border border-gray-200 shadow-2xs" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-2xs">
                          {contact.name ? contact.name.substring(0, 2).toUpperCase() : <User className="w-5 h-5" />}
                        </div>
                      )}
                      <div>
                        <p className="font-bold text-gray-900">{contact.name || 'Lead Anônimo'}</p>
                        {(contact.custom_fields as Record<string, any>)?.username && (
                          <p className="text-[11px] text-gray-500">@{(contact.custom_fields as Record<string, any>).username}</p>
                        )}
                        <p className="text-[11px] font-mono text-gray-400">ID: {contact.ig_scoped_id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {contact.last_interaction_at ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        ● Ativo
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                        ● Novo
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1.5">
                      {contact.contact_tags && contact.contact_tags.length > 0 ? (
                        contact.contact_tags.map((ct: any) => (
                          <span key={ct.tag_id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 text-[10px] font-bold border border-gray-200">
                            <TagIcon className="w-3 h-3 text-gray-500" />
                            {ct.tags?.name || 'Tag'}
                          </span>
                        ))
                      ) : (
                        <span className="text-gray-400 text-xs italic">Sem tags</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-500 font-medium">
                    {new Date(contact.created_at).toLocaleDateString('pt-BR', {
                      day: '2-digit', month: 'short', year: 'numeric'
                    })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-500 font-medium">
                    {timeAgo(contact.last_interaction_at) || <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleOpenProfile(contact)}
                        className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl font-bold text-xs border border-blue-200 transition-colors inline-flex items-center gap-1 cursor-pointer"
                      >
                        Ver Perfil
                      </button>
                      <button
                        onClick={() => setDeleteTarget(contact)}
                        className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl font-bold text-xs border border-red-200 transition-colors inline-flex items-center gap-1.5 cursor-pointer group/del"
                        title="Excluir lead"
                      >
                        <Trash2 className="w-3.5 h-3.5 group-hover/del:scale-110 transition-transform" />
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="px-6 py-4 border-t border-white/50 bg-white/30 flex items-center justify-between">
          <p className="text-xs text-gray-500 font-medium">
            Página <span className="font-bold text-gray-800">{safePage}</span> de <span className="font-bold text-gray-800">{totalPages}</span>
            {' · '}mostrando <span className="font-bold text-gray-800">{paginatedContacts.length}</span> de <span className="font-bold text-gray-800">{filteredContacts.length}</span> leads
          </p>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={safePage === 1}
              className="w-8 h-8 rounded-lg bg-white/70 border border-white hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors shadow-sm"
            >
              <ChevronLeft className="w-4 h-4 text-gray-600" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`w-8 h-8 rounded-lg border text-xs font-bold transition-all shadow-sm ${
                  page === safePage
                    ? 'bg-instagram-gradient text-white border-transparent shadow-lg shadow-pink-500/20 scale-105'
                    : 'bg-white/70 border-white hover:bg-white text-gray-600'
                }`}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              className="w-8 h-8 rounded-lg bg-white/70 border border-white hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors shadow-sm"
            >
              <ChevronRight className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════ */}
      {/* MODAL — CONFIRMAÇÃO DE EXCLUSÃO             */}
      {/* ═══════════════════════════════════════════ */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget && !isDeleting) setDeleteTarget(null); }}
        >
          <div className="glass-panel rounded-3xl border border-white/80 shadow-2xl max-w-md w-full overflow-hidden">
            {/* Header vermelho */}
            <div className="bg-gradient-to-br from-red-500 to-rose-600 p-6 text-white">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-black">Excluir Lead</h3>
                  <p className="text-red-100 text-sm">Esta ação não pode ser desfeita</p>
                </div>
              </div>
            </div>

            {/* Corpo */}
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3 p-4 bg-gray-50 border border-gray-200 rounded-2xl">
                {deleteTarget.profile_picture ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={deleteTarget.profile_picture} alt={deleteTarget.name} className="w-12 h-12 rounded-full object-cover border border-gray-200" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold text-base">
                    {deleteTarget.name ? deleteTarget.name.substring(0, 2).toUpperCase() : <User className="w-5 h-5" />}
                  </div>
                )}
                <div>
                  <p className="font-black text-gray-900">{deleteTarget.name || 'Lead Anônimo'}</p>
                  <p className="text-[11px] font-mono text-gray-400">ID: {deleteTarget.ig_scoped_id}</p>
                </div>
              </div>

              <p className="text-sm text-gray-600 leading-relaxed">
                Você está prestes a excluir permanentemente este lead e todas as suas conversas, mensagens e tags associadas. <span className="font-bold text-red-600">Essa ação é irreversível.</span>
              </p>
            </div>

            {/* Rodapé */}
            <div className="p-5 border-t border-white/50 bg-white/40 flex items-center justify-end gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
                className="px-5 py-2.5 bg-white/80 border border-gray-200 hover:bg-white text-gray-700 rounded-xl text-sm font-bold transition-colors disabled:opacity-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="px-5 py-2.5 bg-gradient-to-r from-red-500 to-rose-600 hover:opacity-90 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-red-500/20 hover:scale-[1.02] disabled:opacity-50 flex items-center gap-2 cursor-pointer"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Excluindo...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Sim, excluir lead
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════ */}
      {/* MODAL — PERFIL DO LEAD                      */}
      {/* ═══════════════════════════════════════════ */}
      {selectedLead && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedLead(null); }}
        >
          <div className="glass-panel rounded-3xl border border-white/80 shadow-2xl max-w-lg w-full overflow-hidden relative">

            {/* Header gradiente */}
            <div className="bg-instagram-gradient p-6 text-white relative">
              <button
                onClick={() => setSelectedLead(null)}
                className="absolute top-4 right-4 text-white/80 hover:text-white bg-black/20 hover:bg-black/40 p-1.5 rounded-full transition-colors cursor-pointer"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-4">
                {loadingProfile ? (
                  <div className="w-18 h-18 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border-3 border-white/60 shadow-lg">
                    <Loader2 className="w-7 h-7 text-white animate-spin" />
                  </div>
                ) : displayAvatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={displayAvatar} alt={displayName} className="w-18 h-18 rounded-full object-cover border-3 border-white/60 shadow-lg" />
                ) : (
                  <div className="w-18 h-18 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white font-extrabold text-2xl border-3 border-white/60 shadow-lg">
                    {displayName.substring(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold text-white truncate">{displayName}</h3>
                    {displayVerified && <BadgeCheck className="w-5 h-5 text-blue-300 flex-shrink-0" />}
                  </div>
                  {displayUsername && <p className="text-white/70 text-sm font-medium mt-0.5">@{displayUsername}</p>}
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="px-2 py-0.5 bg-emerald-400/20 backdrop-blur-md text-emerald-200 text-[10px] font-black rounded-full border border-emerald-400/30">
                      ● Lead Ativo
                    </span>
                    <span className="px-2 py-0.5 bg-white/10 backdrop-blur-md text-white/90 text-[10px] font-bold rounded-full inline-flex items-center gap-1">
                      <Globe className="w-3 h-3" /> Instagram Direct
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Conteúdo */}
            <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto">
              {loadingProfile && (
                <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-2xl">
                  <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                  <span className="text-xs font-bold text-blue-800">Buscando perfil via Meta Graph API...</span>
                </div>
              )}
              {displayBio && (
                <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-gray-500">Biografia</span>
                  <p className="text-xs text-gray-800 leading-relaxed whitespace-pre-line">{displayBio}</p>
                </div>
              )}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white/60 backdrop-blur-sm p-3.5 rounded-2xl border border-white text-center space-y-1 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
                  <UsersIcon className="w-4 h-4 text-pink-600 mx-auto" />
                  <p className="text-lg font-extrabold text-gray-900">{displayFollowers != null ? displayFollowers.toLocaleString('pt-BR') : '—'}</p>
                  <span className="text-[10px] font-bold text-gray-500">Seguidores</span>
                </div>
                <div className="bg-white/60 backdrop-blur-sm p-3.5 rounded-2xl border border-white text-center space-y-1 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
                  <AtSign className="w-4 h-4 text-purple-600 mx-auto" />
                  <p className="text-xs font-extrabold text-gray-900 truncate">{displayUsername || '—'}</p>
                  <span className="text-[10px] font-bold text-gray-500">Username</span>
                </div>
                <div className="bg-white/60 backdrop-blur-sm p-3.5 rounded-2xl border border-white text-center space-y-1 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
                  <ShieldCheck className="w-4 h-4 text-orange-500 mx-auto" />
                  <p className="text-xs font-extrabold text-gray-900">{displayVerified === true ? '✅ Sim' : displayVerified === false ? '❌ Não' : '—'}</p>
                  <span className="text-[10px] font-bold text-gray-500">Verificado</span>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                  <TagIcon className="w-3.5 h-3.5 text-indigo-600" /> Tags do Lead
                </label>
                <div className="flex flex-wrap gap-2 p-3 bg-gray-50 border border-gray-200 rounded-2xl min-h-[40px]">
                  {selectedLead.contact_tags && selectedLead.contact_tags.length > 0 ? (
                    selectedLead.contact_tags.map((ct: any) => (
                      <span key={ct.tag_id} className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-white text-gray-800 text-xs font-bold border border-gray-300 shadow-2xs">
                        <TagIcon className="w-3 h-3 text-blue-600" />
                        {ct.tags?.name || 'Tag'}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-gray-400 italic">Nenhuma tag atribuída a este lead.</span>
                  )}
                </div>
              </div>
            </div>

            {/* Rodapé */}
            <div className="p-5 border-t border-white/50 flex items-center justify-between gap-3 bg-white/40">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedLead(null)}
                  className="px-4 py-2.5 bg-white/60 border border-white hover:bg-white/80 text-gray-700 rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-sm backdrop-blur-sm"
                >
                  Fechar
                </button>
                <button
                  onClick={handleRefreshProfile}
                  disabled={loadingProfile}
                  className="px-3 py-2.5 bg-white/60 border border-white hover:bg-white/80 text-gray-700 rounded-xl text-xs font-bold transition-colors cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5 shadow-sm backdrop-blur-sm"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingProfile ? 'animate-spin' : ''}`} />
                  Atualizar
                </button>
              </div>
              <Link
                href={`/inbox?contactId=${selectedLead.id}`}
                className="px-5 py-2.5 bg-instagram-gradient hover:opacity-90 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-2 shadow-lg shadow-pink-500/20 hover:scale-[1.02]"
              >
                <MessageSquare className="w-4 h-4" /> Abrir no Inbox
              </Link>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
