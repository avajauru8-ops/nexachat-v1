import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { parseRole } from '@/utils/rbac';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: settings } = await serviceSupabase
      .from('system_settings')
      .select('key, value')
      .in('key', ['GEMINI_API_KEY', 'OPENAI_API_KEY', 'DEFAULT_LLM_PROVIDER', 'DEFAULT_LLM_MODEL', 'GLOBAL_SYSTEM_PROMPT']);

    const settingsMap: Record<string, string> = {};
    if (settings) {
      settings.forEach(item => {
        settingsMap[item.key] = item.value;
      });
    }

    return NextResponse.json({
      gemini_api_key: settingsMap['GEMINI_API_KEY'] || process.env.GEMINI_API_KEY || '',
      openai_api_key: settingsMap['OPENAI_API_KEY'] || process.env.OPENAI_API_KEY || '',
      default_provider: settingsMap['DEFAULT_LLM_PROVIDER'] || 'gemini',
      default_model: settingsMap['DEFAULT_LLM_MODEL'] || 'gemini-1.5-flash',
      global_system_prompt: settingsMap['GLOBAL_SYSTEM_PROMPT'] || 'Você é um assistente virtual atencioso e inteligente da nossa empresa no Instagram.'
    });
  } catch (error: unknown) {
    console.error('Erro ao buscar credenciais de IA:', error);
    return NextResponse.json({ error: 'Erro ao buscar credenciais no banco de dados.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    const userRole = parseRole(user.user_metadata?.role);
    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Apenas Administradores podem salvar configurações globais de IA.' }, { status: 403 });
    }

    const body = await request.json();
    const { gemini_api_key, openai_api_key, default_provider, default_model, global_system_prompt } = body;

    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const updates = [
      { key: 'GEMINI_API_KEY', value: String(gemini_api_key || '').trim() },
      { key: 'OPENAI_API_KEY', value: String(openai_api_key || '').trim() },
      { key: 'DEFAULT_LLM_PROVIDER', value: String(default_provider || 'gemini').trim() },
      { key: 'DEFAULT_LLM_MODEL', value: String(default_model || 'gemini-1.5-flash').trim() },
      { key: 'GLOBAL_SYSTEM_PROMPT', value: String(global_system_prompt || '').trim() }
    ];

    const { error: upsertErr } = await serviceSupabase
      .from('system_settings')
      .upsert(updates, { onConflict: 'key' });

    if (upsertErr) {
      console.warn('Aviso ao salvar configurações de IA:', upsertErr);
    }

    return NextResponse.json({
      success: true,
      message: 'Conexão e chaves da API do Google Gemini / OpenAI salvas com sucesso no banco!'
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: 'Erro ao salvar configurações de IA: ' + (error instanceof Error ? error.message : String(error)) }, { status: 500 });
  }
}
