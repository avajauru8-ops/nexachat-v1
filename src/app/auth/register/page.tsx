'use client';

import { useState, use } from 'react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import { parseRole } from '@/utils/rbac';
import { Loader2 } from 'lucide-react';

interface Props {
  searchParams: Promise<{ error?: string }>;
}

export default function RegisterPage({ searchParams }: Props) {
  const resolvedParams = use(searchParams);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [errorMessage, setErrorMessage] = useState(resolvedParams?.error || '');
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    try {
      const supabase = createClient();
      const emailInput = email.toLowerCase().trim();
      const userRole = 'Atendente (Usuário)';

      const { data, error } = await supabase.auth.signUp({
        email: emailInput,
        password,
        options: {
          data: {
            full_name: name.trim() || emailInput.split('@')[0],
            role: userRole
          }
        }
      });

      if (error) {
        setErrorMessage(error.message);
        setIsLoading(false);
        return;
      }

      if (data.user && data.user.identities && data.user.identities.length === 0) {
        setErrorMessage('Este e-mail já está cadastrado.');
        setIsLoading(false);
        return;
      }

      if (!data.session) {
        setErrorMessage('Conta criada! Verifique sua caixa de entrada para confirmar o e-mail antes de fazer login.');
        setIsLoading(false);
        return;
      }

      if (data?.user) {
        const role = parseRole(data.user.user_metadata?.role, data.user.email);
        window.location.href = role === 'admin' ? '/admin' : '/';
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao realizar cadastro.';
      setErrorMessage(msg);
      setIsLoading(false);
    }
  };

  return (
    <div className="glass-panel p-8 rounded-3xl shadow-xl border border-white/60 max-w-md w-full mx-auto backdrop-blur-md bg-white/40">
      <h2 className="text-3xl font-black text-gray-900 tracking-tight mb-6 text-center">Criar Conta no NexaChat</h2>
      
      {errorMessage && (
        <div className="bg-red-50 border border-red-200 text-red-600 p-3.5 rounded-xl text-xs font-semibold mb-6 text-center">
          {errorMessage}
        </div>
      )}

      <form onSubmit={handleRegister} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">Nome Completo</label>
          <input 
            type="text" 
            value={name}
            onChange={(e) => setName(e.target.value)}
            required 
            className="w-full px-4 py-3 bg-white/60 border border-white rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-300 transition-all text-xs font-medium text-gray-800 shadow-sm backdrop-blur-sm"
            placeholder="Seu Nome"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">E-mail</label>
          <input 
            type="email" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required 
            className="w-full px-4 py-3 bg-white/60 border border-white rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-300 transition-all text-xs font-medium text-gray-800 shadow-sm backdrop-blur-sm"
            placeholder="seu@email.com"
          />
        </div>
        
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">Senha</label>
          <input 
            type="password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required 
            className="w-full px-4 py-3 bg-white/60 border border-white rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-300 transition-all text-xs font-medium text-gray-800 shadow-sm backdrop-blur-sm"
            placeholder="••••••••"
          />
        </div>

        <button 
          type="submit" 
          disabled={isLoading}
          className="w-full bg-instagram-gradient hover:opacity-90 text-white font-bold py-3.5 rounded-xl transition-all mt-4 text-xs flex items-center justify-center gap-2 shadow-lg shadow-pink-500/20 disabled:opacity-50 cursor-pointer hover:scale-[1.02]"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {isLoading ? 'Cadastrando...' : 'Cadastrar'}
        </button>
      </form>

      <p className="text-center text-xs text-gray-500 mt-6">
        Já possui uma conta?{' '}
        <Link href="/auth/login" className="text-pink-600 font-bold hover:underline">
          Faça Login
        </Link>
      </p>
    </div>
  );
}
