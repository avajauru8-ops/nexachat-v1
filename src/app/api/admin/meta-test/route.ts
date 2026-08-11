import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { parseRole } from '@/utils/rbac';

// GET: Retorna contas do Instagram ativas para teste
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });

    const userRole = parseRole(user.user_metadata?.role, user.email);
    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Apenas Administradores podem acessar.' }, { status: 403 });
    }

    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: accounts, error } = await serviceSupabase
      .from('instagram_accounts')
      .select('id, ig_user_id, page_id, name, status, access_token')
      .eq('status', 'active');

    if (error) throw error;

    return NextResponse.json({ accounts: accounts || [] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Executa os testes na API da Meta
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });

    const userRole = parseRole(user.user_metadata?.role, user.email);
    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Apenas Administradores.' }, { status: 403 });
    }

    const body = await request.json();
    const { action, accountId, targetId } = body;

    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: account } = await serviceSupabase
      .from('instagram_accounts')
      .select('access_token, ig_user_id')
      .eq('id', accountId)
      .single();

    if (!account || !account.access_token) {
      return NextResponse.json({ error: 'Conta não encontrada ou sem token.' }, { status: 404 });
    }

    const accessToken = account.access_token;
    const isMetaToken = accessToken.startsWith('EAA');
    const graphHost = isMetaToken ? 'graph.facebook.com' : 'graph.instagram.com';

    let result: any = null;

    if (action === 'check_permissions') {
      // /me/permissions or debug_token
      if (isMetaToken) {
        const res = await fetch(`https://graph.facebook.com/v22.0/me/permissions?access_token=${accessToken}`);
        result = await res.json();
      } else {
        result = { error: 'Verificação de permissões detalhadas requer um token do Facebook Login (EAA...).' };
      }
    } 
    else if (action === 'test_dm') {
      if (!targetId) return NextResponse.json({ error: 'ID de destino necessário para DM.' }, { status: 400 });
      const res = await fetch(`https://${graphHost}/v22.0/me/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          recipient: { id: targetId },
          message: { text: "Mensagem de teste do Painel Administrativo NexaChat." }
        })
      });
      result = await res.json();
    }
    else if (action === 'test_insights') {
      const res = await fetch(`https://${graphHost}/v22.0/${account.ig_user_id}/insights?metric=impressions,reach,profile_views&period=day&access_token=${accessToken}`);
      result = await res.json();
    }
    else if (action === 'test_comments') {
      // Pega a midia mais recente
      const mediaRes = await fetch(`https://${graphHost}/v22.0/${account.ig_user_id}/media?fields=id&limit=1&access_token=${accessToken}`);
      const mediaData = await mediaRes.json();
      
      if (mediaData.data && mediaData.data.length > 0) {
        const mediaId = mediaData.data[0].id;
        const commentsRes = await fetch(`https://${graphHost}/v22.0/${mediaId}/comments?access_token=${accessToken}`);
        result = await commentsRes.json();
        result._metadata = { media_id_tested: mediaId };
      } else {
        result = { error: 'Nenhuma mídia encontrada para testar comentários.', meta_response: mediaData };
      }
    }
    else {
      return NextResponse.json({ error: 'Ação de teste inválida.' }, { status: 400 });
    }

    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
