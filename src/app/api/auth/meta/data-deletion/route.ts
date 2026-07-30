import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const APP_SECRET = process.env.META_APP_SECRET || '';

function parseSignedRequest(signedRequest: string) {
  const [encodedSig, payload] = signedRequest.split('.', 2);
  
  if (!encodedSig || !payload) return null;

  const sig = Buffer.from(encodedSig.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('hex');
  const data = JSON.parse(Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));

  if (data.algorithm.toUpperCase() !== 'HMAC-SHA256') {
    return null;
  }

  const expectedSig = crypto
    .createHmac('sha256', APP_SECRET)
    .update(payload)
    .digest('hex');

  if (sig !== expectedSig) {
    return null;
  }

  return data;
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const signedRequest = formData.get('signed_request');

    if (!signedRequest || typeof signedRequest !== 'string') {
      return new NextResponse('Invalid request', { status: 400 });
    }

    const data = parseSignedRequest(signedRequest);

    if (!data) {
      return new NextResponse('Invalid signature', { status: 400 });
    }

    const userId = data.user_id;

    if (userId) {
      console.log(`[Data Deletion] Removendo dados do usuário IG_USER_ID: ${userId}`);
      await supabase
        .from('instagram_accounts')
        .delete()
        .eq('ig_user_id', userId);
    }

    // A Meta exige que essa rota retorne um JSON com uma URL de confirmação e um código
    return NextResponse.json({ 
      url: `https://nexachat-v1.vercel.app/data-deletion-status?id=${userId}`,
      confirmation_code: userId 
    });
  } catch (error) {
    console.error('Error handling data deletion:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
