import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { inngest } from '@/inngest/client';
import { waitUntil } from '@vercel/functions';
import { processMetaPayload } from '@/utils/webhookProcessor';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

import { getMetaCredentials } from '@/utils/metaCredentials';

/**
 * Validação da Assinatura Meta (X-Hub-Signature-256)
 */
function verifySignature(payload: string, signature: string | null, appSecret: string): boolean {
  if (!signature || !appSecret) return true;

  try {
    const expectedSignature = 'sha256=' + crypto
      .createHmac('sha256', appSecret)
      .update(payload)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(signature)
    );
  } catch (err) {
    console.error('[Webhook] Signature check error:', err);
    return false;
  }
}

/**
 * GET: Verificação de Endpoint (Chamado pela Meta ao configurar o Webhook no App Dashboard)
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const { verifyToken } = await getMetaCredentials();

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('[Webhook] Verificação de webhook Meta bem-sucedida!');
    return new NextResponse(challenge, { status: 200 });
  }

  return new NextResponse('Forbidden', { status: 403 });
}

/**
 * POST: Recepção de Eventos (Mensagens, Comentários, Stories)
 * Arquitetura Event-Driven: Valida assinatura, salva raw log em `events_log`, 
 * dispara evento assíncrono para o Inngest e responde 200 OK em <1s.
 */
export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-hub-signature-256');

    const { appSecret } = await getMetaCredentials();

    // 1. Verificação de Segurança (X-Hub-Signature-256)
    if (appSecret && signature) {
      const isValid = verifySignature(rawBody, signature, appSecret);
      if (!isValid) {
        console.warn('[Webhook] Assinatura HMAC-SHA256 inválida recusada.');
        return new NextResponse('Unauthorized', { status: 401 });
      }
    }

    const body = JSON.parse(rawBody);

    if (body.object === 'instagram') {
      console.log(`[Webhook HTTP] Payload Meta recebido. Entry count: ${body.entry?.length || 0}`);

      // 2. Tentar identificar o workspace correspondente (a partir da conta do IG cadastrada)
      let workspaceId: string | null = null;
      let recipientId: string | null = null;

      if (body.entry && body.entry.length > 0) {
        const firstEntry = body.entry[0];
        recipientId = firstEntry.id || firstEntry.messaging?.[0]?.recipient?.id || null;
        if (recipientId) {
          const { data: account } = await supabase
            .from('instagram_accounts')
            .select('workspace_id')
            .or(`ig_user_id.eq.${recipientId},page_id.eq.${recipientId}`)
            .limit(1)
            .maybeSingle();
          if (account) {
            workspaceId = account.workspace_id;
          }
        }
      }

      // Determinar o tipo de evento (messaging, comment, mention, etc)
      let eventType = 'unknown';
      if (body.entry?.[0]?.messaging) {
        eventType = 'messages';
      } else if (body.entry?.[0]?.changes?.[0]?.value?.item === 'comment') {
        eventType = 'comment';
      } else if (body.entry?.[0]?.changes?.[0]?.field === 'mentions') {
        eventType = 'mention';
      }

      // 3. Gravação Bruta no Banco de Dados (events_log) para auditoria e resiliência
      const { data: logEntry, error: logError } = await supabase
        .from('events_log')
        .insert({
          workspace_id: workspaceId,
          event_type: eventType,
          raw_payload: body,
          processed: false
        })
        .select('id')
        .single();

      if (logError) {
        console.error('[Webhook] Erro ao gravar evento em events_log:', logError);
      }

      // 4. Enfileirar no Inngest (Se tiver key configurada)
      try {
        await inngest.send({
          name: 'instagram/event.received',
          data: {
            eventId: logEntry?.id || null,
            workspaceId,
            recipientId,
            payload: body
          }
        });
      } catch (inngestErr) {
        console.error('[Webhook] Falha ao disparar evento no Inngest:', inngestErr);
      }

      // 4.1 Processamento Síncrono de Fundo usando @vercel/functions waitUntil
      // Isso garante que mesmo sem o Inngest pago configurado, a mensagem chegará no Inbox.
      waitUntil(
        processMetaPayload(body, workspaceId).catch(err => {
          console.error('[Webhook] Erro no processamento de fundo Vercel:', err);
        })
      );

      // 5. Retorno imediato para a Meta (< 1 segundo)
      return new NextResponse('EVENT_RECEIVED', { status: 200 });
    }

    return new NextResponse('Not Found', { status: 404 });
  } catch (error) {
    console.error('[Webhook] Erro inesperado ao processar requisição:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
