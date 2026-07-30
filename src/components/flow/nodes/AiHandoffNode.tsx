import { Handle, Position } from '@xyflow/react';
import { Sparkles } from 'lucide-react';

export function AiHandoffNode({ data }: { data: { label?: string } }) {
  return (
    <div className="bg-white rounded-xl border border-purple-300 shadow-md min-w-[200px] overflow-hidden">
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-purple-600 border-2 border-white" />
      <div className="bg-purple-50 px-4 py-2 border-b border-purple-200 flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-purple-700" />
        <span className="font-bold text-xs text-purple-900 uppercase">Agente de IA</span>
      </div>
      <div className="p-3 text-xs text-gray-700 font-medium">
        {data?.label || 'Transfere conversa para o agente LLM de IA'}
      </div>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-purple-600 border-2 border-white" />
    </div>
  );
}
