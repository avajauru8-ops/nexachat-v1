import { Handle, Position, useReactFlow } from '@xyflow/react';
import { Clock, X } from 'lucide-react';

export function DelayNode({ id, data, selected }: { id: string; data: Record<string, unknown>; selected?: boolean }) {
  const { setNodes, setEdges, updateNodeData } = useReactFlow();

  const onDelete = () => {
    setNodes((nds) => nds.filter((n) => n.id !== id));
    setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
  };

  return (
    <div className={`bg-white border-2 rounded-xl shadow-sm min-w-[200px] group transition-all duration-200 ${
      selected 
        ? 'border-cyan-400 ring-4 ring-cyan-400/40 shadow-2xl scale-[1.02] z-50' 
        : 'border-amber-200 hover:border-cyan-400'
    }`}>
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-amber-500" />
      
      <div className="p-3 bg-amber-50 border-b border-amber-100 rounded-t-md flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-600" />
          <span className="font-semibold text-amber-800 text-sm">Atraso Inteligente</span>
        </div>
        <button onClick={onDelete} className="text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
          <X className="w-4 h-4" />
        </button>
      </div>
      
      <div className="p-3 flex flex-col gap-2">
        <label className="text-xs text-gray-500 font-medium">Tempo de espera</label>
        <div className="flex gap-2">
          <input 
            type="number" 
            value={(data.amount as number) || 1} 
            onChange={(e) => updateNodeData(id, { amount: Number(e.target.value) })}
            className="w-16 border border-gray-200 rounded px-2 py-1 text-sm text-gray-900 bg-white outline-none focus:ring-1 focus:ring-amber-500"
          />
          <select 
            value={(data.unit as string) || 'minutes'} 
            onChange={(e) => updateNodeData(id, { unit: e.target.value })}
            className="flex-1 border border-gray-200 rounded px-2 py-1 text-sm text-gray-900 bg-white outline-none focus:ring-1 focus:ring-amber-500"
          >
            <option value="seconds">Segundos</option>
            <option value="minutes">Minutos</option>
            <option value="hours">Horas</option>
            <option value="days">Dias</option>
          </select>
        </div>
      </div>
      
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-amber-500" />
    </div>
  );
}
