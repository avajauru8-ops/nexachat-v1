/* eslint-disable @next/next/no-img-element */
'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, User, MessageCircle, Paperclip, Smile, Mic, Image as ImageIcon, CheckCircle2, Clock, MoreHorizontal, Check, RefreshCw, Bot, Sparkles, AlertTriangle } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'react-hot-toast';

export function InboxClient({ workspaceId }: { workspaceId: string }) {
  const [conversations, setConversations] = useState<Record<string, unknown>[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const activeChatIdRef = useRef<string | null>(null);
  const conversationsRef = useRef<Record<string, unknown>[]>([]);
  const [messages, setMessages] = useState<Record<string, unknown>[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    activeChatIdRef.current = activeChatId;
  }, [activeChatId]);

  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  // Busca conversas iniciais
  useEffect(() => {
    supabase
      .from('conversations')
      .select(`
        id, status, last_interaction_at, window_expires_at, created_at, updated_at,
        contacts ( id, name, ig_scoped_id, profile_picture ),
        messages ( content, message_type, timestamp )
      `)
      .eq('workspace_id', workspaceId)
      .order('last_interaction_at', { ascending: false })
      .order('timestamp', { ascending: false, foreignTable: 'messages' })
      .limit(1, { foreignTable: 'messages' })
      .then(({ data }) => {
        if (data) {
          const formattedData = data.map(c => {
            const msgs = c.messages as Record<string, unknown>[];
            let lastMessage = 'Nova conversa';
            if (msgs && msgs.length > 0) {
              const msg = msgs[0];
              lastMessage = msg.message_type === 'image' ? '📷 Foto' : msg.message_type === 'video' ? '🎥 Vídeo' : msg.message_type === 'audio' ? '🎵 Áudio' : (msg.content as string);
            }
            return { ...c, lastMessage };
          });
          setConversations(formattedData);
        }
      });
  }, [workspaceId, supabase]);

  const activeChat = conversations.find(c => c.id === activeChatId);

  useEffect(() => {
    if (activeChatId) {
      supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', activeChatId)
        .order('timestamp', { ascending: true })
        .then(({ data }) => {
          if (data) setMessages(data);
        });
    }
  }, [activeChatId, supabase]);

  // Supabase Realtime Listener
  useEffect(() => {
    const channel = supabase.channel(`workspace_realtime_${workspaceId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        async (payload) => {
          const newMsg = payload.new as Record<string, unknown>;
          const currentActiveChatId = activeChatIdRef.current;
          
          if (currentActiveChatId === newMsg.conversation_id) {
            setMessages(prev => {
              if (prev.find(m => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });
            fetch('/api/conversations/read', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ conversationId: currentActiveChatId })
            }).catch(() => {});
          }

          setConversations(prev => {
            const isCurrentActive = currentActiveChatId === newMsg.conversation_id;
            const chatIndex = prev.findIndex(c => c.id === newMsg.conversation_id);

            if (chatIndex >= 0) {
              const updated = prev.map(c => {
                if (c.id === newMsg.conversation_id) {
                  return {
                    ...c,
                    lastMessage: newMsg.message_type === 'image' ? '📷 Foto' : newMsg.message_type === 'video' ? '🎥 Vídeo' : newMsg.message_type === 'audio' ? '🎵 Áudio' : newMsg.content,
                    unread_count: isCurrentActive ? 0 : ((c.unread_count as number || 0) + (newMsg.sender_type === 'user' ? 1 : 0)),
                    updated_at: newMsg.timestamp
                  };
                }
                return c;
              });
              if (chatIndex > 0) {
                const chat = updated.splice(chatIndex, 1)[0];
                updated.unshift(chat);
              }
              return updated;
            }

            return prev;
          });

          const existsInList = conversationsRef.current.find(c => c.id === newMsg.conversation_id);
          if (!existsInList) {
            try {
              const { data: newConv } = await supabase
                .from('conversations')
                .select(`
                  id, status, last_interaction_at, window_expires_at, created_at, updated_at,
                  contacts ( id, name, ig_scoped_id, profile_picture ),
                  messages ( content, message_type, timestamp )
                `)
                .eq('id', newMsg.conversation_id as string)
                .single();

              if (newConv) {
                const msgs = (newConv.messages as Record<string, unknown>[]) || [];
                const lastMessage = msgs.length > 0
                  ? (msgs[0].message_type === 'image' ? '📷 Foto' : msgs[0].message_type === 'video' ? '🎥 Vídeo' : msgs[0].message_type === 'audio' ? '🎵 Áudio' : msgs[0].content as string)
                  : 'Nova conversa';
                const contactName = (newConv.contacts as unknown as Record<string, unknown>)?.name || 'Lead';
                toast.success(`💬 Nova conversa de ${contactName}`);
                setConversations(prev => [{ ...newConv, lastMessage, unread_count: 1 }, ...prev]);
              }
            } catch { /* ignore */ }
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'conversations' },
        (payload) => {
          const updatedConv = payload.new as Record<string, unknown>;
          setConversations(prev => prev.map(c => c.id === updatedConv.id ? { ...c, ...updatedConv } : c));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [workspaceId, supabase]);

  const handleUpdateStatus = async (newStatus: string) => {
    if (!activeChatId) return;
    try {
      const { error } = await supabase
        .from('conversations')
        .update({ status: newStatus })
        .eq('id', activeChatId);

      if (error) {
        toast.error('Erro ao atualizar status da conversa');
      } else {
        const labels: Record<string, string> = {
          human: 'Atendimento Humano ativado',
          bot: 'Modo Robô (Automação) ativado',
          ai: 'Agente de IA ativado',
          closed: 'Conversa encerrada'
        };
        toast.success(labels[newStatus] || 'Status atualizado');
        setConversations(prev => prev.map(c => c.id === activeChatId ? { ...c, status: newStatus } : c));
      }
    } catch {
      toast.error('Falha ao comunicar com o banco');
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !activeChatId) return;
    const msg = newMessage;
    setNewMessage('');
    try {
      const res = await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: activeChatId, content: msg })
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error('Erro ao enviar mensagem: ' + (data.error || 'Erro desconhecido'));
      } else {
        setMessages(prev => {
          if (prev.find(m => m.id === data.message.id)) return prev;
          return [...prev, data.message];
        });
        setConversations(prev => {
          const updated = prev.map(c => c.id === activeChatId ? { ...c, lastMessage: msg } : c);
          const chatIndex = updated.findIndex(c => c.id === activeChatId);
          if (chatIndex > 0) {
            const chat = updated[chatIndex];
            updated.splice(chatIndex, 1);
            updated.unshift(chat);
          }
          return updated;
        });
      }
    } catch (e: unknown) {
      toast.error('Erro de comunicação: ' + (e instanceof Error ? e.message : String(e)));
    }
  };

  const handleSyncApi = async () => {
    setIsSyncing(true);
    const toastId = toast.loading('Buscando dados no Instagram...');
    try {
      const res = await fetch('/api/instagram/sync', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        toast.error('Erro: ' + (data.error || 'Falha ao sincronizar'), { id: toastId });
      } else {
        toast.success(`Sincronizado! ${data.synced} conversas atualizadas.`, { id: toastId });
        setTimeout(() => window.location.reload(), 1500);
      }
    } catch {
      toast.error('Erro de conexão ao sincronizar', { id: toastId });
    } finally {
      setIsSyncing(false);
    }
  };

  const formatTime = (isoString?: string) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const now = new Date();
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { day: '2-digit', month: 'short' });
  };

  const get24hWindowInfo = (expiresAt?: string) => {
    if (!expiresAt) return { active: true, text: 'Janela 24h ativa' };
    const expiry = new Date(expiresAt).getTime();
    const diff = expiry - Date.now();
    if (diff <= 0) {
      return { active: false, text: 'Janela 24h Expirada' };
    }
    const hoursLeft = Math.floor(diff / (1000 * 60 * 60));
    const minsLeft = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return { active: true, text: `Janela 24h: ${hoursLeft}h ${minsLeft}m` };
  };

  const windowInfo = get24hWindowInfo(activeChat?.window_expires_at as string);

  return (
    <div className="flex h-[calc(100vh-64px)] -m-6 bg-white overflow-hidden">
      
      {/* Coluna 1: Pastas da Inbox */}
      <div className="w-60 border-r border-gray-200 bg-[#f9fafb] flex flex-col hidden lg:flex">
        <div className="p-4">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Caixa de Entrada</h2>
          <div className="space-y-1">
            <button className="w-full flex items-center justify-between px-3 py-2 bg-gray-200/60 text-gray-900 rounded-lg text-sm font-medium">
              Todas as conversas
              <span className="bg-white px-2 py-0.5 rounded text-xs text-gray-500 font-bold">{conversations.length}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Coluna 2: Lista de Conversas */}
      <div className="w-80 border-r border-gray-200 flex flex-col bg-white shrink-0 relative">
        <div className="p-3 border-b border-gray-200 flex flex-col gap-3">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-semibold text-gray-800 text-sm">Mensagens</h3>
            <button 
              onClick={handleSyncApi}
              disabled={isSyncing}
              className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-600 rounded text-xs font-medium hover:bg-blue-100 disabled:opacity-50 transition-colors"
              title="Puxar mensagens recentes do Instagram"
            >
              <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
              Sincronizar
            </button>
          </div>
          <div className="flex items-center bg-gray-100 rounded-md px-3 py-1.5 border border-transparent focus-within:border-blue-500 focus-within:bg-white transition-colors">
            <Search className="w-4 h-4 text-gray-400 mr-2" />
            <input 
              type="text" 
              placeholder="Pesquisar em conversas..." 
              className="bg-transparent border-none outline-none text-sm w-full text-gray-800 placeholder-gray-500"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {conversations.map((chat) => {
            const isHuman = chat.status === 'human' || chat.status === 'paused_for_human';
            const isAi = chat.status === 'ai';
            return (
              <div 
                key={chat.id as string}
                onClick={() => {
                  setActiveChatId(chat.id as string);
                  if (activeChatId !== chat.id) setMessages([]);
                  if (Number(chat.unread_count || 0) > 0) {
                    setConversations(prev => prev.map(c => c.id === chat.id ? { ...c, unread_count: 0 } : c));
                  }
                }}
                className={`p-3 cursor-pointer hover:bg-gray-50 border-b border-gray-100 flex gap-3 relative transition-colors ${activeChatId === chat.id ? 'bg-[#f4f6fa]' : ''}`}
              >
                <div className="relative">
                  {(chat.contacts as Record<string, unknown>)?.profile_picture ? (
                    <img src={(chat.contacts as Record<string, unknown>).profile_picture as string} alt="Contact" className="w-12 h-12 rounded-full object-cover flex-shrink-0 border border-gray-200" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-indigo-100 flex-shrink-0 flex items-center justify-center text-indigo-700 font-bold border border-gray-200">
                      {((chat.contacts as Record<string, unknown>)?.name as string)?.charAt(0) || '@'}
                    </div>
                  )}
                  {isHuman && (
                    <div className="absolute -bottom-1 -right-1 bg-yellow-500 p-1 rounded-full border border-white" title="Atendimento Humano">
                      <User className="w-3 h-3 text-white" />
                    </div>
                  )}
                  {isAi && (
                    <div className="absolute -bottom-1 -right-1 bg-purple-600 p-1 rounded-full border border-white" title="Agente de IA">
                      <Sparkles className="w-3 h-3 text-white" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <div className="flex justify-between items-baseline mb-0.5">
                    <p className="font-semibold text-gray-900 text-sm truncate">
                      {(chat.contacts as Record<string, unknown>)?.name as string || (chat.contacts as Record<string, unknown>)?.ig_scoped_id as string}
                    </p>
                    <span className="text-[11px] text-gray-500 flex-shrink-0 ml-2">
                      {formatTime(chat.updated_at as string || chat.created_at as string)}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <p className={`text-sm truncate ${Number(chat.unread_count || 0) > 0 ? 'font-bold text-gray-900' : 'text-gray-500'}`}>
                      {(chat.lastMessage as string) || 'Nova conversa'}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Coluna 3: Painel Central de Chat */}
      <div className="flex-1 flex flex-col bg-white relative min-w-0 border-r border-gray-200">
        {activeChat ? (
          <>
            {/* Chat Header */}
            <div className="h-16 border-b border-gray-200 flex items-center justify-between px-6 bg-white shrink-0">
              <div className="flex items-center gap-4">
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <h2 className="font-bold text-gray-900 text-lg">
                      {(activeChat.contacts as Record<string, unknown>)?.name as string || (activeChat.contacts as Record<string, unknown>)?.ig_scoped_id as string}
                    </h2>
                    {/* Badge da Janela de 24 horas */}
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                      windowInfo.active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                      {windowInfo.active ? <Clock className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                      {windowInfo.text}
                    </span>
                  </div>
                </div>
              </div>

              {/* Botões de Ação para Handoff e Status */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleUpdateStatus('human')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors ${
                    activeChat.status === 'human' || activeChat.status === 'paused_for_human'
                      ? 'bg-yellow-500 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  title="Assumir conversa para atendimento humano"
                >
                  <User className="w-3.5 h-3.5" />
                  Assumir (Humano)
                </button>

                <button
                  onClick={() => handleUpdateStatus('ai')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors ${
                    activeChat.status === 'ai'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  title="Ativar Agente de IA"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Agente IA
                </button>

                <button
                  onClick={() => handleUpdateStatus('bot')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors ${
                    activeChat.status === 'bot' || activeChat.status === 'bot_active'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  title="Devolver conversa para o robô de fluxos"
                >
                  <Bot className="w-3.5 h-3.5" />
                  Modo Robô
                </button>
              </div>
            </div>

            {/* Sub-header IG */}
            <div className="px-6 py-2 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-pink-600"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
                <span className="text-xs font-medium text-gray-600">Instagram Direct</span>
              </div>
              <span className="text-xs text-gray-500 font-semibold">
                Status atual: <span className="uppercase text-blue-600">{String(activeChat.status)}</span>
              </span>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-6 bg-white flex flex-col gap-4">
              {messages.map((msg, idx) => {
                const isUser = msg.sender_type === 'user';
                const isAi = msg.sender_type === 'ai';
                return (
                  <div key={(msg.id as string) || idx} className={`flex ${isUser ? 'justify-start' : 'justify-end'} mb-1`}>
                    {isUser && (
                      <div className="mr-2 flex-shrink-0 self-end mb-1">
                        {(activeChat.contacts as Record<string, unknown>)?.profile_picture ? (
                          <img src={(activeChat.contacts as Record<string, unknown>).profile_picture as string} alt="Contact" className="w-8 h-8 rounded-full object-cover" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-xs font-bold">
                            {((activeChat.contacts as Record<string, unknown>)?.name as string)?.charAt(0) || '@'}
                          </div>
                        )}
                      </div>
                    )}
                    <div className={`max-w-[65%] px-4 py-2.5 shadow-sm text-sm ${
                      isUser 
                        ? 'bg-[#f0f2f5] text-gray-900 rounded-2xl rounded-bl-sm' 
                        : isAi
                        ? 'bg-purple-50 text-purple-900 border border-purple-200 rounded-2xl rounded-br-sm'
                        : 'bg-[#e7f3ff] text-[#0064e0] rounded-2xl rounded-br-sm'
                    }`}>
                      {isAi && (
                        <div className="flex items-center gap-1 text-[11px] font-bold text-purple-600 mb-1">
                          <Sparkles className="w-3 h-3" /> Resposta da IA
                        </div>
                      )}
                      {msg.message_type === 'image' && msg.media_url ? (
                        <img src={msg.media_url as string} alt="Mídia" className="max-w-full rounded-lg mb-2 cursor-pointer hover:opacity-90" onClick={() => window.open(msg.media_url as string, '_blank')} />
                      ) : null}
                      <p className="break-words whitespace-pre-wrap">{msg.content as string}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Composer Area */}
            <div className="bg-white border-t border-gray-200">
              {!windowInfo.active && (
                <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-xs text-amber-800 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <span>A janela de 24h da Meta expirou. O contato deve enviar uma nova mensagem antes de você responder via API.</span>
                </div>
              )}
              <div className="p-4">
                <textarea 
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="Responda aqui..." 
                  className="w-full resize-none border-none outline-none text-sm text-gray-800 placeholder-gray-400 min-h-[60px]"
                />
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-1 text-gray-400">
                    <button className="p-2 hover:bg-gray-100 rounded-full transition-colors"><Smile className="w-5 h-5" /></button>
                    <button className="p-2 hover:bg-gray-100 rounded-full transition-colors"><ImageIcon className="w-5 h-5" /></button>
                  </div>
                  <button 
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim()}
                    className="px-4 py-2 bg-[#0064e0] text-white text-sm font-semibold rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    Enviar Mensagem
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center bg-[#f9fafb]">
            <div className="w-24 h-24 rounded-full bg-white shadow-sm flex items-center justify-center mb-6">
              <MessageCircle className="w-10 h-10 text-gray-300" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Caixa de Entrada Vazia</h3>
            <p className="text-gray-500">Selecione uma conversa ao lado para começar.</p>
          </div>
        )}
      </div>

    </div>
  );
}
