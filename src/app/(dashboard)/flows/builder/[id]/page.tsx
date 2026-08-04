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
      const { data: igAccounts } = await supabase.from('instagram_accounts').select('id, page_id, ig_user_id, ig_username').eq('workspace_id', workspaces.id)
      if (igAccounts) {
        // Filter out duplicate ig_user_id if any exist due to lack of DB constraints
        const seen = new Set();
        accounts = igAccounts.filter(acc => {
          if (seen.has(acc.ig_user_id)) return false;
          seen.add(acc.ig_user_id);
          return true;
        });
      }
    }
  }

  if (id === 'new') {
    return <FlowBuilderClient id={id} initialFlowData={null} instagramAccounts={accounts} />
  }
  
  const { data: flow, error } = await supabase
    .from('flows')
    .select('id, name, flow_data, instagram_account_id, status, updated_at, flow_logs(count)')
    .eq('id', id)
    .single()

  if (error || !flow) {
    notFound()
  }

  const executionCount = (flow.flow_logs as unknown as { count: number }[] | null)?.[0]?.count ?? 0

  return (
    <FlowBuilderClient 
      id={flow.id} 
      initialName={flow.name} 
      initialFlowData={flow.flow_data} 
      initialStatus={flow.status}
      initialAccountId={flow.instagram_account_id}
      instagramAccounts={accounts}
      executionCount={executionCount}
      updatedAt={flow.updated_at as string | null}
    />
  )
}
