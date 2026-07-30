import { Handle, Position, useReactFlow } from '@xyflow/react';
import { Zap, X } from 'lucide-react';

export function ActionNode({ id, data }: { id: string, data: Record<string, unknown> }) {
  const { setNodes, setEdges, updateNodeData } = useReactFlow();

  const onDelete = () => {
    setNodes((nds) => nds.filter((n) => n.id !== id));
    setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
  };

  return (
    <div className="bg-white border-2 border-rose-200 rounded-lg shadow-sm min-w-[200px] group">
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-rose-500" />
      
      <div className="p-3 bg-rose-50 border-b border-rose-100 rounded-t-md flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-rose-600" />
          <span className="font-semibold text-rose-800 text-sm">Ação Executável</span>
        </div>
        <button onClick={onDelete} className="text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
          <X className="w-4 h-4" />
        </button>
      </div>
      
      <div className="p-3 flex flex-col gap-2">
        <label className="text-xs text-gray-500 font-medium">Tipo de Ação</label>
        <select 
          value={(data.actionType as string) || 'add_tag'} 
          onChange={(e) => updateNodeData(id, { actionType: e.target.value })}
          className="w-full border border-gray-200 rounded px-2 py-1 text-sm text-gray-900 bg-white outline-none focus:ring-1 focus:ring-rose-500"
        >
          <option value="add_tag">Adicionar Tag</option>
          <option value="remove_tag">Remover Tag</option>
          <option value="set_field">Atualizar Campo</option>
        </select>
        
        <input 
          type="text" 
          value={(data.actionValue as string) || ''} 
          onChange={(e) => updateNodeData(id, { actionValue: e.target.value })}
          placeholder="ex: VIP"
          className="w-full border border-gray-200 rounded px-2 py-1 text-sm text-gray-900 bg-white outline-none focus:ring-1 focus:ring-rose-500 mt-1"
        />
      </div>
      
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-rose-500" />
    </div>
  );
}
