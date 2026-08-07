'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  BackgroundVariant,
  useReactFlow,
  NodeTypes,
  EdgeTypes
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { TriggerNode } from '@/components/flow/nodes/TriggerNode';
import { MessageNode, AttachmentItem } from '@/components/flow/nodes/MessageNode';
import { DelayNode } from '@/components/flow/nodes/DelayNode';
import { ActionNode } from '@/components/flow/nodes/ActionNode';
import { ConditionNode } from '@/components/flow/nodes/ConditionNode';
import { HumanHandoffNode } from '@/components/flow/nodes/HumanHandoffNode';
import { AiHandoffNode } from '@/components/flow/nodes/AiHandoffNode';
import { CrmNode } from '@/components/flow/nodes/CrmNode';
import { NoteNode } from '@/components/flow/nodes/NoteNode';
import { CommentReplyNode } from '@/components/flow/nodes/CommentReplyNode';
import { CustomEdge } from '@/components/flow/edges/CustomEdge';

import { saveFlow } from '@/app/(dashboard)/flows/actions';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import {
  ArrowLeft, Save, Play, Download, Upload, Sparkles, UserCheck, Globe, Clock,
  Filter, MessageSquare, Tag, StickyNote, Plus, Undo2, Redo2, Search, Pencil,
  Workflow, Info, CheckCircle2, MessageCircle, Zap, Circle,
  MousePointerClick, Link as LinkIcon, Image as ImageIcon, Video, FileText, MessageSquarePlus
} from 'lucide-react';

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

const ITEM_STYLES: Record<string, { btn: string; icon: string }> = {
  indigo: { btn: 'bg-indigo-50 text-indigo-800 border-indigo-200 hover:bg-indigo-100', icon: 'text-indigo-600' },
  emerald: { btn: 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100', icon: 'text-emerald-600' },
  orange: { btn: 'bg-orange-50 text-orange-800 border-orange-200 hover:bg-orange-100', icon: 'text-orange-600' },
  amber: { btn: 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100', icon: 'text-amber-600' },
  purple: { btn: 'bg-purple-50 text-purple-800 border-purple-200 hover:bg-purple-100', icon: 'text-purple-600' },
  rose: { btn: 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100', icon: 'text-rose-600' },
  yellow: { btn: 'bg-yellow-50 text-yellow-900 border-yellow-300 hover:bg-yellow-100', icon: 'text-yellow-700' },
  blue: { btn: 'bg-blue-50 text-blue-900 border-blue-300 hover:bg-blue-100', icon: 'text-blue-700' }
};

type PaletteItemDef = {
  type: string;
  label: string;
  desc: string;
  icon: React.ElementType;
  color: keyof typeof ITEM_STYLES;
  preset?: AttachmentItem['type'];
};

const PALETTE_GROUPS: { title: string; items: PaletteItemDef[] }[] = [
  {
    title: 'Disparo',
    items: [
      { type: 'triggerNode', label: 'Gatilho Inicial', desc: 'DM, comentário ou story', icon: Zap, color: 'indigo' }
    ]
  },
  {
    title: 'Mensagens',
    items: [
      { type: 'messageNode', label: 'Mensagem do Bot', desc: 'Envia texto no Direct', icon: MessageSquare, color: 'emerald' },
      { type: 'commentReplyNode', label: 'Responder Comentário', desc: 'Resposta pública no post', icon: MessageCircle, color: 'orange' },
      { type: 'delayNode', label: 'Atraso Inteligente', desc: 'Pausa o fluxo por tempo', icon: Clock, color: 'amber' }
    ]
  },
  {
    title: 'Anexos & Botões',
    items: [
      { type: 'messageNode', preset: 'button', label: 'Botão de Ação', desc: 'Mensagem + botão clicável', icon: MousePointerClick, color: 'emerald' },
      { type: 'messageNode', preset: 'link', label: 'Link Externo', desc: 'Mensagem + link clicável', icon: LinkIcon, color: 'blue' },
      { type: 'messageNode', preset: 'image', label: 'Imagem', desc: 'Mensagem + foto com upload', icon: ImageIcon, color: 'rose' },
      { type: 'messageNode', preset: 'video', label: 'Vídeo', desc: 'Mensagem + vídeo com upload', icon: Video, color: 'purple' },
      { type: 'messageNode', preset: 'file', label: 'Documento / PDF', desc: 'Mensagem + PDF com upload', icon: FileText, color: 'amber' },
      { type: 'messageNode', preset: 'text', label: 'Texto Extra', desc: 'Mensagem + texto adicional', icon: MessageSquarePlus, color: 'yellow' }
    ]
  },
  {
    title: 'Lógica & Dados',
    items: [
      { type: 'conditionNode', label: 'Condição (If/Else)', desc: 'Desvia o fluxo', icon: Filter, color: 'purple' },
      { type: 'actionNode', label: 'Ação (Tag / Campos)', desc: 'Atualiza o contato', icon: Tag, color: 'rose' },
      { type: 'noteNode', label: 'Nota Explicativa', desc: 'Anotações no canvas', icon: StickyNote, color: 'amber' }
    ]
  },
  {
    title: 'Atendimento & IA',
    items: [
      { type: 'aiHandoffNode', label: 'Agente de IA', desc: 'IA conversa com o lead', icon: Sparkles, color: 'purple' },
      { type: 'humanHandoffNode', label: 'Atendente Humano', desc: 'Repassa para o time', icon: UserCheck, color: 'yellow' },
      { type: 'crmNode', label: 'Webhook CRM', desc: 'Integração externa', icon: Globe, color: 'blue' }
    ]
  }
];

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

function MetricCard({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
      <span className="text-xs font-semibold text-gray-500">{label}</span>
      <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
      {hint && <p className="text-[11px] text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

function PaletteItem({ item, onAdd }: { item: PaletteItemDef; onAdd: (type: string, preset?: AttachmentItem['type']) => void }) {
  const Icon = item.icon;
  const style = ITEM_STYLES[item.color];
  return (
    <button
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('application/reactflow', JSON.stringify({ type: item.type, preset: item.preset }));
        e.dataTransfer.effectAllowed = 'move';
      }}
      onClick={() => onAdd(item.type, item.preset)}
      title={item.desc}
      className={`w-full text-left px-3 py-2.5 rounded-lg border ${style.btn} hover:shadow-md hover:brightness-[0.97] transition-all font-semibold text-xs flex items-center gap-2.5 cursor-grab active:cursor-grabbing`}
    >
      <span className="w-7 h-7 rounded-lg bg-white/70 flex items-center justify-center shrink-0 shadow-xs">
        <Icon className={`w-3.5 h-3.5 ${style.icon}`} />
      </span>
      <span className="flex-1 min-w-0">
        <span className="block truncate">{item.label}</span>
        <span className="block text-[10px] font-medium text-gray-500 truncate">{item.desc}</span>
      </span>
      <Plus className="w-3.5 h-3.5 opacity-40 shrink-0" />
    </button>
  );
}

function FlowCanvas({
  nodes, edges, onNodesChange, onEdgesChange, onConnect,
  onDropNode, onZoomChange, nodeTypes, edgeTypes
}: {
  nodes: Node[];
  edges: Edge[];
  onNodesChange: (changes: any) => void;
  onEdgesChange: (changes: any) => void;
  onConnect: (params: Connection | Edge) => void;
  onDropNode: (type: string, preset: AttachmentItem['type'] | undefined, position: { x: number; y: number }) => void;
  onZoomChange: (zoom: number) => void;
  nodeTypes: NodeTypes;
  edgeTypes: EdgeTypes;
}) {
  const { screenToFlowPosition } = useReactFlow();

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const raw = e.dataTransfer.getData('application/reactflow');
    if (!raw) return;
    let type = raw;
    let preset: AttachmentItem['type'] | undefined;
    try {
      const parsed = JSON.parse(raw);
      if (parsed.type) {
        type = parsed.type;
        preset = parsed.preset;
      }
    } catch {
      // payload legado (apenas o tipo)
    }
    const position = screenToFlowPosition({ x: e.clientX, y: e.clientY });
    onDropNode(type, preset, position);
  };

  return (
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
      onDrop={onDrop}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
      }}
      onMoveEnd={(_, vp) => onZoomChange(vp.zoom)}
      className="bg-[#f8fafc]"
    >
      <Controls />
      <MiniMap pannable zoomable />
      <Background variant={BackgroundVariant.Dots} gap={16} size={1.5} color="#cbd5e1" />
    </ReactFlow>
  );
}

export function FlowBuilderClient({
  id,
  initialFlowData,
  initialName = 'Nova Automação',
  initialStatus = 'draft',
  initialAccountId = '',
  instagramAccounts = [],
  executionCount = 0,
  updatedAt = null
}: {
  id: string;
  initialFlowData: Record<string, unknown> | null;
  initialName?: string;
  initialStatus?: string;
  initialAccountId?: string;
  instagramAccounts?: Record<string, unknown>[];
  executionCount?: number;
  updatedAt?: string | null;
}) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>((initialFlowData?.nodes as Node[]) || []);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>((initialFlowData?.edges as Edge[]) || []);
  const [flowName, setFlowName] = useState(initialName);
  const [status, setStatus] = useState(initialStatus);
  const [accountId, setAccountId] = useState<string>(initialAccountId || ((instagramAccounts[0]?.id as string) || ''));
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<'visualizacao' | 'insights'>('visualizacao');
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [paletteSearch, setPaletteSearch] = useState('');
  const [zoom, setZoom] = useState(1);
  const [isDirty, setIsDirty] = useState(false);

  const [past, setPast] = useState<{ nodes: Node[]; edges: Edge[] }[]>([]);
  const [future, setFuture] = useState<{ nodes: Node[]; edges: Edge[] }[]>([]);
  const snapshotTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(false);
  const skipSnapshotRef = useRef(false);

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    setIsDirty(true);
    if (skipSnapshotRef.current) {
      skipSnapshotRef.current = false;
      return;
    }
    if (snapshotTimer.current) clearTimeout(snapshotTimer.current);
    snapshotTimer.current = setTimeout(() => {
      setPast((p) => [...p.slice(-49), { nodes: clone(nodes), edges: clone(edges) }]);
      setFuture([]);
    }, 800);
  }, [nodes, edges]);

  useEffect(() => () => {
    if (snapshotTimer.current) clearTimeout(snapshotTimer.current);
  }, []);

  const undo = useCallback(() => {
    if (past.length === 0) return;
    skipSnapshotRef.current = true;
    const prev = past[past.length - 1];
    setPast((p) => p.slice(0, -1));
    setFuture((f) => [...f, { nodes: clone(nodes), edges: clone(edges) }]);
    setNodes(prev.nodes);
    setEdges(prev.edges);
  }, [past, nodes, edges, setNodes, setEdges]);

  const redo = useCallback(() => {
    if (future.length === 0) return;
    skipSnapshotRef.current = true;
    const next = future[future.length - 1];
    setFuture((f) => f.slice(0, -1));
    setPast((p) => [...p, { nodes: clone(nodes), edges: clone(edges) }]);
    setNodes(next.nodes);
    setEdges(next.edges);
  }, [future, nodes, edges, setNodes, setEdges]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo, redo]);

  const filteredGroups = useMemo(
    () =>
      PALETTE_GROUPS.map((g) => ({
        ...g,
        items: g.items.filter(
          (i) =>
            i.label.toLowerCase().includes(paletteSearch.toLowerCase()) ||
            i.desc.toLowerCase().includes(paletteSearch.toLowerCase())
        )
      })).filter((g) => g.items.length > 0),
    [paletteSearch]
  );

  const onConnect = useCallback(
    (params: Connection | Edge) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const addNode = (type: string, position?: { x: number; y: number }, presetType?: AttachmentItem['type']) => {
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

    const data: Record<string, unknown> = {
      label,
      text: type === 'messageNode' ? 'Digite a mensagem de resposta...' : undefined
    };

    if (type === 'messageNode' && presetType) {
      const presetLabel = presetType === 'button' ? 'Clique Aqui 🔥' : presetType === 'file' ? 'Documento.pdf' : '';
      data.attachments = [{
        id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        type: presetType,
        label: presetLabel,
        value: ''
      }];
    }

    const newNode: Node = {
      id: `n-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type,
      position: position || { x: Math.random() * 200 + 200, y: Math.random() * 200 + 150 },
      className: 'node-pop',
      data
    };
    setNodes((nds) => nds.concat(newNode));
  };

  const buildTemplate = (templateId: string): { nodes: Node[]; edges: Edge[] } | null => {
    const pop = { className: 'node-pop' as const };
    if (templateId === 'welcome') {
      return {
        nodes: [
          { id: 't1-trigger', type: 'triggerNode', position: { x: 0, y: 180 }, ...pop, data: { label: 'Gatilho Boas-Vindas', triggerType: 'welcome_dm' } },
          { id: 't1-msg', type: 'messageNode', position: { x: 340, y: 180 }, ...pop, data: { label: 'Mensagem do Bot', text: 'Olá! 👋 Que bom ter você aqui! Para começar, me conta o que você procura hoje?' } }
        ],
        edges: [{ id: 't1-e1', source: 't1-trigger', target: 't1-msg', type: 'customEdge' }]
      };
    }
    if (templateId === 'comment') {
      return {
        nodes: [
          { id: 't2-trigger', type: 'triggerNode', position: { x: 0, y: 160 }, ...pop, data: { label: 'Gatilho Comentário', triggerType: 'comment_keyword' } },
          { id: 't2-reply', type: 'commentReplyNode', position: { x: 340, y: 120 }, ...pop, data: { label: 'Responder Comentário', publicReply: 'Te mandei os detalhes no Direct! 🚀' } },
          { id: 't2-msg', type: 'messageNode', position: { x: 680, y: 160 }, ...pop, data: { label: 'Mensagem do Bot', text: 'Acabei de te responder no post! 💬 Se preferir, me conta aqui o que você precisa.' } }
        ],
        edges: [
          { id: 't2-e1', source: 't2-trigger', target: 't2-reply', type: 'customEdge' },
          { id: 't2-e2', source: 't2-reply', target: 't2-msg', type: 'customEdge' }
        ]
      };
    }
    if (templateId === 'cupom') {
      return {
        nodes: [
          { id: 't3-trigger', type: 'triggerNode', position: { x: 0, y: 180 }, ...pop, data: { label: 'Gatilho Cupom', triggerType: 'dm_keyword', keyword: 'cupom' } },
          { id: 't3-msg', type: 'messageNode', position: { x: 340, y: 180 }, ...pop, data: { label: 'Mensagem do Bot', text: 'Ótima escolha! 🎁 Aqui está seu cupom: NEXA10 — 10% OFF na primeira compra.' } }
        ],
        edges: [{ id: 't3-e1', source: 't3-trigger', target: 't3-msg', type: 'customEdge' }]
      };
    }
    return null;
  };

  const applyTemplate = (templateId: string) => {
    const t = buildTemplate(templateId);
    if (!t) return;
    setNodes(t.nodes);
    setEdges(t.edges);
    toast.success('Modelo aplicado! Personalize os blocos e publique.');
  };

  const validateForPublish = (): string | null => {
    if (!accountId) return 'Selecione a conta do Instagram que executará a automação.';
    if (!nodes.some((n) => n.type === 'triggerNode' || n.type === 'trigger')) {
      return 'Adicione o bloco "Gatilho Inicial" para iniciar a automação.';
    }
    const validActionNodes = ['messageNode', 'commentReplyNode', 'aiAgentNode', 'humanHandoffNode'];
    if (!nodes.some((n) => n.type && validActionNodes.includes(n.type))) {
      return 'Adicione pelo menos uma "Mensagem do Bot", "Responder Comentário", "Agente de IA" ou "Handoff Humano" antes de publicar.';
    }
    return null;
  };

  const handleSaveFlow = (targetStatus: string = status) => {
    if (targetStatus === 'active' || targetStatus === 'published') {
      const issue = validateForPublish();
      if (issue) {
        toast.error(issue);
        return;
      }
      if (!window.confirm('Deseja publicar esta automação? Ela começará a funcionar imediatamente para novos gatilhos.')) return;
    }

    startTransition(async () => {
      try {
        const triggerNode = nodes.find((n) => n.type === 'triggerNode' || n.type === 'trigger');
        let triggers: Record<string, any> = { triggerType: 'keyword', keyword: '' };

        if (triggerNode && triggerNode.data) {
          triggers = {
            triggerType: (triggerNode.data.triggerType as string) || 'keyword',
            keyword: (triggerNode.data.keyword as string) || '',
            publicReply: (triggerNode.data.publicReply as string) || undefined,
            specificMediaId: (triggerNode.data.specificMediaId as string) || undefined
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
        setIsDirty(false);

        if (id === 'new') {
          toast.success('Automação criada com sucesso!');
          window.location.href = `/flows/builder/${newId}`;
        } else {
          toast.success(targetStatus === 'published' || targetStatus === 'active' ? 'Automação publicada!' : 'Automação salva!');
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

      <div className="h-16 border-b border-gray-200 flex items-center justify-between px-4 lg:px-6 bg-white shrink-0 z-20 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/flows" className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-gray-900 transition-colors" title="Voltar para Automações">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Pencil className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <input
                type="text"
                value={flowName}
                onChange={(e) => setFlowName(e.target.value)}
                className="border-none bg-transparent font-bold text-gray-900 outline-none text-base focus:ring-1 focus:ring-blue-500 rounded px-1 w-44 sm:w-64 truncate"
                placeholder="Nome da Automação"
              />
            </div>
            <div className="flex items-center gap-2 px-1 mt-0.5 min-w-0">
              <span className={`flex items-center gap-1.5 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full whitespace-nowrap ${
                isPublished ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-amber-100 text-amber-800 border border-amber-200'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isPublished ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                {isPublished ? 'Publicado' : 'Rascunho'}
              </span>

              {instagramAccounts && instagramAccounts.length > 0 && (
                <select
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className="text-[11px] font-medium border border-gray-300 rounded px-2 py-0.5 bg-gray-50 text-gray-700 outline-none focus:ring-1 focus:ring-blue-500 max-w-[160px] truncate cursor-pointer"
                  title="Conta do Instagram que executa a automação"
                >
                  <option value="">Selecione a conta...</option>
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

        <div className="hidden md:flex items-center bg-gray-100 p-1 rounded-lg border border-gray-200 shrink-0">
          <button
            onClick={() => setActiveTab('visualizacao')}
            className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${activeTab === 'visualizacao' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
          >
            Editor Visual
          </button>
          <button
            onClick={() => setActiveTab('insights')}
            className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${activeTab === 'insights' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
          >
            Métricas
          </button>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={undo}
            disabled={past.length === 0}
            className="p-2 border border-gray-200 hover:bg-gray-50 rounded-lg text-gray-600 transition-colors disabled:opacity-35 disabled:cursor-not-allowed disabled:hover:bg-transparent"
            title="Desfazer (Ctrl+Z)"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            onClick={redo}
            disabled={future.length === 0}
            className="p-2 border border-gray-200 hover:bg-gray-50 rounded-lg text-gray-600 transition-colors disabled:opacity-35 disabled:cursor-not-allowed disabled:hover:bg-transparent mr-1"
            title="Refazer (Ctrl+Shift+Z)"
          >
            <Redo2 className="w-4 h-4" />
          </button>

          <span className={`hidden xl:flex items-center gap-1.5 text-[11px] font-semibold mr-1 ${
            isDirty ? 'text-amber-600' : 'text-emerald-600'
          }`}>
            {isDirty ? <><Circle className="w-2.5 h-2.5 fill-current" />Alterações não salvas</> : <><CheckCircle2 className="w-3.5 h-3.5" />Salvo</>}
          </span>

          <button
            onClick={handleExportJson}
            className="p-2 border border-gray-200 hover:bg-gray-50 rounded-lg text-gray-600 text-xs font-medium flex items-center gap-1 transition-colors"
            title="Exportar JSON"
          >
            <Download className="w-4 h-4" />
          </button>

          <label className="p-2 border border-gray-200 hover:bg-gray-50 rounded-lg text-gray-600 text-xs font-medium cursor-pointer transition-colors mr-1" title="Importar JSON">
            <Upload className="w-4 h-4" />
            <input type="file" accept=".json" onChange={handleImportJson} className="hidden" />
          </label>

          <button
            onClick={() => handleSaveFlow('draft')}
            disabled={isPending}
            className="px-4 py-2 border border-gray-300 text-gray-700 text-xs font-semibold rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            Salvar
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

          <button
            onClick={() => setIsPaletteOpen(!isPaletteOpen)}
            className="md:hidden fixed bottom-6 right-6 p-4 bg-[#0064e0] text-white rounded-full shadow-lg z-50 flex items-center justify-center"
          >
            <Plus className="w-6 h-6" />
          </button>

          {isPaletteOpen && (
            <div
              className="fixed inset-0 bg-black/40 z-40 md:hidden"
              onClick={() => setIsPaletteOpen(false)}
            />
          )}

          <div className={`absolute md:relative z-50 md:z-10 w-72 h-full bg-white border-r border-gray-200 p-4 flex flex-col gap-3 shadow-xl md:shadow-sm overflow-y-auto transition-transform duration-300 ease-in-out ${isPaletteOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
            <div>
              <h2 className="font-bold text-gray-900 text-sm">Paleta de Blocos</h2>
              <p className="text-xs text-gray-500 mt-0.5 hidden md:block">Arraste para o canvas ou clique para adicionar.</p>
            </div>

            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-gray-400" />
              <input
                type="text"
                value={paletteSearch}
                onChange={(e) => setPaletteSearch(e.target.value)}
                placeholder="Buscar bloco..."
                className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-8 pr-3 py-2 text-xs outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200 placeholder:text-gray-400"
              />
            </div>

            <div className="space-y-4">
              {filteredGroups.map((group) => (
                <div key={group.title}>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 px-1">{group.title}</p>
                  <div className="space-y-1.5">
                    {group.items.map((item) => (
                      <PaletteItem
                        key={item.type}
                        item={item}
                        onAdd={(type, preset) => {
                          addNode(type, undefined, preset);
                          setIsPaletteOpen(false);
                        }}
                      />
                    ))}
                  </div>
                </div>
              ))}
              {filteredGroups.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-4">Nenhum bloco encontrado para &quot;{paletteSearch}&quot;</p>
              )}
            </div>
          </div>

          <div className="flex-1 bg-[#f8fafc] h-full relative">
            <ReactFlowProvider>
              <FlowCanvas
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onDropNode={(type, preset, position) => addNode(type, position, preset)}
                onZoomChange={setZoom}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
              />
            </ReactFlowProvider>

            {nodes.length === 0 && (
              <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
                <div className="pointer-events-auto bg-white/95 backdrop-blur-sm border border-gray-200 rounded-2xl shadow-2xl p-8 max-w-xl w-full mx-4 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] flex items-center justify-center mx-auto mb-4 shadow-lg shadow-pink-500/20">
                    <Workflow className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-lg font-black text-gray-900">Comece com um modelo</h3>
                  <p className="text-sm text-gray-500 mt-1 mb-6">Escolha um ponto de partida ou monte seu fluxo do zero arrastando os blocos da paleta.</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button
                      onClick={() => applyTemplate('welcome')}
                      className="group bg-gray-50 hover:bg-pink-50 border border-gray-200 hover:border-pink-300 rounded-xl p-4 text-left transition-all"
                    >
                      <span className="text-2xl">👋</span>
                      <p className="font-bold text-gray-900 text-xs mt-2 group-hover:text-pink-600">Boas-vindas na DM</p>
                      <p className="text-[10px] text-gray-500 mt-1 leading-snug">Responda automaticamente novos seguidores</p>
                    </button>
                    <button
                      onClick={() => applyTemplate('comment')}
                      className="group bg-gray-50 hover:bg-orange-50 border border-gray-200 hover:border-orange-300 rounded-xl p-4 text-left transition-all"
                    >
                      <span className="text-2xl">💬</span>
                      <p className="font-bold text-gray-900 text-xs mt-2 group-hover:text-orange-600">Resposta a comentário</p>
                      <p className="text-[10px] text-gray-500 mt-1 leading-snug">Responde no post e continua na DM</p>
                    </button>
                    <button
                      onClick={() => applyTemplate('cupom')}
                      className="group bg-gray-50 hover:bg-emerald-50 border border-gray-200 hover:border-emerald-300 rounded-xl p-4 text-left transition-all"
                    >
                      <span className="text-2xl">🎁</span>
                      <p className="font-bold text-gray-900 text-xs mt-2 group-hover:text-emerald-600">Cupom por palavra-chave</p>
                      <p className="text-[10px] text-gray-500 mt-1 leading-snug">Envia oferta quando o lead digita &quot;CUPOM&quot;</p>
                    </button>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-5">💡 Dica: toda automação precisa de um <b>Gatilho</b> conectado a uma <b>Mensagem</b> para ser publicada.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 p-8 bg-gray-50 overflow-y-auto">
          <h2 className="text-xl font-bold text-gray-900 mb-1">Métricas de Execução do Fluxo</h2>
          <p className="text-sm text-gray-500 mb-6">Acompanhe o desempenho desta automação.</p>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <MetricCard label="Execuções Totais" value={executionCount} hint="Fluxos disparados por este gatilho" />
            <MetricCard label="Blocos no Fluxo" value={nodes.length} hint={`${edges.length} conexões entre blocos`} />
            <MetricCard
              label="Status"
              value={
                <span className="flex items-center gap-2 text-xl">
                  <span className={`w-2.5 h-2.5 rounded-full ${isPublished ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                  {isPublished ? 'Ativa' : 'Rascunho'}
                </span>
              }
              hint={updatedAt ? `Última alteração em ${new Date(updatedAt).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}` : 'Ainda não alterado'}
            />
            <MetricCard label="Conta Vinculada" value={instagramAccounts.length > 0 ? `@${(instagramAccounts.find((a) => a.id === accountId) as any)?.ig_username || '—'}` : '—'} hint="Conta que executa a automação" />
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6 flex items-start gap-4 shadow-sm">
            <Info className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
            <div>
              <p className="font-bold text-gray-900 text-sm">Métricas avançadas em breve</p>
              <p className="text-sm text-gray-500 mt-1">Mensagens enviadas, taxa de conclusão e handoffs por bloco serão exibidos aqui assim que o registro de execuções estiver ativo.</p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'visualizacao' && (
        <div className="h-9 border-t border-gray-200 bg-white flex items-center justify-between px-4 text-[11px] text-gray-500 shrink-0">
          <div className="flex items-center gap-4 font-medium">
            <span>{nodes.length} blocos</span>
            <span>{edges.length} conexões</span>
          </div>
          <div className="flex items-center gap-4 font-medium">
            <span className="hidden sm:flex items-center gap-1"><Undo2 className="w-3 h-3" /> Ctrl+Z desfazer</span>
            <span className="hidden md:flex items-center gap-1"><Redo2 className="w-3 h-3" /> Ctrl+Shift+Z refazer</span>
            <span className="bg-gray-100 rounded px-1.5 py-0.5 font-bold text-gray-700">{Math.round(zoom * 100)}%</span>
          </div>
        </div>
      )}
    </div>
  );
}
