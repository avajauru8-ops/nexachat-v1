'use client';

import { useState, use } from 'react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import { parseRole } from '@/utils/rbac';
import { Loader2, Eye, EyeOff } from 'lucide-react';

interface Props {
  searchParams: Promise<{ error?: string }>;
}

export default function LoginPage({ searchParams }: Props) {
  const resolvedParams = use(searchParams);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState(resolvedParams?.error || '');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        let msg = 'Credenciais inválidas.';
        if (error.message.includes('Email not confirmed')) {
          msg = 'E-mail não confirmado. Verifique sua caixa de entrada.';
        } else if (error.message.includes('Invalid login credentials')) {
          msg = 'E-mail ou senha incorretos.';
        }
        setErrorMessage(msg);
        setIsLoading(false);
        return;
      }

      if (data?.user) {
        const role = parseRole(data.user.user_metadata?.role, data.user.email);
        window.location.href = role === 'admin' ? '/admin' : '/';
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao realizar login.';
      setErrorMessage(msg);
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 max-w-md w-full mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Entrar no NexaChat</h2>
      
      {errorMessage && (
        <div className="bg-red-50 border border-red-200 text-red-600 p-3.5 rounded-xl text-xs font-semibold mb-6 text-center">
          {errorMessage}
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-4" autoComplete="on">
        <div>
          <label htmlFor="login-email" className="block text-xs font-bold text-gray-700 mb-1">E-mail</label>
          <input 
            id="login-email"
            name="email"
            type="email" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required 
            autoComplete="email"
            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-xs font-medium text-gray-800"
            placeholder="seu@email.com"
          />
        </div>
        
        <div>
          <label htmlFor="login-password" className="block text-xs font-bold text-gray-700 mb-1">Senha</label>
          <div className="relative">
            <input 
              id="login-password"
              name="password"
              type={showPassword ? "text" : "password"} 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required 
              autoComplete="current-password"
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-xs font-medium text-gray-800 pr-10"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
              title={showPassword ? "Ocultar senha" : "Mostrar senha"}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <button 
          type="submit" 
          disabled={isLoading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-colors mt-2 text-xs flex items-center justify-center gap-2 shadow-xs disabled:opacity-50 cursor-pointer"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {isLoading ? 'Entrando...' : 'Entrar'}
        </button>
      </form>

      <p className="text-center text-xs text-gray-500 mt-6">
        Não tem uma conta?{' '}
        <Link href="/auth/register" className="text-blue-600 font-bold hover:underline">
          Cadastre-se
        </Link>
      </p>
    </div>
  );
}
