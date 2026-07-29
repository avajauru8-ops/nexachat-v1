import { PlusCircle, Play, MoreVertical } from 'lucide-react'
import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export default async function FlowsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  let { data: workspace } = await supabase.from('workspaces').select('id').eq('user_id', user.id).single();
  if (!workspace) {
    const { data: latestWs } = await supabase.from('workspaces').select('id').order('created_at', { ascending: false }).limit(1).single();
    workspace = latestWs;
  }
  
  if (!workspace?.id) {
    return <div className="p-8 text-center text-slate-500">Workspace não encontrado.</div>;
  }

  const { data: flows } = await supabase
    .from('flows')
    .select('*')
    .eq('workspace_id', workspace.id)
    .order('updated_at', { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Fluxos de Automação</h1>
          <p className="text-slate-500 mt-1">Crie e gerencie seus funis de atendimento automático</p>
        </div>
        <Link 
          href="/flows/builder/new"
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors shadow-sm"
        >
          <PlusCircle className="w-5 h-5" />
          Novo Fluxo
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {flows && flows.length > 0 ? flows.map((flow: any) => {
          const keyword = typeof flow.triggers === 'object' && flow.triggers !== null ? flow.triggers.keyword : '';
          const flowDesc = flow.description || (keyword ? `Gatilho: "${keyword}"` : 'Nenhuma descrição fornecida.');
          const isActive = flow.status === 'active' || flow.is_active;

          return (
            <div key={flow.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col group hover:border-blue-200 hover:shadow-md transition-all">
              <div className="p-5 flex-1">
                <div className="flex justify-between items-start mb-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isActive ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                    <Play className="w-5 h-5" />
                  </div>
                  <button className="p-1.5 text-slate-400 hover:bg-slate-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                    <MoreVertical className="w-5 h-5" />
                  </button>
                </div>
                <h3 className="font-bold text-slate-800 text-lg mb-1">{flow.name}</h3>
                <p className="text-sm text-slate-500 line-clamp-2">
                  {flowDesc}
                </p>
              </div>
              
              <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>
                  <span className="text-xs font-semibold text-slate-600">{isActive ? 'Ativo (LIVE)' : 'Inativo'}</span>
                </div>
                <Link 
                  href={`/flows/builder/${flow.id}`}
                  className="text-sm font-bold text-blue-600 hover:text-blue-700"
                >
                  Editar
                </Link>
              </div>
            </div>
          );
        }) : (
          <div className="col-span-full py-12 text-center bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
             <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                <Play className="w-8 h-8 text-slate-300" />
             </div>
             <h3 className="text-lg font-bold text-slate-800 mb-2">Nenhum fluxo criado</h3>
             <p className="text-slate-500 max-w-md mx-auto mb-6">Você ainda não criou nenhuma automação. Crie seu primeiro fluxo para começar a atender seus clientes no automático.</p>
             <Link 
                href="/flows/builder/new"
                className="inline-flex items-center gap-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 px-4 py-2 rounded-lg font-semibold transition-colors shadow-sm"
              >
                <PlusCircle className="w-5 h-5" />
                Criar Primeiro Fluxo
              </Link>
          </div>
        )}
      </div>
    </div>
  )
}
