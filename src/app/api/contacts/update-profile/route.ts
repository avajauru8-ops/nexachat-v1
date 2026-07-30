import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { contactId, profile_picture, name, username, email, phone } = await request.json();

    if (!contactId) {
      return NextResponse.json({ error: 'ID do contato é obrigatório' }, { status: 400 });
    }

    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const updateData: Record<string, any> = {};
    if (profile_picture !== undefined) updateData.profile_picture = profile_picture;
    if (name !== undefined) updateData.name = name;
    if (username !== undefined) updateData.username = username;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;

    const { data: updatedContact, error } = await serviceSupabase
      .from('contacts')
      .update(updateData)
      .eq('id', contactId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, contact: updatedContact });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro interno no servidor';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
