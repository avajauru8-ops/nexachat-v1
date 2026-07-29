'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export async function saveFlow(id: string, name: string, flowData: any, triggers: any) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Não autenticado")

  const { data: workspace } = await supabase
    .from('workspaces')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!workspace) throw new Error("Workspace não encontrado")

  // Precisa do instagram_account_id, vamos pegar o primeiro disponível por enquanto
  const { data: account } = await supabase
    .from('instagram_accounts')
    .select('id')
    .eq('workspace_id', workspace.id)
    .limit(1)
    .single()

  if (!account) {
    throw new Error("Conecte uma conta do Instagram primeiro")
  }

  if (id === 'new') {
    const { data, error } = await supabase
      .from('flows')
      .insert({
        workspace_id: workspace.id,
        instagram_account_id: account.id,
        name: name,
        flow_data: flowData,
        triggers: triggers,
        status: 'draft'
      })
      .select('id')
      .single()
      
    if (error) throw error
    return data.id
  } else {
    const { error } = await supabase
      .from('flows')
      .update({
        name: name,
        flow_data: flowData,
        triggers: triggers
      })
      .eq('id', id)
      .eq('workspace_id', workspace.id)

    if (error) throw error
    return id
  }
}
