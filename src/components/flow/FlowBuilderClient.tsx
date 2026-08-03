'use client';

import { useCallback, useState, useTransition } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  BackgroundVariant
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { TriggerNode } from '@/components/flow/nodes/TriggerNode';
import { MessageNode } from '@/components/flow/nodes/MessageNode';
import { DelayNode } from '@/components/flow/nodes/DelayNode';
import { ActionNode } from '@/components/flow/nodes/ActionNode';
import { ConditionNode } from '@/components/flow/nodes/ConditionNode';
import { HumanHandoffNode } from '@/components/flow/nodes/HumanHandoffNode';
import { AiHandoffNode } from '@/components/flow/nodes/AiHandoffNode';
import { CrmNode } from '@/components/flow/nodes/CrmNode';

import { saveFlow } from '@/app/(dashboard)/flows/actions';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { ArrowLeft, Save, Play, Download, Upload, Sparkles, UserCheck, Globe, Clock, Filter, MessageSquare, Tag, StickyNote, Plus } from 'lucide-react';

import { NoteNode } from '@/components/flow/nodes/NoteNode';
import { CommentReplyNode } from '@/components/flow/nodes/CommentReplyNode';

import { CustomEdge } from '@/components/flow/edges/CustomEdge';

const nodeTypes = {
  triggerNode: TriggerNode,
  commentReplyNode: CommentReplyNode,
  messageNode: MessageNode,
  delayNode: DelayNode,
  actionNode: ActionNode,
  conditionNode: ConditionNode,
  humanHandoffNode: HumanHandoffNode,
  human_handoff: HumanHandoffNode,
  aiHandoffNode: AiHandoffNode,
  ai_handoff: AiHandoffNode,
  crmNode: CrmNode,
  crm_webhook: CrmNode,
  noteNode: NoteNode
};

const edgeTypes = {
  customEdge: CustomEdge,
  default: CustomEdge
};

const initialNodesDefault: Node[] = [];
const initialEdgesDefault: Edge[] = [];

export function FlowBuilderClient({ 
  id, 
  initialFlowData, 
  initialName = 'Nova Automação',
  initialStatus = 'draft',
  initialAccountId = '',
  instagramAccounts = []
}: { 
  id: string;
  initialFlowData: Record<string, unknown> | null;
  initialName?: string;
  initialStatus?: string;
  initialAccountId?: string;
  instagramAccounts?: Record<string, unknown>[];
}) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>((initialFlowData?.nodes as Node[]) || (initialNodesDefault as Node[]));
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>((initialFlowData?.edges as Edge[]) || initialEdgesDefault);
  const [flowName, setFlowName] = useState(initialName);
  const [status, setStatus] = useState(initialStatus);
  const [accountId, setAccountId] = useState<string>(initialAccountId || ((instagramAccounts[0]?.id as string) || ''));
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<'visualizacao' | 'insights'>('visualizacao');
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);

  const onConnect = useCallback(
    (params: Connection | Edge) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const addNode = (type: string) => {
    let label = 'Novo Bloco';
    if (type === 'messageNode') label = 'Mensagem do Bot';
    if (type === 'commentReplyNode') label = 'Responder Comentário';
    if (type === 'triggerNode') label = 'Gatilho DM';
    if (type === 'delayNode') label = 'Atraso Inteligente';
    if (type === 'actionNode') label = 'Ação (Tags/Campos)';
    if (type === 'conditionNode') label = 'Condição (If/Else)';
    if (type === 'humanHandoffNode') label = 'Atendimento Humano';
    if (type === 'aiHandoffNode') label = 'Agente de IA';
    if (type === 'crmNode') label = 'Webhook CRM';
    if (type === 'noteNode') label = 'Nota Explicativa';

    const newNode: Node = {
      id: Math.random().toString(),
      type,
      position: { x: Math.random() * 200 + 200, y: Math.random() * 200 + 150 },
      data: { label, text: type === 'messageNode' ? 'Digite a mensagem de resposta...' : undefined }
    };
    setNodes((nds) => nds.concat(newNode));
    toast.success(`Bloco "${label}" adicionado ao canvas`);
  };

  const handleSaveFlow = (targetStatus: string = status) => {
    startTransition(async () => {
      try {
        const triggerNode = nodes.find((n) => n.type === 'triggerNode' || n.type === 'trigger');
        let triggers: Record<string, any> = { triggerType: 'keyword', keyword: '' };
        
        if (triggerNode && triggerNode.data) {
          triggers = {
            triggerType: (triggerNode.data.triggerType as string) || 'keyword',
            keyword: (triggerNode.data.keyword as string) || '',
            publicReply: triggerNode.data.publicReply as string || undefined,
            specificMediaId: triggerNode.data.specificMediaId as string || undefined
          };
        }

        const flowData = { nodes, edges };
        const res = await saveFlow(id, flowName, flowData, triggers, targetStatus, accountId);
        
        if (res.error) {
          toast.error(res.error);
          return;
        }
        
        const newId = res.id;
        
        setStatus(targetStatus);

        if (id === 'new') {
          toast.success('Automação criada com sucesso!');
          window.location.href = `/flows/builder/${newId}`;
        } else {
          toast.success(targetStatus === 'published' ? 'Automação publicada!' : 'Automação salva!');
        }
      } catch (err: unknown) {
        toast.error('Erro ao salvar: ' + (err instanceof Error ? err.message : String(err)));
      }
    });
  };

  const handleExportJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ nodes, edges }, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `${flowName.replace(/\s+/g, '_')}_fluxo.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    toast.success('JSON do fluxo exportado!');
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], "UTF-8");
      fileReader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (parsed.nodes && parsed.edges) {
            setNodes(parsed.nodes);
            setEdges(parsed.edges);
            toast.success('Fluxo importado do arquivo JSON!');
          } else {
            toast.error('Arquivo JSON inválido para fluxo.');
          }
        } catch {
          toast.error('Erro ao ler arquivo JSON');
        }
      };
    }
  };

  const isPublished = status === 'published' || status === 'active';

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] -m-6 bg-white overflow-hidden">
      
      {/* Header Superior Estilo Manychat / Builder */}
      <div className="h-16 border-b border-gray-200 flex items-center justify-between px-6 bg-white shrink-0 z-20">
        <div className="flex items-center gap-3">
          <Link href="/flows" className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-gray-900 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <input 
              type="text" 
              value={flowName} 
              onChange={(e) => setFlowName(e.target.value)}
              className="border-none bg-transparent font-bold text-gray-900 outline-none text-base focus:ring-1 focus:ring-blue-500 rounded px-1" 
              placeholder="Nome da Automação"
            />
            <div className="flex items-center gap-2 px-1">
              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                isPublished ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-amber-100 text-amber-800 border border-amber-200'
              }`}>
                {isPublished ? '🟢 PUBLICADO (LIVE)' : '🟡 RASCUNHO (PAUSADO)'}
              </span>
              
              {instagramAccounts && instagramAccounts.length > 0 && (
                <select
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className="text-[11px] font-medium border border-gray-300 rounded px-2 py-0.5 bg-gray-50 text-gray-700 outline-none focus:ring-1 focus:ring-blue-500 max-w-[150px] truncate"
                >
                  <option value="">Selecione a DM...</option>
                  {instagramAccounts.map((acc: any) => (
                    <option key={acc.id as string} value={acc.id as string}>
                      @{acc.ig_username || (acc.page_id !== 'native_ig_login' && acc.page_id !== 'ig_login_direct' && acc.page_id ? acc.page_id : acc.ig_user_id)}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
        </div>

        {/* Abas centrais */}
        <div className="flex items-center bg-gray-100 p-1 rounded-lg border border-gray-200">
          <button 
            onClick={() => setActiveTab('visualizacao')}
            className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${activeTab === 'visualizacao' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
          >
            Editor Visual (Canvas)
          </button>
          <button 
            onClick={() => setActiveTab('insights')}
            className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${activeTab === 'insights' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
          >
            Métricas & Insights
          </button>
        </div>

        {/* Botões de Ação */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportJson}
            className="p-2 border border-gray-200 hover:bg-gray-50 rounded-lg text-gray-600 text-xs font-medium flex items-center gap-1 transition-colors"
            title="Exportar JSON"
          >
            <Download className="w-4 h-4" />
          </button>

          <label className="p-2 border border-gray-200 hover:bg-gray-50 rounded-lg text-gray-600 text-xs font-medium cursor-pointer transition-colors" title="Importar JSON">
            <Upload className="w-4 h-4" />
            <input type="file" accept=".json" onChange={handleImportJson} className="hidden" />
          </label>

          <button 
            onClick={() => handleSaveFlow('draft')}
            disabled={isPending}
            className="px-4 py-2 border border-gray-300 text-gray-700 text-xs font-semibold rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            Salvar Rascunho
          </button>

          <button 
            onClick={() => handleSaveFlow('active')}
            disabled={isPending}
            className="px-4 py-2 bg-[#0064e0] text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            Publicar
          </button>
        </div>
      </div>

      {activeTab === 'visualizacao' ? (
        <div className="flex-1 flex overflow-hidden relative">
          
          {/* Floating Button Mobile */}
          <button 
            onClick={() => setIsPaletteOpen(!isPaletteOpen)} 
            className="md:hidden fixed bottom-6 right-6 p-4 bg-[#0064e0] text-white rounded-full shadow-lg z-50 flex items-center justify-center"
          >
            <Plus className="w-6 h-6" />
          </button>

          {/* Overlay Mobile */}
          {isPaletteOpen && (
            <div 
              className="fixed inset-0 bg-black/40 z-40 md:hidden"
              onClick={() => setIsPaletteOpen(false)}
            />
          )}

          {/* Sidebar Lateral de Blocos */}
          <div className={`absolute md:relative z-50 md:z-10 w-72 h-full bg-white border-r border-gray-200 p-5 flex flex-col gap-4 shadow-xl md:shadow-sm overflow-y-auto transition-transform duration-300 ease-in-out ${isPaletteOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
            <div className="flex justify-between items-center md:block">
              <div>
                <h2 className="font-bold text-gray-900 text-sm">Paleta de Blocos</h2>
                <p className="text-xs text-gray-500 mt-0.5 md:block hidden">Clique em um bloco para adicioná-lo ao fluxo visual.</p>
              </div>
            </div>

            <div className="space-y-2">
              <button 
                onClick={() => { addNode('triggerNode'); setIsPaletteOpen(false); }}
                className="w-full text-left px-3.5 py-2.5 bg-indigo-50 text-indigo-800 rounded-lg border border-indigo-200 hover:bg-indigo-100 transition-colors font-semibold text-xs flex items-center gap-2 shadow-xs"
              >
                <div className="w-2.5 h-2.5 rounded-full bg-indigo-600"></div>
                Gatilho (Palavra-chave DM)
              </button>

              <button 
                onClick={() => { addNode('messageNode'); setIsPaletteOpen(false); }}
                className="w-full text-left px-3.5 py-2.5 bg-emerald-50 text-emerald-800 rounded-lg border border-emerald-200 hover:bg-emerald-100 transition-colors font-semibold text-xs flex items-center gap-2 shadow-xs"
              >
                <MessageSquare className="w-4 h-4 text-emerald-600" />
                Mensagem do Bot
              </button>

              <button 
                onClick={() => { addNode('commentReplyNode'); setIsPaletteOpen(false); }}
                className="w-full text-left px-3.5 py-2.5 bg-orange-50 text-orange-800 rounded-lg border border-orange-200 hover:bg-orange-100 transition-colors font-semibold text-xs flex items-center gap-2 shadow-xs"
              >
                <MessageSquare className="w-4 h-4 text-orange-600" />
                Responder Comentário
              </button>

              <button 
                onClick={() => { addNode('delayNode'); setIsPaletteOpen(false); }}
                className="w-full text-left px-3.5 py-2.5 bg-amber-50 text-amber-800 rounded-lg border border-amber-200 hover:bg-amber-100 transition-colors font-semibold text-xs flex items-center gap-2 shadow-xs"
              >
                <Clock className="w-4 h-4 text-amber-600" />
                Atraso Inteligente
              </button>

              <button 
                onClick={() => { addNode('actionNode'); setIsPaletteOpen(false); }}
                className="w-full text-left px-3.5 py-2.5 bg-rose-50 text-rose-800 rounded-lg border border-rose-200 hover:bg-rose-100 transition-colors font-semibold text-xs flex items-center gap-2 shadow-xs"
              >
                <Tag className="w-4 h-4 text-rose-600" />
                Ação (Tag / Campos)
              </button>

              <button 
                onClick={() => { addNode('conditionNode'); setIsPaletteOpen(false); }}
                className="w-full text-left px-3.5 py-2.5 bg-purple-50 text-purple-800 rounded-lg border border-purple-200 hover:bg-purple-100 transition-colors font-semibold text-xs flex items-center gap-2 shadow-xs"
              >
                <Filter className="w-4 h-4 text-purple-600" />
                Condição (If / Else)
              </button>

              <button 
                onClick={() => { addNode('aiHandoffNode'); setIsPaletteOpen(false); }}
                className="w-full text-left px-3.5 py-2.5 bg-purple-50 text-purple-900 rounded-lg border border-purple-300 hover:bg-purple-100 transition-colors font-semibold text-xs flex items-center gap-2 shadow-xs"
              >
                <Sparkles className="w-4 h-4 text-purple-700" />
                Transferir para Agente IA
              </button>

              <button 
                onClick={() => { addNode('humanHandoffNode'); setIsPaletteOpen(false); }}
                className="w-full text-left px-3.5 py-2.5 bg-yellow-50 text-yellow-900 rounded-lg border border-yellow-300 hover:bg-yellow-100 transition-colors font-semibold text-xs flex items-center gap-2 shadow-xs"
              >
                <UserCheck className="w-4 h-4 text-yellow-700" />
                Handoff Atendente Humano
              </button>

              <button 
                onClick={() => { addNode('crmNode'); setIsPaletteOpen(false); }}
                className="w-full text-left px-3.5 py-2.5 bg-blue-50 text-blue-900 rounded-lg border border-blue-300 hover:bg-blue-100 transition-colors font-semibold text-xs flex items-center gap-2 shadow-xs"
              >
                <Globe className="w-4 h-4 text-blue-700" />
                Webhook CRM Externo
              </button>

              <button 
                onClick={() => addNode('noteNode')}
                className="w-full text-left px-3.5 py-2.5 bg-[#FFF8E7] text-amber-900 rounded-lg border border-[#FFE39F] hover:bg-amber-100 transition-colors font-semibold text-xs flex items-center gap-2 shadow-xs"
              >
                <StickyNote className="w-4 h-4 text-amber-700" />
                Nota Adesiva Explicativa
              </button>
            </div>
          </div>

          {/* Canvas React Flow */}
          <div className="flex-1 bg-[#f8fafc] h-full relative">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              defaultEdgeOptions={{ type: 'customEdge' }}
              fitView
              className="bg-[#f8fafc]"
            >
              <Controls />
              <MiniMap />
              <Background variant={BackgroundVariant.Dots} gap={16} size={1.5} color="#cbd5e1" />
            </ReactFlow>
          </div>
        </div>
      ) : (
        /* Aba de Métricas e Insights */
        <div className="flex-1 p-8 bg-gray-50 overflow-y-auto">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Métricas de Execução do Fluxo</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
              <span className="text-xs font-semibold text-gray-500">Execuções Totais</span>
              <p className="text-3xl font-bold text-gray-900 mt-2">{isPublished ? '12' : '0'}</p>
            </div>
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
              <span className="text-xs font-semibold text-gray-500">Mensagens Enviadas</span>
              <p className="text-3xl font-bold text-gray-900 mt-2">{isPublished ? '24' : '0'}</p>
            </div>
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
              <span className="text-xs font-semibold text-gray-500">Taxa de Conclusão (CTR)</span>
              <p className="text-3xl font-bold text-gray-900 mt-2">{isPublished ? '94%' : '0%'}</p>
            </div>
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
              <span className="text-xs font-semibold text-gray-500">Handoffs Humanos</span>
              <p className="text-3xl font-bold text-gray-900 mt-2">1</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
