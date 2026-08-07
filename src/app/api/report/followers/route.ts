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

    const [followersRes, followRes] = await Promise.all([
      fetch(
        `https://${domain}/v22.0/${ig_user_id}/insights?metric=follower_count&period=day&since=${sinceStr}&access_token=${access_token}`
      ),
      fetch(
        `https://${domain}/v22.0/${ig_user_id}/insights?metric=follows&period=day&since=${sinceStr}&access_token=${access_token}`
      ),
    ]);

    const followersData = await followersRes.json();
    const followData = await followRes.json();

    let totalFollowers = 0;
    let newFollowers = 0;
    let lostFollowers = 0;

    if (!followersData.error) {
      const fRows = followersData.data || [];
      for (const row of fRows) {
        const values = row.values || [];
        if (values.length > 0) {
          totalFollowers = values[values.length - 1].value || 0;
        }
      }
    }

    if (!followData.error) {
      const rows = followData.data || [];
      for (const row of rows) {
        const values = row.values || [];
        for (const v of values) {
          const val = v.value || 0;
          if (val > 0) newFollowers += val;
          if (val < 0) lostFollowers += Math.abs(val);
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