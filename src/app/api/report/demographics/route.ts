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
      `https://${domain}/v22.0/${ig_user_id}/insights?metric=audience_gender_age,audience_city,audience_country&period=lifetime&access_token=${access_token}`
    );
    const data = await res.json();
    
    let genderAgeData: Record<string, number> = {};
    let cityDataObj: Record<string, number> = {};
    let countryDataObj: Record<string, number> = {};

    if (!data.error && data.data) {
      for (const item of data.data) {
        if (item.values && item.values.length > 0) {
          const valObj = item.values[0].value || {};
          if (item.name === 'audience_gender_age') genderAgeData = valObj;
          if (item.name === 'audience_city') cityDataObj = valObj;
          if (item.name === 'audience_country') countryDataObj = valObj;
        }
      }
    }

    const genderMap = new Map<string, number>();
    const ageMap = new Map<string, number>();
    
    for (const [key, value] of Object.entries(genderAgeData)) {
      const [g, a] = key.split('.');
      const genderLabel = g === 'F' ? 'Mulher' : g === 'M' ? 'Homem' : 'Não informado';
      genderMap.set(genderLabel, (genderMap.get(genderLabel) || 0) + (value as number));
      if (a) {
        ageMap.set(a, (ageMap.get(a) || 0) + (value as number));
      }
    }

    const byGender = Array.from(genderMap.entries()).map(([gender, count]) => ({ gender, count, percentage: 0 }));
    const byAge = Array.from(ageMap.entries()).map(([age_range, count]) => ({ age_range, count, percentage: 0 }));
    
    byAge.sort((a, b) => a.age_range.localeCompare(b.age_range));

    const byCity = Object.entries(cityDataObj)
      .map(([city, count]) => ({ city, count: count as number, percentage: 0 }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);

    const byCountry = Object.entries(countryDataObj)
      .map(([country, count]) => ({ country, count: count as number, percentage: 0 }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);

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