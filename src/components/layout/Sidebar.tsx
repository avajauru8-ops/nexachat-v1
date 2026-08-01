import { LogOut } from 'lucide-react';
import { createClient } from '@/utils/supabase/server';
import { logout } from '@/app/auth/actions';
import { SidebarLinks } from './SidebarLinks';
import { UserProfileMenu } from './UserProfileMenu';
import { parseRole } from '@/utils/rbac';

export async function Sidebar() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  let workspaceName = 'Workspace';
  let userInitials = 'U';
  const userEmail = user?.email || 'Usuário';
  let avatarUrl: string | null = null;
  let userDisplayName = 'Usuário';
  let badgeLabel = 'FREE';
  let isAdmin = false;

  let workspaceId = '';
  let unreadCount = 0;

  if (user) {
    const meta = user.user_metadata || {};
    const role = parseRole(meta.role, user.email);
    isAdmin = role === 'admin';

    avatarUrl = meta.avatar_url || meta.picture || meta.avatar || null;
    userDisplayName = meta.full_name || meta.name || userEmail.split('@')[0] || 'Usuário';
    userInitials = userDisplayName.substring(0, 2).toUpperCase();
    badgeLabel = isAdmin ? 'ADMIN' : 'PRO';

    const { data: workspace } = await supabase
      .from('workspaces')
      .select('id, name')
      .eq('user_id', user.id)
      .single();
    
    if (workspace) {
      workspaceName = workspace.name;
      workspaceId = workspace.id;

      const { count } = await supabase
        .from('conversations')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', workspace.id);
      
      unreadCount = count || 0;

      // Buscar foto e @ da conta conectada do instagram
      const { data: account } = await supabase
        .from('instagram_accounts')
        .select('ig_user_id, page_id, access_token')
        .eq('workspace_id', workspace.id)
        .eq('status', 'active')
        .limit(1)
        .maybeSingle();
        
      if (account) {
        let dbUsername = account.page_id && account.page_id !== 'ig_login_direct' ? account.page_id : account.ig_user_id;
        let profilePic = null;

        try {
          const isMetaToken = account.access_token && account.access_token.startsWith('EAA');
          const apiUrl = isMetaToken
            ? `https://graph.facebook.com/v22.0/${account.ig_user_id}?fields=username,profile_picture_url&access_token=${account.access_token}`
            : `https://graph.instagram.com/v22.0/${account.ig_user_id}?fields=username,profile_picture_url&access_token=${account.access_token}`;
          
          const metaRes = await fetch(apiUrl);
          const metaData = await metaRes.json();
          if (metaData.profile_picture_url) profilePic = metaData.profile_picture_url;
          if (metaData.username) dbUsername = metaData.username;
        } catch (e) { /* ignore */ }

        if (profilePic) avatarUrl = profilePic;
        if (dbUsername) userDisplayName = `@${dbUsername}`;
        userInitials = userDisplayName.replace('@', '').substring(0, 2).toUpperCase();
      }
    }
  }

  return (
    <aside className="w-[240px] h-screen bg-[#f8f9fa] border-r border-gray-200 flex flex-col fixed left-0 top-0 z-30">
      
      {/* Top Logo */}
      <div className="h-16 flex items-center px-5 flex-shrink-0">
        <span className="text-2xl font-black text-gray-900 tracking-tighter">NexaChat</span>
      </div>
      
      {/* User Profile Selector (Interactive Dropdown Menu) */}
      <UserProfileMenu
        userDisplayName={userDisplayName}
        userEmail={userEmail}
        avatarUrl={avatarUrl}
        userInitials={userInitials}
        badgeLabel={badgeLabel}
        isAdmin={isAdmin}
        workspaceName={workspaceName}
      />
      
      {/* Navigation Links */}
      <div className="px-3 flex-1 overflow-y-auto">
        <SidebarLinks workspaceId={workspaceId} initialUnreadCount={unreadCount} />
      </div>
      
      {/* Bottom Logout Quick Bar */}
      <div className="p-3 border-t border-gray-200 bg-[#f8f9fa]">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-3 truncate">
            <div className="text-xs truncate">
              <p className="font-medium text-gray-700 truncate" title={userEmail}>{userEmail}</p>
            </div>
          </div>
          <form action={logout}>
            <button className="text-gray-400 hover:text-red-600 transition-colors shrink-0 p-1 rounded hover:bg-red-50" title="Sair da Conta">
              <LogOut className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
