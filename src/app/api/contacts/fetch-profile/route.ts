import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

/**
 * POST /api/contacts/fetch-profile
 * Busca o perfil real do Instagram via Meta Graph API v22.0 usando o ig_scoped_id
 * e atualiza os dados no banco de dados (contacts).
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { contactId } = await request.json();

    if (!contactId) {
      return NextResponse.json({ error: 'contactId é obrigatório' }, { status: 400 });
    }

    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1. Buscar o contato no banco
    const { data: contact, error: contactError } = await serviceSupabase
      .from('contacts')
      .select('id, ig_scoped_id, name, username, profile_picture, workspace_id, instagram_account_id')
      .eq('id', contactId)
      .single();

    if (contactError || !contact) {
      return NextResponse.json({ error: 'Contato não encontrado' }, { status: 404 });
    }

    // 2. Buscar o access_token da conta Instagram conectada
    let accessToken: string | null = null;

    if (contact.instagram_account_id) {
      const { data: igAccount } = await serviceSupabase
        .from('instagram_accounts')
        .select('access_token')
        .eq('id', contact.instagram_account_id)
        .single();
      accessToken = igAccount?.access_token || null;
    }

    // Fallback: buscar qualquer conta do workspace
    if (!accessToken && contact.workspace_id) {
      const { data: igAccount } = await serviceSupabase
        .from('instagram_accounts')
        .select('access_token')
        .eq('workspace_id', contact.workspace_id)
        .eq('status', 'active')
        .limit(1)
        .maybeSingle();
      accessToken = igAccount?.access_token || null;
    }

    if (!accessToken) {
      return NextResponse.json({
        success: true,
        contact: {
          ...contact,
          ig_profile: null,
          message: 'Sem access_token disponível para buscar perfil do Instagram.'
        }
      });
    }

    // 3. Buscar perfil real do Instagram via Meta Graph API v22.0
    const igScopedId = contact.ig_scoped_id;
    const fields = 'name,username,profile_picture_url,follower_count,is_verified_user,biography';
    
    const isMetaToken = accessToken.startsWith('EAA');
    const domain = isMetaToken ? 'graph.facebook.com' : 'graph.instagram.com';
    const graphUrl = `https://${domain}/v22.0/${igScopedId}?fields=${fields}&access_token=${accessToken}`;

    let igProfile: Record<string, any> | null = null;

    try {
      const graphRes = await fetch(graphUrl);
      const graphData = await graphRes.json();

      if (graphData && !graphData.error) {
        igProfile = {
          name: graphData.name || null,
          username: graphData.username || null,
          profile_picture_url: graphData.profile_picture_url || null,
          follower_count: graphData.follower_count || null,
          is_verified: graphData.is_verified_user || false,
          biography: graphData.biography || null,
        };

        // 4. Atualizar dados do contato no banco com os dados reais
        const updatePayload: Record<string, any> = {};
        if (igProfile.name && igProfile.name !== contact.name) {
          updatePayload.name = igProfile.name;
        }
        if (igProfile.profile_picture_url) {
          updatePayload.profile_picture = igProfile.profile_picture_url;
        }
        if (igProfile.username) {
          updatePayload.username = igProfile.username;
        }

        if (Object.keys(updatePayload).length > 0) {
          await serviceSupabase
            .from('contacts')
            .update(updatePayload)
            .eq('id', contactId);
        }
      } else {
        console.warn('[fetch-profile] Meta Graph API error:', graphData.error);
      }
    } catch (fetchErr) {
      console.warn('[fetch-profile] Erro ao buscar perfil do Instagram:', fetchErr);
    }

    return NextResponse.json({
      success: true,
      contact: {
        ...contact,
        profile_picture: igProfile?.profile_picture_url || contact.profile_picture,
        name: igProfile?.name || contact.name,
        username: igProfile?.username || contact.username,
      },
      ig_profile: igProfile,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro interno no servidor';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
