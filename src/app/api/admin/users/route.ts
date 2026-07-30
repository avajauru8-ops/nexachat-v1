import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { parseRole, getRolePermissions } from '@/utils/rbac';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    const userRole = parseRole(user.user_metadata?.role, user.email);
    const permissions = getRolePermissions(userRole);

    if (!permissions.manageTeam && userRole !== 'admin') {
      return NextResponse.json({ error: 'Apenas Administradores podem visualizar a lista geral de usuários.' }, { status: 403 });
    }

    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: { users }, error: listErr } = await serviceSupabase.auth.admin.listUsers();

    if (listErr) {
      return NextResponse.json({ error: listErr.message }, { status: 500 });
    }

    const formattedUsers = users.map(u => ({
      id: u.id,
      email: u.email || '',
      name: u.user_metadata?.full_name || u.user_metadata?.name || u.email?.split('@')[0] || 'Sem nome',
      role: u.user_metadata?.role || 'Atendente (Usuário)',
      status: u.email_confirmed_at ? 'active' : 'pending',
      created_at: u.created_at
    }));

    return NextResponse.json({ users: formattedUsers });
  } catch (error: unknown) {
    console.error('Erro ao buscar usuários:', error);
    return NextResponse.json({ error: 'Erro ao buscar usuários no banco de dados.' }, { status: 500 });
  }
}

// POST: Criar Novo Usuário no Banco pelo Administrador
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    const userRole = parseRole(user.user_metadata?.role, user.email);
    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Apenas Administradores podem criar novos usuários.' }, { status: 403 });
    }

    const body = await request.json();
    const { email, password, name, role } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'E-mail e senha são obrigatórios.' }, { status: 400 });
    }

    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: newUser, error: createErr } = await serviceSupabase.auth.admin.createUser({
      email: String(email).trim().toLowerCase(),
      password: String(password).trim(),
      email_confirm: true,
      user_metadata: {
        full_name: String(name || email.split('@')[0]).trim(),
        role: role || 'Atendente (Usuário)'
      }
    });

    if (createErr) {
      return NextResponse.json({ error: createErr.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, user: newUser.user });
  } catch (error: unknown) {
    return NextResponse.json({ error: 'Erro ao criar usuário: ' + (error instanceof Error ? error.message : String(error)) }, { status: 500 });
  }
}

// PUT: Alterar Dados / Senha / Role do Usuário pelo Administrador
export async function PUT(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    const userRole = parseRole(user.user_metadata?.role, user.email);
    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Apenas Administradores podem alterar dados de usuários.' }, { status: 403 });
    }

    const body = await request.json();
    const { userId, email, name, role, password } = body;

    if (!userId) {
      return NextResponse.json({ error: 'ID do usuário obrigatório.' }, { status: 400 });
    }

    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: targetUser } = await serviceSupabase.auth.admin.getUserById(userId);
    if (!targetUser?.user) {
      return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateAttributes: any = {
      user_metadata: {
        ...targetUser.user.user_metadata,
        full_name: name ? String(name).trim() : targetUser.user.user_metadata?.full_name,
        role: role || targetUser.user.user_metadata?.role || 'Atendente (Usuário)'
      }
    };

    if (email && email.trim() !== targetUser.user.email) {
      updateAttributes.email = String(email).trim().toLowerCase();
      updateAttributes.email_confirm = true;
    }

    if (password && String(password).trim().length >= 6) {
      updateAttributes.password = String(password).trim();
    }

    const { error: updateErr } = await serviceSupabase.auth.admin.updateUserById(userId, updateAttributes);

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Dados do usuário atualizados com sucesso!' });
  } catch (error: unknown) {
    return NextResponse.json({ error: 'Erro ao atualizar usuário: ' + (error instanceof Error ? error.message : String(error)) }, { status: 500 });
  }
}

// DELETE: Deletar Usuário do Banco de Dados
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    const userRole = parseRole(user.user_metadata?.role, user.email);
    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Apenas Administradores podem deletar usuários.' }, { status: 403 });
    }

    if (!userId) {
      return NextResponse.json({ error: 'ID do usuário obrigatório.' }, { status: 400 });
    }

    if (userId === user.id) {
      return NextResponse.json({ error: 'Você não pode deletar sua própria conta de administrador.' }, { status: 400 });
    }

    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error: delErr } = await serviceSupabase.auth.admin.deleteUser(userId);

    if (delErr) {
      return NextResponse.json({ error: delErr.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Usuário removido com sucesso!' });
  } catch (error: unknown) {
    return NextResponse.json({ error: 'Erro ao remover usuário: ' + (error instanceof Error ? error.message : String(error)) }, { status: 500 });
  }
}
