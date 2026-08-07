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
    const sinceUnix = Math.floor(since.getTime() / 1000);

    const [userRes, insightsRes] = await Promise.all([
      fetch(
        `https://${domain}/v22.0/${ig_user_id}?fields=followers_count&access_token=${access_token}`
      ),
      fetch(
        `https://${domain}/v22.0/${ig_user_id}/insights?metric=follower_count&period=day&since=${sinceUnix}&access_token=${access_token}`
      ),
    ]);

    const userData = await userRes.json();
    const insightsData = await insightsRes.json();

    let totalFollowers = userData.followers_count || 0;
    let newFollowers = 0;
    let lostFollowers = 0;

    if (!insightsData.error && insightsData.data) {
      for (const row of insightsData.data) {
        const values = row.values || [];
        if (values.length >= 2) {
          const first = values[0].value || 0;
          const last = values[values.length - 1].value || 0;
          if (last > first) newFollowers = last - first;
          else if (first > last) lostFollowers = first - last;
        }
      }
    }

    const dailyChange = newFollowers - lostFollowers;

    return NextResponse.json({
      data: {
        total_followers: totalFollowers,
        new_followers: newFollowers,
        lost_followers: lostFollowers,
        daily_change: dailyChange,
      },
    });
  } catch (error: unknown) {
    console.error('Error in followers:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro interno' },
      { status: 500 }
    );
  }
}