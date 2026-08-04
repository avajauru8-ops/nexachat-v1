import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

    const { data: workspace } = await supabase
      .from('workspaces')
      .select('id')
      .eq('user_id', user.id)
      .single();
    if (!workspace) return NextResponse.json({ error: 'Workspace não encontrado.' }, { status: 404 });

    const body = await request.json();
    const topic = String(body.topic || '').trim().slice(0, 300);
    const mediaType = body.mediaType === 'REELS' ? 'REELS' : 'POST';

    const admin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { data: systemSettings } = await admin
      .from('system_settings')
      .select('key, value')
      .in('key', ['GEMINI_API_KEY', 'OPENAI_API_KEY']);

    const settingsMap = (systemSettings || []).reduce((acc: Record<string, string>, curr: { key: string; value: string }) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {});

    const geminiKey = process.env.GEMINI_API_KEY || settingsMap['GEMINI_API_KEY'];
    const openaiKey = process.env.OPENAI_API_KEY || settingsMap['OPENAI_API_KEY'];

    if (!geminiKey && !openaiKey) {
      return NextResponse.json(
        { error: 'Nenhuma chave de IA configurada (GEMINI_API_KEY ou OPENAI_API_KEY). Configure em Admin → IA.' },
        { status: 400 }
      );
    }

    const systemPrompt = `Você é um especialista em social media e criação de legendas para Instagram em português brasileiro.
Crie uma legenda chamativa e profissional para ${mediaType === 'REELS' ? 'um REELS (vídeo curto)' : 'um POST (imagem)'}.
Regras:
- Somente o texto da legenda (sem título, sem aspas, sem "Legenda:").
- Máximo 2000 caracteres.
- Use no máximo 3 emojis relevantes.
- Texto fluido com quebras de linha naturais (máx. 2 quebras de linha seguidas).
- Termine com 3 a 5 hashtags relevantes separadas por espaço.`;

    const userPrompt = topic
      ? `Tema/assunto do post: "${topic}".`
      : 'Crie uma legenda genérica de engajamento que funcione para qualquer nicho.';

    let caption = '';

    if (geminiKey) {
      const res = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=' + geminiKey,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: systemPrompt }] },
            contents: [{ role: 'user', parts: [{ text: userPrompt }] }]
          })
        }
      );
      const data = await res.json();
      if (data.error) {
        return NextResponse.json({ error: data.error.message || 'Erro ao gerar legenda com a IA.' }, { status: 500 });
      }
      caption = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    } else {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          max_tokens: 700
        })
      });
      const data = await res.json();
      if (data.error) {
        return NextResponse.json({ error: data.error.message || 'Erro ao gerar legenda com a IA.' }, { status: 500 });
      }
      caption = data.choices?.[0]?.message?.content || '';
    }

    caption = caption.trim().replace(/^["'`]+|["'`]+$/g, '');

    if (!caption) {
      return NextResponse.json({ error: 'A IA não retornou uma legenda. Tente novamente.' }, { status: 500 });
    }

    return NextResponse.json({ caption: caption.slice(0, 2200) });
  } catch (err: unknown) {
    console.error('Erro ao gerar legenda com IA:', err);
    return NextResponse.json(
      { error: 'Erro interno: ' + (err instanceof Error ? err.message : String(err)) },
      { status: 500 }
    );
  }
}
