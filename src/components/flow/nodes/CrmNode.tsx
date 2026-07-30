import { Handle, Position } from '@xyflow/react';
import { Globe } from 'lucide-react';

export function CrmNode({ data }: { data: { label?: string; webhookUrl?: string } }) {
  return (
    <div className="bg-white rounded-xl border border-blue-300 shadow-md min-w-[220px] overflow-hidden">
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-blue-600 border-2 border-white" />
      <div className="bg-blue-50 px-4 py-2 border-b border-blue-200 flex items-center gap-2">
        <Globe className="w-4 h-4 text-blue-700" />
        <span className="font-bold text-xs text-blue-900 uppercase">Webhook CRM</span>
      </div>
      <div className="p-3 text-xs text-gray-700 font-medium">
        <p className="mb-1 font-semibold">Enviar Lead para CRM</p>
        <p className="text-[11px] text-gray-500 truncate">{data?.webhookUrl || 'URL de Webhook externa'}</p>
      </div>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-blue-600 border-2 border-white" />
    </div>
  );
}
