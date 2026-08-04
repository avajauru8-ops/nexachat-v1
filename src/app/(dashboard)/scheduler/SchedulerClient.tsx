'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CalendarClock, Image as ImageIcon, Video, Upload, X, Loader2, Trash2,
  Send, CheckCircle2, Clock, AlertTriangle, Zap, Copy, CalendarPlus, Link2,
  CalendarDays, ChevronLeft, ChevronRight
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { createClient } from '@/utils/supabase/client';

interface Account {
  id: string;
  ig_user_id: string;
  page_id?: string | null;
  ig_username?: string | null;
}

interface ScheduledPost {
  id: string;
  workspace_id: string;
  instagram_account_id: string;
  media_type: 'POST' | 'REELS';
  caption: string | null;
  media_url: string | null;
  scheduled_at: string;
  status: 'scheduled' | 'publishing' | 'published' | 'failed';
  error: string | null;
  published_media_id: string | null;
  published_permalink: string | null;
  published_at: string | null;
  created_at: string;
}

const HASHTAG_SUGGESTIONS = ['#promoção', '#novidade', '#oferta', '#linknabio', '#partiu', '#dicas'];

const STATUS_META: Record<ScheduledPost['status'], { label: string; classes: string; dot: string }> = {
  scheduled: { label: 'Agendado', classes: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500' },
  publishing: { label: 'Publicando...', classes: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500 animate-pulse' },
  published: { label: 'Publicado', classes: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  failed: { label: 'Falhou', classes: 'bg-red-50 text-red-700 border-red-200', dot: 'bg-red-500' }
};

const toLocalInput = (d: Date) => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const formatSchedule = (iso: string) => {
  const d = new Date(iso);
  const today = new Date();
  const tomorrow = new Date(today.getTime() + 86400000);
  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  const time = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  if (sameDay(d, today)) return `Hoje às ${time}`;
  if (sameDay(d, tomorrow)) return `Amanhã às ${time}`;
  return `${d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })}, ${time}`;
};

const toDayKey = (d: Date) => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const isVideoUrl = (url: string | null) => /\.(mp4|mov|m4v|webm)(\?|$)/i.test(url || '');

export function SchedulerClient({
  workspaceId,
  accounts,
  initialPosts,
  tableExists: initialTableExists
}: {
  workspaceId: string;
  accounts: Account[];
  initialPosts: Record<string, unknown>[];
  tableExists: boolean;
}) {
  const supabase = createClient();

  const [accountId, setAccountId] = useState<string>(accounts[0]?.id || '');
  const [mediaType, setMediaType] = useState<'POST' | 'REELS'>('POST');
  const [caption, setCaption] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [fileType, setFileType] = useState<'image' | 'video' | null>(null);
  const [uploading, setUploading] = useState(false);
  const [scheduledAt, setScheduledAt] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [posts, setPosts] = useState<ScheduledPost[]>(initialPosts as unknown as ScheduledPost[]);
  const [tableExists, setTableExists] = useState(initialTableExists);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [viewDate, setViewDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [selectedDay, setSelectedDay] = useState<string>(() => toDayKey(new Date()));

  const refreshPosts = useCallback(async () => {
    if (!tableExists) return;
    const { data, error } = await supabase
      .from('scheduled_posts')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('scheduled_at', { ascending: true });
    if (!error && data) setPosts(data as ScheduledPost[]);
  }, [supabase, workspaceId, tableExists]);

  useEffect(() => {
    if (!tableExists) return;
    const channel = supabase
      .channel(`scheduler_${workspaceId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'scheduled_posts' }, () => {
        refreshPosts();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [supabase, workspaceId, tableExists, refreshPosts]);

  const stats = useMemo(() => {
    const total = posts.length;
    const scheduled = posts.filter(p => p.status === 'scheduled').length;
    const published = posts.filter(p => p.status === 'published').length;
    const failed = posts.filter(p => p.status === 'failed').length;
    return { total, scheduled, published, failed };
  }, [posts]);

  const monthPosts = useMemo(() => {
    const map = new Map<string, ScheduledPost[]>();
    posts.forEach(p => {
      const d = new Date(p.scheduled_at);
      if (d.getFullYear() === viewDate.getFullYear() && d.getMonth() === viewDate.getMonth()) {
        const key = toDayKey(d);
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(p);
      }
    });
    map.forEach(items =>
      items.sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
    );
    return map;
  }, [posts, viewDate]);

  const selectedPosts = useMemo(() => monthPosts.get(selectedDay) || [], [monthPosts, selectedDay]);

  const selectedDayLabel = useMemo(() => {
    const [y, m, d] = selectedDay.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    const today = new Date();
    const same = (a: Date, b: Date) => a.toDateString() === b.toDateString();
    if (same(date, today)) return 'Hoje';
    return date.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
  }, [selectedDay]);

  const monthLabel = useMemo(() => {
    const s = viewDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    return s.charAt(0).toUpperCase() + s.slice(1);
  }, [viewDate]);

  const changeMonth = (delta: number) => {
    const d = new Date(viewDate.getFullYear(), viewDate.getMonth() + delta, 1);
    setViewDate(d);
    setSelectedDay(toDayKey(d));
  };

  const firstDow = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay();
  const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array.from({ length: firstDow }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1)
  ];

  const todayKey = toDayKey(new Date());

  const accountLabel = (acc: Account) =>
    acc.ig_username ? `@${acc.ig_username}` : (acc.page_id && acc.page_id !== 'ig_login_direct' ? acc.page_id : acc.ig_user_id);

  const handleFileChange = async (file: File | null) => {
    if (!file) return;
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    if (!isImage && !isVideo) {
      toast.error('Envie uma imagem ou vídeo.');
      return;
    }

    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/scheduler/upload', { method: 'POST', body: form });
      const result = await res.json();
      if (!res.ok || result.error) throw new Error(result.error || 'Falha no upload.');

      setMediaUrl(result.url);
      setFilePreview(URL.createObjectURL(file));
      setFileType(isImage ? 'image' : 'video');
      if (isVideo) setMediaType('REELS');
      toast.success('Mídia enviada com sucesso!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao enviar a mídia.');
    } finally {
      setUploading(false);
    }
  };

  const clearMedia = () => {
    setMediaUrl('');
    setFilePreview(null);
    setFileType(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const setQuickSchedule = (minutesFromNow: number) => {
    setScheduledAt(toLocalInput(new Date(Date.now() + minutesFromNow * 60000)));
  };

  const handleSubmit = async () => {
    if (!accountId) return toast.error('Selecione a conta do Instagram.');
    if (!mediaUrl) return toast.error('Envie a imagem ou vídeo.');
    if (!scheduledAt) return toast.error('Defina a data e hora da publicação.');

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/scheduler/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instagramAccountId: accountId, mediaType, caption, mediaUrl, scheduledAt })
      });
      const result = await res.json();

      if (result.error === 'TABELA_AUSENTE') {
        setTableExists(false);
        toast.error('Tabela ainda não criada — rode o SQL abaixo.');
        return;
      }
      if (!res.ok || result.error) throw new Error(result.error || 'Erro ao agendar.');

      toast.success('Publicação agendada! 🗓️');
      setCaption('');
      setScheduledAt('');
      clearMedia();
      await refreshPosts();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao agendar.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePublishNow = async (post: ScheduledPost) => {
    setPublishingId(post.id);
    try {
      const res = await fetch(`/api/scheduler/posts/${post.id}`, { method: 'POST' });
      const result = await res.json();
      if (!res.ok || result.error) throw new Error(result.error || 'Erro ao publicar.');
      toast.success('Post publicado com sucesso! 🎉');
      await refreshPosts();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao publicar.');
      await refreshPosts();
    } finally {
      setPublishingId(null);
    }
  };

  const handleDelete = async (post: ScheduledPost) => {
    if (!confirm(`Excluir a publicação "${post.caption?.slice(0, 40) || 'sem legenda'}"?`)) return;
    setDeletingId(post.id);
    try {
      const res = await fetch(`/api/scheduler/posts/${post.id}`, { method: 'DELETE' });
      const result = await res.json();
      if (!res.ok || result.error) throw new Error(result.error || 'Erro ao excluir.');
      toast.success('Agendamento excluído.');
      await refreshPosts();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao excluir.');
    } finally {
      setDeletingId(null);
    }
  };

  const copySetupSql = async () => {
    const sql = `create table if not exists public.scheduled_posts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  instagram_account_id uuid references public.instagram_accounts(id) on delete cascade,
  media_type text not null default 'POST' check (media_type in ('POST', 'REELS')),
  caption text,
  media_url text,
  scheduled_at timestamptz not null,
  status text not null default 'scheduled' check (status in ('scheduled', 'publishing', 'published', 'failed')),
  error text,
  published_media_id text,
  published_permalink text,
  published_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists scheduled_posts_due_idx on public.scheduled_posts (status, scheduled_at);
alter table public.scheduled_posts enable row level security;
create policy "scheduled_posts_all" on public.scheduled_posts for all using (true) with check (true);`;
    try {
      await navigator.clipboard.writeText(sql);
      toast.success('SQL copiado! Cole no Supabase (SQL Editor) e execute.');
    } catch {
      toast.error('Não foi possível copiar. Rode o SQL manualmente (veja o arquivo supabase/migrations).');
    }
  };

  const renderPostRow = (post: ScheduledPost) => {
    const st = STATUS_META[post.status];
    return (
      <div key={post.id} className="bg-white border border-gray-100 rounded-2xl p-3 flex items-center gap-3 hover:border-pink-200 hover:shadow-md transition-all group">
        {post.media_url && isVideoUrl(post.media_url) ? (
          <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shrink-0 overflow-hidden relative">
            <Video className="w-6 h-6 text-white/80" />
            {post.media_type === 'REELS' && (
              <span className="absolute bottom-1 left-1 bg-black/50 text-white text-[8px] font-black px-1.5 py-0.5 rounded">REELS</span>
            )}
          </div>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={post.media_url || ''} alt="Post" className="w-20 h-20 rounded-xl object-cover shrink-0 border border-gray-100" />
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 border border-gray-200">
              {post.media_type}
            </span>
            <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full border ${st.classes}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
              {st.label}
            </span>
            {post.published_permalink && (
              <a
                href={post.published_permalink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:underline"
                title="Ver publicação no Instagram"
              >
                <Link2 className="w-3 h-3" /> ver post
              </a>
            )}
          </div>
          <p className="text-xs font-bold text-gray-900 mt-1.5 truncate">{post.caption || 'Sem legenda'}</p>
          <p className="text-[11px] text-gray-400 mt-0.5 flex items-center gap-1">
            <Clock className="w-3 h-3" /> {formatSchedule(post.scheduled_at)}
            {post.status === 'failed' && post.error && (
              <span className="text-red-500 font-semibold truncate" title={post.error}>· {post.error.slice(0, 60)}</span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          {post.status === 'scheduled' && (
            <button
              onClick={() => handlePublishNow(post)}
              disabled={publishingId === post.id}
              className="w-9 h-9 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50"
              title="Publicar agora"
            >
              {publishingId === post.id
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Send className="w-4 h-4" />}
            </button>
          )}
          <button
            onClick={() => handleDelete(post)}
            disabled={deletingId === post.id}
            className="w-9 h-9 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50"
            title="Excluir agendamento"
          >
            {deletingId === post.id
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Trash2 className="w-4 h-4" />}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Cards de estatísticas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Agendados', value: stats.scheduled, icon: Clock, cls: 'text-blue-600 bg-blue-50 border-blue-200' },
          { label: 'Publicados', value: stats.published, icon: CheckCircle2, cls: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
          { label: 'Falhas', value: stats.failed, icon: AlertTriangle, cls: 'text-red-600 bg-red-50 border-red-200' },
          { label: 'Total', value: stats.total, icon: CalendarClock, cls: 'text-pink-600 bg-pink-50 border-pink-200' }
        ].map(s => (
          <div key={s.label} className="bg-white/60 backdrop-blur-md rounded-2xl border border-white p-5 flex items-center gap-4 shadow-sm">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center border ${s.cls}`}>
              <s.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-black text-gray-900 leading-none">{s.value}</p>
              <p className="text-[11px] font-bold text-gray-500 mt-1">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Aviso de tabela ausente */}
      {!tableExists && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-5 flex flex-col md:flex-row md:items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
          </div>
          <div className="flex-1">
            <p className="font-black text-amber-900 text-sm">Tabela de agendamentos ainda não criada no Supabase</p>
            <p className="text-xs text-amber-700 mt-0.5">
              Vá em Supabase → SQL Editor, cole o SQL abaixo e clique em Run. Leva 5 segundos e libera o agendamento.
            </p>
          </div>
          <button
            onClick={copySetupSql}
            className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-2 transition-colors shadow-sm shrink-0 cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5" /> Copiar SQL
          </button>
        </div>
      )}

      {accounts.length === 0 && (
        <div className="bg-white/60 backdrop-blur-md rounded-2xl border border-white p-6 shadow-sm text-center">
          <p className="text-sm font-bold text-gray-700">Nenhuma conta do Instagram conectada.</p>
          <p className="text-xs text-gray-500 mt-1">Conecte sua conta na tela inicial para começar a agendar posts e reels.</p>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6 items-start">
        {/* ── FORMULÁRIO DE CRIAÇÃO ── */}
        <div className="xl:col-span-2 bg-white/70 backdrop-blur-md rounded-3xl border border-white shadow-xl p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="font-black text-gray-900 text-lg flex items-center gap-2">
              <CalendarPlus className="w-5 h-5 text-pink-600" /> Nova Publicação
            </h2>
          </div>

          {/* Seletor de conta */}
          <div>
            <label className="text-[11px] font-black uppercase tracking-wider text-gray-500 block mb-1.5">Conta do Instagram</label>
            <select
              value={accountId}
              onChange={e => setAccountId(e.target.value)}
              className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-gray-900 outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 cursor-pointer"
            >
              {accounts.length === 0 && <option value="">Nenhuma conta conectada</option>}
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>{accountLabel(acc)}</option>
              ))}
            </select>
          </div>

          {/* Tipo POST / REELS */}
          <div>
            <label className="text-[11px] font-black uppercase tracking-wider text-gray-500 block mb-1.5">Formato</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setMediaType('POST')}
                className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 font-bold text-sm transition-all cursor-pointer ${
                  mediaType === 'POST'
                    ? 'border-pink-500 bg-pink-50 text-pink-700 shadow-md shadow-pink-500/10'
                    : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                }`}
              >
                <ImageIcon className="w-4 h-4" /> POST
              </button>
              <button
                onClick={() => setMediaType('REELS')}
                className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 font-bold text-sm transition-all cursor-pointer ${
                  mediaType === 'REELS'
                    ? 'border-purple-500 bg-purple-50 text-purple-700 shadow-md shadow-purple-500/10'
                    : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                }`}
              >
                <Video className="w-4 h-4" /> REELS
              </button>
            </div>
          </div>

          {/* Upload de mídia */}
          <div>
            <label className="text-[11px] font-black uppercase tracking-wider text-gray-500 block mb-1.5">
              Mídia {mediaType === 'REELS' ? '(vídeo)' : '(imagem)'}
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept={mediaType === 'REELS' ? 'video/mp4,video/quicktime,video/webm' : 'image/*'}
              className="hidden"
              onChange={e => handleFileChange(e.target.files?.[0] || null)}
            />
            {!filePreview ? (
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                onDragOver={e => e.preventDefault()}
                onDrop={e => {
                  e.preventDefault();
                  handleFileChange(e.dataTransfer.files?.[0] || null);
                }}
                className="w-full h-44 bg-gradient-to-br from-gray-50 to-white border-2 border-dashed border-gray-300 hover:border-pink-400 rounded-2xl flex flex-col items-center justify-center gap-2 text-gray-400 hover:text-pink-500 transition-all cursor-pointer disabled:opacity-50"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-8 h-8 animate-spin text-pink-500" />
                    <span className="text-xs font-bold">Enviando para o armazenamento...</span>
                  </>
                ) : (
                  <>
                    <div className="w-12 h-12 rounded-2xl bg-pink-50 border border-pink-100 flex items-center justify-center">
                      <Upload className="w-5 h-5 text-pink-500" />
                    </div>
                    <span className="text-sm font-bold">Arraste o arquivo ou clique para enviar</span>
                    <span className="text-[10px]">JPG, PNG, MP4 · até 200MB</span>
                  </>
                )}
              </button>
            ) : (
              <div className="relative rounded-2xl overflow-hidden border border-gray-200 bg-black/5">
                {fileType === 'video' ? (
                  <video src={filePreview} className="w-full h-44 object-cover" controls />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={filePreview} alt="Prévia" className="w-full h-44 object-cover" />
                )}
                <button
                  onClick={clearMedia}
                  className="absolute top-2 right-2 w-8 h-8 bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center justify-center transition-colors cursor-pointer"
                  title="Remover mídia"
                >
                  <X className="w-4 h-4" />
                </button>
                {mediaUrl && (
                  <span className="absolute bottom-2 left-2 bg-emerald-600 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow">
                    ✓ Pronto para agendar
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Legenda */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-black uppercase tracking-wider text-gray-500">Legenda</label>
              <span className={`text-[10px] font-bold ${caption.length > 2100 ? 'text-red-500' : 'text-gray-400'}`}>
                {caption.length}/2200
              </span>
            </div>
            <textarea
              value={caption}
              onChange={e => setCaption(e.target.value.slice(0, 2200))}
              rows={4}
              placeholder="Escreva a legenda da publicação... 💬"
              className="w-full bg-white border border-gray-200 rounded-xl p-3 text-sm text-gray-900 outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 resize-none font-medium"
            />
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              {HASHTAG_SUGGESTIONS.map(h => (
                <button
                  key={h}
                  onClick={() => setCaption(c => (c.includes(h) ? c : `${c}${c ? ' ' : ''}${h}`))}
                  className="px-2.5 py-1 rounded-full bg-gray-100 hover:bg-pink-50 hover:text-pink-700 text-[10px] font-bold text-gray-600 border border-gray-200 transition-colors cursor-pointer"
                >
                  {h}
                </button>
              ))}
            </div>
          </div>

          {/* Data/hora */}
          <div>
            <label className="text-[11px] font-black uppercase tracking-wider text-gray-500 block mb-1.5">Data e hora</label>
            <input
              type="datetime-local"
              value={scheduledAt}
              min={toLocalInput(new Date())}
              onChange={e => setScheduledAt(e.target.value)}
              className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-gray-900 outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 cursor-pointer"
            />
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              {[
                { label: 'Agora ⚡', mins: 1 },
                { label: '+1 hora', mins: 60 },
                { label: '+3 horas', mins: 180 },
                { label: 'Hoje 18h', mins: 0 }
              ].map(q => (
                <button
                  key={q.label}
                  onClick={() => {
                    if (q.label === 'Hoje 18h') {
                      const d = new Date(); d.setHours(18, 0, 0, 0);
                      setScheduledAt(toLocalInput(d));
                    } else setQuickSchedule(q.mins);
                  }}
                  className="px-2.5 py-1 rounded-full bg-gray-100 hover:bg-pink-50 hover:text-pink-700 text-[10px] font-bold text-gray-600 border border-gray-200 transition-colors cursor-pointer"
                >
                  {q.label}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={isSubmitting || uploading || accounts.length === 0}
            className="w-full py-3.5 bg-instagram-gradient text-white rounded-2xl font-black text-sm shadow-lg shadow-pink-500/25 hover:scale-[1.01] hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Agendando...
              </>
            ) : (
              <>
                <CalendarClock className="w-4 h-4" /> Agendar Publicação
              </>
            )}
          </button>
        </div>

        {/* ── CALENDÁRIO DE AGENDAMENTOS ── */}
        <div className="xl:col-span-3 bg-white/70 backdrop-blur-md rounded-3xl border border-white shadow-xl p-6">
          <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
            <h2 className="font-black text-gray-900 text-lg flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-blue-600" /> Próximas Publicações
            </h2>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => changeMonth(-1)}
                className="w-8 h-8 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 flex items-center justify-center transition-colors cursor-pointer"
                title="Mês anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-black text-gray-800 min-w-[130px] text-center capitalize">{monthLabel}</span>
              <button
                onClick={() => changeMonth(1)}
                className="w-8 h-8 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 flex items-center justify-center transition-colors cursor-pointer"
                title="Próximo mês"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  const d = new Date();
                  setViewDate(new Date(d.getFullYear(), d.getMonth(), 1));
                  setSelectedDay(toDayKey(d));
                }}
                className="px-2.5 h-8 rounded-lg bg-pink-50 hover:bg-pink-100 text-pink-700 border border-pink-200 text-[10px] font-black transition-colors cursor-pointer"
              >
                HOJE
              </button>
            </div>
          </div>

          {!tableExists ? (
            <div className="text-center py-16 text-gray-400">
              <CalendarClock className="w-10 h-10 mx-auto mb-3 text-gray-300" />
              <p className="font-bold text-gray-600 text-sm">Crie a tabela para começar</p>
              <p className="text-xs mt-1">Copie o SQL no aviso acima e execute no Supabase.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-7 gap-1.5 mb-1.5">
                {WEEKDAYS.map(d => (
                  <div key={d} className="text-center text-[9px] font-black uppercase tracking-wider text-gray-400">{d}</div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1.5">
                {cells.map((day, i) => {
                  if (day === null) return <div key={`empty-${i}`} className="min-h-[76px]" />;
                  const key = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const items = monthPosts.get(key) || [];
                  const isToday = key === todayKey;
                  const isSelected = key === selectedDay;
                  return (
                    <button
                      key={key}
                      onClick={() => setSelectedDay(key)}
                      className={`relative min-h-[76px] rounded-xl border p-1.5 text-left transition-all cursor-pointer flex flex-col items-stretch ${
                        isSelected
                          ? 'border-pink-500 bg-pink-50/70 shadow-md shadow-pink-500/10 ring-2 ring-pink-500/20'
                          : isToday
                            ? 'border-pink-300 bg-white hover:border-pink-400 hover:shadow-sm'
                            : 'border-gray-100 bg-white hover:border-pink-200 hover:shadow-sm'
                      }`}
                    >
                      <span className={`text-[10px] font-black leading-none ${isToday ? 'text-pink-600' : 'text-gray-600'}`}>
                        {day}
                        {items.length > 0 && (
                          <span className="ml-1 text-[8px] font-bold text-pink-500">· {items.length}</span>
                        )}
                      </span>
                      {items.length > 0 && (
                        <div className="grid grid-cols-2 gap-1 mt-1 flex-1">
                          {items.slice(0, 4).map(p => (
                            <div key={p.id} className="relative aspect-square rounded-md overflow-hidden bg-gray-100">
                              {p.media_url && !isVideoUrl(p.media_url) ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={p.media_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                                  <Video className="w-3 h-3 text-white/80" />
                                </div>
                              )}
                              <span className={`absolute bottom-0.5 right-0.5 w-1.5 h-1.5 rounded-full border border-white ${STATUS_META[p.status].dot}`} />
                            </div>
                          ))}
                        </div>
                      )}
                      {items.length > 4 && (
                        <span className="text-[8px] font-bold text-gray-400 mt-0.5">+{items.length - 4} mais</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {monthPosts.size === 0 && (
                <p className="text-center text-[11px] font-bold text-gray-400 mt-4">
                  Nenhuma publicação em {monthLabel} — use o formulário ao lado para agendar.
                </p>
              )}

              {/* Detalhes do dia selecionado */}
              <div className="mt-5 border-t border-gray-100 pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[11px] font-black uppercase tracking-wider text-pink-600 capitalize">{selectedDayLabel}</span>
                  <div className="flex-1 h-px bg-gray-100" />
                  <span className="text-[10px] font-bold text-gray-400">
                    {selectedPosts.length} publicação{selectedPosts.length !== 1 ? 'ões' : ''}
                  </span>
                </div>
                {selectedPosts.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <Clock className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    <p className="font-bold text-gray-600 text-xs">Nenhuma publicação neste dia</p>
                    <p className="text-[11px] mt-0.5">Clique em outro dia do calendário ou agende uma nova publicação.</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
                    {selectedPosts.map(renderPostRow)}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Nota sobre permissões da Meta */}
      <div className="bg-white/50 backdrop-blur-md rounded-2xl border border-white p-4 flex items-start gap-3 shadow-sm">
        <Zap className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
        <p className="text-[11px] text-gray-500 leading-relaxed">
          A publicação usa a <b>Content Publishing API</b> da Meta. Confirme que sua app Meta tem a permissão{' '}
          <b>instagram_content_publish</b> (Modo Desenvolvimento funciona para contas de teste; produção exige análise da Meta).
          O cron do Inngest publica automaticamente a cada minuto — se ele não estiver configurado, use o botão
          <b> Publicar agora</b> em cada post.
        </p>
      </div>
    </div>
  );
}
