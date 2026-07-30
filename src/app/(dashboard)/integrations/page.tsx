import { createClient } from '@/utils/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import IntegrationsClient from './IntegrationsClient';

export default async function IntegrationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let connectedAccount = null;

  if (user) {
    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: workspace } = await serviceSupabase
      .from('workspaces')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (workspace) {
      const { data: account } = await serviceSupabase
        .from('instagram_accounts')
        .select('id, ig_user_id, page_id, status, access_token, created_at')
        .eq('workspace_id', workspace.id)
        .single();

      if (account) {
        // Se page_id contiver o username salvo no banco, usa ele
        let username = account.page_id && account.page_id !== 'ig_login_direct' ? account.page_id : account.ig_user_id;
        let profilePictureUrl = null;

        try {
          const isMetaToken = account.access_token && account.access_token.startsWith('EAA');
          const apiUrl = isMetaToken
            ? `https://graph.facebook.com/v22.0/${account.ig_user_id}?fields=id,username,name,profile_picture_url&access_token=${account.access_token}`
            : `https://graph.instagram.com/v22.0/me?fields=id,username,name,profile_picture_url&access_token=${account.access_token}`;
            
          const res = await fetch(apiUrl);
          const profile = await res.json();
          if (profile.username) username = profile.username;
          if (profile.profile_picture_url) profilePictureUrl = profile.profile_picture_url;
        } catch (err) {
          console.error("Failed to fetch IG profile in integrations", err);
        }

        connectedAccount = {
          ...account,
          username,
          profile_picture_url: profilePictureUrl,
        };
      }
    }
  }

  return <IntegrationsClient connectedAccount={connectedAccount} />;
}
