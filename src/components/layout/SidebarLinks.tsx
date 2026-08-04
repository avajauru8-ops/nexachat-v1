'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Home, MessageSquare, Webhook, Workflow, Settings, Users, Megaphone, Bot, ShieldAlert, ShieldCheck, Sparkles, CreditCard, Bell, ArrowLeft, CalendarClock, Menu, Wrench } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { parseRole } from '@/utils/rbac';
import { DEFAULT_DASHBOARD_MENUS, fetchDashboardMenus, getMenuByHref, subscribeDashboardMenus, type DashboardMenu } from '@/utils/dashboardMenus';

const getMenuItems = (unreadCount: number) => [
  { name: 'Inicial', icon: Home, href: '/' },
  { name: 'Contatos', icon: Users, href: '/audience' },
  { name: 'Automação', icon: Workflow, href: '/flows' },
  { name: 'Nexa AI', icon: Bot, href: '/templates' },
  { name: 'Caixa de Entrada', icon: MessageSquare, href: '/inbox', badge: unreadCount > 0 ? unreadCount : undefined },
  { name: 'Agendamento', icon: CalendarClock, href: '/scheduler' },
];

export function SidebarLinks({ workspaceId, initialUnreadCount }: { workspaceId?: string, initialUnreadCount?: number }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [unreadCount, setUnreadCount] = useState(initialUnreadCount || 0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [menus, setMenus] = useState<DashboardMenu[]>(DEFAULT_DASHBOARD_MENUS);

  useEffect(() => {
    fetchDashboardMenus().then(setMenus);
    const unsubscribe = subscribeDashboardMenus(setMenus);
    const onMenusChanged = () => { fetchDashboardMenus().then(setMenus); };
    window.addEventListener('nexachat:menus-changed', onMenusChanged);
    return () => {
      unsubscribe();
      window.removeEventListener('nexachat:menus-changed', onMenusChanged);
    };
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        const userRole = parseRole(data.user.user_metadata?.role, data.user.email);
        setIsAdmin(userRole === 'admin');
      }
    });
  }, [supabase]);

  useEffect(() => {
    if (!workspaceId) return;
    
    const channel = supabase.channel(`sidebar_${workspaceId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'conversations' },
        () => {
          supabase
            .from('conversations')
            .select('id', { count: 'exact', head: true })
            .eq('workspace_id', workspaceId)
            .gt('unread_count', 0)
            .then(({ count }) => {
               if (count !== null) setUnreadCount(count);
            });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [workspaceId, supabase]);

  const isAdminPage = pathname.startsWith('/admin');

  // MODO EXCLUSIVO PAINEL ADMINISTRADOR
  if (isAdminPage) {
    const currentTab = searchParams.get('tab') || 'users';

    const adminMenuItems = [
      { name: '👥 Usuários & RBAC', icon: Users, tab: 'users' },
      { name: '🛡️ API Oficial Meta', icon: ShieldCheck, tab: 'meta' },
      { name: '🤖 Conexão IA (Gemini)', icon: Sparkles, tab: 'ai' },
      { name: '💳 Planos & Assinaturas', icon: CreditCard, tab: 'plans' },
      { name: '📢 Envio de Notificações', icon: Bell, tab: 'notifications' },
      { name: '🧭 Menus & Manutenção', icon: Menu, tab: 'menus' },
    ];

    return (
      <div className="flex flex-col h-full justify-between">
        <div className="space-y-1.5">
          <div className="px-3 py-2 text-[10px] font-extrabold uppercase tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-xl mb-3 flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-indigo-600" /> PAINEL DO ADMINISTRADOR
          </div>

          {adminMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.tab;
            return (
              <Link
                key={item.name}
                href={`/admin?tab=${item.tab}`}
                className={`flex items-center px-3 py-2.5 rounded-xl transition-all group text-xs ${
                  isActive
                    ? 'bg-indigo-600 text-white font-bold shadow-xs'
                    : 'text-gray-700 hover:bg-indigo-50 hover:text-indigo-900 font-semibold'
                }`}
              >
                <Icon className={`w-4 h-4 mr-2.5 ${isActive ? 'text-white' : 'text-indigo-600'} transition-colors`} />
                {item.name}
              </Link>
            );
          })}
        </div>

        <div className="mb-4 pt-4 border-t border-gray-200">
          <Link
            href="/"
            className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-gray-300 hover:bg-gray-100 text-gray-700 font-bold text-xs transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-gray-500" /> Voltar ao App Principal
          </Link>
        </div>
      </div>
    );
  }

  // MODO PADRÃO DA APLICAÇÃO
  const menuItems = getMenuItems(unreadCount)
    .map((item) => {
      const setting = getMenuByHref(menus, item.href);
      return { ...item, maintenance: setting?.maintenance === true };
    })
    .filter((item) => {
      const setting = getMenuByHref(menus, item.href);
      return !setting || setting.enabled;
    });

  const secondaryItems = [
    ...(isAdmin ? [{ name: '👑 Painel Admin', icon: ShieldAlert, href: '/admin' }] : []),
    { name: 'Configurações', icon: Settings, href: '/settings' },
    { name: 'Integrações', icon: Webhook, href: '/integrations' },
    { name: 'Broadcasts', icon: Megaphone, href: '/broadcasts' },
  ]
    .map((item) => {
      const setting = getMenuByHref(menus, item.href);
      return { ...item, maintenance: setting?.maintenance === true };
    })
    .filter((item) => {
      if (item.href === '/admin') return true;
      const setting = getMenuByHref(menus, item.href);
      return !setting || setting.enabled;
    });

  return (
    <div className="flex flex-col h-full justify-between">
      <ul className="space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          
          return (
            <li key={item.name}>
              <Link
                href={item.href}
                className={`flex items-center justify-between px-2 py-2 rounded-2xl transition-all group font-medium text-sm ${
                  isActive 
                    ? 'bg-white shadow-sm border border-gray-100 text-gray-900 font-bold scale-[1.02]' 
                    : 'text-gray-600 hover:bg-white hover:shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-transparent'
                }`}
              >
                <div className="flex items-center">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-xl mr-3 transition-all ${
                    isActive 
                      ? 'bg-instagram-gradient text-white shadow-md shadow-pink-500/20' 
                      : 'bg-transparent text-gray-500 group-hover:text-gray-900 group-hover:bg-gray-50'
                  }`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  {item.name}
                </div>
                
                {item.badge && (
                  <span className="bg-instagram-gradient text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                    {item.badge}
                  </span>
                )}

                {item.maintenance && !item.badge && (
                  <span className="bg-amber-100 text-amber-700 border border-amber-200 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Wrench className="w-2.5 h-2.5" /> Manutenção
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="mb-4 space-y-1 pt-4 border-t border-gray-100">
        {secondaryItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          const isAdminLink = item.href === '/admin';
          
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center px-3 py-2.5 rounded-lg transition-colors group font-medium text-sm ${
                isActive 
                  ? 'bg-indigo-600 text-white font-bold' 
                  : isAdminLink
                    ? 'text-indigo-700 bg-indigo-50 hover:bg-indigo-100 font-bold'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <Icon className={`w-5 h-5 mr-3 ${isActive ? 'text-white' : isAdminLink ? 'text-indigo-600' : 'text-gray-500 group-hover:text-gray-900'} transition-colors`} />
              {item.name}
              {item.maintenance && (
                <span className="ml-auto bg-amber-100 text-amber-700 border border-amber-200 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Wrench className="w-2.5 h-2.5" /> Manutenção
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
