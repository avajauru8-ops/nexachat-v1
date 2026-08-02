import { Handle, Position, NodeProps, useReactFlow } from '@xyflow/react';
import { Zap, X, MessageSquare, Camera, MessageCircle, UserPlus, Sparkles, Image as ImageIcon, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';

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

  const [mediaList, setMediaList] = useState<any[]>([]);
  const [loadingMedia, setLoadingMedia] = useState(false);
  const [showMediaSelector, setShowMediaSelector] = useState(false);

  useEffect(() => {
    if (currentType === 'comment_keyword' && showMediaSelector && mediaList.length === 0) {
      fetchMedia();
    }
  }, [currentType, showMediaSelector]);

  const fetchMedia = async () => {
    setLoadingMedia(true);
    try {
      // workspaceId is generally available in the URL or we can let the API find it
      const res = await fetch('/api/instagram/media');
      const result = await res.json();
      if (result.success) {
        setMediaList(result.data);
      }
    } catch (e) {
      console.error('Error fetching media', e);
    } finally {
      setLoadingMedia(false);
    }
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
            
            {/* Seletor de Post/Reels */}
            <div className="mt-2 p-2 bg-white rounded-lg border border-orange-200">
              <label className="text-[10px] font-bold text-orange-800 uppercase block mb-1">Qual Post ou Reels?</label>
              
              {!data.specificMediaId || data.specificMediaId === 'all' ? (
                <button 
                  onClick={() => setShowMediaSelector(!showMediaSelector)}
                  className="w-full text-left px-2 py-1.5 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-md text-xs font-semibold text-orange-900 transition-colors flex items-center justify-between"
                >
                  <span>Qualquer Post/Reels</span>
                  <ImageIcon className="w-3.5 h-3.5 text-orange-600" />
                </button>
              ) : (
                <div className="flex items-center justify-between bg-orange-100/50 p-1.5 rounded-md border border-orange-300">
                  <div className="flex items-center gap-2 truncate">
                    {data.specificMediaUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={data.specificMediaUrl as string} alt="thumb" className="w-6 h-6 rounded-sm object-cover" />
                    ) : (
                      <ImageIcon className="w-4 h-4 text-orange-600" />
                    )}
                    <span className="text-[10px] font-bold text-orange-900 truncate">
                      Selecionado: {(data.specificMediaCaption as string)?.substring(0, 20) || (data.specificMediaId as string)}
                    </span>
                  </div>
                  <button 
                    onClick={() => updateNodeData(id, { specificMediaId: 'all', specificMediaUrl: null, specificMediaCaption: null })}
                    className="p-1 hover:bg-orange-200 rounded-md transition-colors"
                    title="Remover seleção"
                  >
                    <X className="w-3 h-3 text-orange-700" />
                  </button>
                </div>
              )}

              {/* Lista de Seleção de Media */}
              {showMediaSelector && (!data.specificMediaId || data.specificMediaId === 'all') && (
                <div className="mt-2 max-h-40 overflow-y-auto bg-white border border-gray-200 rounded-md shadow-inner custom-scrollbar">
                  {loadingMedia ? (
                    <div className="flex justify-center p-4">
                      <Loader2 className="w-4 h-4 text-orange-500 animate-spin" />
                    </div>
                  ) : mediaList.length === 0 ? (
                    <div className="p-3 text-center text-[10px] text-gray-500">Nenhuma publicação encontrada</div>
                  ) : (
                    <div className="flex flex-col">
                      {mediaList.map((media) => (
                        <button
                          key={media.id}
                          onClick={() => {
                            updateNodeData(id, { 
                              specificMediaId: media.id, 
                              specificMediaUrl: media.thumbnail_url || media.media_url,
                              specificMediaCaption: media.caption
                            });
                            setShowMediaSelector(false);
                          }}
                          className="flex items-start gap-2 p-2 hover:bg-orange-50 border-b border-gray-100 transition-colors text-left"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img 
                            src={media.thumbnail_url || media.media_url} 
                            alt="thumb" 
                            className="w-8 h-8 rounded object-cover flex-shrink-0 bg-gray-100"
                          />
                          <div className="flex-1 min-w-0">
                            <span className="text-[9px] font-black uppercase text-orange-600 tracking-wider">
                              {media.media_type === 'VIDEO' ? 'REELS' : 'POST'}
                            </span>
                            <p className="text-[10px] text-gray-700 truncate font-medium">
                              {media.caption || 'Sem legenda'}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <p className="text-[11px] text-gray-500 mt-2">Gatilho ativado se o comentário contiver:</p>
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
