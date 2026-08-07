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
    const genderFilter = searchParams.get('gender') || 'all';

    const account = await getInstagramAccount();
    const { access_token, ig_user_id } = account;
    const isMetaToken = access_token.startsWith('EAA');
    const domain = isMetaToken ? 'graph.facebook.com' : 'graph.instagram.com';

    const since = new Date();
    since.setDate(since.getDate() - 30);
    const sinceStr = since.toISOString().split('T')[0];

    const metrics = ['impressions', 'reach', 'engagement', 'profile_views'];
    const breakdown = genderFilter !== 'all' ? `gender=${genderFilter}` : undefined;

    const summary: Record<string, number> = { views: 0, interactions: 0, likes: 0, comments: 0, shares: 0, saves: 0 };
    const byGender: Array<{ label: string; views: number; interactions: number; likes: number; comments: number; shares: number; saves: number }> = [];

    for (const metric of metrics) {
      let url = `https://${domain}/v22.0/${ig_user_id}/insights?metric=${metric}&period=day&since=${sinceStr}&access_token=${access_token}`;
      if (breakdown) url += `&breakdown=${breakdown}`;

      const res = await fetch(url);
      const data = await res.json();

      if (data.error) continue;

      const rows = data.data || [];
      for (const row of rows) {
        const values = row.values || [];
        const total = values.reduce((acc: number, v: Record<string, number>) => acc + (v.value || 0), 0);

        if (metric === 'impressions') summary.views = total;
        if (metric === 'engagement') summary.interactions = total;
        if (metric === 'reach') summary.views += total;
      }
    }

    const likesRes = await fetch(
      `https://${domain}/v22.0/${ig_user_id}/insights?metric=engagement&period=day&since=${sinceStr}&breakdown=post_type&access_token=${access_token}`
    );
    const likesData = await likesRes.json();
    if (!likesData.error) {
      const likesRows = likesData.data || [];
      for (const row of likesRows) {
        const values = row.values || [];
        summary.likes = values.reduce((acc: number, v: Record<string, number>) => acc + (v.value || 0), 0);
      }
    }

    const commentsRes = await fetch(
      `https://${domain}/v22.0/${ig_user_id}/insights?metric=comments&period=day&since=${sinceStr}&access_token=${access_token}`
    );
    const commentsData = await commentsRes.json();
    if (!commentsData.error) {
      const commentsRows = commentsData.data || [];
      for (const row of commentsRows) {
        const values = row.values || [];
        summary.comments = values.reduce((acc: number, v: Record<string, number>) => acc + (v.value || 0), 0);
      }
    }

    const sharesRes = await fetch(
      `https://${domain}/v22.0/${ig_user_id}/insights?metric=shares&period=day&since=${sinceStr}&access_token=${access_token}`
    );
    const sharesData = await sharesRes.json();
    if (!sharesData.error) {
      const sharesRows = sharesData.data || [];
      for (const row of sharesRows) {
        const values = row.values || [];
        summary.shares = values.reduce((acc: number, v: Record<string, number>) => acc + (v.value || 0), 0);
      }
    }

    const savesRes = await fetch(
      `https://${domain}/v22.0/${ig_user_id}/insights?metric=save&period=day&since=${sinceStr}&access_token=${access_token}`
    );
    const savesData = await savesRes.json();
    if (!savesData.error) {
      const savesRows = savesData.data || [];
      for (const row of savesRows) {
        const values = row.values || [];
        summary.saves = values.reduce((acc: number, v: Record<string, number>) => acc + (v.value || 0), 0);
      }
    }

    if (genderFilter === 'all') {
      const genderBreakdown = ['male', 'female', 'non_informed'];
      for (const g of genderBreakdown) {
        const gRes = await fetch(
          `https://${domain}/v22.0/${ig_user_id}/insights?metric=impressions&period=day&since=${sinceStr}&breakdown=gender&gender=${g}&access_token=${access_token}`
        );
        const gData = await gRes.json();
        if (gData.error) continue;
        const gRows = gData.data || [];
        let gViews = 0;
        for (const row of gRows) {
          const values = row.values || [];
          gViews = values.reduce((acc: number, v: Record<string, number>) => acc + (v.value || 0), 0);
        }
        byGender.push({
          label: getGenderLabel(g),
          views: gViews,
          interactions: 0,
          likes: 0,
          comments: 0,
          shares: 0,
          saves: 0,
        });
      }
    }

    return NextResponse.json({ summary, by_gender: byGender });
  } catch (error: unknown) {
    console.error('Error in summary:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro interno' },
      { status: 500 }
    );
  }
}