import { Handle, Position } from '@xyflow/react';
import { UserCheck } from 'lucide-react';

export function HumanHandoffNode({ data }: { data: { label?: string } }) {
  return (
    <div className="bg-white rounded-xl border border-yellow-300 shadow-md min-w-[200px] overflow-hidden">
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-yellow-500 border-2 border-white" />
      <div className="bg-yellow-50 px-4 py-2 border-b border-yellow-200 flex items-center gap-2">
        <UserCheck className="w-4 h-4 text-yellow-700" />
        <span className="font-bold text-xs text-yellow-900 uppercase">Handoff Humano</span>
      </div>
      <div className="p-3 text-xs text-gray-700 font-medium">
        {data?.label || 'Pausa o robô e notifica atendente humano'}
      </div>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-yellow-500 border-2 border-white" />
    </div>
  );
}
