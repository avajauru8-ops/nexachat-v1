'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { ShieldAlert, AlertTriangle, CheckCircle, X, Lock } from 'lucide-react';

export function GlobalAlertModal() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [alert, setAlert] = useState<{ title: string; message: string; type: 'error' | 'warning' | 'success' } | null>(null);

  useEffect(() => {
    const error = searchParams.get('error');
    const success = searchParams.get('success');

    if (error) {
      let formattedTitle = 'Atenção!';
      let formattedMessage = error.replace(/_/g, ' ');

      if (error.includes('Acesso_negado') || error.includes('administradores')) {
        formattedTitle = '👑 Acesso Restrito a Administradores';
        formattedMessage = 'Sua conta possui o nível de permissão "Usuário". Você não tem autorização para acessar a área administrativa /admin.';
      }

      setAlert({
        title: formattedTitle,
        message: formattedMessage,
        type: 'error'
      });
    } else if (success) {
      setAlert({
        title: 'Operação Concluída com Sucesso',
        message: success.replace(/_/g, ' '),
        type: 'success'
      });
    }
  }, [searchParams]);

  const handleClose = () => {
    setAlert(null);
    // Limpar o parâmetro da URL sem dar reload na página
    router.replace(pathname);
  };

  if (!alert) return null;

  return (
    <div className="fixed inset-0 z-50 bg-gray-900/60 backdrop-blur-xs flex items-start justify-center pt-20 p-4 animate-in fade-in duration-200">
      <div className="bg-white border border-red-200 rounded-2xl shadow-2xl max-w-md w-full p-6 relative animate-in slide-in-from-top-4 duration-200">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-start gap-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-white shrink-0 shadow-md ${
            alert.type === 'error' ? 'bg-gradient-to-tr from-red-500 to-rose-600' : 'bg-gradient-to-tr from-emerald-500 to-teal-600'
          }`}>
            {alert.type === 'error' ? <Lock className="w-6 h-6" /> : <CheckCircle className="w-6 h-6" />}
          </div>

          <div className="flex-1 space-y-1">
            <h3 className="font-bold text-gray-900 text-base">{alert.title}</h3>
            <p className="text-xs text-gray-600 leading-relaxed">{alert.message}</p>
          </div>
        </div>

        <div className="mt-5 pt-4 border-t border-gray-100 flex justify-end">
          <button
            onClick={handleClose}
            className="px-5 py-2.5 bg-gray-900 hover:bg-black text-white text-xs font-bold rounded-xl transition-all shadow-xs"
          >
            Entendi
          </button>
        </div>
      </div>
    </div>
  );
}
