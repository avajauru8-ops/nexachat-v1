import { FlowBuilderClient } from '@/components/flow/FlowBuilderClient'
import { createClient } from '@/utils/supabase/server'
import { notFound } from 'next/navigation'

export default async function FlowBuilderPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const { id } = resolvedParams;
  
  if (id === 'new') {
    return <FlowBuilderClient id={id} initialFlowData={null} />
  }

  const supabase = await createClient()
  
  const { data: flow, error } = await supabase
    .from('flows')
    .select('id, name, flow_data')
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
    />
  )
}
