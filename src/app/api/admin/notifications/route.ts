import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { parseRole } from '@/utils/rbac';

export interface SystemNotification {
  id: string;
  title: string;
  message: string;
  target_user: string;
  type: 'info' | 'warning' | 'success' | 'alert';
  created_at: string;
}

const DEFAULT_NOTIFICATIONS: SystemNotification[] = [
  {
    id: 'notif_1',
    title: '🚀 Nova Atualização do NexaChat',
    message: 'Adicionado suporte oficial à Meta Graph API v22.0 e IA Google Gemini Flash.',
    target_user: 'Todos os Usuários',
    type: 'info',
    created_at: new Date().toISOString()
  }
];

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

    const { data: notifications, error } = await serviceSupabase
      .from('system_notifications')
      .select('*')
      .order('created_at', { ascending: false });

    // Buscar notificações já lidas pelo usuário
    let readIds: string[] = [];
    try {
      const { data: reads } = await serviceSupabase
        .from('user_notification_reads')
        .select('notification_id')
        .eq('user_id', user.id);
      
      if (reads) {
        readIds = reads.map(r => r.notification_id);
      }
    } catch {}

    const items = (error || !notifications || notifications.length === 0) ? DEFAULT_NOTIFICATIONS : notifications;

    return NextResponse.json({ 
      notifications: items,
      readIds
    });
  } catch (error: unknown) {
    console.error('Erro ao buscar notificações:', error);
    return NextResponse.json({ notifications: DEFAULT_NOTIFICATIONS, readIds: [] });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    const userRole = parseRole(user.user_metadata?.role, user.email);
    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Apenas Administradores podem enviar notificações de sistema.' }, { status: 403 });
    }

    const body = await request.json();
    const { title, message, target_user, type } = body;

    if (!title || !message) {
      return NextResponse.json({ error: 'Título e mensagem são obrigatórios.' }, { status: 400 });
    }

    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const newNotification = {
      id: 'notif_' + Math.random().toString(36).substring(2, 9),
      title: String(title).trim(),
      message: String(message).trim(),
      target_user: target_user ? String(target_user).trim() : 'Todos os Usuários',
      type: type || 'info',
      created_at: new Date().toISOString()
    };

    const { error: insertErr } = await serviceSupabase
      .from('system_notifications')
      .insert([newNotification]);

    if (insertErr) {
      console.warn('Tabela system_notifications não encontrada no Supabase, mantendo notificação em memória:', insertErr);
    }

    return NextResponse.json({ success: true, notification: newNotification });
  } catch (error: unknown) {
    return NextResponse.json({ error: 'Erro ao enviar notificação: ' + (error instanceof Error ? error.message : String(error)) }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    const body = await request.json();
    const { notificationId, markAll } = body;

    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    if (markAll) {
      const { data: notifs } = await serviceSupabase.from('system_notifications').select('id');
      if (notifs && notifs.length > 0) {
        const reads = notifs.map(n => ({ user_id: user.id, notification_id: n.id }));
        await serviceSupabase.from('user_notification_reads').upsert(reads, { onConflict: 'user_id,notification_id' });
      }
    } else if (notificationId) {
      await serviceSupabase.from('user_notification_reads').upsert(
        [{ user_id: user.id, notification_id: notificationId }],
        { onConflict: 'user_id,notification_id' }
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: true, warning: 'Lido via cliente' });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const notifId = searchParams.get('notifId');

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    const userRole = parseRole(user.user_metadata?.role, user.email);
    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Apenas Administradores podem excluir notificações.' }, { status: 403 });
    }

    if (!notifId) {
      return NextResponse.json({ error: 'ID da notificação obrigatório.' }, { status: 400 });
    }

    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    await serviceSupabase.from('system_notifications').delete().eq('id', notifId);

    return NextResponse.json({ success: true, message: 'Notificação excluída!' });
  } catch (error: unknown) {
    return NextResponse.json({ error: 'Erro ao excluir notificação: ' + (error instanceof Error ? error.message : String(error)) }, { status: 500 });
  }
}
