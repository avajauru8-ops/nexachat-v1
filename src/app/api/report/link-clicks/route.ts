import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

async function getInstagramAccount() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Não autorizado');

  const { data: workspace } = await supabase
    .from('workspaces')
    .select('id')
    .eq('user_id', user.id)
    .single();
  if (!workspace) throw new Error('Workspace não encontrado');

  const serviceSupabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: account, error } = await serviceSupabase
    .from('instagram_accounts')
    .select('access_token, ig_user_id')
    .eq('workspace_id', workspace.id)
    .eq('status', 'active')
    .limit(1)
    .single();

  if (error || !account) throw new Error('Conta do Instagram não encontrada');
  return account;
}

export async function GET(request: Request) {
  try {
    const account = await getInstagramAccount();
    const { access_token, ig_user_id } = account;
    const isMetaToken = access_token.startsWith('EAA');
    const domain = isMetaToken ? 'graph.facebook.com' : 'graph.instagram.com';

    const since = new Date();
    since.setDate(since.getDate() - 30);
    const sinceStr = since.toISOString().split('T')[0];

    const res = await fetch(
      `https://${domain}/v22.0/${ig_user_id}/insights?metric=click_throughs&period=day&since=${sinceStr}&access_token=${access_token}`
    );
    const data = await res.json();

    if (data.error) {
      return NextResponse.json({ data: [] });
    }

    const rows = data.data || [];
    const result = rows.map((row: Record<string, unknown>) => ({
      url: row.title || row.name || 'Link',
      clicks: ((row.values || []) as Record<string, number>[]).reduce((acc: number, v: Record<string, number>) => acc + (v.value || 0), 0),
      unique_clicks: 0,
    }));

    return NextResponse.json({ data: result });
  } catch (error: unknown) {
    console.error('Error in link-clicks:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro interno' },
      { status: 500 }
    );
  }
}