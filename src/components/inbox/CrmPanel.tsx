/* eslint-disable @next/next/no-img-element */
'use client';

import { useEffect, useState } from 'react';
import { AtSign, Mail, Phone, X, ChevronDown, Tag as TagIcon, UserCog, Save, Sparkles } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'react-hot-toast';

const PIPELINE_STAGES = [
  { value: 'novo', label: 'Novo' },
  { value: 'em_atendimento', label: 'Em Atendimento' },
  { value: 'em_negociacao', label: 'Em Negociação' },
  { value: 'fechado', label: 'Fechado' },
  { value: 'perdido', label: 'Perdido' }
];

interface Member {
  id: string;
  user_id: string;
  role: string;
  email?: string;
  name?: string;
}

interface CrmPanelProps {
  workspaceId: string;
  conversationId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  contact: Record<string, any>;
  pipelineStage?: string | null;
  assigneeId?: string | null;
  members: Member[];
  onDataChanged: () => void;
  onClose: () => void;
}

export function CrmPanel({
  workspaceId,
  conversationId,
  contact,
  pipelineStage,
  assigneeId,
  members,
  onDataChanged,
  onClose
}: CrmPanelProps) {
  const supabase = createClient();
  const [stage, setStage] = useState(pipelineStage || 'novo');
  const [assignedTo, setAssignedTo] = useState(assigneeId || '');
  const [email, setEmail] = useState(contact.email || '');
  const [phone, setPhone] = useState(contact.phone || '');
  const [tagInput, setTagInput] = useState('');
  const [saving, setSaving] = useState(false);

  // Se o username ainda não foi capturado, buscar o perfil real no Instagram
  useEffect(() => {
    if (!contact?.id || contact.username || contact.custom_fields?.username) return;
    let cancelled = false;
    fetch('/api/contacts/fetch-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contactId: contact.id })
    })
      .then(r => r.json())
      .then(d => { if (!cancelled && d.success && d.contact) onDataChanged(); })
      .catch(() => {});
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contact?.id, contact?.username, contact?.custom_fields?.username]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const contactTags: any[] = contact.contact_tags || [];

  const updateConversation = async (updates: Record<string, unknown>) => {
    try {
      const res = await fetch('/api/conversations/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId, ...updates })
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error('Erro: ' + (data.error || 'Falha ao atualizar'));
        return false;
      }
      return true;
    } catch {
      toast.error('Erro de comunicação');
      return false;
    }
  };

  const handleStageChange = async (value: string) => {
    setStage(value);
    if (await updateConversation({ pipeline_stage: value })) onDataChanged();
  };

  const handleAssigneeChange = async (value: string) => {
    setAssignedTo(value);
    if (await updateConversation({ assignee_id: value })) onDataChanged();
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/contacts/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactId: contact.id, email: email.trim() || null, phone: phone.trim() || null })
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error('Erro: ' + (data.error || 'Falha ao salvar perfil'));
      } else {
        toast.success('Perfil atualizado');
        onDataChanged();
      }
    } catch {
      toast.error('Erro de comunicação');
    } finally {
      setSaving(false);
    }
  };

  const handleAddTag = async () => {
    const name = tagInput.trim();
    if (!name) return;

    let tagId: string | undefined;
    const { data: existing } = await supabase
      .from('tags')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('name', name)
      .maybeSingle();
    tagId = existing?.id as string | undefined;

    if (!tagId) {
      const { data: created, error: createErr } = await supabase
        .from('tags')
        .insert({ workspace_id: workspaceId, name })
        .select('id')
        .single();
      if (createErr) {
        toast.error('Erro ao criar tag: ' + createErr.message);
        return;
      }
      tagId = created?.id as string;
    }

    const { error } = await supabase
      .from('contact_tags')
      .insert({ contact_id: contact.id, tag_id: tagId });

    if (error && error.code !== '23505') {
      toast.error('Erro ao vincular tag: ' + error.message);
      return;
    }

    setTagInput('');
    toast.success('Tag adicionada');
    onDataChanged();
  };

  const handleRemoveTag = async (tagId: string) => {
    const { error } = await supabase
      .from('contact_tags')
      .delete()
      .eq('contact_id', contact.id)
      .eq('tag_id', tagId);

    if (error) {
      toast.error('Erro ao remover tag: ' + error.message);
      return;
    }
    onDataChanged();
  };

  const assigneeLabel = (id: string) => {
    if (!id) return 'Não atribuído';
    const m = members.find(x => x.user_id === id);
    return m ? (m.name || m.email || 'Membro') : 'Membro';
  };

  const stageLabel = PIPELINE_STAGES.find(s => s.value === stage)?.label || stage;

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header do painel */}
      <div className="h-[72px] border-b border-[#e5e7eb] flex items-center justify-between px-4 bg-white shrink-0">
        <h3 className="font-semibold text-gray-900 text-sm">Perfil do Cliente</h3>
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-indigo-400" />
          <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Informações do Lead */}
        <div className="px-5 py-5 border-b border-[#e5e7eb]">
          <div className="flex items-center gap-4">
            {contact.profile_picture ? (
              <img src={contact.profile_picture} alt="Lead" className="w-16 h-16 rounded-full object-cover shadow-sm" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-2xl font-bold">
                {(contact.name as string)?.charAt(0) || '@'}
              </div>
            )}
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 text-sm truncate">{contact.name || 'Lead do Instagram'}</p>
              <p className="text-xs text-gray-500 flex items-center gap-1 truncate">
                <AtSign className="w-3 h-3" /> {contact.username || contact.custom_fields?.username || 'username não capturado'}
              </p>
            </div>
          </div>

          {/* Campos personalizados */}
          <div className="mt-5 space-y-3">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wide text-gray-400 flex items-center gap-1">
                <Mail className="w-3 h-3" /> Email
              </label>
              <input
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="email@cliente.com"
                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-800 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200 transition-colors"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wide text-gray-400 flex items-center gap-1">
                <Phone className="w-3 h-3" /> Telefone
              </label>
              <input
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="(11) 99999-9999"
                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-800 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200 transition-colors"
              />
            </div>
            <button
              onClick={handleSaveProfile}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" /> {saving ? 'Salvando...' : 'Salvar contato'}
            </button>
          </div>
        </div>

        {/* Funil de Vendas */}
        <div className="px-5 py-4 border-b border-[#e5e7eb]">
          <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-2">Funil de Vendas</p>
          <div className="relative">
            <select
              value={stage}
              onChange={e => handleStageChange(e.target.value)}
              className="w-full appearance-none border border-gray-200 rounded-lg px-3 py-2.5 text-xs font-semibold text-gray-800 bg-white outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200 cursor-pointer"
            >
              {PIPELINE_STAGES.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
          <p className="text-[10px] text-gray-400 mt-1.5">Etapa atual: <span className="font-semibold text-gray-600">{stageLabel}</span></p>
        </div>

        {/* Gestão de Tags */}
        <div className="px-5 py-4 border-b border-[#e5e7eb]">
          <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-2">Tags</p>
          {contactTags.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {contactTags.map(ct => (
                <span
                  key={ct.tag_id}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold border"
                  style={{
                    backgroundColor: (ct.tags?.color || '#3B82F6') + '1A',
                    borderColor: (ct.tags?.color || '#3B82F6') + '66',
                    color: ct.tags?.color || '#3B82F6'
                  }}
                >
                  <TagIcon className="w-3 h-3" />
                  {ct.tags?.name || 'Tag'}
                  <button onClick={() => handleRemoveTag(ct.tag_id as string)} className="ml-0.5 hover:opacity-60">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400 italic mb-3">Nenhuma tag atribuída</p>
          )}
          <div className="flex gap-2">
            <input
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAddTag(); }}
              placeholder="Nova tag..."
              className="flex-1 min-w-0 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-800 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200"
            />
            <button
              onClick={handleAddTag}
              disabled={!tagInput.trim()}
              className="px-3 py-2 bg-gray-900 hover:bg-gray-700 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-40"
            >
              +
            </button>
          </div>
        </div>

        {/* Atribuição de Agente */}
        <div className="px-5 py-4 border-b border-[#e5e7eb]">
          <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-2 flex items-center gap-1">
            <UserCog className="w-3 h-3" /> Atribuído a
          </p>
          <div className="relative">
            <select
              value={assignedTo}
              onChange={e => handleAssigneeChange(e.target.value)}
              className="w-full appearance-none border border-gray-200 rounded-lg px-3 py-2.5 text-xs font-semibold text-gray-800 bg-white outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200 cursor-pointer"
            >
              <option value="">Não atribuído</option>
              {members.map(m => (
                <option key={m.user_id} value={m.user_id}>
                  {m.name || m.email || 'Membro'}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
          <p className="text-[10px] text-gray-400 mt-1.5">Responsável: <span className="font-semibold text-gray-600">{assigneeLabel(assignedTo)}</span></p>
        </div>
      </div>
    </div>
  );
}
