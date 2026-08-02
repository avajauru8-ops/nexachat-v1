import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    let workspaceId = searchParams.get('workspaceId');

    // Se não passou workspaceId, tenta achar o padrão do usuário
    if (!workspaceId) {
      const { data: workspace } = await supabase
        .from('workspaces')
        .select('id')
        .eq('user_id', user.id)
        .limit(1)
        .single();
      
      if (workspace) {
        workspaceId = workspace.id;
      } else {
        return NextResponse.json({ error: 'Workspace não encontrado' }, { status: 404 });
      }
    }

    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Buscar a conta conectada do Instagram
    const { data: account, error: accountError } = await serviceSupabase
      .from('instagram_accounts')
      .select('access_token, ig_user_id')
      .eq('workspace_id', workspaceId)
      .eq('status', 'active')
      .limit(1)
      .single();

    if (accountError || !account) {
      return NextResponse.json({ error: 'Nenhuma conta do Instagram conectada' }, { status: 404 });
    }

    const { access_token, ig_user_id } = account;
    
    // Buscar mídias do Instagram (Posts e Reels)
    const isMetaToken = access_token.startsWith('EAA');
    const domain = isMetaToken ? 'graph.facebook.com' : 'graph.instagram.com';
    const fields = 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp';
    const limit = 30; // Buscar as últimas 30 publicações

    const url = `https://${domain}/v22.0/${ig_user_id}/media?fields=${fields}&limit=${limit}&access_token=${access_token}`;

    const res = await fetch(url);
    const data = await res.json();

    if (data.error) {
      console.error('[Meta Graph API Error] fetching media:', data.error);
      return NextResponse.json({ error: 'Erro ao buscar publicações do Instagram', details: data.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: data.data || []
    });

  } catch (error) {
    console.error('Erro na rota /api/instagram/media:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
