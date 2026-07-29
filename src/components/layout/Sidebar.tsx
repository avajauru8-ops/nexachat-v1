import Link from 'next/link';
import { Home, MessageSquare, Webhook, Workflow, LayoutTemplate, Settings, LogOut } from 'lucide-react';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

export async function Sidebar() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();

  const menuItems = [
    { name: 'Visão Geral', href: '/', icon: Home },
    { name: 'Caixa de Entrada', href: '/inbox', icon: MessageSquare },
    { name: 'Fluxos de Automação', href: '/flows', icon: Workflow },
    { name: 'Templates', href: '/templates', icon: LayoutTemplate },
    { name: 'Integrações', href: '/integrations', icon: Webhook },
    { name: 'Configurações', href: '/settings', icon: Settings },
  ];

  return (
    <aside className="w-64 h-full bg-white border-r border-slate-200 p-4 flex flex-col gap-2 shrink-0">
      <div className="h-12 flex items-center px-3 mb-2 gap-3">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-lg">N</span>
        </div>
        <span className="font-black text-xl text-slate-800 tracking-tight">NexaChat</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        <ul className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className="flex items-center gap-3 px-3 py-2 text-slate-600 hover:bg-slate-50 rounded-lg font-medium text-sm transition-colors group"
                >
                  <Icon className="w-5 h-5 text-slate-400 group-hover:text-slate-600 transition-colors" />
                  {item.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="pt-4 border-t border-slate-200 mt-auto">
        <div className="flex items-center gap-3 px-3 py-2 mb-2">
          <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold border border-slate-200 shadow-sm">
            {profile?.full_name?.charAt(0) || user.email?.charAt(0) || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-700 truncate">{profile?.full_name || 'Usuário'}</p>
            <p className="text-xs text-slate-500 truncate">{user.email}</p>
          </div>
        </div>
        
        {profile?.role === 'admin' && (
          <Link
            href="/admin"
            className="flex items-center gap-3 px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-lg font-semibold text-sm transition-colors mb-1"
          >
            Administração
          </Link>
        )}
        
        <form action="/auth/logout" method="post">
          <button className="w-full flex items-center gap-3 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg font-medium text-sm transition-colors group">
            <LogOut className="w-5 h-5 text-red-400 group-hover:text-red-600 transition-colors" />
            Sair da Conta
          </button>
        </form>
      </div>
    </aside>
  );
}
