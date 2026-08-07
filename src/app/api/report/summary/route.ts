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

function getGenderLabel(gender: string): string {
  const map: Record<string, string> = {
    'male': 'Homem',
    'female': 'Mulher',
    'non_informed': 'Não informado',
  };
  return map[gender] || gender;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const account = await getInstagramAccount();
    const { access_token, ig_user_id } = account;
    const isMetaToken = access_token.startsWith('EAA');
    const domain = isMetaToken ? 'graph.facebook.com' : 'graph.instagram.com';

    const since = new Date();
    since.setDate(since.getDate() - 30);
    const sinceUnix = Math.floor(since.getTime() / 1000);

    const summary: Record<string, number> = { views: 0, interactions: 0, likes: 0, comments: 0, shares: 0, saves: 0 };
    const byGender: Array<{ label: string; views: number; interactions: number; likes: number; comments: number; shares: number; saves: number }> = [];

    // 1. Fetch User Insights (Impressions & Profile Views)
    const userMetrics = ['impressions', 'profile_views'];
    for (const metric of userMetrics) {
      const url = `https://${domain}/v22.0/${ig_user_id}/insights?metric=${metric}&period=day&since=${sinceUnix}&access_token=${access_token}`;
      const res = await fetch(url);
      const data = await res.json();
      if (!data.error && data.data) {
        for (const row of data.data) {
          const values = row.values || [];
          const total = values.reduce((acc: number, v: Record<string, number>) => acc + (v.value || 0), 0);
          if (metric === 'impressions') summary.views += total;
        }
      }
    }

    // 2. Fetch Media and sum up engagement metrics
    let hasNext = true;
    let afterCursor = '';
    let fetchedCount = 0;
    while (hasNext && fetchedCount < 100) { // Limit to 100 recent posts
      let mediaUrl = `https://${domain}/v22.0/${ig_user_id}/media?fields=id,like_count,comments_count,insights.metric(saved,shares)&limit=50&access_token=${access_token}`;
      if (afterCursor) mediaUrl += `&after=${afterCursor}`;
      
      const res = await fetch(mediaUrl);
      const data = await res.json();
      
      if (data.error || !data.data) {
        break;
      }
      
      for (const item of data.data) {
        // Standard fields
        summary.likes += item.like_count || 0;
        summary.comments += item.comments_count || 0;

        // Insights fields (saved, shares)
        const insights = item.insights?.data || [];
        for (const ins of insights) {
          const metric = ins.name || ins.metric || '';
          const values = ins.values || [];
          const total = values.reduce((acc: number, v: Record<string, number>) => acc + (v.value || 0), 0);
          if (metric === 'saved' || metric === 'save') summary.saves += total;
          if (metric === 'shares') summary.shares += total;
        }
      }
      
      fetchedCount += data.data.length;
      
      if (data.paging?.cursors?.after) {
        afterCursor = data.paging.cursors.after;
      } else {
        hasNext = false;
      }
    }
    
    summary.interactions = summary.likes + summary.comments + summary.shares + summary.saves;

    return NextResponse.json({ summary, by_gender: byGender });
  } catch (error: unknown) {
    console.error('Error in summary:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro interno' },
      { status: 500 }
    );
  }
}