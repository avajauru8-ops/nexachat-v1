'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Search, Folder, Plus, Trash2,
  Play, Pause, Copy, Edit
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { publishFlow, deleteFlow, duplicateFlow } from './actions';

export interface FlowItem {
  id: string;
  name: string;
  status: string;
  triggers: Record<string, unknown>;
  trigger_type?: string;
  updated_at: string;
  execution_count?: number;
}

interface Props {
  initialFlows: FlowItem[];
}

export function FlowsListClient({ initialFlows }: Props) {
  const router = useRouter();
  const [flows, setFlows] = useState<FlowItem[]>(initialFlows);
  const [search, setSearch] = useState('');
  const [triggerFilter, setTriggerFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [activeFolder, setActiveFolder] = useState('all');
  const [folders, setFolders] = useState(['Geral', 'Básico', 'Vendas']);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(4);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, triggerFilter, statusFilter, activeFolder]);

  const timeAgo = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 60000);
    if (diff < 1) return 'agora';
    if (diff < 60) return `há ${diff} min`;
    if (diff < 1440) return `há ${Math.floor(diff / 60)}h`;
    return date.toLocaleDateString('pt-BR');
  };

  // Filtragem dos fluxos
  const filteredFlows = flows.filter(flow => {
    const nameMatch = flow.name.toLowerCase().includes(search.toLowerCase());
    const keyword = ((flow.triggers as Record<string, unknown>)?.keyword as string || '').toLowerCase();
    const keywordMatch = keyword.includes(search.toLowerCase());

    const isMatchSearch = nameMatch || keywordMatch;

    let isMatchStatus = true;
    if (statusFilter === 'published') {
      isMatchStatus = flow.status === 'published' || flow.status === 'active';
    } else if (statusFilter === 'draft') {
      isMatchStatus = flow.status === 'draft' || flow.status === 'paused';
    }

    return isMatchSearch && isMatchStatus;
  });

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentFlows = filteredFlows.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredFlows.length / itemsPerPage);

  const handleTogglePublish = async (id: string, currentStatus: string) => {
    const isCurrentlyPublished = currentStatus === 'published' || currentStatus === 'active';
    const newStatus = isCurrentlyPublished ? 'draft' : 'active';

    // Optimistic Update
    setFlows(prev => prev.map(f => f.id === id ? { ...f, status: newStatus } : f));

    try {
      const res = await publishFlow(id, !isCurrentlyPublished);
      if (res.error) throw new Error(res.error);
      toast.success(isCurrentlyPublished ? 'Automação pausada!' : 'Automação publicada com sucesso!');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao atualizar status do fluxo');
      setFlows(prev => prev.map(f => f.id === id ? { ...f, status: currentStatus } : f));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir esta automação?')) return;
    try {
      const res = await deleteFlow(id);
      if (res.error) throw new Error(res.error);
      setFlows(prev => prev.filter(f => f.id !== id));
      toast.success('Automação excluída');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao excluir automação');
    }
  };

  const handleDuplicate = async (id: string) => {
    const toastId = toast.loading('Duplicando automação...');
    try {
      const res = await duplicateFlow(id);
      if (res.error) throw new Error(res.error);
      toast.success('Automação duplicada com sucesso!', { id: toastId });
      router.push(`/flows/builder/${res.id}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao duplicar automação', { id: toastId });
    }
  };

  const handleCreateFolder = () => {
    const folderName = prompt('Digite o nome da nova pasta:');
    if (folderName && folderName.trim()) {
      setFolders(prev => [...prev, folderName.trim()]);
      setActiveFolder(folderName.trim());
      toast.success(`Pasta "${folderName}" criada!`);
    }
  };

  return (
    <div className="flex h-full -m-6 bg-white overflow-hidden">
      
      {/* Sidebar de Pastas & Filtros (Estilo Manychat Pro) */}
      <div className="w-64 border-r border-gray-200 bg-[#f9fafb] flex flex-col hidden lg:flex shrink-0">
        <div className="p-4 space-y-1 mt-2">
          <button 
            onClick={() => setActiveFolder('all')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
              activeFolder === 'all' ? 'bg-gray-200/80 text-gray-900 shadow-sm' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center gap-2">
              <Folder className="w-4 h-4 text-blue-600" />
              <span>Minhas Automações</span>
            </div>
            <span className="bg-white border border-gray-200 text-gray-600 text-xs px-2 py-0.5 rounded-full font-bold">
              {flows.length}
            </span>
          </button>

          <div className="pt-4 pb-2 px-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center justify-between">
            <span>Pastas</span>
            <button onClick={handleCreateFolder} className="hover:text-blue-600 font-bold">+</button>
          </div>

          {folders.map(folder => (
            <button
              key={folder}
              onClick={() => setActiveFolder(folder)}
              className={`w-full flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeFolder === folder ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Folder className="w-4 h-4 mr-2.5 text-gray-400" />
              {folder}
            </button>
          ))}
        </div>
      </div>

      {/* Conteúdo Principal */}
      <div className="flex-1 flex flex-col overflow-y-auto bg-white p-8">
        
        {/* Header Superior */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Automações do Instagram</h1>
            <p className="text-sm text-gray-500 mt-1">Crie e gerencie fluxos interativos acionados por DMs, comentários e stories.</p>
          </div>
          <Link 
            href="/flows/builder/new" 
            className="bg-[#0064e0] text-white px-5 py-2.5 rounded-lg font-semibold text-sm hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Nova Automação
          </Link>
        </div>

        {/* Linha de Busca e Filtros */}
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <div className="flex items-center bg-white border border-gray-300 rounded-lg px-3.5 py-2 flex-1 min-w-[240px] focus-within:ring-2 focus-within:ring-blue-100 focus-within:border-blue-500 transition-all shadow-sm">
            <Search className="w-4 h-4 text-gray-400 mr-2" />
            <input 
              type="text" 
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Pesquisar por nome ou palavra-chave..." 
              className="bg-transparent border-none outline-none text-sm w-full text-gray-800 placeholder-gray-400"
            />
          </div>

          <select 
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="bg-white border border-gray-300 text-gray-700 text-sm rounded-lg px-3 py-2 outline-none hover:border-gray-400 shadow-sm"
          >
            <option value="all">Todos os status</option>
            <option value="published">🟢 Publicados (LIVE)</option>
            <option value="draft">🟡 Rascunhos (Pausados)</option>
          </select>

          <select 
            value={triggerFilter}
            onChange={e => setTriggerFilter(e.target.value)}
            className="bg-white border border-gray-300 text-gray-700 text-sm rounded-lg px-3 py-2 outline-none hover:border-gray-400 shadow-sm"
          >
            <option value="all">Qualquer gatilho</option>
            <option value="dm_keyword">DM: Palavra-chave</option>
            <option value="comment_keyword">Comentário em Post</option>
            <option value="story_reply">Resposta a Story</option>
          </select>
        </div>

        {/* Tabela de Fluxos */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#f9fafb] border-b border-gray-200 text-gray-500 text-xs font-semibold uppercase tracking-wider">
                <th className="pl-4 pr-2 py-3 w-10">
                  <input 
                    type="checkbox" 
                    onChange={(e) => {
                      if (e.target.checked) setSelectedIds(filteredFlows.map(f => f.id));
                      else setSelectedIds([]);
                    }}
                    checked={selectedIds.length > 0 && selectedIds.length === filteredFlows.length}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" 
                  />
                </th>
                <th className="px-4 py-3">Automação / Gatilho</th>
                <th className="px-4 py-3 w-32">Status</th>
                <th className="px-4 py-3 w-28">Execuções</th>
                <th className="px-4 py-3 w-36">Última alteração</th>
                <th className="px-4 py-3 w-20 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {currentFlows.length > 0 ? (
                currentFlows.map(flow => {
                  const keyword = (flow.triggers as Record<string, unknown>)?.keyword as string;
                  const isPublished = flow.status === 'published' || flow.status === 'active';

                  return (
                    <tr key={flow.id} className="hover:bg-gray-50/80 transition-colors group">
                      <td className="pl-4 pr-2 py-4">
                        <input 
                          type="checkbox" 
                          checked={selectedIds.includes(flow.id)}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedIds(prev => [...prev, flow.id]);
                            else setSelectedIds(prev => prev.filter(i => i !== flow.id));
                          }}
                          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" 
                        />
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex flex-col">
                          <Link href={`/flows/builder/${flow.id}`} className="font-bold text-gray-900 hover:text-blue-600 text-base transition-colors flex items-center gap-2">
                            {flow.name}
                          </Link>
                          
                          <div className="flex items-center gap-2 text-xs text-gray-500 mt-1.5">
                            <span className="flex items-center gap-1 bg-pink-50 text-pink-700 px-2 py-0.5 rounded-md border border-pink-100 font-medium">
                              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-pink-600"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg> Direct
                            </span>
                            <span>A mensagem contém:</span>
                            {keyword ? (
                              <span className="bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full font-semibold border border-blue-100">
                                &quot;{keyword}&quot;
                              </span>
                            ) : (
                              <span className="text-gray-400 italic">Qualquer mensagem</span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <button
                          onClick={() => handleTogglePublish(flow.id, flow.status)}
                          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all shadow-xs ${
                            isPublished
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200'
                              : 'bg-amber-100 text-amber-800 border border-amber-300 hover:bg-amber-200'
                          }`}
                          title={isPublished ? 'Clique para pausar automação' : 'Clique para publicar automação'}
                        >
                          {isPublished ? (
                            <>
                              <Play className="w-3 h-3 fill-current" /> PUBLICADO
                            </>
                          ) : (
                            <>
                              <Pause className="w-3 h-3 fill-current" /> RASCUNHO
                            </>
                          )}
                        </button>
                      </td>

                      <td className="px-4 py-4 font-semibold text-gray-800 text-sm">
                        {flow.execution_count} execuções
                      </td>

                      <td className="px-4 py-4 text-sm text-gray-500">
                        {timeAgo(flow.updated_at)}
                      </td>

                      <td className="px-4 py-4 text-right relative">
                        <div className="flex items-center justify-end gap-1">
                          <Link 
                            href={`/flows/builder/${flow.id}`}
                            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                            title="Editar fluxo visual"
                          >
                            <Edit className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => handleDuplicate(flow.id)}
                            className="p-1.5 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-md transition-colors"
                            title="Duplicar fluxo"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(flow.id)}
                            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                            title="Excluir fluxo"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center text-gray-400">
                      <Folder className="w-12 h-12 mb-3 text-gray-300" />
                      <p className="font-semibold text-gray-700 text-base mb-1">Nenhuma automação encontrada</p>
                      <p className="text-sm text-gray-500 mb-6">Crie uma nova automação para começar a responder seus leads no Instagram.</p>
                      <Link 
                        href="/flows/builder/new"
                        className="bg-[#0064e0] text-white px-4 py-2 rounded-lg font-semibold text-sm hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm"
                      >
                        <Plus className="w-4 h-4" />
                        Criar Primeira Automação
                      </Link>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        {filteredFlows.length > 0 && (
          <div className="mt-4 flex items-center justify-between bg-white px-4 py-3 border border-gray-200 rounded-xl shadow-sm">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-700">Mostrar</span>
              <select 
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-gray-50 border border-gray-300 text-gray-700 text-sm rounded-lg px-2 py-1 outline-none font-medium hover:border-gray-400 cursor-pointer"
              >
                <option value={4}>4</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
              <span className="text-sm text-gray-700">por página</span>
            </div>
            
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-700">
                Página <span className="font-bold text-gray-900">{currentPage}</span> de <span className="font-bold text-gray-900">{totalPages}</span>
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 hover:text-gray-900 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-semibold shadow-xs transition-colors"
                >
                  Anterior
                </button>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 hover:text-gray-900 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-semibold shadow-xs transition-colors"
                >
                  Próxima
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
