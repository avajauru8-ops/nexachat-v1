'use client';

import { Handle, Position, NodeProps } from '@xyflow/react';
import { IconMessageSquare } from '@tabler/icons-react';

export function MessageNode({ data }: NodeProps) {
  return (
    <div className="bg-white border-2 border-emerald-200 rounded-xl shadow-sm min-w-[200px]">
      <Handle 
        type="target" 
        position={Position.Top} 
        className="w-3 h-3 bg-emerald-500 border-2 border-white"
      />
      <div className="bg-emerald-50 px-4 py-2 rounded-t-xl border-b border-emerald-100 flex items-center">
        <IconMessageSquare className="w-4 h-4 text-emerald-500 mr-2" />
        <span className="font-bold text-sm text-emerald-900">Enviar Mensagem</span>
      </div>
      <div className="p-4">
        <p className="text-sm text-gray-600 line-clamp-2">
          {data.label as string}
        </p>
      </div>
      <Handle 
        type="source" 
        position={Position.Bottom} 
        className="w-3 h-3 bg-emerald-500 border-2 border-white"
      />
    </div>
  );
}
