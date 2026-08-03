import { createClient } from '@/utils/supabase/server';
import { FlowsListClient, FlowItem } from './FlowsListClient';

export const dynamic = 'force-dynamic';

export default async function FlowsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let flows: any[] | null = [];
  
  if (user) {
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (workspace) {
      const { data } = await supabase
        .from('flows')
        .select('id, name, status, triggers, updated_at, flow_logs(count)')
        .eq('workspace_id', workspace.id)
        .order('updated_at', { ascending: false });
        
      flows = data;
    }
  }

  const formattedFlows: FlowItem[] = (flows || []).map(f => ({
    id: f.id,
    name: f.name,
    status: f.status || 'draft',
    triggers: (f.triggers as Record<string, unknown>) || {},
    trigger_type: (f as any).trigger_type || 'dm_keyword',
    execution_count: f.flow_logs && f.flow_logs[0] ? f.flow_logs[0].count : 0,
    updated_at: f.updated_at
  }));

  return <FlowsListClient initialFlows={formattedFlows} />;
}
