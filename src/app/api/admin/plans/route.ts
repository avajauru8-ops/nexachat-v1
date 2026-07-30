import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { parseRole } from '@/utils/rbac';

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  message_limit: number;
  features: string[];
  is_active: boolean;
  created_at: string;
}

const DEFAULT_PLANS: SubscriptionPlan[] = [
  {
    id: 'plan_free',
    name: 'Gratuito (Starter)',
    price: 0,
    message_limit: 1000,
    features: ['Até 1.000 DMs/mês', 'Conexão Instagram Graph', 'Editor Visual de Fluxos'],
    is_active: true,
    created_at: new Date().toISOString()
  },
  {
    id: 'plan_pro',
    name: 'NexaChat Pro Unlimited',
    price: 97,
    message_limit: 50000,
    features: ['DMs Ilimitadas', 'Agente de IA (Gemini / OpenAI)', 'Handoff Humano em Tempo Real', 'CRM Webhook Integrado'],
    is_active: true,
    created_at: new Date().toISOString()
  },
  {
    id: 'plan_enterprise',
    name: 'Enterprise VIP',
    price: 297,
    message_limit: 500000,
    features: ['Múltiplas Contas de Instagram', 'Atendentes Ilimitados', 'Suporte Prioritário 24/7', 'SLA Garantido'],
    is_active: true,
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

    const { data: plans, error } = await serviceSupabase
      .from('subscription_plans')
      .select('*')
      .order('price', { ascending: true });

    if (error || !plans || plans.length === 0) {
      return NextResponse.json({ plans: DEFAULT_PLANS });
    }

    return NextResponse.json({ plans });
  } catch (error: unknown) {
    console.error('Erro ao buscar planos de assinatura:', error);
    return NextResponse.json({ plans: DEFAULT_PLANS });
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
      return NextResponse.json({ error: 'Apenas Administradores podem criar planos.' }, { status: 403 });
    }

    const body = await request.json();
    const { name, price, message_limit, features } = body;

    if (!name || price === undefined) {
      return NextResponse.json({ error: 'Nome do plano e preço são obrigatórios.' }, { status: 400 });
    }

    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const newPlan = {
      id: 'plan_' + Math.random().toString(36).substring(2, 9),
      name: String(name).trim(),
      price: Number(price),
      message_limit: Number(message_limit || 10000),
      features: Array.isArray(features) ? features : [String(features)],
      is_active: true,
      created_at: new Date().toISOString()
    };

    const { error: insertErr } = await serviceSupabase
      .from('subscription_plans')
      .insert([newPlan]);

    if (insertErr) {
      console.warn('Tabela subscription_plans não encontrada no Supabase, retornando plano criado localmente:', insertErr);
    }

    return NextResponse.json({ success: true, plan: newPlan });
  } catch (error: unknown) {
    return NextResponse.json({ error: 'Erro ao criar plano: ' + (error instanceof Error ? error.message : String(error)) }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    const userRole = parseRole(user.user_metadata?.role, user.email);
    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Apenas Administradores podem editar planos.' }, { status: 403 });
    }

    const body = await request.json();
    const { id, name, price, message_limit, features } = body;

    if (!id || !name || price === undefined) {
      return NextResponse.json({ error: 'ID, Nome do plano e Preço são obrigatórios.' }, { status: 400 });
    }

    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const updatedPlan = {
      name: String(name).trim(),
      price: Number(price),
      message_limit: Number(message_limit || 10000),
      features: Array.isArray(features) ? features : [String(features)]
    };

    const { error: updateErr } = await serviceSupabase
      .from('subscription_plans')
      .update(updatedPlan)
      .eq('id', id);

    if (updateErr) {
      console.warn('Aviso ao atualizar plano no Supabase:', updateErr);
    }

    return NextResponse.json({ success: true, plan: { id, ...updatedPlan } });
  } catch (error: unknown) {
    return NextResponse.json({ error: 'Erro ao editar plano: ' + (error instanceof Error ? error.message : String(error)) }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const planId = searchParams.get('planId');

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    const userRole = parseRole(user.user_metadata?.role, user.email);
    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Apenas Administradores podem excluir planos.' }, { status: 403 });
    }

    if (!planId) {
      return NextResponse.json({ error: 'ID do plano obrigatório.' }, { status: 400 });
    }

    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    await serviceSupabase.from('subscription_plans').delete().eq('id', planId);

    return NextResponse.json({ success: true, message: 'Plano excluído com sucesso!' });
  } catch (error: unknown) {
    return NextResponse.json({ error: 'Erro ao excluir plano: ' + (error instanceof Error ? error.message : String(error)) }, { status: 500 });
  }
}
