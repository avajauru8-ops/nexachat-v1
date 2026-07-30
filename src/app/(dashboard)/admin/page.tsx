import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { parseRole } from '@/utils/rbac';
import AdminDashboardClient from './AdminDashboardClient';

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  const userRole = parseRole(user.user_metadata?.role, user.email);

  // SE NÃO FOR ADMINISTRADOR (ex: eberfsj@gmail.com ou qualquer usuário comum), BLOQUEIA E REDIRECIONA IMEDIATAMENTE
  if (userRole !== 'admin') {
    redirect('/?error=Acesso_negado_apenas_administradores');
  }

  return (
    <AdminDashboardClient
      currentUser={{
        id: user.id,
        email: user.email || '',
        name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Admin',
        role: userRole
      }}
    />
  );
}
