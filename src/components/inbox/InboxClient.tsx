'use client';


import { useState, useEffect } from 'react';
import { Search, MoreVertical, Send, User, Tag, Clock, Bot, PauseCircle, MessageCircle } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

export function InboxClient({ initialConversations = [], workspaceId }: { initialConversations?: any[], workspaceId: string }) {
  const [conversations, setConversations] = useState<any[]>(initialConversations || []);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const supabase = createClient();

  const activeChat = conversations.find(c => c.id === activeChatId);

  // Carregar mensagens quando um chat é selecionado
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
    } else {
      setMessages([]);
    }
  }, [activeChatId, supabase]);

  // Configurar Realtime
  useEffect(() => {
    const channel = supabase.channel('realtime_inbox')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const newMsg = payload.new;
          // Se a mensagem pertencer ao chat ativo, adiciona na tela
          if (activeChatId === newMsg.conversation_id) {
            setMessages(prev => [...prev, newMsg]);
          }
          // Atualiza a lista de conversas com o 'lastMessage'
          setConversations(prev => 
            prev.map(c => c.id === newMsg.conversation_id ? { ...c, lastMessage: newMsg.content } : c)
          );
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'conversations', filter: `workspace_id=eq.${workspaceId}` },
        (payload) => {
          // Simplificação: num app real, recarregaríamos ou atualizaríamos o estado 'conversations' com os contatos
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeChatId, supabase, workspaceId]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !activeChatId) return;

    const msg = newMessage;
    setNewMessage('');

    try {
      const res = await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: activeChatId,
          content: msg
        })
      });

      const data = await res.json();
      
      if (!res.ok) {
        alert('Erro ao enviar mensagem: ' + (data.error || 'Erro desconhecido'));
      }
    } catch (e: any) {
      alert('Erro de comunicação: ' + e.message);
    }
  };

  return (
    <div className="flex h-full -m-6 bg-white overflow-hidden border-t border-slate-200">
      {/* Lista de Conversas (Esquerda) */}
      <div className="w-80 border-r border-slate-200 flex flex-col bg-slate-50/50">
        <div className="p-4 border-b border-slate-200">
          <div className="flex items-center bg-white rounded-lg px-3 py-2 border border-slate-200 shadow-sm">
            <Search className="w-4 h-4 text-slate-400 mr-2" />
            <input 
              type="text" 
              placeholder="Buscar nas conversas..." 
              className="bg-transparent border-none outline-none text-sm w-full text-slate-800 placeholder-slate-400"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {conversations.map((chat) => (
            <div 
              key={chat.id}
              onClick={() => setActiveChatId(chat.id)}
              className={`p-4 border-b border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors flex gap-3 ${activeChatId === chat.id ? 'bg-blue-50/50 border-l-4 border-l-blue-600' : 'border-l-4 border-l-transparent'}`}
            >
              <div className="w-10 h-10 rounded-full bg-blue-100 flex-shrink-0 flex items-center justify-center text-blue-700 font-bold">
                {chat.contacts?.name?.charAt(0) || '@'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                  <p className="font-semibold text-slate-800 text-sm truncate">{chat.contacts?.name || chat.contacts?.ig_scoped_id}</p>
                </div>
                <div className="flex items-center gap-1 mt-1">
                  {chat.status === 'paused_for_human' ? (
                    <PauseCircle className="w-3 h-3 text-amber-500 flex-shrink-0" />
                  ) : (
                    <Bot className="w-3 h-3 text-green-500 flex-shrink-0" />
                  )}
                  <p className="text-sm truncate text-slate-500 font-medium">
                    {chat.lastMessage || 'Nova conversa'}
                  </p>
                </div>
              </div>
            </div>
          ))}
          {conversations.length === 0 && (
            <div className="p-8 text-center text-slate-400 text-sm font-medium">
              Nenhuma conversa encontrada.
            </div>
          )}
        </div>
      </div>

      {/* Painel Central de Chat */}
      <div className="flex-1 flex flex-col bg-white relative">
        {activeChat ? (
          <>
            <div className="h-16 border-b border-slate-200 flex items-center justify-between px-6 bg-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold">
                  {activeChat.contacts?.name?.charAt(0) || '@'}
                </div>
                <div>
                  <h2 className="font-bold text-slate-800">{activeChat.contacts?.name || activeChat.contacts?.ig_scoped_id}</h2>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-sm font-semibold hover:bg-amber-100 transition-colors shadow-sm">
                  <PauseCircle className="w-4 h-4" />
                  Pausar Automação
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-[url('https://i.pinimg.com/736x/8c/98/99/8c98994518b575bfd8c949e91d20548b.jpg')] bg-cover bg-center">
              <div className="space-y-4 flex flex-col">
                {messages.map((msg, idx) => {
                  const isUser = msg.sender_type === 'user';
                  return (
                    <div key={msg.id || idx} className={`flex ${isUser ? 'justify-start' : 'justify-end'}`}>
                      <div className={`max-w-[70%] p-3 rounded-2xl shadow-sm ${isUser ? 'bg-white border border-gray-100 text-gray-800 rounded-tl-sm' : 'bg-blue-600 text-white rounded-tr-sm'}`}>
                        <p className="text-sm">{msg.content}</p>
                        <div className={`flex mt-1 ${isUser ? 'justify-start' : 'justify-end'}`}>
                          <span className={`text-[10px] ${isUser ? 'text-gray-400' : 'text-blue-200'}`}>
                            {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} 
                            {!isUser && ` • ${msg.sender_type === 'bot' ? 'Bot' : 'Agente'}`}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="p-4 bg-white border-t border-slate-200">
              <div className="flex items-center bg-slate-50 border border-slate-200 rounded-full px-4 py-2 focus-within:bg-white focus-within:border-blue-300 focus-within:ring-2 focus-within:ring-blue-100 transition-all shadow-sm">
                <input 
                  type="text" 
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Envie uma mensagem..." 
                  className="bg-transparent border-none outline-none text-sm w-full text-slate-800 placeholder-slate-400"
                />
                <button 
                  onClick={handleSendMessage}
                  className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white ml-2 flex-shrink-0 hover:bg-blue-700 transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
            <MessageCircle className="w-16 h-16 mb-4 text-slate-200" />
            <p className="font-medium text-slate-500">Selecione uma conversa</p>
          </div>
        )}
      </div>

      {/* Painel Direito (Detalhes do Lead) */}
      {activeChat && (
        <div className="w-72 bg-white border-l border-slate-200 p-6 flex flex-col overflow-y-auto">
          <div className="flex flex-col items-center mb-6">
            <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-2xl mb-3">
              {activeChat.contacts?.name?.charAt(0) || '@'}
            </div>
            <h3 className="font-bold text-slate-800 text-lg">{activeChat.contacts?.name || activeChat.contacts?.ig_scoped_id}</h3>
            
            <button className="mt-4 w-full py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors flex items-center justify-center gap-2 shadow-sm">
              <User className="w-4 h-4" />
              Ver no Instagram
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
