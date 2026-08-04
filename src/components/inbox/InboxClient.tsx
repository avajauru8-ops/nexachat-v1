/* eslint-disable @next/next/no-img-element */
'use client';

import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Filter, Paperclip, Smile, Image as ImageIcon, Mic, Clock, ChevronDown, Check, MoreHorizontal, MessageCircle, Square, Tag, Trash2, Bot, Workflow, Star, PanelRightOpen, Camera, X } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'react-hot-toast';
import { CrmPanel } from './CrmPanel';

const EMOJIS = [
  '😀', '😄', '😁', '😂', '🤣', '😊', '😍', '😘',
  '😎', '🤩', '🥳', '😇', '🙂', '😉', '😅', '😆',
  '🤔', '🤨', '😐', '😴', '😢', '😭', '😤', '😡',
  '👍', '👎', '👏', '🙏', '🤝', '💪', '✌️', '🤙',
  '❤️', '💜', '💛', '💚', '💙', '🔥', '✨', '⭐',
  '🎉', '🎊', '🎁', '🥂', '☕', '🍕', '🌹', '💯'
];

export function InboxClient({ workspaceId }: { workspaceId: string }) {
  const [conversations, setConversations] = useState<Record<string, unknown>[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const activeChatIdRef = useRef<string | null>(null);
  const conversationsRef = useRef<Record<string, unknown>[]>([]);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const [messages, setMessages] = useState<Record<string, unknown>[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [now, setNow] = useState<number | null>(null);
  const [showCrmPanel, setShowCrmPanel] = useState(true);
  const [replyMode, setReplyMode] = useState<'dm' | 'public'>('dm');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [members, setMembers] = useState<any[]>([]);
  const [folderFilter, setFolderFilter] = useState('all');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [labels, setLabels] = useState<any[]>([]);
  const [labelsOpen, setLabelsOpen] = useState(true);
  const [showLabelInput, setShowLabelInput] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [statusFilter, setStatusFilter] = useState('open');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [sortMode, setSortMode] = useState('recent');
  const [channelFilter, setChannelFilter] = useState('all');
  const [pipelineFilter, setPipelineFilter] = useState('all');
  const [assigneeFilter, setAssigneeFilter] = useState('all');
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetch('/api/workspace/members')
      .then(r => r.json())
      .then(d => { if (d.members) setMembers(d.members); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setNow(Date.now()), 0);
    return () => clearTimeout(timer);
  }, []);

  const supabase = createClient();

  useEffect(() => {
    supabase
      .from('tags')
      .select('id, name, color')
      .eq('workspace_id', workspaceId)
      .order('name')
      .then(({ data }) => { if (data) setLabels(data); });
  }, [workspaceId, supabase]);

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
        id, status, channel, last_interaction_at, window_expires_at, created_at, updated_at, pipeline_stage, assigned_agent_id, is_favorite,
        contacts ( id, name, ig_scoped_id, profile_picture, username, email, phone, custom_fields, contact_tags ( tag_id, tags ( id, name, color ) ) ),
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
              lastMessage = msg.message_type === 'image' ? '📷 Foto' : msg.message_type === 'video' ? '🎥 Vídeo' : msg.message_type === 'audio' ? '🎵 Áudio' : msg.message_type === 'comment' ? `💬 ${(msg.content as string) || 'Comentário'}` : (msg.content as string);
            }
            return { ...c, lastMessage };
          });
          setConversations(formattedData);

          // Verificar se há um contactId na URL para selecionar automaticamente
          if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            const targetContactId = params.get('contactId');
            if (targetContactId) {
              const matchingConv = formattedData.find((c: Record<string, unknown>) => (c.contacts as Record<string, unknown>)?.id === targetContactId);
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
                    lastMessage: newMsg.message_type === 'image' ? '📷 Foto' : newMsg.message_type === 'video' ? '🎥 Vídeo' : newMsg.message_type === 'audio' ? '🎵 Áudio' : newMsg.message_type === 'comment' ? `💬 ${(newMsg.content as string) || 'Comentário'}` : newMsg.content,
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
                  id, status, channel, last_interaction_at, window_expires_at, created_at, updated_at, unread_count, pipeline_stage, assigned_agent_id, is_favorite,
                  contacts ( id, name, ig_scoped_id, profile_picture, username, email, phone, custom_fields, contact_tags ( tag_id, tags ( id, name, color ) ) ),
                  messages ( content, message_type, timestamp )
                `)
                .eq('id', newMsg.conversation_id as string)
                .single();

              if (newConv) {
                const msgs = (newConv.messages as Record<string, unknown>[]) || [];
                const lastMessage = msgs.length > 0
                  ? (msgs[0].message_type === 'image' ? '📷 Foto' : msgs[0].message_type === 'video' ? '🎥 Vídeo' : msgs[0].message_type === 'audio' ? '🎵 Áudio' : msgs[0].message_type === 'comment' ? `💬 ${(msgs[0].content as string) || 'Comentário'}` : msgs[0].content as string)
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

  const handlePublicCommentReply = async () => {
    if (!newMessage.trim() || !activeChatId) return;
    const content = newMessage;
    const toastId = toast.loading('Respondendo publicamente ao comentário...');
    try {
      const res = await fetch('/api/instagram/comment-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: activeChatId, content })
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error('Erro: ' + (data.error || 'Falha ao responder comentário'), { id: toastId });
      } else {
        toast.success('Comentário respondido publicamente!', { id: toastId });
        setNewMessage('');
        const { data: msgs } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', activeChatId)
          .order('timestamp', { ascending: true });
        if (msgs) setMessages(msgs);
      }
    } catch {
      toast.error('Erro de comunicação', { id: toastId });
    }
  };

  const handleSendOrReply = () => {
    if (activeChat?.channel === 'comment' && replyMode === 'public') {
      handlePublicCommentReply();
    } else {
      handleSendMessage();
    }
  };

  const handleSendMediaFile = (file: Blob | File, mimeType: string, filename: string) => {
    if (!activeChatId) return;
    if (file.size > 4 * 1024 * 1024) {
      toast.error('Anexo muito grande (máx. 4MB)');
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1];
      const mediaType = mimeType.startsWith('video/') ? 'video' : mimeType.startsWith('audio/') ? 'audio' : 'image';
      const toastId = toast.loading(mediaType === 'audio' ? 'Enviando áudio...' : mediaType === 'video' ? 'Enviando vídeo...' : 'Enviando imagem...');
      try {
        const res = await fetch('/api/messages/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ conversationId: activeChatId, mediaBase64: base64, mediaType, mimeType, filename })
        });
        const data = await res.json();
        if (!res.ok) {
          toast.error('Erro: ' + (data.error || 'Falha no envio'), { id: toastId });
          return;
        }
        toast.success(mediaType === 'audio' ? 'Áudio enviado!' : mediaType === 'video' ? 'Vídeo enviado!' : 'Imagem enviada!', { id: toastId });
        setMessages(prev => prev.find(m => m.id === data.message.id) ? prev : [...prev, data.message]);
        setConversations(prev => prev.map(c => c.id === activeChatId ? { ...c, lastMessage: mediaType === 'image' ? '📷 Foto' : mediaType === 'video' ? '🎥 Vídeo' : '🎵 Áudio' } : c));
      } catch {
        toast.error('Erro de comunicação', { id: toastId });
      }
    };
    reader.onerror = () => toast.error('Falha ao ler o arquivo');
    reader.readAsDataURL(file);
  };

  const handlePickFile = (accept: string) => {
    if (!activeChatId) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      const isAudio = file.type.startsWith('audio/');
      if (!isImage && !isVideo && !isAudio) {
        toast.error('O Instagram aceita apenas imagens, vídeos ou áudios');
        return;
      }
      handleSendMediaFile(file, file.type, file.name);
    };
    input.click();
  };

  const startRecording = async () => {
    if (!activeChatId) return;
    if (typeof window === 'undefined' || typeof MediaRecorder === 'undefined') {
      toast.error('Gravação de voz não suportada neste navegador');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      let mime = 'audio/mp4;codecs=mp4a.40.2';
      if (!MediaRecorder.isTypeSupported(mime)) mime = 'audio/webm;codecs=opus';
      if (!MediaRecorder.isTypeSupported(mime)) mime = '';
      const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      recorderRef.current = recorder;
      recordingChunksRef.current = [];
      recorder.ondataavailable = e => { if (e.data.size > 0) recordingChunksRef.current.push(e.data); };
      recorder.onstop = () => { recorder.stream.getTracks().forEach(t => t.stop()); };
      recorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);
      recordTimerRef.current = setInterval(() => setRecordingSeconds(s => s + 1), 1000);
      toast.success('Gravando... clique em Enviar para finalizar');
    } catch {
      toast.error('Não foi possível acessar o microfone');
    }
  };

  const stopRecording = () => {
    const recorder = recorderRef.current;
    if (!recorder) return;
    clearInterval(recordTimerRef.current || undefined);
    recordTimerRef.current = null;
    setRecordingSeconds(0);
    setIsRecording(false);
    recorder.onstop = () => {
      recorder.stream.getTracks().forEach(t => t.stop());
      const blob = new Blob(recordingChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
      if (blob.size === 0) {
        toast.error('Nenhum áudio capturado');
        return;
      }
      const isMp4 = recorder.mimeType.includes('mp4');
      handleSendMediaFile(blob, recorder.mimeType || 'audio/webm', isMp4 ? 'voz.m4a' : 'voz.webm');
    };
    recorder.stop();
  };

  const cancelRecording = () => {
    const recorder = recorderRef.current;
    if (!recorder) return;
    clearInterval(recordTimerRef.current || undefined);
    recordTimerRef.current = null;
    setRecordingSeconds(0);
    setIsRecording(false);
    recorder.onstop = () => { recorder.stream.getTracks().forEach(t => t.stop()); };
    recorder.stop();
    toast('Gravação cancelada');
  };

  const insertEmoji = (emoji: string) => {
    setNewMessage(prev => prev + emoji);
  };

  const handleToggleActiveFavorite = () => {
    if (activeChat) handleToggleFavorite(activeChat);
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
        id, status, channel, last_interaction_at, window_expires_at, created_at, updated_at, pipeline_stage, assigned_agent_id, is_favorite,
        contacts ( id, name, ig_scoped_id, profile_picture, username, email, phone, custom_fields, contact_tags ( tag_id, tags ( id, name, color ) ) ),
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
              lastMessage = msg.message_type === 'image' ? '📷 Foto' : msg.message_type === 'video' ? '🎥 Vídeo' : msg.message_type === 'audio' ? '🎵 Áudio' : msg.message_type === 'comment' ? `💬 ${(msg.content as string) || 'Comentário'}` : (msg.content as string);
            }
            return { ...c, lastMessage };
          });
          setConversations(formattedData);
        }
      });
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

  const TAG_COLORS = ['#3B82F6', '#F59E0B', '#10B981', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#6366F1'];

  const handleCreateLabel = async () => {
    const name = newLabel.trim();
    if (!name) return;
    const color = TAG_COLORS[labels.length % TAG_COLORS.length];
    const { data, error } = await supabase
      .from('tags')
      .insert({ workspace_id: workspaceId, name, color })
      .select('id, name, color')
      .single();
    if (error) {
      toast.error('Erro ao criar legenda: ' + error.message);
      return;
    }
    setLabels(prev => [...prev, data]);
    setNewLabel('');
    setShowLabelInput(false);
    toast.success('Legenda criada!');
  };

  const handleToggleFavorite = async (chat: Record<string, unknown>) => {
    const newVal = !chat.is_favorite;
    setConversations(prev => prev.map(c => c.id === chat.id ? { ...c, is_favorite: newVal } : c));
    try {
      const res = await fetch('/api/conversations/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: chat.id, is_favorite: newVal })
      });
      if (!res.ok) {
        setConversations(prev => prev.map(c => c.id === chat.id ? { ...c, is_favorite: !newVal } : c));
        toast.error('Erro ao favoritar conversa');
      }
    } catch {
      setConversations(prev => prev.map(c => c.id === chat.id ? { ...c, is_favorite: !newVal } : c));
      toast.error('Erro de comunicação');
    }
  };

  const isAttention = (c: Record<string, unknown>) =>
    Number(c.unread_count || 0) > 0 || c.status === 'paused_for_human';

  const PIPELINE_OPTIONS = [
    { value: 'novo', label: 'Novo' },
    { value: 'em_atendimento', label: 'Em Atendimento' },
    { value: 'em_negociacao', label: 'Em Negociação' },
    { value: 'fechado', label: 'Fechado' },
    { value: 'perdido', label: 'Perdido' }
  ];

  const visibleConversations = conversations
    .filter(c => {
      if (folderFilter === 'attention' && !isAttention(c)) return false;
      if (folderFilter === 'favorite' && !Boolean(c.is_favorite)) return false;
      if (folderFilter.startsWith('tag:')) {
        const tagId = folderFilter.slice(4);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const cts = ((c.contacts as Record<string, any>)?.contact_tags as any[]) || [];
        if (!cts.some(ct => ct.tag_id === tagId)) return false;
      }
      if (statusFilter === 'open' && c.status === 'closed') return false;
      if (statusFilter === 'closed' && c.status !== 'closed') return false;
      if (unreadOnly && !(Number(c.unread_count || 0) > 0)) return false;
      if (channelFilter !== 'all' && c.channel !== channelFilter) return false;
      if (pipelineFilter !== 'all' && c.pipeline_stage !== pipelineFilter) return false;
      if (assigneeFilter !== 'all' && c.assigned_agent_id !== assigneeFilter) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortMode === 'name') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const na = ((a.contacts as Record<string, any>)?.name as string) || '';
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const nb = ((b.contacts as Record<string, any>)?.name as string) || '';
        return na.localeCompare(nb, 'pt-BR');
      }
      const ta = new Date((a.last_interaction_at as string) || (a.updated_at as string) || 0).getTime();
      const tb = new Date((b.last_interaction_at as string) || (b.updated_at as string) || 0).getTime();
      return sortMode === 'oldest' ? ta - tb : tb - ta;
    });

  const statusLabel = statusFilter === 'open' ? 'Conversas Abertas' : statusFilter === 'closed' ? 'Fechadas' : 'Todas';
  const sortLabel = sortMode === 'recent' ? 'Mais Recentes' : sortMode === 'oldest' ? 'Mais Antigas' : 'Por Nome';
  const channelLabel = channelFilter === 'all' ? 'Todos Os Canais' : channelFilter === 'dm' ? 'DM' : channelFilter === 'comment' ? 'Comentários' : 'Story';
  const hasAdvancedFilter = pipelineFilter !== 'all' || assigneeFilter !== 'all';

  const attentionCount = conversations.filter(isAttention).length;
  const favoriteCount = conversations.filter(c => Boolean(c.is_favorite)).length;

  return (
    <div className="flex h-[calc(100vh-64px)] -m-6 bg-[#f4f6f8] overflow-hidden text-sm font-sans">
      
      {/* Coluna 1: Pastas da Inbox */}
      <div className="w-[220px] border-r border-[#e5e7eb] bg-[#f8f9fa] flex flex-col hidden lg:flex shrink-0 py-4">
        <div
          onClick={() => setFolderFilter('all')}
          className={`px-3 mb-2 flex items-center justify-between py-2 mx-2 rounded cursor-pointer transition-colors ${folderFilter === 'all' ? 'bg-[#e5e7eb]' : 'hover:bg-[#ececec]'}`}
        >
          <div className="flex items-center gap-2 font-medium text-gray-800">
            <MessageCircle className="w-4 h-4 text-gray-500" />
            Todas as conversas
          </div>
          <span className="text-gray-500 font-medium text-xs">{conversations.length}</span>
        </div>

        <div
          onClick={() => setFolderFilter('attention')}
          className={`px-4 py-2 mx-2 flex items-center gap-2 rounded cursor-pointer transition-colors ${folderFilter === 'attention' ? 'bg-[#e5e7eb] text-gray-800 font-semibold' : 'text-gray-600 hover:bg-[#ececec]'}`}
        >
          <Clock className="w-4 h-4" />
          <span className="flex-1">Lembretes</span>
          {attentionCount > 0 && (
            <span className="text-[10px] font-bold bg-red-100 text-red-600 rounded-full px-1.5 py-0.5">{attentionCount}</span>
          )}
        </div>

        <div className="mt-4 px-3">
          <div
            onClick={() => setLabelsOpen(v => !v)}
            className="px-2 py-1 text-xs font-semibold text-gray-400 flex items-center justify-between cursor-pointer group"
          >
            <div className="flex items-center gap-1">
              <ChevronDown className={`w-3 h-3 transition-transform ${labelsOpen ? '' : '-rotate-90'} group-hover:text-gray-600`} /> Legendas
            </div>
            <span
              onClick={(e) => { e.stopPropagation(); setShowLabelInput(v => !v); }}
              className="text-gray-400 group-hover:text-gray-600 hover:text-gray-800 font-bold"
              title="Criar legenda"
            >
              +
            </span>
          </div>

          {showLabelInput && (
            <div className="mt-1 px-2">
              <input
                value={newLabel}
                onChange={e => setNewLabel(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleCreateLabel(); }}
                onBlur={() => { if (!newLabel.trim()) setShowLabelInput(false); }}
                autoFocus
                placeholder="Nome da legenda..."
                className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200"
              />
            </div>
          )}

          {labelsOpen && (
            <div className="mt-1">
              {labels.length === 0 && !showLabelInput && (
                <p className="px-2 py-1 text-[11px] text-gray-400 italic">Nenhuma legenda ainda</p>
              )}
              {labels.map(tag => (
                <div
                  key={tag.id}
                  onClick={() => setFolderFilter(`tag:${tag.id}`)}
                  className={`px-2 py-1.5 flex items-center gap-2 text-xs rounded cursor-pointer transition-colors ${folderFilter === `tag:${tag.id}` ? 'bg-[#e5e7eb] font-semibold text-gray-800' : 'text-gray-500 hover:bg-[#ececec]'}`}
                >
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: tag.color || '#3B82F6' }}></span>
                  <span className="truncate">{tag.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div
          onClick={() => setFolderFilter('favorite')}
          className={`mt-2 px-4 py-2 mx-2 flex items-center gap-2 rounded cursor-pointer transition-colors ${folderFilter === 'favorite' ? 'bg-[#e5e7eb] text-gray-800 font-semibold' : 'text-gray-500 hover:bg-[#ececec]'}`}
        >
          <Star className={`w-3.5 h-3.5 ${folderFilter === 'favorite' ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400'}`} />
          <span className="flex-1 font-semibold text-xs">Favorites</span>
          {favoriteCount > 0 && (
            <span className="text-[10px] font-bold text-gray-400">{favoriteCount}</span>
          )}
        </div>
      </div>

      {/* Coluna 2: Lista de Conversas */}
      <div className={`${activeChatId ? 'hidden md:flex' : 'flex'} w-full md:w-[360px] border-r border-[#e5e7eb] flex-col bg-white shrink-0 relative`}>
        <div className="flex flex-col border-b border-[#e5e7eb] relative">
          {openDropdown && (
            <div className="fixed inset-0 z-10" onClick={() => setOpenDropdown(null)} />
          )}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-[#e5e7eb]">
            <Square className="w-4 h-4 text-gray-400" />
            <div className="relative">
              <button
                onClick={() => setOpenDropdown(openDropdown === 'status' ? null : 'status')}
                className={`flex items-center border rounded px-2 py-1 gap-1 text-xs font-medium cursor-pointer transition-colors ${openDropdown === 'status' ? 'border-gray-400 bg-gray-50' : 'border-gray-200 text-gray-600'}`}
              >
                <MessageCircle className="w-3 h-3" /> {statusLabel} <ChevronDown className="w-3 h-3" />
              </button>
              {openDropdown === 'status' && (
                <div className="absolute left-0 top-full mt-1 w-44 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1">
                  {[{ value: 'open', label: 'Conversas Abertas' }, { value: 'closed', label: 'Fechadas' }, { value: 'all', label: 'Todas' }].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => { setStatusFilter(opt.value); setOpenDropdown(null); }}
                      className={`w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 flex items-center justify-between ${statusFilter === opt.value ? 'font-semibold text-gray-900' : 'text-gray-600'}`}
                    >
                      {opt.label}
                      {statusFilter === opt.value && <Check className="w-3 h-3 text-indigo-500" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={() => setUnreadOnly(v => !v)}
              className={`border rounded px-2 py-1 text-xs font-medium cursor-pointer transition-colors ${unreadOnly ? 'bg-blue-50 border-blue-300 text-blue-600 font-bold' : 'border-gray-200 text-gray-600'}`}
              title="Mostrar apenas conversas não lidas"
            >
              Não Lidas
            </button>
          </div>
          <div className="flex items-center gap-3 px-3 py-2 text-xs text-gray-600">
            <div className="relative">
              <button
                onClick={() => setOpenDropdown(openDropdown === 'sort' ? null : 'sort')}
                className={`flex items-center gap-1 cursor-pointer hover:text-gray-900 ${openDropdown === 'sort' ? 'text-gray-900' : ''}`}
              >
                Classificar: <span className="font-semibold">{sortLabel}</span> <ChevronDown className="w-3 h-3" />
              </button>
              {openDropdown === 'sort' && (
                <div className="absolute left-0 top-full mt-1 w-44 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1">
                  {[{ value: 'recent', label: 'Mais Recentes' }, { value: 'oldest', label: 'Mais Antigas' }, { value: 'name', label: 'Por Nome' }].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => { setSortMode(opt.value); setOpenDropdown(null); }}
                      className={`w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 flex items-center justify-between ${sortMode === opt.value ? 'font-semibold text-gray-900' : 'text-gray-600'}`}
                    >
                      {opt.label}
                      {sortMode === opt.value && <Check className="w-3 h-3 text-indigo-500" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="relative">
              <button
                onClick={() => setOpenDropdown(openDropdown === 'channel' ? null : 'channel')}
                className={`flex items-center gap-1 cursor-pointer hover:text-gray-900 ${openDropdown === 'channel' ? 'text-gray-900' : ''}`}
              >
                <span className="font-semibold">{channelLabel}</span> <ChevronDown className="w-3 h-3" />
              </button>
              {openDropdown === 'channel' && (
                <div className="absolute left-0 top-full mt-1 w-44 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1">
                  {[{ value: 'all', label: 'Todos Os Canais' }, { value: 'dm', label: 'DM' }, { value: 'comment', label: 'Comentários' }, { value: 'story', label: 'Story' }].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => { setChannelFilter(opt.value); setOpenDropdown(null); }}
                      className={`w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 flex items-center justify-between ${channelFilter === opt.value ? 'font-semibold text-gray-900' : 'text-gray-600'}`}
                    >
                      {opt.label}
                      {channelFilter === opt.value && <Check className="w-3 h-3 text-indigo-500" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="relative ml-auto">
              <button
                onClick={() => setOpenDropdown(openDropdown === 'filter' ? null : 'filter')}
                className={`flex items-center gap-1 border rounded px-2 py-1 cursor-pointer transition-colors ${hasAdvancedFilter || openDropdown === 'filter' ? 'bg-indigo-50 border-indigo-300 text-indigo-600 font-semibold' : 'text-gray-500 hover:text-gray-900 border-gray-200'}`}
              >
                <Filter className="w-3 h-3" /> Filtro {hasAdvancedFilter && <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />}
              </button>
              {openDropdown === 'filter' && (
                <div className="absolute right-0 top-full mt-1 w-52 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-2.5 px-3">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1.5">Etapa do funil</p>
                  <select
                    value={pipelineFilter}
                    onChange={e => { setPipelineFilter(e.target.value); }}
                    className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs outline-none focus:border-indigo-400 mb-3"
                  >
                    <option value="all">Todas as etapas</option>
                    {PIPELINE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1.5">Atribuído a</p>
                  <select
                    value={assigneeFilter}
                    onChange={e => { setAssigneeFilter(e.target.value); }}
                    className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs outline-none focus:border-indigo-400"
                  >
                    <option value="all">Qualquer agente</option>
                    <option value="">Não atribuído</option>
                    {members.map(m => <option key={m.user_id} value={m.user_id}>{m.name || m.email || 'Membro'}</option>)}
                  </select>
                  {(pipelineFilter !== 'all' || assigneeFilter !== 'all') && (
                    <button
                      onClick={() => { setPipelineFilter('all'); setAssigneeFilter('all'); }}
                      className="mt-3 w-full text-center text-[11px] font-bold text-indigo-600 hover:text-indigo-800"
                    >
                      Limpar filtros
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {visibleConversations.length === 0 && (
            <div className="p-8 text-center text-xs text-gray-400">
              <MessageCircle className="w-6 h-6 text-gray-300 mx-auto mb-2" />
              Nenhuma conversa nesta pasta
            </div>
          )}
          {visibleConversations.map((chat) => {
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
                      {chat.channel === 'comment' && (
                        <span className="text-[9px] font-bold uppercase tracking-wide text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-1.5 py-0.5 ml-1 align-middle">💬 Comentário</span>
                      )}
                      {chat.channel === 'story' && (
                        <span className="text-[9px] font-bold uppercase tracking-wide text-pink-600 bg-pink-50 border border-pink-200 rounded-full px-1.5 py-0.5 ml-1 align-middle">📸 Story</span>
                      )}
                    </p>
                    <span className={`text-[11px] flex-shrink-0 ml-2 ${Number(chat.unread_count || 0) > 0 ? 'text-blue-600 font-bold' : 'text-gray-400'}`}>
                      {formatTime(chat.updated_at as string || chat.created_at as string)}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between gap-1">
                    <p className={`text-xs truncate ${Number(chat.unread_count || 0) > 0 ? 'font-bold text-gray-900' : 'text-gray-500'}`}>
                      {isAi ? '🤖 bot' : isHuman ? '👤 Humano: ' : '🤖 bot'}{((chat.lastMessage as string) && (chat.lastMessage as string) !== 'Nova conversa') ? `: ${chat.lastMessage}` : ''}
                    </p>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleToggleFavorite(chat); }}
                      className="p-0.5 rounded flex-shrink-0 hover:bg-gray-200 transition-colors"
                      title={chat.is_favorite ? 'Remover dos favoritos' : 'Favoritar conversa'}
                    >
                      <Star className={`w-3.5 h-3.5 transition-colors ${chat.is_favorite ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300 hover:text-gray-500'}`} />
                    </button>
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
                    {activeChat.channel === 'comment' ? '💬 Comentário no post' : 'Não atribuído'} <ChevronDown className="w-3 h-3" />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 text-gray-400">
                <PanelRightOpen
                  onClick={() => setShowCrmPanel(v => !v)}
                  className={`w-5 h-5 cursor-pointer hover:text-gray-600 transition-colors ${showCrmPanel ? 'text-indigo-500' : ''}`}
                  aria-label="Painel CRM"
                />
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
                          msg.message_type === 'comment'
                            ? 'bg-amber-50 border border-amber-200 text-gray-900 rounded-2xl rounded-bl-sm shadow-sm'
                            : isUser 
                              ? 'bg-[#f0f2f5] text-gray-900 rounded-2xl rounded-bl-sm shadow-sm' 
                              : 'bg-[#e7f3ff] text-[#0064e0] rounded-2xl rounded-br-sm shadow-sm'
                        }`}>
                          {msg.message_type === 'comment' && (
                            <div className="text-[10px] font-bold text-amber-600 uppercase tracking-wide mb-1 flex items-center gap-1">
                              <MessageCircle className="w-3 h-3" />
                              {msg.direction === 'outbound' ? 'Resposta pública no comentário' : 'Comentário no post'}
                            </div>
                          )}
                          {(() => {
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            const meta = (msg.metadata as Record<string, any>) || {};
                            const isStory = msg.message_type === 'story_mention' || msg.message_type === 'story_reply';
                            const isCommentCtx = msg.message_type === 'comment' && (meta.post_url || meta.post_text || meta.thumbnail_url);
                            if (isStory || isCommentCtx) {
                              const thumb = meta.thumbnail_url || (isStory ? msg.media_url : null);
                              return (
                                <div className="mb-2 rounded-xl border border-gray-200 bg-white p-2.5 shadow-sm">
                                  <div className="flex items-center gap-2">
                                    {thumb ? (
                                      <img src={thumb as string} alt="contexto" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                                    ) : (
                                      <div className="w-10 h-10 rounded-lg bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                                        <Camera className="w-4 h-4 text-white" />
                                      </div>
                                    )}
                                    <div className="min-w-0 flex-1">
                                      <p className={`text-[10px] font-bold uppercase tracking-wide ${isStory ? 'text-pink-600' : 'text-gray-400'}`}>
                                        {isStory ? '📸 Resposta ao Story' : '📌 Post original'}
                                      </p>
                                      {meta.post_text && (
                                        <p className="text-xs text-gray-600 truncate mt-0.5">{meta.post_text as string}</p>
                                      )}
                                      {meta.post_url && (
                                        <a href={meta.post_url as string} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-600 underline mt-0.5 inline-block">
                                          Ver no Instagram
                                        </a>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          })()}
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
                                <div className="w-[300px] sm:w-[320px] rounded-xl overflow-hidden bg-[#fafafa] shadow-sm border border-gray-200 mt-1 h-[380px] relative">
                                  <iframe 
                                    src={`${((msg.media_url as string).split('?')[0].replace(/\/$/, ''))}/embed`}
                                    className="absolute top-[-56px] left-0 w-full h-[460px]"
                                    frameBorder="0"
                                    scrolling="no"
                                    allow="encrypted-media"
                                  ></iframe>
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
                          {!msg.content && !msg.media_url && (msg.message_type === 'image' || msg.message_type === 'video' || msg.message_type === 'audio') && (
                            <span className="text-gray-400 italic">📎 Anexo enviado</span>
                          )}
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
                  <div className="relative">
                    <button
                      onClick={() => setShowEmojiPicker(v => !v)}
                      className={`hover:text-gray-600 transition-colors ${showEmojiPicker ? 'text-indigo-500' : ''}`}
                      title="Emojis"
                    >
                      <Smile className="w-5 h-5" />
                    </button>
                    {showEmojiPicker && (
                      <>
                        <div className="fixed inset-0 z-20" onClick={() => setShowEmojiPicker(false)} />
                        <div className="absolute bottom-full left-0 mb-2 w-[272px] bg-white border border-gray-200 rounded-xl shadow-xl z-30 p-3 grid grid-cols-8 gap-1">
                          {EMOJIS.map(e => (
                            <button
                              key={e}
                              onClick={() => insertEmoji(e)}
                              className="text-xl leading-none hover:bg-gray-100 rounded p-1 transition-colors"
                            >
                              {e}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>

                  <button onClick={() => handlePickFile('image/*')} className="hover:text-gray-600 transition-colors" title="Galeria de Mídia">
                    <ImageIcon className="w-5 h-5" />
                  </button>

                  <button onClick={() => handlePickFile('*/*')} className="hover:text-gray-600 transition-colors" title="Anexar arquivo">
                    <Paperclip className="w-5 h-5" />
                  </button>

                  <div className="relative group flex flex-col items-center">
                    {isRecording ? (
                      <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-full px-3 py-1.5">
                        <button onClick={cancelRecording} className="text-red-500 hover:opacity-70" title="Cancelar gravação">
                          <X className="w-4 h-4" />
                        </button>
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                        <span className="text-[11px] font-bold text-red-600 tabular-nums">
                          {Math.floor(recordingSeconds / 60)}:{String(recordingSeconds % 60).padStart(2, '0')}
                        </span>
                        <button onClick={stopRecording} className="text-red-600 font-bold text-[11px] hover:opacity-70" title="Enviar áudio">
                          Enviar
                        </button>
                      </div>
                    ) : (
                      <button onClick={startRecording} className="hover:text-gray-600 transition-colors" title="Gravar mensagem de voz">
                        <Mic className="w-5 h-5" />
                      </button>
                    )}
                  </div>

                  <button
                    onClick={() => { window.location.href = '/flows'; }}
                    className="hover:text-blue-600 transition-colors"
                    title="Automação e fluxos de chat"
                  >
                    <Workflow className="w-5 h-5" />
                  </button>

                  <button
                    onClick={handleToggleActiveFavorite}
                    className={`transition-colors ${activeChat?.is_favorite ? 'text-yellow-400 hover:text-yellow-500' : 'hover:text-yellow-500'}`}
                    title={activeChat?.is_favorite ? 'Remover dos favoritos' : 'Favoritar conversa'}
                  >
                    <Star className={`w-5 h-5 ${activeChat?.is_favorite ? 'fill-yellow-400' : ''}`} />
                  </button>
                </div>
                  
                  <div className="flex items-center gap-3">
                    {activeChat.channel === 'comment' && (
                      <div className="flex items-center gap-1 rounded-xl bg-amber-50 border border-amber-200 p-1" title="Escolha o canal de resposta">
                        <button
                          onClick={() => setReplyMode('dm')}
                          className={`px-3 py-1.5 text-[11px] font-bold rounded-lg transition-colors ${replyMode === 'dm' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-800'}`}
                        >
                          DM
                        </button>
                        <button
                          onClick={() => setReplyMode('public')}
                          className={`px-3 py-1.5 text-[11px] font-bold rounded-lg transition-colors ${replyMode === 'public' ? 'bg-amber-500 text-white shadow-sm' : 'text-amber-700 hover:bg-amber-100'}`}
                          title="Responde publicamente no post do Instagram"
                        >
                          Público (no post)
                        </button>
                      </div>
                    )}
                    <button 
                      onClick={handleSendOrReply}
                      disabled={!newMessage.trim()}
                      className={`px-8 py-2.5 text-[13px] font-bold rounded-xl shadow-lg transition-all hover:scale-[1.02] disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed ${
                        activeChat.channel === 'comment' && replyMode === 'public'
                          ? 'bg-amber-500 hover:bg-amber-400 text-white shadow-amber-500/20'
                          : 'bg-instagram-gradient hover:opacity-90 text-white shadow-pink-500/20'
                      }`}
                    >
                      {activeChat.channel === 'comment' && replyMode === 'public'
                        ? 'Responder no Post'
                        : activeChat.channel === 'comment'
                          ? 'Enviar via DM'
                          : 'Enviar'}
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

      {/* Coluna 4: Painel CRM (retrátil) */}
      <aside
        className={`${showCrmPanel ? 'w-[320px]' : 'w-0'} border-l border-[#e5e7eb] bg-white flex flex-col shrink-0 overflow-hidden transition-all duration-300 hidden lg:flex`}
      >
        {activeChat ? (
          <CrmPanel
            key={activeChat.id as string}
            workspaceId={workspaceId}
            conversationId={activeChat.id as string}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            contact={(activeChat.contacts as Record<string, any>) || {}}
            pipelineStage={activeChat.pipeline_stage as string}
            assigneeId={activeChat.assigned_agent_id as string}
            members={members}
            onDataChanged={fetchConversationsList}
            onClose={() => setShowCrmPanel(false)}
          />
        ) : null}
      </aside>

    </div>
  );
}
