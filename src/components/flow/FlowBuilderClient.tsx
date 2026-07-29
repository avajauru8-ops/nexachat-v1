

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
  BackgroundVariant
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { TriggerNode } from '@/components/flow/nodes/TriggerNode';
import { MessageNode } from '@/components/flow/nodes/MessageNode';
import { saveFlow } from '@/app/(dashboard)/flows/actions';
import { useRouter } from 'next/navigation';

const nodeTypes = {
  triggerNode: TriggerNode,
  messageNode: MessageNode,
};

const initialNodesDefault = [
  { id: '1', type: 'triggerNode', position: { x: 250, y: 100 }, data: { label: 'Gatilho: Qualquer Mensagem' } },
];
const initialEdgesDefault: Edge[] = [];

export function FlowBuilderClient({ 
  id, 
  initialFlowData, 
  initialName = 'Novo Fluxo' 
}: { 
  id: string, 
  initialFlowData: any, 
  initialName?: string 
}) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialFlowData?.nodes || initialNodesDefault);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialFlowData?.edges || initialEdgesDefault);
  const [flowName, setFlowName] = useState(initialName);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const onConnect = useCallback(
    (params: Connection | Edge) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const addNode = (type: string) => {
    const newNode = {
      id: Math.random().toString(),
      type,
      position: { x: Math.random() * 300 + 100, y: Math.random() * 300 + 100 },
      data: { label: type === 'messageNode' ? 'Nova Mensagem' : 'Novo Gatilho' },
    };
    setNodes((nds) => nds.concat(newNode));
  };

  const handleSave = () => {
    startTransition(async () => {
      try {
        const triggers = { keyword: 'Qualquer Mensagem' }; // Simplificação
        const flowData = { nodes, edges };
        
        const newId = await saveFlow(id, flowName, flowData, triggers);
        
        if (id === 'new') {
          router.replace(`/flows/builder/${newId}`);
        } else {
          alert('Fluxo salvo com sucesso!');
        }
      } catch (err: any) {
        alert('Erro ao salvar: ' + err.message);
      }
    });
  };

  return (
    <div className="flex h-full -m-6">
      {/* Sidebar do FlowBuilder */}
      <div className="w-64 bg-white border-r border-gray-200 p-4 flex flex-col gap-4 shadow-sm z-10">
        <h2 className="font-bold text-gray-800">Blocos de Construção</h2>
        <div className="space-y-2">
          <button 
            onClick={() => addNode('triggerNode')}
            className="w-full text-left px-4 py-3 bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-100 hover:bg-indigo-100 transition-colors font-medium text-sm flex items-center"
          >
            <div className="w-2 h-2 rounded-full bg-indigo-500 mr-2"></div>
            Gatilho (Trigger)
          </button>
          <button 
            onClick={() => addNode('messageNode')}
            className="w-full text-left px-4 py-3 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-100 hover:bg-emerald-100 transition-colors font-medium text-sm flex items-center"
          >
            <div className="w-2 h-2 rounded-full bg-emerald-500 mr-2"></div>
            Mensagem do Bot
          </button>
        </div>

        <div className="mt-auto space-y-2">
          <button 
            onClick={handleSave}
            disabled={isPending}
            className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
          >
            {isPending ? 'Salvando...' : 'Salvar Fluxo'}
          </button>
          <button className="w-full py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors font-medium">
            Testar
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 bg-gray-50 h-full relative">
        <div className="absolute top-4 left-4 z-10 bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-200 flex items-center gap-2">
          <h1 className="font-bold text-gray-700">Editor de Fluxo: </h1>
          <input 
            type="text" 
            value={flowName} 
            onChange={(e) => setFlowName(e.target.value)}
            className="border-none bg-gray-50 px-2 py-1 rounded focus:ring-2 focus:ring-blue-500 font-medium text-gray-700 outline-none" 
            placeholder="Nome do Fluxo"
          />
        </div>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          className="bg-gray-50"
        >
          <Controls />
          <MiniMap />
          <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
        </ReactFlow>
      </div>
    </div>
  );
}
