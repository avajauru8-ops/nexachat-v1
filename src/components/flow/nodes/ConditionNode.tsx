import { Handle, Position, useReactFlow } from '@xyflow/react';
import { GitBranch, X } from 'lucide-react';

export function ConditionNode({ id, data }: { id: string, data: Record<string, unknown> }) {
  const { setNodes, setEdges, updateNodeData } = useReactFlow();

  const onDelete = () => {
    setNodes((nds) => nds.filter((n) => n.id !== id));
    setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
  };

  return (
    <div className="bg-white border-2 border-purple-200 rounded-lg shadow-sm min-w-[220px] group">
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-purple-500" />
      
      <div className="p-3 bg-purple-50 border-b border-purple-100 rounded-t-md flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GitBranch className="w-4 h-4 text-purple-600" />
          <span className="font-semibold text-purple-800 text-sm">Condição (If/Else)</span>
        </div>
        <button onClick={onDelete} className="text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
          <X className="w-4 h-4" />
        </button>
      </div>
      
      <div className="p-3 flex flex-col gap-2">
        <label className="text-xs text-gray-500 font-medium">Se o Lead tiver a Tag:</label>
        <input 
          type="text" 
          value={(data.conditionValue as string) || ''} 
          onChange={(e) => updateNodeData(id, { conditionValue: e.target.value })}
          placeholder="ex: VIP"
          className="w-full border border-gray-200 rounded px-2 py-1 text-sm text-gray-900 bg-white outline-none focus:ring-1 focus:ring-purple-500 nowheel"
        />
      </div>
      
      {/* Handles Condicionais (Verdadeiro ou Falso) */}
      <div className="flex justify-between px-4 pb-2 text-xs font-medium text-gray-500">
        <div className="flex flex-col items-center relative">
          <span>Verdadeiro</span>
          <Handle 
            type="source" 
            position={Position.Bottom} 
            id="true" 
            className="w-3 h-3 bg-green-500 absolute -bottom-3 left-1/2 transform -translate-x-1/2" 
          />
        </div>
        <div className="flex flex-col items-center relative">
          <span>Falso</span>
          <Handle 
            type="source" 
            position={Position.Bottom} 
            id="false" 
            className="w-3 h-3 bg-red-500 absolute -bottom-3 left-1/2 transform -translate-x-1/2" 
          />
        </div>
      </div>
    </div>
  );
}
