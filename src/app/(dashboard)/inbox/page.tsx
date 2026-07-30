import { InboxClient } from '@/components/inbox/InboxClient'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic';

export default async function InboxPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Buscar workspace
  const { data: workspace } = await supabase
    .from('workspaces')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!workspace) {
    return <div>Workspace não encontrado</div>
  }

  return (
    <InboxClient workspaceId={workspace.id} />
  )
}
