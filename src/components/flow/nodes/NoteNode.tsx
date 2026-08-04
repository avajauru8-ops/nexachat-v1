import { NodeProps, useReactFlow } from '@xyflow/react';
import { X, StickyNote } from 'lucide-react';

export function NoteNode({ id, data }: NodeProps) {
  const { setNodes, updateNodeData } = useReactFlow();

  const onDelete = () => {
    setNodes((nds) => nds.filter((n) => n.id !== id));
  };

  return (
    <div className="bg-[#FFF8E7] border border-[#FFE39F] rounded-2xl p-4 shadow-sm min-w-[240px] max-w-[280px] group relative text-gray-800 transition-all hover:shadow-md">
      <button 
        onClick={onDelete} 
        className="absolute top-2 right-2 text-amber-500 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
        title="Excluir Nota"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex items-center gap-1.5 text-amber-700 font-bold text-xs mb-2">
        <StickyNote className="w-3.5 h-3.5" />
        <span>Nota Explicativa</span>
      </div>

      <textarea
        value={(data.text as string) || (data.label as string) || ''}
        onChange={(e) => updateNodeData(id, { text: e.target.value, label: e.target.value })}
        rows={4}
        placeholder="Escreva uma dica ou explicação aqui..."
        className="w-full bg-transparent border-none outline-none text-xs text-gray-800 placeholder-amber-700/50 resize-y max-h-48 overflow-y-auto nowheel font-medium leading-relaxed"
      />
    </div>
  );
}
