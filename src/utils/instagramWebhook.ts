const IG_WEBHOOK_FIELDS = 'messages,messaging_postbacks,messaging_optins,comments,message_reactions,follow';

export interface InstagramAccountRef {
  id: string;
  ig_user_id: string;
  page_id?: string | null;
  access_token?: string | null;
  workspace_id?: string | null;
}

/**
 * (Re)inscreve a conta do Instagram nos webhooks da Meta.
 * Contas nativas (Instagram Login) usam /me/subscribed_apps no graph.instagram.com.
 * O campo `follow` (novo seguidor) é incluído; se a Meta rejeitar (success:false),
 * o motivo é normalmente falta de permissão/review do app no painel da Meta.
 */
export async function resubscribeInstagramWebhooks(account: InstagramAccountRef) {
  const token = account.access_token;
  if (!token) {
    return { ok: false, reason: 'Conta sem access_token' };
  }

  const isMetaToken = token.startsWith('EAA');
  const host = isMetaToken ? 'graph.facebook.com' : 'graph.instagram.com';

  try {
    if (isMetaToken && account.page_id && account.page_id !== 'native_ig_login') {
      const res = await fetch(
        `https://graph.facebook.com/v22.0/${account.page_id}/subscribed_apps?subscribed_fields=feed,mention&access_token=${token}`,
        { method: 'POST' }
      );
      const data = await res.json();
      return { ok: data?.success === true, response: data };
    }

    const res = await fetch(
      `https://graph.instagram.com/v22.0/me/subscribed_apps?subscribed_fields=${encodeURIComponent(IG_WEBHOOK_FIELDS)}&access_token=${token}`,
      { method: 'POST' }
    );
    const data = await res.json();
    return { ok: data?.success === true, response: data };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}
