import { Handle, Position, NodeProps, useReactFlow } from '@xyflow/react';
import { X, MessageCircle } from 'lucide-react';

export function CommentReplyNode({ id, data, selected }: NodeProps) {
  const { setNodes, setEdges, updateNodeData } = useReactFlow();

  const onDeleteNode = () => {
    setNodes((nds) => nds.filter((n) => n.id !== id));
    setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
  };

  return (
    <div className={`bg-white border-2 rounded-2xl min-w-[280px] max-w-[320px] group overflow-hidden transition-all duration-200 relative ${
      selected 
        ? 'border-orange-500 ring-4 ring-orange-400/40 shadow-2xl scale-[1.02] z-50' 
        : 'border-orange-200 hover:border-orange-400 shadow-md'
    }`}>
      {/* Entrada (do Gatilho) */}
      <Handle 
        type="target" 
        position={Position.Left} 
        id="left"
        className="w-3.5 h-3.5 bg-orange-500 border-2 border-white"
      />
      <Handle 
        type="target" 
        position={Position.Top} 
        id="top"
        className="w-3.5 h-3.5 bg-orange-500 border-2 border-white"
      />

      {/* Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-white/20 backdrop-blur-xs flex items-center justify-center">
            <MessageCircle className="w-3.5 h-3.5 fill-white" />
          </div>
          <span className="font-bold text-xs tracking-wide">Responder Comentário</span>
        </div>
        <button onClick={onDeleteNode} className="text-white/80 hover:text-white transition-colors opacity-0 group-hover:opacity-100">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Área Principal */}
      <div className="p-3 bg-gray-50 flex flex-col gap-2">
        <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider pl-1">
          Resposta Pública
        </p>
        <textarea
          value={(data.publicReply as string) || ''}
          onChange={(e) => updateNodeData(id, { publicReply: e.target.value })}
          placeholder="Ex: Te mandei os detalhes no Direct! 🚀"
          className="w-full text-sm text-gray-900 font-medium placeholder:text-gray-400 resize-none rounded-xl bg-white border border-gray-200 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all outline-none p-3 min-h-[80px]"
        />
        <div className="bg-orange-50 border border-orange-100 rounded-lg p-2 mt-1">
           <p className="text-[10px] text-orange-800 leading-tight">
             O bot vai responder diretamente no post/reel do usuário com essa mensagem.
           </p>
        </div>
      </div>

      {/* Saída para próximo passo (ex: enviar DM) */}
      <div className="border-t border-gray-100 bg-white">
        <div className="p-2 relative flex items-center justify-between hover:bg-gray-50 transition-colors">
          <span className="text-xs font-semibold text-gray-600 ml-2">Próximo Passo</span>
          <Handle 
            type="source" 
            position={Position.Right} 
            id="next"
            className="w-4 h-4 bg-gray-800 border-2 border-white -right-[2px]"
          />
        </div>
      </div>
    </div>
  );
}
