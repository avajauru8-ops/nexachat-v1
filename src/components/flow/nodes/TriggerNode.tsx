import { Handle, Position, NodeProps, useReactFlow } from '@xyflow/react';
import { Zap, X, MessageSquare, Camera, MessageCircle, UserPlus, Sparkles } from 'lucide-react';

export function TriggerNode({ id, data, selected }: NodeProps) {
  const { setNodes, setEdges, updateNodeData } = useReactFlow();

  const onDelete = () => {
    setNodes((nds) => nds.filter((n) => n.id !== id));
    setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
  };

  const currentType = (data.triggerType as string) || (data.trigger_type as string) || 'dm_keyword';

  const handleTypeChange = (newType: string) => {
    updateNodeData(id, { triggerType: newType, trigger_type: newType });
  };

  return (
    <div className={`bg-white border-2 rounded-2xl shadow-md min-w-[280px] max-w-[320px] group overflow-hidden transition-all duration-200 ${
      selected 
        ? 'border-purple-500 ring-4 ring-purple-400/40 shadow-2xl scale-[1.02] z-50' 
        : 'border-purple-200 hover:border-purple-400'
    }`}>
      {/* Header com Gradiente Instagram */}
      <div className="px-4 py-3 bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 text-white flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-white/20 backdrop-blur-xs flex items-center justify-center text-white font-bold">
            <Zap className="w-3.5 h-3.5 fill-white" />
          </div>
          <span className="font-bold text-xs tracking-wide">⚡ Quando... (Gatilho Inicial)</span>
        </div>
        <button onClick={onDelete} className="text-white/80 hover:text-white transition-colors opacity-0 group-hover:opacity-100">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Conteúdo do Gatilho */}
      <div className="p-4 flex flex-col gap-3">
        
        {/* Seletor de Tipo de Gatilho (Manychat Style) */}
        <div>
          <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
            Canal / Evento do Gatilho
          </label>
          <select 
            value={currentType} 
            onChange={(e) => handleTypeChange(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold text-gray-900 bg-gray-50 outline-none focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500 transition-all cursor-pointer"
          >
            <option value="dm_keyword">📩 Direct: Palavra-Chave na DM</option>
            <option value="comment_keyword">💬 Comentário em Post / Reels</option>
            <option value="story_mention">📸 Menção no Story (@suaconta)</option>
            <option value="story_reply">📲 Resposta a Story</option>
            <option value="welcome_dm">👋 Boas-Vindas a Novos Seguidores</option>
          </select>
        </div>

        {/* Formulário Condicional com Base no Tipo Selecionado */}
        {currentType === 'dm_keyword' && (
          <div className="bg-indigo-50/80 border border-indigo-100 rounded-xl p-3 space-y-2">
            <div className="flex items-center gap-1.5 text-indigo-950 font-bold text-xs">
              <MessageSquare className="w-3.5 h-3.5 text-indigo-600" />
              <span>O usuário envia uma mensagem na DM</span>
            </div>
            <p className="text-[11px] text-gray-500">Gera resposta quando a mensagem contiver a palavra-chave:</p>
            <input 
              type="text" 
              value={(data.keyword as string) || ''} 
              onChange={(e) => updateNodeData(id, { keyword: e.target.value })}
              placeholder="Ex: preço, cupom, quero"
              className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-900 bg-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-semibold"
            />
          </div>
        )}

        {currentType === 'comment_keyword' && (
          <div className="bg-orange-50/80 border border-orange-100 rounded-xl p-3 space-y-2">
            <div className="flex items-center gap-1.5 text-orange-950 font-bold text-xs">
              <MessageCircle className="w-3.5 h-3.5 text-orange-600" />
              <span>O usuário comenta em um Post/Reels</span>
            </div>
            <p className="text-[11px] text-gray-500">Gatilho ativado se o comentário contiver:</p>
            <input 
              type="text" 
              value={(data.keyword as string) || ''} 
              onChange={(e) => updateNodeData(id, { keyword: e.target.value })}
              placeholder="Ex: QUERO, LINK (deixe vazio p/ todos)"
              className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-900 bg-white outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 font-semibold mb-1"
            />
            <label className="text-[10px] font-bold text-orange-800 uppercase block">Resposta pública no post (opcional):</label>
            <input 
              type="text" 
              value={(data.publicReply as string) || ''} 
              onChange={(e) => updateNodeData(id, { publicReply: e.target.value })}
              placeholder="Ex: Te enviei os detalhes no Direct! 📥"
              className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-900 bg-white outline-none"
            />
          </div>
        )}

        {currentType === 'story_mention' && (
          <div className="bg-pink-50/80 border border-pink-100 rounded-xl p-3 space-y-1.5">
            <div className="flex items-center gap-1.5 text-pink-950 font-bold text-xs">
              <Camera className="w-3.5 h-3.5 text-pink-600" />
              <span>Alguém marcou @suaconta em um Story</span>
            </div>
            <p className="text-[11px] text-pink-700 leading-relaxed">
              Dispara uma DM automática de agradecimento instantaneamente para quem te marcar nos Stories!
            </p>
          </div>
        )}

        {currentType === 'story_reply' && (
          <div className="bg-purple-50/80 border border-purple-100 rounded-xl p-3 space-y-2">
            <div className="flex items-center gap-1.5 text-purple-950 font-bold text-xs">
              <Sparkles className="w-3.5 h-3.5 text-purple-600" />
              <span>Resposta ou Emoji em seu Story</span>
            </div>
            <p className="text-[11px] text-gray-500">Palavra ou reação no Story (deixe em branco para qualquer resposta):</p>
            <input 
              type="text" 
              value={(data.keyword as string) || ''} 
              onChange={(e) => updateNodeData(id, { keyword: e.target.value })}
              placeholder="Ex: sim, 🔥, quero"
              className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-900 bg-white outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 font-semibold"
            />
          </div>
        )}

        {currentType === 'welcome_dm' && (
          <div className="bg-emerald-50/80 border border-emerald-100 rounded-xl p-3 space-y-1.5">
            <div className="flex items-center gap-1.5 text-emerald-950 font-bold text-xs">
              <UserPlus className="w-3.5 h-3.5 text-emerald-600" />
              <span>Boas-Vindas a Novos Seguidores</span>
            </div>
            <p className="text-[11px] text-emerald-700 leading-relaxed">
              Envie uma DM de boas-vindas e oferta especial para novos seguidores que acabaram de seguir sua conta.
            </p>
          </div>
        )}
      </div>

      <Handle 
        type="source" 
        position={Position.Right} 
        id="right"
        className="w-3.5 h-3.5 bg-cyan-400 border-2 border-white"
      />
      <Handle 
        type="source" 
        position={Position.Bottom} 
        id="bottom"
        className="w-3.5 h-3.5 bg-cyan-400 border-2 border-white"
      />
    </div>
  );
}
