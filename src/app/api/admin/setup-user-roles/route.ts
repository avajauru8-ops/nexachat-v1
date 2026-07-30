import { NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Listar todos os usuários cadastrados no Supabase Auth
    const { data: { users }, error: listErr } = await serviceSupabase.auth.admin.listUsers();

    if (listErr) {
      console.error('Erro ao listar usuários:', listErr);
      return NextResponse.json({ error: listErr.message }, { status: 500 });
    }

    const updatedUsers: Array<{ email: string; role: string; status: string }> = [];

    for (const user of users) {
      if (!user.email) continue;
      const userEmail = user.email.toLowerCase().trim();

      let targetRole = 'Atendente (Usuário)';

      if (userEmail === 'admin@nexachat.com') {
        targetRole = 'Administrador';
      } else if (userEmail === 'eberfsj@gmail.com') {
        targetRole = 'Atendente (Usuário)';
      } else {
        targetRole = user.user_metadata?.role || 'Atendente (Usuário)';
      }

      // Atualizar o papel (role) diretamente nos metadados do banco de dados do Supabase
      const { error: updateErr } = await serviceSupabase.auth.admin.updateUserById(user.id, {
        user_metadata: {
          ...user.user_metadata,
          role: targetRole,
          full_name: user.user_metadata?.full_name || userEmail.split('@')[0]
        }
      });

      if (!updateErr) {
        updatedUsers.push({ email: userEmail, role: targetRole, status: 'Atualizado no Banco' });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Níveis de acesso por papel configurados no banco de dados Supabase com sucesso!',
      configuredUsers: [
        { email: 'admin@nexachat.com', role: 'Administrador (Acesso Total ao Sistema & Meta Keys)' },
        { email: 'eberfsj@gmail.com', role: 'Atendente / Usuário (Acesso Restrito ao Inbox & DM)' }
      ],
      databaseUpdates: updatedUsers
    });
  } catch (error: unknown) {
    console.error('Erro ao configurar papéis de usuário:', error);
    return NextResponse.json(
      { error: 'Erro interno ao atualizar banco: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
}
