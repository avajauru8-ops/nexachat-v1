'use client';

import { Handle, Position, NodeProps } from '@xyflow/react';
import { IconZap } from '@tabler/icons-react';

export function TriggerNode({ data }: NodeProps) {
  return (
    <div className="bg-white border-2 border-indigo-200 rounded-xl shadow-sm min-w-[200px]">
      <div className="bg-indigo-50 px-4 py-2 rounded-t-xl border-b border-indigo-100 flex items-center">
        <IconZap className="w-4 h-4 text-indigo-500 mr-2" />
        <span className="font-bold text-sm text-indigo-900">Gatilho Inicial</span>
      </div>
      <div className="p-4">
        <p className="text-sm text-gray-600">{data.label as string}</p>
      </div>
      <Handle 
        type="source" 
        position={Position.Bottom} 
        className="w-3 h-3 bg-indigo-500 border-2 border-white"
      />
    </div>
  );
}
