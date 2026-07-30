'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { parseRole } from '@/utils/rbac'

export async function loginAction(emailInput: string, passwordInput: string) {
  try {
    const supabase = await createClient()
    const authClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: authData, error } = await authClient.auth.signInWithPassword({
      email: emailInput.trim(),
      password: passwordInput
    });

    if (error) {
      let message = 'Credenciais inválidas';
      if (error.message.includes('Email not confirmed')) {
        message = 'E-mail não confirmado. Verifique sua caixa de entrada.';
      } else if (error.message.includes('Invalid login credentials')) {
        message = 'E-mail ou senha incorretos.';
      }
      return { success: false, error: message };
    }

    if (authData?.session) {
      await supabase.auth.setSession({
        access_token: authData.session.access_token,
        refresh_token: authData.session.refresh_token,
      });
    }

    const role = parseRole(authData.user?.user_metadata?.role, authData.user?.email);
    const redirectUrl = role === 'admin' ? '/admin' : '/';
    return { success: true, redirectUrl };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro ao realizar login.';
    return { success: false, error: msg };
  }
}

export async function signupAction(nameInput: string, emailInput: string, passwordInput: string) {
  try {
    const supabase = await createClient();
    const authClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const emailFormatted = emailInput.toLowerCase().trim();
    const nameFormatted = nameInput.trim() || emailFormatted.split('@')[0];
    const userRole = emailFormatted === 'admin@nexachat.com' ? 'Administrador' : 'Atendente (Usuário)';

    const { data: authData, error } = await authClient.auth.signUp({
      email: emailFormatted,
      password: passwordInput,
      options: {
        data: {
          full_name: nameFormatted,
          role: userRole
        }
      }
    });

    if (error) {
      return { success: false, error: error.message };
    }

    if (authData.user && authData.user.identities && authData.user.identities.length === 0) {
      return { success: false, error: 'Este e-mail já está cadastrado.' };
    }

    if (!authData.session) {
      return { success: false, error: 'Conta criada! Verifique sua caixa de entrada para confirmar o e-mail.' };
    }

    await supabase.auth.setSession({
      access_token: authData.session.access_token,
      refresh_token: authData.session.refresh_token,
    });

    const role = parseRole(authData.user?.user_metadata?.role, authData.user?.email);
    const redirectUrl = role === 'admin' ? '/admin' : '/';
    return { success: true, redirectUrl };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro ao realizar cadastro.';
    return { success: false, error: msg };
  }
}

export async function logout() {
  try {
    const supabase = await createClient()
    await supabase.auth.signOut()
  } catch {
    /* ignore error */
  }
  redirect('/auth/login')
}
