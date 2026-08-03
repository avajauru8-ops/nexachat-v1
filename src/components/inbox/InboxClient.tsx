/* eslint-disable @next/next/no-img-element */
'use client';

import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Send, Search, Settings, Filter, MoreVertical, Paperclip, Smile, Image as ImageIcon, Video, Mic, CheckCheck, Clock, ChevronDown, Check, MoreHorizontal, MessageCircle, Square, Tag, Trash2, X, RefreshCw, Bot, Workflow, Star } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'react-hot-toast';

export function InboxClient({ workspaceId }: { workspaceId: string }) {
  const [conversations, setConversations] = useState<Record<string, unknown>[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const activeChatIdRef = useRef<string | null>(null);
  const conversationsRef = useRef<Record<string, unknown>[]>([]);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const [messages, setMessages] = useState<Record<string, unknown>[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setNow(Date.now()), 0);
    return () => clearTimeout(timer);
  }, []);

  const supabase = createClient();

  useEffect(() => {
    activeChatIdRef.current = activeChatId;
  }, [activeChatId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Update "now" every minute for time calculations
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

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

          // Verificar se há um contactId na URL para selecionar automaticamente
          if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            const targetContactId = params.get('contactId');
            if (targetContactId) {
              const matchingConv = formattedData.find((c: any) => c.contacts?.id === targetContactId);
              if (matchingConv) {
                setActiveChatId(matchingConv.id);
              }
            }
          }
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
                  id, status, last_interaction_at, window_expires_at, created_at, updated_at, unread_count,
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
                setConversations(prev => {
                  if (prev.some(c => c.id === newConv.id)) return prev;
                  return [{ ...newConv, lastMessage, unread_count: (newConv.unread_count || 0) + 1 }, ...prev];
                });
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

  const handleDeleteConversation = async () => {
    if (!activeChatId) return;
    if (!confirm('Tem certeza que deseja excluir esta conversa inteira? Essa ação é irreversível.')) return;
    
    try {
      const res = await fetch('/api/conversations/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: activeChatId })
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error('Erro ao excluir: ' + (data.error || 'Desconhecido'));
      } else {
        toast.success('Conversa excluída com sucesso');
        setConversations(prev => prev.filter(c => c.id !== activeChatId));
        setActiveChatId(null);
        setMessages([]);
      }
    } catch (e: unknown) {
      toast.error('Erro de comunicação: ' + (e instanceof Error ? e.message : String(e)));
    }
  };

  const fetchConversationsList = () => {
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
        fetchConversationsList();
        if (activeChatId) {
           supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', activeChatId)
            .order('timestamp', { ascending: true })
            .then(({ data: msgs }) => {
              if (msgs) setMessages(msgs);
            });
        }
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

  const get24hWindowInfo = (expiresAt?: string, nowVal?: number | null) => {
    if (!expiresAt) return { active: true, text: 'Janela 24h ativa' };
    const expiry = new Date(expiresAt).getTime();
    const diff = expiry - (nowVal || 0);
    if (nowVal && diff <= 0) {
      return { active: false, text: 'Janela 24h Expirada' };
    }
    const hoursLeft = Math.floor(diff / (1000 * 60 * 60));
    const minsLeft = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return { active: true, text: `Janela 24h: ${hoursLeft}h ${minsLeft}m` };
  };

  const windowInfo = get24hWindowInfo(activeChat?.window_expires_at as string, now);

  return (
    <div className="flex h-[calc(100vh-64px)] -m-6 bg-[#f4f6f8] overflow-hidden text-sm font-sans">
      
      {/* Coluna 1: Pastas da Inbox */}
      <div className="w-[220px] border-r border-[#e5e7eb] bg-[#f8f9fa] flex flex-col hidden lg:flex shrink-0 py-4">
        <div className="px-3 mb-2 flex items-center justify-between bg-[#e5e7eb] py-2 mx-2 rounded cursor-pointer">
          <div className="flex items-center gap-2 font-medium text-gray-800">
            <MessageCircle className="w-4 h-4 text-gray-500" />
            Todas as conversas
          </div>
          <span className="text-gray-500 font-medium text-xs">{conversations.length}</span>
        </div>
        <div className="px-5 py-2 flex items-center gap-2 text-gray-600 hover:bg-gray-100 cursor-pointer">
          <Clock className="w-4 h-4" />
          Lembretes
        </div>
        
        <div className="mt-4 px-5 py-1 text-xs font-semibold text-gray-400 flex items-center justify-between cursor-pointer group">
          <div className="flex items-center gap-1">
             <ChevronDown className="w-3 h-3 group-hover:text-gray-600" /> Legendas
          </div>
          <span className="text-gray-400 group-hover:text-gray-600">+</span>
        </div>

        <div className="mt-2 px-5 py-1 text-xs font-semibold text-gray-400 flex items-center gap-1 cursor-pointer">
          <div className="w-4 h-4 flex items-center justify-center">
            <span className="w-2 h-2 rounded-full bg-red-400"></span>
          </div>
          Favorites
        </div>
      </div>

      {/* Coluna 2: Lista de Conversas */}
      <div className={`${activeChatId ? 'hidden md:flex' : 'flex'} w-full md:w-[360px] border-r border-[#e5e7eb] flex-col bg-white shrink-0 relative`}>
        <div className="flex flex-col border-b border-[#e5e7eb]">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-[#e5e7eb]">
            <Square className="w-4 h-4 text-gray-400" />
            <div className="flex items-center border border-gray-200 rounded px-2 py-1 gap-1 text-xs text-gray-600 font-medium cursor-pointer">
              <MessageCircle className="w-3 h-3" /> Conversas Abertas <ChevronDown className="w-3 h-3" />
            </div>
            <div className="border border-gray-200 rounded px-2 py-1 text-xs text-gray-600 font-medium cursor-pointer">
              Não Lidas
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 text-xs text-gray-600">
            <div className="flex items-center gap-1 cursor-pointer hover:text-gray-900">
              Classificar: Mais Recentes <ChevronDown className="w-3 h-3" />
            </div>
            <div className="flex items-center gap-1 cursor-pointer hover:text-gray-900">
              Todos Os Canais <ChevronDown className="w-3 h-3" />
            </div>
            <div className="flex items-center gap-1 cursor-pointer text-gray-500 hover:text-gray-900 ml-auto border border-gray-200 rounded px-2 py-1">
              <Filter className="w-3 h-3" /> Filtro
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {conversations.map((chat) => {
            const isHuman = chat.status === 'human' || chat.status === 'paused_for_human';
            const isAi = chat.status === 'ai';
            return (
              <div 
                key={chat.id as string}
                onClick={async () => {
                  setActiveChatId(chat.id as string);
                  if (activeChatId !== chat.id) setMessages([]);
                  if (Number(chat.unread_count || 0) > 0) {
                    setConversations(prev => prev.map(c => c.id === chat.id ? { ...c, unread_count: 0 } : c));
                    try {
                      await fetch('/api/conversations/read', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ conversationId: chat.id })
                      });
                    } catch (e) {
                      console.error('Failed to mark conversation as read', e);
                    }
                  }
                }}
                className={`p-3 cursor-pointer border-b border-gray-100 flex gap-3 relative transition-colors ${activeChatId === chat.id ? 'bg-[#f4f6fa]' : 'hover:bg-gray-50'}`}
              >
                <div className="relative">
                  {(chat.contacts as Record<string, unknown>)?.profile_picture ? (
                    <img src={(chat.contacts as Record<string, unknown>).profile_picture as string} alt="Contact" className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-indigo-100 flex-shrink-0 flex items-center justify-center text-indigo-700 font-bold">
                      {((chat.contacts as Record<string, unknown>)?.name as string)?.charAt(0) || '@'}
                    </div>
                  )}
                  <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-sm">
                    <img src="https://upload.wikimedia.org/wikipedia/commons/e/e7/Instagram_logo_2016.svg" className="w-4 h-4 rounded-full" alt="ig" />
                  </div>
                </div>

                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <div className="flex justify-between items-baseline mb-1">
                    <p className={`font-semibold text-sm truncate ${Number(chat.unread_count || 0) > 0 ? 'text-black' : 'text-gray-800'}`}>
                      {(chat.contacts as Record<string, unknown>)?.name as string || (chat.contacts as Record<string, unknown>)?.ig_scoped_id as string}
                    </p>
                    <span className={`text-[11px] flex-shrink-0 ml-2 ${Number(chat.unread_count || 0) > 0 ? 'text-blue-600 font-bold' : 'text-gray-400'}`}>
                      {formatTime(chat.updated_at as string || chat.created_at as string)}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <p className={`text-xs truncate ${Number(chat.unread_count || 0) > 0 ? 'font-bold text-gray-900' : 'text-gray-500'}`}>
                      {isAi ? '🤖 bot' : isHuman ? '👤 Humano: ' : '🤖 bot'}{((chat.lastMessage as string) && (chat.lastMessage as string) !== 'Nova conversa') ? `: ${chat.lastMessage}` : ''}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Coluna 3: Painel Central de Chat */}
      <div className={`${!activeChatId ? 'hidden md:flex' : 'flex'} flex-1 flex-col bg-white relative min-w-0 md:border-l border-gray-200`}>
        {activeChat ? (
          <>
            {/* Chat Header */}
            <div className="h-[72px] border-b border-[#e5e7eb] flex items-center justify-between px-4 md:px-6 bg-white shrink-0">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setActiveChatId(null)}
                  className="p-1 -ml-2 text-gray-500 hover:bg-gray-100 rounded-full md:hidden"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                {(activeChat.contacts as Record<string, unknown>)?.profile_picture ? (
                  <img src={(activeChat.contacts as Record<string, unknown>).profile_picture as string} alt="Contact" className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
                    {((activeChat.contacts as Record<string, unknown>)?.name as string)?.charAt(0) || '@'}
                  </div>
                )}
                <div className="flex flex-col">
                  <h2 className="font-semibold text-gray-900 text-[15px]">
                    {(activeChat.contacts as Record<string, unknown>)?.name as string || (activeChat.contacts as Record<string, unknown>)?.ig_scoped_id as string}
                  </h2>
                  <div className="text-[11px] text-gray-500 flex items-center gap-1 cursor-pointer hover:text-gray-700">
                    Não atribuído <ChevronDown className="w-3 h-3" />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 text-gray-400">
                <Tag className="w-5 h-5 cursor-pointer hover:text-gray-600" />
                <Clock className="w-5 h-5 cursor-pointer hover:text-gray-600" />
                <Check className="w-5 h-5 cursor-pointer hover:text-gray-600" />
                <Trash2 onClick={handleDeleteConversation} className="w-5 h-5 cursor-pointer hover:text-red-500" />
                <MoreHorizontal className="w-5 h-5 cursor-pointer hover:text-gray-600" />
              </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto bg-[#fafafa] flex flex-col relative">
              <div className="sticky top-0 z-10 flex items-center gap-2 px-6 py-3 bg-white border-b border-[#e5e7eb] shadow-sm">
                <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500 flex items-center justify-center shrink-0">
                  <img src="https://upload.wikimedia.org/wikipedia/commons/e/e7/Instagram_logo_2016.svg" className="w-4 h-4 invert" alt="ig" />
                </div>
                <span className="text-sm font-semibold text-gray-800">Instagram</span>
              </div>

              <div className="px-6 pb-6 pt-4 flex flex-col gap-6">
                {messages.map((msg, idx) => {
                  const isUser = msg.sender_type === 'user';
                  
                  const msgDate = new Date(msg.timestamp as string || (now || 0));
                  const isFirstOfDay = idx === 0 || new Date(messages[idx-1].timestamp as string).toDateString() !== msgDate.toDateString();
                  
                  return (
                    <div key={(msg.id as string) || idx} className="flex flex-col">
                      {isFirstOfDay && (
                        <div className="flex justify-center mb-6">
                          <span className="text-[11px] text-gray-400 font-medium">
                            {msgDate.toLocaleDateString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      )}
                      
                      <div className={`flex items-end gap-3 ${isUser ? 'flex-row' : 'flex-row-reverse'}`}>
                        {isUser && (
                          <div className="flex-shrink-0">
                            {(activeChat.contacts as Record<string, unknown>)?.profile_picture ? (
                              <img src={(activeChat.contacts as Record<string, unknown>).profile_picture as string} alt="Contact" className="w-8 h-8 rounded-full object-cover shadow-sm" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-xs font-bold shadow-sm">
                                {((activeChat.contacts as Record<string, unknown>)?.name as string)?.charAt(0) || '@'}
                              </div>
                            )}
                          </div>
                        )}
                        {!isUser && (
                          <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center flex-shrink-0 shadow-sm overflow-hidden">
                            <Bot className="w-5 h-5 text-white opacity-80" />
                          </div>
                        )}
                        
                        <div className={`max-w-[70%] px-4 py-3 text-[14px] leading-relaxed ${
                          isUser 
                            ? 'bg-[#f0f2f5] text-gray-900 rounded-2xl rounded-bl-sm shadow-sm' 
                            : 'bg-[#e7f3ff] text-[#0064e0] rounded-2xl rounded-br-sm shadow-sm'
                        }`}>
                          {msg.message_type === 'image' && Boolean(msg.media_url) && (
                            <img src={msg.media_url as string} alt="Mídia" className="max-w-full rounded-lg mb-2 cursor-pointer hover:opacity-90 border border-transparent" onClick={() => window.open(msg.media_url as string, '_blank')} />
                          )}
                          {msg.message_type === 'video' && Boolean(msg.media_url) && (
                            <video src={msg.media_url as string} controls className="max-w-full rounded-lg mb-2 bg-black" />
                          )}
                          {msg.message_type === 'audio' && Boolean(msg.media_url) && (
                            <audio src={msg.media_url as string} controls className="max-w-[250px] mb-2" />
                          )}
                          {(msg.message_type === 'share' || (msg.message_type === 'text' && Boolean(msg.media_url))) && (
                            <div className="mb-2">
                              {((msg.media_url as string) || '').includes('instagram.com/p/') || ((msg.media_url as string) || '').includes('instagram.com/reel/') ? (
                                <div className="w-[240px] rounded-xl overflow-hidden bg-[#121212] text-white shadow-sm border border-gray-800/60 mt-1 cursor-pointer hover:opacity-95 transition-opacity" onClick={() => window.open(msg.media_url as string, '_blank')}>
                                  {/* Header */}
                                  <div className="flex items-center gap-2 p-3 bg-[#1a1a1a]">
                                    <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500 flex items-center justify-center shrink-0">
                                      <img src="https://upload.wikimedia.org/wikipedia/commons/e/e7/Instagram_logo_2016.svg" className="w-3 h-3 invert" alt="ig" />
                                    </div>
                                    <span className="text-xs font-medium text-gray-200">Publicação do Instagram</span>
                                  </div>
                                  {/* Thumbnail Area */}
                                  <div className="h-[220px] bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center relative group">
                                    <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors"></div>
                                    <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-md shadow-lg group-hover:scale-110 transition-transform">
                                      <div className="w-0 h-0 border-t-[8px] border-t-transparent border-l-[14px] border-l-white border-b-[8px] border-b-transparent ml-1"></div>
                                    </div>
                                  </div>
                                  {/* Footer */}
                                  <div className="px-4 py-3 bg-[#1a1a1a] flex justify-between items-center border-t border-gray-800/50">
                                    <span className="text-xs font-semibold text-white">Assistir vídeo</span>
                                    <span className="text-[10px] bg-white/10 px-2 py-1 rounded-full text-gray-300 font-medium">Abrir App</span>
                                  </div>
                                </div>
                              ) : (
                                <a href={msg.media_url as string} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                                    <span className="text-blue-600 font-semibold underline text-sm break-all">🔗 Ver link compartilhado</span>
                                </a>
                              )}
                            </div>
                          )}
                          {msg.message_type === 'story_mention' && Boolean(msg.media_url) && (
                            <a href={msg.media_url as string} target="_blank" rel="noopener noreferrer" className="flex flex-col gap-1 p-3 bg-white border border-gray-200 rounded-lg mb-2 hover:bg-gray-50 transition-colors">
                                <span className="text-pink-600 font-semibold text-sm">📸 Mencionou você num Story</span>
                                <span className="text-blue-600 underline text-xs break-all">Ver no Instagram</span>
                            </a>
                          )}
                          {Boolean(msg.content) && <p className="break-words whitespace-pre-wrap">{msg.content as string}</p>}
                          {!msg.content && !msg.media_url && !['image', 'video', 'audio', 'share', 'story_mention'].includes(msg.message_type as string) && (
                            <span className="text-gray-400 italic">Mensagem vazia ou tipo não suportado ({msg.message_type as string})</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                
                {/* System Message Divider Example */}
                {!windowInfo.active && (
                   <div className="flex items-center justify-center gap-2 my-2 opacity-50">
                     <div className="h-px bg-gray-300 w-12"></div>
                     <span className="text-[11px] text-gray-500">Janela 24h Expirada</span>
                     <div className="h-px bg-gray-300 w-12"></div>
                   </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Composer Area */}
            <div className="bg-white border-t border-[#e5e7eb] flex flex-col z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.02)]">
              <div className="flex items-center gap-6 px-6 py-3 border-b border-[#e5e7eb]">
                <button className="text-sm font-bold text-gray-900 border-b-2 border-black pb-1 -mb-[13px]">Responder</button>
                <button className="text-sm font-medium text-gray-500 pb-1 -mb-[13px] hover:text-gray-900 transition-colors">Observação</button>
              </div>
              
              <div className="p-4 flex flex-col min-h-[140px] justify-between">
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
                  className="w-full resize-none border-none outline-none text-sm text-gray-800 placeholder-gray-400 bg-transparent min-h-[50px] overflow-hidden"
                />
                
                <div className="flex items-center justify-between mt-4">
                  <div className="flex items-center gap-4 text-gray-400">
                    <Smile className="w-5 h-5 cursor-pointer hover:text-gray-600 transition-colors" />
                    <ImageIcon className="w-5 h-5 cursor-pointer hover:text-gray-600 transition-colors" />
                    <Paperclip className="w-5 h-5 cursor-pointer hover:text-gray-600 transition-colors" />
                    <Mic className="w-5 h-5 cursor-pointer hover:text-gray-600 transition-colors" />
                    
                    <div className="relative group flex flex-col items-center">
                      <div className="absolute -top-8 bg-gray-900 text-white text-[11px] font-semibold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                        Automação
                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                      </div>
                      <Workflow className="w-5 h-5 cursor-pointer hover:text-blue-600 transition-colors" />
                    </div>
                    
                    <Star className="w-5 h-5 cursor-pointer hover:text-yellow-500 transition-colors" />
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={handleSyncApi}
                      disabled={isSyncing}
                      className="w-10 h-10 flex items-center justify-center bg-[#a6c8fa] hover:bg-blue-500 text-white rounded-md transition-colors disabled:bg-[#d0e1ff]"
                      title="Sincronizar Mensagens"
                    >
                      <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                    </button>
                    <button 
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim()}
                      className="px-8 py-2.5 bg-[#a6c8fa] hover:bg-blue-600 text-white text-[13px] font-bold rounded-md transition-colors disabled:bg-[#d0e1ff] disabled:cursor-not-allowed"
                    >
                      Enviar Para O Instagram
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center bg-[#f8f9fa]">
            <div className="w-20 h-20 rounded-full bg-white shadow-sm flex items-center justify-center mb-4 border border-gray-100">
              <MessageCircle className="w-8 h-8 text-gray-300" />
            </div>
            <h3 className="text-lg font-medium text-gray-500">Selecione uma conversa para iniciar</h3>
          </div>
        )}
      </div>

    </div>
  );
}
