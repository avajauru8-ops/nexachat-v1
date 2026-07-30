import { createClient as createServiceClient } from '@supabase/supabase-js';

export interface MetaCredentials {
  appId: string;
  appSecret: string;
  verifyToken: string;
}

export async function getMetaCredentials(): Promise<MetaCredentials> {
  try {
    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: settings } = await serviceSupabase
      .from('system_settings')
      .select('key, value')
      .in('key', ['META_APP_ID', 'META_APP_SECRET', 'META_VERIFY_TOKEN']);

    const settingsMap: Record<string, string> = {};
    if (settings && settings.length > 0) {
      settings.forEach(item => {
        if (item.value) {
          settingsMap[item.key] = item.value;
        }
      });
    }

    return {
      appId: settingsMap['META_APP_ID'] || process.env.META_APP_ID || '1762123168122342',
      appSecret: settingsMap['META_APP_SECRET'] || process.env.META_APP_SECRET || '717ea4b8e025223a6e314725369d76a5',
      verifyToken: settingsMap['META_VERIFY_TOKEN'] || process.env.META_VERIFY_TOKEN || 'nexachat_webhook_secret_2026'
    };
  } catch (e) {
    console.warn('Aviso ao buscar credenciais da Meta no banco de dados:', e);
    return {
      appId: process.env.META_APP_ID || '1762123168122342',
      appSecret: process.env.META_APP_SECRET || '717ea4b8e025223a6e314725369d76a5',
      verifyToken: process.env.META_VERIFY_TOKEN || 'nexachat_webhook_secret_2026'
    };
  }
}
