import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const type = formData.get('type');

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: 'Arquivo ausente ou vazio.' }, { status: 400 });
    }

    const mediaType = String(type || 'image');
    if (!['image', 'video', 'file'].includes(mediaType)) {
      return NextResponse.json({ error: 'Tipo de arquivo inválido.' }, { status: 400 });
    }

    const maxBytes = (mediaType === 'image' ? 8 : 25) * 1024 * 1024;
    if (file.size > maxBytes) {
      return NextResponse.json(
        { error: `Arquivo muito grande. Máximo ${mediaType === 'image' ? '8MB' : '25MB'}.` },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado. Faça login novamente.' }, { status: 401 });
    }

    const { data: workspace } = await supabase
      .from('workspaces')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!workspace) {
      return NextResponse.json({ error: 'Workspace não encontrado.' }, { status: 404 });
    }

    const { data: account } = await supabase
      .from('instagram_accounts')
      .select('access_token')
      .eq('workspace_id', workspace.id)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle();

    if (!account?.access_token) {
      return NextResponse.json(
        { error: 'Conecte uma conta do Instagram para fazer upload de arquivos.' },
        { status: 400 }
      );
    }

    const graphHost = account.access_token.startsWith('EAA') ? 'graph.facebook.com' : 'graph.instagram.com';
    const fileName = file.name || (mediaType === 'video' ? 'anexo.mp4' : mediaType === 'file' ? 'documento.pdf' : 'anexo.jpg');

    const form = new FormData();
    form.append('media_type', mediaType);
    form.append('filename', fileName);
    form.append('message', JSON.stringify({
      attachment: { type: mediaType, payload: { is_reusable: true } }
    }));
    form.append('file', file, fileName);

    const uploadRes = await fetch(`https://${graphHost}/v22.0/me/message_attachments`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${account.access_token}` },
      body: form
    });

    const uploadData = await uploadRes.json();

    if (uploadData.error) {
      return NextResponse.json({ error: uploadData.error.message || 'Falha no upload.' }, { status: 400 });
    }

    if (!uploadData.id) {
      return NextResponse.json({ error: 'A Meta não retornou o anexo.' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      attachmentId: uploadData.id,
      uri: uploadData.uri || null
    });
  } catch (error: unknown) {
    console.error('Erro ao fazer upload de anexo:', error);
    return NextResponse.json(
      { error: 'Erro interno ao enviar arquivo: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
}
