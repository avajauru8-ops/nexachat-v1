import Link from 'next/link';
import { LayoutDashboard, Users, CreditCard, Settings, LogOut } from 'lucide-react';
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
    { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    { name: 'Usuários', href: '/admin/users', icon: Users },
    { name: 'Assinaturas', href: '/admin/subscriptions', icon: CreditCard },
  ];

  return (
    <aside className="w-64 h-full bg-slate-900 text-slate-300 p-4 flex flex-col gap-2 shrink-0">
      <div className="h-12 flex items-center px-3 mb-2 gap-3">
        <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-lg">A</span>
        </div>
        <span className="font-black text-xl text-white tracking-tight">AdminPanel</span>
      </div>

      <div className="flex-1 overflow-y-auto mt-4">
        <ul className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className="flex items-center gap-3 px-3 py-2 hover:bg-slate-800 hover:text-white rounded-lg font-medium text-sm transition-colors group"
                >
                  <Icon className="w-5 h-5 text-slate-500 group-hover:text-purple-400 transition-colors" />
                  {item.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="pt-4 border-t border-slate-800 mt-auto">
        <Link
          href="/"
          className="flex items-center gap-3 px-3 py-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg font-medium text-sm transition-colors mb-2 group"
        >
          Voltar ao App
        </Link>
        
        <form action="/auth/logout" method="post">
          <button className="w-full flex items-center gap-3 px-3 py-2 text-red-400 hover:bg-slate-800 hover:text-red-300 rounded-lg font-medium text-sm transition-colors group">
            <LogOut className="w-5 h-5 group-hover:text-red-400 transition-colors" />
            Sair da Conta
          </button>
        </form>
      </div>
    </aside>
  );
}
