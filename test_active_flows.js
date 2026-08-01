const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: flows, error } = await supabase
    .from('flows')
    .select('id, name, trigger_type, trigger_config, triggers, status, graph_json, flow_data')
    .in('status', ['active', 'published']);
  
  if (error) console.error(error);

  const mapped = flows.map(f => {
    // try to extract keyword from graph_json
    const graphData = f.graph_json || f.flow_data || {};
    const nodes = graphData.nodes || [];
    const triggerNode = nodes.find(n => n.type === 'triggerNode');
    
    return {
      id: f.id,
      name: f.name,
      trigger_type: f.trigger_type,
      trigger_config: f.trigger_config,
      triggers: f.triggers,
      node_keyword: triggerNode?.data?.keyword,
    };
  });
  console.log(JSON.stringify(mapped, null, 2));
}
check();
