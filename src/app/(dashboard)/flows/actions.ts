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
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Não autenticado")

  const { data: workspace } = await supabase
    .from('workspaces')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!workspace) throw new Error("Workspace não encontrado")

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
    throw new Error("Nenhuma conta do Instagram selecionada ou conectada")
  }

  if (id === 'new') {
    const { data, error } = await supabase
      .from('flows')
      .insert({
        workspace_id: workspace.id,
        instagram_account_id: targetAccountId,
        name: name,
        flow_data: flowData,
        graph_json: flowData,
        triggers: triggers,
        status: status,
        version: 1,
        created_by: user.id
      })
      .select('id')
      .single()
      
    if (error) throw error

    // Grava a versão 1 em flow_versions
    try {
      await supabase.from('flow_versions').insert({
        flow_id: data.id,
        version: 1,
        graph_json: flowData
      });
    } catch { /* ignore version error */ }

    return data.id
  } else {
    const { data: currentFlow } = await supabase
      .from('flows')
      .select('version')
      .eq('id', id)
      .single();

    const nextVersion = (currentFlow?.version || 1) + 1;

    const { error } = await supabase
      .from('flows')
      .update({
        name: name,
        flow_data: flowData,
        graph_json: flowData,
        triggers: triggers,
        status: status,
        version: nextVersion,
        instagram_account_id: targetAccountId,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('workspace_id', workspace.id)

    if (error) throw error

    try {
      await supabase.from('flow_versions').insert({
        flow_id: id,
        version: nextVersion,
        graph_json: flowData
      });
    } catch { /* ignore version error */ }

    return id
  }
}

export async function publishFlow(id: string, publish: boolean = true) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Não autenticado")

  const status = publish ? 'published' : 'draft';

  const { error } = await supabase
    .from('flows')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
  return { success: true, status };
}

export async function deleteFlow(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Não autenticado")

  const { error } = await supabase
    .from('flows')
    .delete()
    .eq('id', id);

  if (error) throw error;
  return { success: true };
}

export async function duplicateFlow(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Não autenticado")

  const { data: flow, error: fetchErr } = await supabase
    .from('flows')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchErr || !flow) throw new Error("Fluxo não encontrado para duplicação");

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

  if (insertErr) throw insertErr;
  return newFlow.id;
}
