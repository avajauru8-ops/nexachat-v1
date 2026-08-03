'use client';

import { Bell, Search, CheckCheck, Info, AlertTriangle, CheckCircle2, ShieldAlert, X, Menu } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useSidebar } from '@/contexts/SidebarContext';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  target_user: string;
  type: 'info' | 'warning' | 'success' | 'alert';
  created_at: string;
}

export function Topbar() {
  const { toggle } = useSidebar();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [isOpen, setIsOpen] = useState(false);
  const [selectedNotif, setSelectedNotif] = useState<NotificationItem | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Carregar lista de notificações e IDs lidos do localStorage e da API
  const fetchNotifications = async () => {
    try {
      // 1. Carregar local storage primeiro
      let localReads: string[] = [];
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('nexachat_read_notifs');
        if (stored) {
          try { localReads = JSON.parse(stored); } catch {}
        }
      }

      const res = await fetch('/api/admin/notifications');
      const data = await res.json();
      
      if (data.notifications) {
        setNotifications(data.notifications);
      }

      const combinedReads = new Set([...localReads, ...(data.readIds || [])]);
      setReadIds(combinedReads);
    } catch {
      /* ignore error */
    }
  };

  useEffect(() => {
    fetchNotifications();

    // Polling a cada 8 segundos para novos alertas
    const interval = setInterval(fetchNotifications, 8000);
    return () => clearInterval(interval);
  }, []);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Notificações não lidas
  const unreadNotifications = notifications.filter(n => !readIds.has(n.id));
  const unreadCount = unreadNotifications.length;

  // Marcar uma notificação como lida
  const markAsRead = async (id: string) => {
    const nextReads = new Set(readIds);
    nextReads.add(id);
    setReadIds(nextReads);

    if (typeof window !== 'undefined') {
      localStorage.setItem('nexachat_read_notifs', JSON.stringify(Array.from(nextReads)));
    }

    try {
      await fetch('/api/admin/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId: id })
      });
    } catch {}
  };

  // Marcar todas como lidas
  const markAllAsRead = async () => {
    const allIds = new Set([...readIds, ...notifications.map(n => n.id)]);
    setReadIds(allIds);

    if (typeof window !== 'undefined') {
      localStorage.setItem('nexachat_read_notifs', JSON.stringify(Array.from(allIds)));
    }

    try {
      await fetch('/api/admin/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAll: true })
      });
    } catch {}
  };

  const getNotifIcon = (type: string) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case 'alert':
        return <ShieldAlert className="w-4 h-4 text-red-500" />;
      default:
        return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:px-6 sticky top-0 z-40 w-full">
      <div className="flex items-center gap-3 w-full md:w-auto">
        <button 
          onClick={toggle}
          className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-lg md:hidden"
        >
          <Menu className="w-6 h-6" />
        </button>
        <div className="flex items-center text-gray-500 bg-gray-100 rounded-lg px-3 py-2 w-full md:w-96">
          <Search className="w-5 h-5 mr-2 shrink-0" />
          <input 
            type="text" 
            placeholder="Buscar leads, fluxos..." 
            className="bg-transparent border-none outline-none text-sm w-full placeholder-gray-500 text-gray-800"
          />
        </div>
      </div>
      
      <div className="flex items-center gap-4 relative shrink-0" ref={dropdownRef}>
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors focus:outline-none"
          title="Notificações do Sistema"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 min-w-[1.25rem] h-5 bg-red-500 text-white text-[10px] font-extrabold rounded-full flex items-center justify-center px-1 animate-pulse border-2 border-white shadow-sm">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>

        {/* DROPDOWN MENU DE NOTIFICAÇÕES */}
        {isOpen && (
          <div className="absolute right-0 top-12 w-80 md:w-96 bg-white rounded-2xl border border-gray-200 shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-gray-900 text-sm">Notificações</h3>
                {unreadCount > 0 ? (
                  <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-extrabold rounded-full">
                    {unreadCount} não lida{unreadCount > 1 ? 's' : ''}
                  </span>
                ) : (
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-full">
                    Tudo lido!
                  </span>
                )}
              </div>

              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 hover:underline transition-colors"
                >
                  <CheckCheck className="w-3.5 h-3.5" /> Limpar todas
                </button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto divide-y divide-gray-100">
              {notifications.length > 0 ? (
                notifications.map((notif) => {
                  const isRead = readIds.has(notif.id);

                  return (
                    <div
                      key={notif.id}
                      onClick={() => {
                        markAsRead(notif.id);
                        setSelectedNotif(notif);
                      }}
                      className={`p-4 transition-colors cursor-pointer flex items-start gap-3 relative ${
                        isRead ? 'bg-white hover:bg-gray-50/80 opacity-75' : 'bg-blue-50/40 hover:bg-blue-50/70 font-semibold'
                      }`}
                    >
                      {!isRead && (
                        <span className="w-2 h-2 rounded-full bg-blue-600 absolute left-2 top-5"></span>
                      )}

                      <div className="p-2 rounded-xl bg-gray-100 shrink-0 mt-0.5">
                        {getNotifIcon(notif.type)}
                      </div>

                      <div className="flex-1 space-y-0.5">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-gray-900 line-clamp-1">{notif.title}</h4>
                          <span className="text-[10px] text-gray-400 font-normal">
                            {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 line-clamp-2 font-normal leading-relaxed">{notif.message}</p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center text-gray-500 text-xs">
                  Nenhuma notificação registrada.
                </div>
              )}
            </div>

            <div className="p-3 bg-gray-50 border-t border-gray-100 text-center">
              <p className="text-[11px] text-gray-400">NexaChat Sistema de Comunicados</p>
            </div>
          </div>
        )}

        {/* MODAL DETALHE DA NOTIFICAÇÃO SELECIONADA */}
        {selectedNotif && (
          <div className="fixed inset-0 z-50 bg-gray-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white border border-gray-200 rounded-2xl shadow-2xl max-w-md w-full p-6 relative animate-in zoom-in-95 duration-150">
              <button
                onClick={() => setSelectedNotif(null)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-3">
                <div className="p-2.5 rounded-2xl bg-blue-50 border border-blue-100 text-blue-600">
                  {getNotifIcon(selectedNotif.type)}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-base">{selectedNotif.title}</h3>
                  <p className="text-[11px] text-gray-400">
                    {new Date(selectedNotif.created_at).toLocaleString('pt-BR')}
                  </p>
                </div>
              </div>

              <div className="my-4 p-4 rounded-xl bg-gray-50 border border-gray-100 text-xs text-gray-700 leading-relaxed whitespace-pre-line">
                {selectedNotif.message}
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => setSelectedNotif(null)}
                  className="px-4 py-2 bg-gray-900 hover:bg-black text-white text-xs font-bold rounded-xl transition-all shadow-xs"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
