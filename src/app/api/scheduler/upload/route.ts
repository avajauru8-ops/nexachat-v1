import { NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/utils/supabase/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const BUCKET = 'scheduled-media';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

    const { data: workspace } = await supabase.from('workspaces').select('id').eq('user_id', user.id).single();
    if (!workspace) return NextResponse.json({ error: 'Workspace não encontrado.' }, { status: 404 });

    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: 'Arquivo ausente ou vazio.' }, { status: 400 });
    }

    const maxBytes = 200 * 1024 * 1024;
    if (file.size > maxBytes) {
      return NextResponse.json({ error: 'Arquivo muito grande (máx 200MB).' }, { status: 400 });
    }

    if (!supabaseServiceKey) {
      return NextResponse.json({ error: 'Configuração de armazenamento ausente no servidor.' }, { status: 500 });
    }

    const admin = createSupabaseClient(supabaseUrl, supabaseServiceKey);
    const storageHeaders = {
      'apikey': supabaseServiceKey,
      'Authorization': `Bearer ${supabaseServiceKey}`,
      'Content-Type': 'application/json'
    };

    // Garantir que o bucket público exista
    await fetch(`${supabaseUrl}/storage/v1/bucket`, {
      method: 'POST',
      headers: storageHeaders,
      body: JSON.stringify({ name: BUCKET, public: true })
    });

    const ext = (file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '');
    const path = `${workspace.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const uploadRes = await fetch(`${supabaseUrl}/storage/v1/object/${BUCKET}/${path}`, {
      method: 'POST',
      headers: {
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': file.type || 'application/octet-stream',
        'x-upsert': 'true'
      },
      body: file
    });

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      console.error('[Scheduler Upload] Erro do Storage:', uploadRes.status, errText.slice(0, 300));
      return NextResponse.json({ error: 'Falha ao enviar o arquivo para o armazenamento.' }, { status: 500 });
    }

    const url = `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${path}`;
    return NextResponse.json({ success: true, url });
  } catch (err: unknown) {
    console.error('Erro no upload de mídia:', err);
    return NextResponse.json(
      { error: 'Erro interno: ' + (err instanceof Error ? err.message : String(err)) },
      { status: 500 }
    );
  }
}
