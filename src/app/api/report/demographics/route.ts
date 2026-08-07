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

    const [genderRes, ageRes, countryRes, cityRes] = await Promise.all([
      fetch(
        `https://${domain}/v22.0/${ig_user_id}/insights?metric=impressions&period=day&since=${sinceStr}&breakdown=gender&access_token=${access_token}`
      ),
      fetch(
        `https://${domain}/v22.0/${ig_user_id}/insights?metric=impressions&period=day&since=${sinceStr}&breakdown=age&access_token=${access_token}`
      ),
      fetch(
        `https://${domain}/v22.0/${ig_user_id}/insights?metric=impressions&period=day&since=${sinceStr}&breakdown=country&access_token=${access_token}`
      ),
      fetch(
        `https://${domain}/v22.0/${ig_user_id}/insights?metric=impressions&period=day&since=${sinceStr}&breakdown=city&access_token=${access_token}`
      ),
    ]);

    const genderData = await genderRes.json();
    const ageData = await ageRes.json();
    const countryData = await countryRes.json();
    const cityData = await cityRes.json();

    const byGender = (genderData.data || []).map((row: Record<string, unknown>) => {
      const values = (row.values || []) as Record<string, number>[];
      const total = values.reduce((acc: number, v: Record<string, number>) => acc + (v.value || 0), 0);
      return {
        gender: row.title || row.name || '',
        count: total,
        percentage: 0,
      };
    });

    const byAge = (ageData.data || []).map((row: Record<string, unknown>) => {
      const values = (row.values || []) as Record<string, number>[];
      const total = values.reduce((acc: number, v: Record<string, number>) => acc + (v.value || 0), 0);
      return {
        age_range: row.title || row.name || '',
        count: total,
        percentage: 0,
      };
    });

    const byCountry = (countryData.data || []).map((row: Record<string, unknown>) => {
      const values = (row.values || []) as Record<string, number>[];
      const total = values.reduce((acc: number, v: Record<string, number>) => acc + (v.value || 0), 0);
      return {
        country: row.title || row.name || '',
        count: total,
        percentage: 0,
      };
    });

    const byCity = (cityData.data || []).map((row: Record<string, unknown>) => {
      const values = (row.values || []) as Record<string, number>[];
      const total = values.reduce((acc: number, v: Record<string, number>) => acc + (v.value || 0), 0);
      return {
        city: row.title || row.name || '',
        count: total,
        percentage: 0,
      };
    });

    const calcPercentages = (arr: Array<{ count: number; percentage: number }>) => {
      const total = arr.reduce((sum, item) => sum + item.count, 0);
      if (total === 0) return arr;
      return arr.map((item) => ({
        ...item,
        percentage: (item.count / total) * 100,
      }));
    };

    return NextResponse.json({
      by_gender: calcPercentages(byGender),
      by_age: calcPercentages(byAge),
      by_country: calcPercentages(byCountry),
      by_city: calcPercentages(byCity),
    });
  } catch (error: unknown) {
    console.error('Error in demographics:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro interno' },
      { status: 500 }
    );
  }
}