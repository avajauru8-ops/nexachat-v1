import { FlowBuilderClient } from '@/components/flow/FlowBuilderClient'
import { createClient } from '@/utils/supabase/server'
import { notFound } from 'next/navigation'

export default async function FlowBuilderPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const { id } = resolvedParams;
  
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let accounts: Record<string, unknown>[] = []
  if (user) {
    const { data: workspaces } = await supabase.from('workspaces').select('id').eq('user_id', user.id).single()
    if (workspaces) {
      const { data: igAccounts } = await supabase.from('instagram_accounts').select('id, page_id, ig_user_id').eq('workspace_id', workspaces.id)
      if (igAccounts) accounts = igAccounts
    }
  }

  if (id === 'new') {
    return <FlowBuilderClient id={id} initialFlowData={null} instagramAccounts={accounts} />
  }
  
  const { data: flow, error } = await supabase
    .from('flows')
    .select('id, name, flow_data, instagram_account_id, status')
    .eq('id', id)
    .single()

  if (error || !flow) {
    notFound()
  }

  return (
    <FlowBuilderClient 
      id={flow.id} 
      initialName={flow.name} 
      initialFlowData={flow.flow_data} 
      initialStatus={flow.status}
      initialAccountId={flow.instagram_account_id}
      instagramAccounts={accounts}
    />
  )
}
