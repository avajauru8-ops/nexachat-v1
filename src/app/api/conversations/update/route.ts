import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

const PIPELINE_STAGES = ['novo', 'em_atendimento', 'em_negociacao', 'fechado', 'perdido'];

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const { conversationId, pipeline_stage, assignee_id } = await request.json();
    if (!conversationId) {
      return NextResponse.json({ error: 'conversationId é obrigatório' }, { status: 400 });
    }

    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: conv } = await serviceSupabase
      .from('conversations')
      .select('id, workspace_id')
      .eq('id', conversationId)
      .maybeSingle();

    if (!conv) return NextResponse.json({ error: 'Conversa não encontrada' }, { status: 404 });

    const { data: ws } = await serviceSupabase
      .from('workspaces')
      .select('id')
      .eq('id', conv.workspace_id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!ws) return NextResponse.json({ error: 'Sem permissão nesta conversa' }, { status: 403 });

    const updateData: Record<string, unknown> = {};
    if (pipeline_stage !== undefined) {
      if (!PIPELINE_STAGES.includes(pipeline_stage)) {
        return NextResponse.json({ error: 'Etapa de pipeline inválida' }, { status: 400 });
      }
      updateData.pipeline_stage = pipeline_stage;
    }
    if (assignee_id !== undefined) {
      updateData.assigned_agent_id = assignee_id === '' ? null : assignee_id;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'Nada para atualizar' }, { status: 400 });
    }

    const { data: updated, error } = await serviceSupabase
      .from('conversations')
      .update(updateData)
      .eq('id', conversationId)
      .select('id, pipeline_stage, assigned_agent_id')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, conversation: updated });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro interno no servidor';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
