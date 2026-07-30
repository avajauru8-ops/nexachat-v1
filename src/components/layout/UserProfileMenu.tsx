'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { User, Settings, ShieldAlert, LogOut, ChevronDown } from 'lucide-react';
import { logout } from '@/app/auth/actions';

interface Props {
  userDisplayName: string;
  userEmail: string;
  avatarUrl: string | null;
  userInitials: string;
  badgeLabel: string;
  isAdmin: boolean;
  workspaceName: string;
}

export function UserProfileMenu({
  userDisplayName,
  userEmail,
  avatarUrl,
  userInitials,
  badgeLabel,
  isAdmin,
  workspaceName,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative px-3 pb-4" ref={menuRef}>
      {/* Botão Seletor de Perfil na Sidebar */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-2 hover:bg-gray-200/60 rounded-xl cursor-pointer transition-all group focus:outline-none"
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt={userDisplayName}
                className="w-9 h-9 rounded-full object-cover shadow-xs border border-gray-300"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-600 to-purple-800 text-white flex items-center justify-center font-extrabold text-xs shadow-xs">
                {userInitials}
              </div>
            )}
            <div className={`absolute -bottom-1.5 -right-1.5 text-[8px] font-black text-white px-1.5 py-0.2 rounded shadow-xs border border-white ${
              isAdmin ? 'bg-purple-900' : 'bg-gray-800'
            }`}>
              {badgeLabel}
            </div>
          </div>

          <div className="flex flex-col text-left">
            <span className="text-sm font-bold text-gray-900 truncate max-w-[100px] leading-tight">{workspaceName}</span>
            <span className="text-[10px] font-medium text-gray-500 truncate max-w-[110px]">{userDisplayName}</span>
          </div>
        </div>

        <ChevronDown className={`w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-transform duration-200 ${isOpen ? 'rotate-180 text-indigo-600' : ''}`} />
      </button>

      {/* DROPDOWN MENU DE PERFIL & CONFIGURAÇÕES */}
      {isOpen && (
        <div className="absolute left-3 right-3 top-14 bg-white rounded-2xl border border-gray-200 shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150 p-1.5 space-y-1">
          {/* Cabeçalho do Usuário */}
          <div className="p-2.5 bg-gray-50/80 rounded-xl border border-gray-100 mb-1">
            <p className="text-xs font-bold text-gray-900 truncate">{userDisplayName}</p>
            <p className="text-[10px] font-mono text-gray-500 truncate">{userEmail}</p>
            <div className="mt-1.5 flex items-center gap-1.5">
              {isAdmin ? (
                <span className="px-2 py-0.5 bg-purple-100 text-purple-800 text-[9px] font-extrabold rounded-full border border-purple-200">
                  👑 Administrador
                </span>
              ) : (
                <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-[9px] font-extrabold rounded-full border border-blue-200">
                  🎧 Usuário Padrão
                </span>
              )}
            </div>
          </div>

          {/* Links do Menu */}
          <Link
            href="/settings?tab=profile"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100/80 rounded-xl transition-colors"
          >
            <User className="w-4 h-4 text-indigo-600" /> Meu Perfil
          </Link>

          <Link
            href="/settings"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100/80 rounded-xl transition-colors"
          >
            <Settings className="w-4 h-4 text-gray-600" /> Configurações do Sistema
          </Link>

          {isAdmin && !pathname?.startsWith('/admin') && (
            <Link
              href="/admin"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-purple-700 bg-purple-50/50 hover:bg-purple-100/80 rounded-xl transition-colors"
            >
              <ShieldAlert className="w-4 h-4 text-purple-600" /> 👑 Painel Admin
            </Link>
          )}

          <div className="border-t border-gray-100 my-1"></div>

          {/* Botão de Logout */}
          <form action={logout} onClick={() => setIsOpen(false)}>
            <button
              type="submit"
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-xl transition-colors text-left"
            >
              <LogOut className="w-4 h-4" /> Sair da Conta
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
