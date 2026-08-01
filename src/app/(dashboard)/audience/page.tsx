import { createClient } from '@/utils/supabase/server';
import { AudienceTable } from '@/components/audience/AudienceTable';
import { Users } from 'lucide-react';
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

  const leads = contacts || [];

  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-600" />
            Audiência e Leads
          </h1>
          <p className="text-gray-500 mt-1">Gerencie as pessoas que interagiram com seu bot no Instagram.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm flex items-center gap-3">
            <div className="text-sm font-medium text-gray-500">Total de Leads</div>
            <div className="text-xl font-bold text-gray-900">{leads.length}</div>
          </div>
        </div>
      </div>

      <AudienceTable contacts={leads} />
    </div>
  );
}
