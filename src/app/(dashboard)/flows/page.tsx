import { createClient } from '@/utils/supabase/server';
import { FlowsListClient, FlowItem } from './FlowsListClient';

export default async function FlowsPage() {
  const supabase = await createClient();
  
  const { data: flows } = await supabase
    .from('flows')
    .select('id, name, status, triggers, trigger_type, updated_at')
    .order('updated_at', { ascending: false });

  const formattedFlows: FlowItem[] = (flows || []).map(f => ({
    id: f.id,
    name: f.name,
    status: f.status || 'draft',
    triggers: (f.triggers as Record<string, unknown>) || {},
    trigger_type: f.trigger_type || 'dm_keyword',
    updated_at: f.updated_at
  }));

  return <FlowsListClient initialFlows={formattedFlows} />;
}
