'use client';

import { useState } from 'react';
import { User, Tag as TagIcon, Search, Filter, X, MessageSquare, Copy, Check, Calendar, ShieldCheck, Globe, Users as UsersIcon, BadgeCheck, Loader2, RefreshCw, AtSign } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';

interface Contact {
  id: string;
  ig_scoped_id: string;
  name?: string;
  profile_picture?: string;
  created_at: string;
  contact_tags?: any;
}

interface IgProfile {
  name: string | null;
  username: string | null;
  profile_picture_url: string | null;
  follower_count: number | null;
  is_verified: boolean;
  biography: string | null;
}

export function AudienceTable({ contacts }: { contacts: Contact[] }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLead, setSelectedLead] = useState<Contact | null>(null);
  const [igProfile, setIgProfile] = useState<IgProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  const filteredContacts = contacts.filter((c) =>
    c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.ig_scoped_id.includes(searchTerm)
  );

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(true);
    toast.success('ID do Instagram copiado!');
    setTimeout(() => setCopiedId(false), 2000);
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
        // Update selected lead with fresh data
        setSelectedLead(prev => prev ? {
          ...prev,
          name: data.contact?.name || prev.name,
          profile_picture: data.contact?.profile_picture || prev.profile_picture,
        } : prev);

        if (data.ig_profile) {
          setIgProfile(data.ig_profile);
        }
      }
    } catch (err) {
      console.warn('Erro ao buscar perfil do Instagram:', err);
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleRefreshProfile = () => {
    if (selectedLead) {
      handleOpenProfile(selectedLead);
      toast.success('Atualizando perfil do Instagram...');
    }
  };

  const displayName = selectedLead?.name || 'Lead Anônimo';
  const displayAvatar = igProfile?.profile_picture_url || selectedLead?.profile_picture;
  const displayUsername = igProfile?.username;
  const displayBio = igProfile?.biography;
  const displayFollowers = igProfile?.follower_count;
  const displayVerified = igProfile?.is_verified;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">

      {/* Barra de Ferramentas */}
      <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row gap-4 justify-between items-center bg-gray-50/50">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nome ou ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-xs font-medium"
          />
        </div>
        <button
          onClick={() => toast.success('Filtros ativados.')}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer shadow-2xs"
        >
          <Filter className="w-3.5 h-3.5" />
          Filtros Avançados
        </button>
      </div>

      {/* Tabela de Leads */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-gray-600">
          <thead className="bg-gray-50/80 text-gray-700 font-bold border-b border-gray-200 uppercase tracking-wider text-[10px]">
            <tr>
              <th className="px-6 py-4">Lead</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Tags</th>
              <th className="px-6 py-4">Cadastrado em</th>
              <th className="px-6 py-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredContacts.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                  Nenhum lead encontrado.
                </td>
              </tr>
            ) : (
              filteredContacts.map((contact) => (
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
                        <p className="text-[11px] font-mono text-gray-400">ID: {contact.ig_scoped_id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                      Inscrito
                    </span>
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
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleOpenProfile(contact)}
                      className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl font-bold text-xs border border-blue-200 transition-colors inline-flex items-center gap-1 cursor-pointer"
                    >
                      Ver Perfil
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* MODAL — PERFIL REAL DO LEAD (Instagram)                */}
      {/* ═══════════════════════════════════════════════════════ */}
      {selectedLead && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedLead(null); }}
        >
          <div className="bg-white rounded-3xl border border-gray-200 shadow-2xl max-w-lg w-full overflow-hidden relative">

            {/* ── Header com gradiente ────────────────────────── */}
            <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-6 text-white relative">
              <button
                onClick={() => setSelectedLead(null)}
                className="absolute top-4 right-4 text-white/80 hover:text-white bg-black/20 hover:bg-black/40 p-1.5 rounded-full transition-colors cursor-pointer"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-4">
                {/* Avatar real do Instagram */}
                {loadingProfile ? (
                  <div className="w-18 h-18 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border-3 border-white/60 shadow-lg">
                    <Loader2 className="w-7 h-7 text-white animate-spin" />
                  </div>
                ) : displayAvatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={displayAvatar}
                    alt={displayName}
                    className="w-18 h-18 rounded-full object-cover border-3 border-white/60 shadow-lg"
                  />
                ) : (
                  <div className="w-18 h-18 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white font-extrabold text-2xl border-3 border-white/60 shadow-lg">
                    {displayName.substring(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold text-white truncate">{displayName}</h3>
                    {displayVerified && (
                      <BadgeCheck className="w-5 h-5 text-blue-300 flex-shrink-0" />
                    )}
                  </div>
                  {displayUsername && (
                    <p className="text-white/70 text-sm font-medium mt-0.5">@{displayUsername}</p>
                  )}
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

            {/* ── Conteúdo ────────────────────────────────────── */}
            <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto">

              {/* Loading state */}
              {loadingProfile && (
                <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-2xl">
                  <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                  <span className="text-xs font-bold text-blue-800">Buscando perfil real do Instagram via Meta Graph API...</span>
                </div>
              )}

              {/* Biografia do Instagram */}
              {displayBio && (
                <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-gray-500">Biografia</span>
                  <p className="text-xs text-gray-800 leading-relaxed whitespace-pre-line">{displayBio}</p>
                </div>
              )}

              {/* KPIs — Seguidores, Username, ID */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white p-3.5 rounded-2xl border border-gray-200 text-center space-y-1">
                  <UsersIcon className="w-4 h-4 text-indigo-600 mx-auto" />
                  <p className="text-lg font-extrabold text-gray-900">
                    {displayFollowers != null ? displayFollowers.toLocaleString('pt-BR') : '—'}
                  </p>
                  <span className="text-[10px] font-bold text-gray-500">Seguidores</span>
                </div>

                <div className="bg-white p-3.5 rounded-2xl border border-gray-200 text-center space-y-1">
                  <AtSign className="w-4 h-4 text-purple-600 mx-auto" />
                  <p className="text-xs font-extrabold text-gray-900 truncate">
                    {displayUsername || '—'}
                  </p>
                  <span className="text-[10px] font-bold text-gray-500">Username</span>
                </div>

                <div className="bg-white p-3.5 rounded-2xl border border-gray-200 text-center space-y-1">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 mx-auto" />
                  <p className="text-xs font-extrabold text-gray-900">
                    {displayVerified ? '✅ Sim' : '—'}
                  </p>
                  <span className="text-[10px] font-bold text-gray-500">Verificado</span>
                </div>
              </div>



              {/* Tags do Lead */}
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

            {/* ── Rodapé — Ações rápidas ──────────────────────── */}
            <div className="p-5 border-t border-gray-100 flex items-center justify-between gap-3 bg-gray-50/50">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedLead(null)}
                  className="px-4 py-2.5 border border-gray-300 hover:bg-gray-100 text-gray-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Fechar
                </button>
                <button
                  onClick={handleRefreshProfile}
                  disabled={loadingProfile}
                  className="px-3 py-2.5 border border-gray-300 hover:bg-gray-100 text-gray-700 rounded-xl text-xs font-bold transition-colors cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
                  title="Atualizar dados do Instagram"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingProfile ? 'animate-spin' : ''}`} />
                  Atualizar
                </button>
              </div>

              <Link
                href="/inbox"
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-2 shadow-xs"
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
