'use server'

import { createClient } from '@/utils/supabase/server'

export async function saveFlow(
  id: string, 
  name: string, 
  flowData: Record<string, unknown>, 
  triggers: Record<string, unknown>, 
  status: string = 'draft', 
  instagramAccountId?: string
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Não autenticado" }

    const { data: workspace } = await supabase
      .from('workspaces')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!workspace) return { success: false, error: "Workspace não encontrado" }

    let targetAccountId = instagramAccountId;
    if (!targetAccountId) {
      const { data: account } = await supabase
        .from('instagram_accounts')
        .select('id')
        .eq('workspace_id', workspace.id)
        .limit(1)
        .single()
      if (account) targetAccountId = account.id;
    }

    if (!targetAccountId) {
      return { success: false, error: "Nenhuma conta do Instagram conectada. Vá em 'Painel Inicial' e conecte sua conta Meta primeiro." }
    }

    if (id === 'new') {
      const { data, error } = await supabase
        .from('flows')
        .insert({
          workspace_id: workspace.id,
          instagram_account_id: targetAccountId,
          name: name,
          flow_data: flowData,
          triggers: triggers,
          status: status
        })
        .select('id')
        .single()
        
      if (error) return { success: false, error: error.message || 'Erro ao criar fluxo no banco de dados' }

      // Removed flow_versions insertion as table does not exist

      return { success: true, id: data.id }
    } else {
      const { error } = await supabase
        .from('flows')
        .update({
          name: name,
          flow_data: flowData,
          triggers: triggers,
          status: status,
          instagram_account_id: targetAccountId,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('workspace_id', workspace.id)

      if (error) return { success: false, error: error.message || 'Erro ao atualizar fluxo no banco de dados' }

      return { success: true, id: id }
    }
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro inesperado' }
  }
}

export async function publishFlow(id: string, publish: boolean = true) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Não autenticado" }

    const status = publish ? 'published' : 'draft';

    const { error } = await supabase
      .from('flows')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) return { success: false, error: error.message || 'Erro ao publicar fluxo' }
    return { success: true, status };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro inesperado' }
  }
}

export async function deleteFlow(id: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Não autenticado" }

    const { error } = await supabase
      .from('flows')
      .delete()
      .eq('id', id);

    if (error) return { success: false, error: error.message || 'Erro ao deletar fluxo' }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro inesperado' }
  }
}

export async function duplicateFlow(id: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Não autenticado" }

    const { data: flow, error: fetchErr } = await supabase
      .from('flows')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchErr || !flow) return { success: false, error: "Fluxo não encontrado para duplicação" }

    const { data: newFlow, error: insertErr } = await supabase
      .from('flows')
      .insert({
        workspace_id: flow.workspace_id,
        instagram_account_id: flow.instagram_account_id,
        name: `${flow.name} (Cópia)`,
        flow_data: flow.flow_data,
        graph_json: flow.graph_json || flow.flow_data,
        triggers: flow.triggers,
        status: 'draft',
        version: 1,
        created_by: user.id
      })
      .select('id')
      .single();

    if (insertErr) return { success: false, error: insertErr.message || 'Erro ao duplicar fluxo no banco de dados' }
    return { success: true, id: newFlow.id };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro inesperado' }
  }
}
