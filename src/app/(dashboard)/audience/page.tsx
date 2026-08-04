import { createClient } from '@/utils/supabase/server';
import { AudienceTable } from '@/components/audience/AudienceTable';
import { Users, UserPlus, Tag as TagIcon, MessageSquare } from 'lucide-react';
import { redirect } from 'next/navigation';

export default async function AudiencePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  // Obter o workspace primário do usuário
  const { data: workspace } = await supabase
    .from('workspaces')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!workspace) {
    return <div>Workspace não encontrado.</div>;
  }

  // Buscar todos os contatos do workspace e suas tags associadas
  const { data: contacts, error } = await supabase
    .from('contacts')
    .select(`
      id, 
      ig_scoped_id, 
      name, 
      profile_picture, 
      created_at,
      custom_fields,
      contact_tags (
        tag_id,
        tags (
          name
        )
      )
    `)
    .eq('workspace_id', workspace.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Erro ao buscar leads:', error);
  }

  const rawContacts: any[] = contacts || [];

  // Buscar conversas para saber a última interação de cada lead
  const convMap: Record<string, string | null> = {};
  const contactIds = rawContacts.map((c) => c.id);

  for (let i = 0; i < contactIds.length; i += 100) {
    const chunk = contactIds.slice(i, i + 100);
    const { data: convs } = await supabase
      .from('conversations')
      .select('contact_id, last_interaction_at')
      .in('contact_id', chunk);

    (convs || []).forEach((c: any) => {
      const current = convMap[c.contact_id];
      if (!current || (c.last_interaction_at && new Date(c.last_interaction_at) > new Date(current))) {
        convMap[c.contact_id] = c.last_interaction_at || null;
      }
    });
  }

  const leads = rawContacts.map((c) => ({
    ...c,
    last_interaction_at: convMap[c.id] || null
  }));

  const now = Date.now();
  const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();

  const totalLeads = leads.length;
  const newThisWeek = leads.filter((l) => new Date(l.created_at) >= new Date(weekAgo)).length;
  const withTags = leads.filter((l) => (l.contact_tags?.length || 0) > 0).length;
  const activeThisWeek = leads.filter((l) => l.last_interaction_at && new Date(l.last_interaction_at) >= new Date(weekAgo)).length;

  const stats = [
    { icon: Users, label: 'Total de Leads', value: totalLeads, color: 'text-pink-600 bg-pink-50 border-pink-200' },
    { icon: UserPlus, label: 'Novos (7 dias)', value: newThisWeek, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
    { icon: TagIcon, label: 'Com Tags', value: withTags, color: 'text-indigo-600 bg-indigo-50 border-indigo-200' },
    { icon: MessageSquare, label: 'Interagiram (7 dias)', value: activeThisWeek, color: 'text-blue-600 bg-blue-50 border-blue-200' }
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-instagram-gradient flex items-center justify-center text-white shadow-md shadow-pink-500/20">
              <Users className="w-5 h-5" />
            </div>
            Audiência e Leads
          </h1>
          <p className="text-gray-500 mt-1">Gerencie as pessoas que interagiram com seu bot no Instagram.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className={`bg-white/60 backdrop-blur-md rounded-2xl border p-5 flex items-center gap-4 shadow-sm ${s.color.split(' ').slice(2).join(' ')}`}>
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center border ${s.color}`}>
              <s.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-black text-gray-900 leading-none">{s.value}</p>
              <p className="text-[11px] font-bold text-gray-500 mt-1">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <AudienceTable contacts={leads} />
    </div>
  );
}
