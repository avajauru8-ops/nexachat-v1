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
      `https://${domain}/v22.0/${ig_user_id}/media?fields=id,caption,media_type,media_url,permalink,timestamp,insights.metric(impressions,engagement,likes,comments,shares,saves)&limit=50&access_token=${access_token}`
    );
    const data = await res.json();

    if (data.error) {
      return NextResponse.json({ data: [] });
    }

    const reels = (data.data || [])
      .filter((item: Record<string, unknown>) => item.media_type === 'REELS' || (item.media_type === 'VIDEO' && typeof item.caption === 'string' && item.caption.includes('reel')))
      .map((item: Record<string, unknown>) => {
        let views = 0;
        let likes = 0;
        let comments = 0;
        let shares = 0;
        let saves = 0;

        const insights = ((item.insights as Record<string, unknown>)?.data as Record<string, unknown>[]) || [];
        for (const ins of insights) {
          const metric = ins.name || ins.metric || '';
          const values = (ins.values || []) as Record<string, number>[];
          const total = values.reduce((acc: number, v: Record<string, number>) => acc + (v.value || 0), 0);
          if (metric === 'impressions') views = total;
          if (metric === 'engagement') likes = total;
          if (metric === 'likes') likes = total;
          if (metric === 'comments') comments = total;
          if (metric === 'shares') shares = total;
          if (metric === 'save') saves = total;
        }

        return {
          id: item.id as string,
          caption: (item.caption as string) || '',
          views,
          likes,
          comments,
          shares,
          saves,
          timestamp: item.timestamp as string,
          permalink: item.permalink as string,
        };
      })
      .sort((a: { views: number }, b: { views: number }) => b.views - a.views)
      .slice(0, 20);

    return NextResponse.json({ data: reels });
  } catch (error: unknown) {
    console.error('Error in top-reels:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro interno' },
      { status: 500 }
    );
  }
}