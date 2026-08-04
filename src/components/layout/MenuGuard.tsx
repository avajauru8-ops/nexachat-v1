'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Wrench, ShieldOff, ArrowLeft } from 'lucide-react';
import { DEFAULT_DASHBOARD_MENUS, fetchDashboardMenus, subscribeDashboardMenus, matchesMenuHref, type DashboardMenu } from '@/utils/dashboardMenus';

export function MenuGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
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

  if (pathname.startsWith('/admin') || pathname.startsWith('/auth')) {
    return <>{children}</>;
  }

  const current = menus.find((menu) => matchesMenuHref(menu, pathname));

  if (current && !current.enabled) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="bg-white rounded-3xl border border-red-200 shadow-sm p-10 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ShieldOff className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-black text-gray-900">Página Indisponível</h2>
          <p className="text-sm text-gray-500 mt-2 leading-relaxed">
            O menu <span className="font-bold text-gray-900">{current.label}</span> foi desativado pelo administrador do sistema. Fale com o suporte se precisar de acesso.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Voltar ao Início
          </Link>
        </div>
      </div>
    );
  }

  if (current && current.maintenance) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="bg-white rounded-3xl border border-amber-200 shadow-sm p-10 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Wrench className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-black text-gray-900">Em Manutenção</h2>
          <p className="text-sm text-gray-500 mt-2 leading-relaxed">
            O menu <span className="font-bold text-gray-900">{current.label}</span> está temporariamente em manutenção. Voltaremos em breve!
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Voltar ao Início
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
