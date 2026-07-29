import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { inngest } from '@/inngest/client';

// Token de verificação configurado no Meta App Dashboard
const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN || 'nexachat_secure_verify_token_123';
const APP_SECRET = process.env.META_APP_SECRET || '';

// Validação da Assinatura (X-Hub-Signature-256)
function verifySignature(payload: string, signature: string | null): boolean {
  if (!signature || !APP_SECRET) return true; // Para ambiente de dev sem secret, podemos pular, mas idealmente sempre validar

  const expectedSignature = 'sha256=' + crypto
    .createHmac('sha256', APP_SECRET)
    .update(payload)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature),
    Buffer.from(signature)
  );
}

// GET: Verificação de Endpoint (Chamado pela Meta ao configurar o Webhook)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('Webhook verified successfully!');
    // Retorna apenas o challenge em plain text
    return new NextResponse(challenge, { status: 200 });
  }

  return new NextResponse('Forbidden', { status: 403 });
}

// POST: Recepção de Eventos (Mensagens, Comentários, Stories)
export async function POST(request: Request) {
  try {
    // Pegar o body como texto cru para validação da assinatura
    const rawBody = await request.text();
    const signature = request.headers.get('x-hub-signature-256');

    // if (!verifySignature(rawBody, signature)) {
    //   console.error('Invalid signature');
    //   return new NextResponse('Invalid signature', { status: 401 });
    // }

    const body = JSON.parse(rawBody);

    // O retorno DEVE ser rápido para a Meta (200 OK)
    // Então, idealmente, despachamos para uma fila (ex: Inngest/QStash)
    // Para o MVP inicial, vamos processar de forma assíncrona simples (não aguardada)
    
    if (body.object === 'instagram') {
      // Dispara o evento para o Inngest processar em background de forma resiliente
      await inngest.send({
        name: 'instagram/webhook.received',
        data: body
      });

      return new NextResponse('EVENT_RECEIVED', { status: 200 });
    }

    return new NextResponse('Not Found', { status: 404 });
  } catch (error) {
    console.error('Error handling webhook:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}


