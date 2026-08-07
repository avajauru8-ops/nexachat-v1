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

    const res = await fetch(
      `https://${domain}/v22.0/${ig_user_id}/media?fields=id,media_type,caption,like_count,comments_count,insights.metric(impressions)&limit=100&access_token=${access_token}`
    );
    const data = await res.json();

    if (data.error) {
      return NextResponse.json({ data: [] });
    }

    const typeMap = new Map<string, { count: number; total_likes: number; total_comments: number; total_views: number }>();

    for (const item of data.data || []) {
      const type = item.media_type as string;
      if (!typeMap.has(type)) {
        typeMap.set(type, { count: 0, total_likes: 0, total_comments: 0, total_views: 0 });
      }
      const entry = typeMap.get(type)!;
      entry.count += 1;
      
      entry.total_likes += (item.like_count as number) || 0;
      entry.total_comments += (item.comments_count as number) || 0;

      const insights = item.insights?.data || [];
      for (const ins of insights) {
        const metric = ins.name || ins.metric || '';
        const values = ins.values || [];
        const total = values.reduce((acc: number, v: Record<string, number>) => acc + (v.value || 0), 0);
        if (metric === 'impressions') entry.total_views += total;
      }
    }

    const result = Array.from(typeMap.entries()).map(([type, val]) => ({
      type,
      ...val,
    }));

    return NextResponse.json({ data: result });
  } catch (error: unknown) {
    console.error('Error in posts-type:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro interno' },
      { status: 500 }
    );
  }
}