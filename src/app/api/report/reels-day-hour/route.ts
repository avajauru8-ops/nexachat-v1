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
      `https://${domain}/v22.0/${ig_user_id}/media?fields=id,media_type,caption,timestamp,insights.metric(impressions)&limit=100&access_token=${access_token}`
    );
    const data = await res.json();

    if (data.error) {
      return NextResponse.json({ data: [] });
    }

    const dayHourMap = new Map<string, { count: number; total_views: number }>();

    for (const item of data.data || []) {
      if (item.media_type !== 'REELS' && !(item.media_type === 'VIDEO' && typeof item.caption === 'string' && item.caption.includes('reel'))) {
        continue;
      }
      const date = new Date(item.timestamp as string);
      const day = date.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' });
      const hour = date.getHours().toString().padStart(2, '0') + ':00';
      const key = `${day}|${hour}`;

      if (!dayHourMap.has(key)) {
        dayHourMap.set(key, { count: 0, total_views: 0 });
      }
      const entry = dayHourMap.get(key)!;
      entry.count += 1;

      const insights = item.insights?.data || [];
      for (const ins of insights) {
        const metric = ins.name || ins.metric || '';
        const values = ins.values || [];
        const total = values.reduce((acc: number, v: Record<string, number>) => acc + (v.value || 0), 0);
        if (metric === 'impressions') entry.total_views += total;
      }
    }

    const result = Array.from(dayHourMap.entries()).map(([key, val]) => {
      const [day, hour] = key.split('|');
      return { day, hour, count: val.count, total_views: val.total_views };
    });

    return NextResponse.json({ data: result });
  } catch (error: unknown) {
    console.error('Error in reels-day-hour:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro interno' },
      { status: 500 }
    );
  }
}