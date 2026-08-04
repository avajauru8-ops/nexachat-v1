import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { parseRole } from '@/utils/rbac';
import { DEFAULT_DASHBOARD_MENUS, type DashboardMenu } from '@/utils/dashboardMenus';

const SETTINGS_KEY = 'DASHBOARD_MENUS';

function mergeMenus(stored: unknown): DashboardMenu[] {
  const storedList = Array.isArray(stored) ? stored : [];
  return DEFAULT_DASHBOARD_MENUS.map((defaultMenu) => {
    const storedMenu = storedList.find((item: unknown) =>
      item && typeof item === 'object' && (item as DashboardMenu).key === defaultMenu.key
    ) as Partial<DashboardMenu> | undefined;

    if (!storedMenu) return { ...defaultMenu };

    return {
      key: defaultMenu.key,
      label: typeof storedMenu.label === 'string' ? storedMenu.label : defaultMenu.label,
      href: defaultMenu.href,
      enabled: typeof storedMenu.enabled === 'boolean' ? storedMenu.enabled : defaultMenu.enabled,
      maintenance: typeof storedMenu.maintenance === 'boolean' ? storedMenu.maintenance : defaultMenu.maintenance
    };
  });
}

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
      .select('value')
      .eq('key', SETTINGS_KEY)
      .maybeSingle();

    let stored: unknown = null;
    if (settings?.value) {
      try {
        stored = JSON.parse(settings.value);
      } catch {
        stored = null;
      }
    }

    return NextResponse.json({ menus: mergeMenus(stored) });
  } catch (error: unknown) {
    console.error('Erro ao buscar menus:', error);
    return NextResponse.json({ menus: DEFAULT_DASHBOARD_MENUS });
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
      return NextResponse.json({ error: 'Acesso negado. Apenas Administradores podem gerenciar os menus.' }, { status: 403 });
    }

    const body = await request.json();
    const incoming: DashboardMenu[] = Array.isArray(body.menus) ? body.menus : [];

    const sanitized = mergeMenus(incoming).map((menu) => ({
      key: menu.key,
      label: menu.label,
      href: menu.href,
      enabled: menu.enabled,
      maintenance: menu.maintenance
    }));

    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error: upsertErr } = await serviceSupabase
      .from('system_settings')
      .upsert({ key: SETTINGS_KEY, value: JSON.stringify(sanitized) }, { onConflict: 'key' });

    if (upsertErr) {
      console.warn('Aviso no upsert de menus:', upsertErr);
    }

    return NextResponse.json({ success: true, menus: sanitized });
  } catch (error: unknown) {
    console.error('Erro ao salvar menus:', error);
    return NextResponse.json({ error: 'Erro ao salvar no servidor: ' + (error instanceof Error ? error.message : String(error)) }, { status: 500 });
  }
}
