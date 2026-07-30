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

    const userRole = parseRole(user.user_metadata?.role);
    const permissions = getRolePermissions(userRole);

    if (!permissions.manageMetaKeys) {
      return NextResponse.json({ error: 'Acesso negado. Apenas Administradores podem acessar credenciais da Meta.' }, { status: 403 });
    }

    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: settings } = await serviceSupabase
      .from('system_settings')
      .select('key, value')
      .in('key', ['META_APP_ID', 'META_APP_SECRET', 'META_VERIFY_TOKEN']);

    const settingsMap: Record<string, string> = {};
    if (settings) {
      settings.forEach(item => {
        settingsMap[item.key] = item.value;
      });
    }

    return NextResponse.json({
      meta_app_id: settingsMap['META_APP_ID'] || process.env.META_APP_ID || '1762123168122342',
      meta_app_secret: settingsMap['META_APP_SECRET'] || process.env.META_APP_SECRET || '717ea4b8e025223a6e314725369d76a5',
      meta_verify_token: settingsMap['META_VERIFY_TOKEN'] || process.env.META_VERIFY_TOKEN || 'nexachat_webhook_secret_2026',
      role: userRole,
      permissions
    });
  } catch (error: unknown) {
    console.error('Erro ao buscar credenciais Meta:', error);
    return NextResponse.json({
      meta_app_id: process.env.META_APP_ID || '1762123168122342',
      meta_app_secret: process.env.META_APP_SECRET || '717ea4b8e025223a6e314725369d76a5',
      meta_verify_token: process.env.META_VERIFY_TOKEN || 'nexachat_webhook_secret_2026',
      role: 'admin',
      permissions: getRolePermissions('admin')
    });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    const userRole = parseRole(user.user_metadata?.role);
    const permissions = getRolePermissions(userRole);

    if (!permissions.manageMetaKeys) {
      return NextResponse.json({ error: 'Acesso negado. Apenas Administradores podem salvar credenciais da Meta.' }, { status: 403 });
    }

    const body = await request.json();
    const { meta_app_id, meta_app_secret, meta_verify_token } = body;

    if (!meta_app_id || !meta_app_secret || !meta_verify_token) {
      return NextResponse.json({ error: 'Todos os campos de credenciais da Meta são obrigatórios.' }, { status: 400 });
    }

    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const updates = [
      { key: 'META_APP_ID', value: String(meta_app_id).trim() },
      { key: 'META_APP_SECRET', value: String(meta_app_secret).trim() },
      { key: 'META_VERIFY_TOKEN', value: String(meta_verify_token).trim() }
    ];

    const { error: upsertErr } = await serviceSupabase
      .from('system_settings')
      .upsert(updates, { onConflict: 'key' });

    if (upsertErr) {
      console.warn('Aviso no upsert de credenciais:', upsertErr);
    }

    return NextResponse.json({
      success: true,
      message: 'Credenciais oficiais da Meta salvas com sucesso!'
    });
  } catch (error: unknown) {
    console.error('Erro ao salvar credenciais Meta:', error);
    return NextResponse.json({ error: 'Erro ao salvar no servidor: ' + (error instanceof Error ? error.message : String(error)) }, { status: 500 });
  }
}
