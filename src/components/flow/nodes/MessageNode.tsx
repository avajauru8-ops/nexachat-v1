import { Handle, Position, NodeProps, useReactFlow } from '@xyflow/react';
import { X, Plus, Image as ImageIcon, Video, FileText, Link as LinkIcon, MessageSquare, Trash2, ChevronDown } from 'lucide-react';
import { useState } from 'react';

export interface AttachmentItem {
  id: string;
  type: 'text' | 'button' | 'link' | 'image' | 'video' | 'file';
  value: string;
  label?: string;
}

export function MessageNode({ id, data, selected }: NodeProps) {
  const { setNodes, setEdges, updateNodeData } = useReactFlow();
  
  // Elementos anexados dentro do nó (começa limpo se não for passado nada no data)
  const [attachments, setAttachments] = useState<AttachmentItem[]>(
    (data.attachments as AttachmentItem[]) || []
  );
  const [showAttachMenu, setShowAttachMenu] = useState(false);

  const onDeleteNode = () => {
    setNodes((nds) => nds.filter((n) => n.id !== id));
    setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
  };

  const handleAddAttachment = (type: AttachmentItem['type']) => {
    setShowAttachMenu(false);
    let label = '';
    let value = '';

    if (type === 'button') {
      label = prompt('Digite o texto do Botão:', 'Clique Aqui 🔥') || '';
      if (!label.trim()) return;
    } else if (type === 'link') {
      label = prompt('Texto do Link:', 'Acessar Nosso Site 🔗') || '';
      value = prompt('URL de destino (https://...):', 'https://') || '';
      if (!label.trim()) return;
    } else if (type === 'image') {
      value = prompt('URL da Imagem (https://...):', 'https://') || '';
      if (!value.trim()) return;
    } else if (type === 'video') {
      value = prompt('URL do Vídeo (https://...):', 'https://') || '';
      if (!value.trim()) return;
    } else if (type === 'file') {
      label = prompt('Nome do Arquivo/PDF:', 'Documento.pdf') || '';
      value = prompt('URL do Arquivo (https://...):', 'https://') || '';
      if (!label.trim()) return;
    } else if (type === 'text') {
      value = '';
    }

    const newItem: AttachmentItem = {
      id: Math.random().toString(),
      type,
      label,
      value
    };

    const updated = [...attachments, newItem];
    setAttachments(updated);
    updateNodeData(id, { attachments: updated });
  };

  const handleRemoveAttachment = (attachId: string) => {
    const updated = attachments.filter(a => a.id !== attachId);
    setAttachments(updated);
    updateNodeData(id, { attachments: updated });
    // Remove edges originadas dessa attachment (se for botão)
    setEdges(eds => eds.filter(e => e.sourceHandle !== `btn-${attachId}`));
  };

  const handleUpdateAttachmentValue = (attachId: string, value: string) => {
    const updated = attachments.map(a => a.id === attachId ? { ...a, value } : a);
    setAttachments(updated);
    updateNodeData(id, { attachments: updated });
  };

  return (
    <div className={`bg-white border-2 rounded-2xl min-w-[290px] max-w-[340px] group overflow-hidden transition-all duration-200 relative ${
      selected 
        ? 'border-pink-500 ring-4 ring-pink-400/40 shadow-2xl scale-[1.02] z-50' 
        : 'border-pink-200 hover:border-pink-400 shadow-md'
    }`}>
      {/* Handles de Entrada */}
      <Handle 
        type="target" 
        position={Position.Left} 
        id="left"
        className="w-3.5 h-3.5 bg-pink-500 border-2 border-white"
      />
      <Handle 
        type="target" 
        position={Position.Top} 
        id="top"
        className="w-3.5 h-3.5 bg-pink-500 border-2 border-white"
      />

      {/* Header do Nó com Gradiente Oficial Instagram */}
      <div className="px-4 py-3 bg-gradient-to-r from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] text-white flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-white/20 backdrop-blur-xs flex items-center justify-center text-white">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5">
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
              <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
            </svg>
          </div>
          <span className="font-bold text-xs tracking-wide">
            Instagram <span className="opacity-80 font-normal">Send Message</span>
          </span>
        </div>
        <button onClick={onDeleteNode} className="text-white/80 hover:text-white transition-colors opacity-0 group-hover:opacity-100">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Corpo com Texto Principal Limpo */}
      <div className="p-4 flex flex-col gap-3">
        <div className="bg-gray-50/80 border border-gray-200 rounded-xl p-3">
          <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Texto da Mensagem</label>
          <textarea 
            value={(data.text as string) || ''} 
            onChange={(e) => updateNodeData(id, { text: e.target.value })}
            rows={3}
            placeholder="Escreva sua mensagem aqui..."
            className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-xs text-gray-900 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 resize-y max-h-44 overflow-y-auto nowheel font-medium leading-relaxed"
          />
        </div>

        {/* Lista Dinâmica de Anexos / Encaixes adicionados pelo usuário */}
        {attachments.length > 0 && (
          <div className="space-y-2 pt-1 border-t border-gray-100">
            {attachments.map((item) => (
              <div key={item.id} className="relative group/item bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-xs shadow-xs">
                
                {/* Cabeçalho do Anexo */}
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1">
                    {item.type === 'button' && '🔘 Botão de Ação'}
                    {item.type === 'link' && '🔗 Link Externo'}
                    {item.type === 'image' && '🖼️ Imagem'}
                    {item.type === 'video' && '🎥 Vídeo'}
                    {item.type === 'file' && '📄 Documento PDF'}
                    {item.type === 'text' && '💬 Texto Extra'}
                  </span>
                  <button 
                    onClick={() => handleRemoveAttachment(item.id)}
                    className="text-gray-400 hover:text-red-500 transition-colors p-0.5"
                    title="Remover encaixe"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Conteúdo por tipo de anexo */}
                {item.type === 'button' && (
                  <div className="bg-white border border-emerald-300 text-emerald-800 font-bold py-1.5 px-3 rounded-lg text-center shadow-xs flex items-center justify-between relative">
                    <span>{item.label}</span>
                    <Handle 
                      type="source" 
                      position={Position.Right} 
                      id={`btn-${item.id}`}
                      className="w-3.5 h-3.5 bg-cyan-400 border-2 border-white -right-4"
                    />
                  </div>
                )}

                {item.type === 'link' && (
                  <div className="space-y-1">
                    <p className="font-semibold text-blue-600 flex items-center gap-1">
                      <LinkIcon className="w-3 h-3" /> {item.label}
                    </p>
                    <p className="text-[10px] text-gray-400 truncate">{item.value}</p>
                  </div>
                )}

                {item.type === 'image' && (
                  <div>
                    {item.value ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={item.value} alt="Anexo" className="w-full h-24 object-cover rounded-lg mb-1" />
                    ) : null}
                    <input
                      type="text"
                      value={item.value}
                      onChange={(e) => handleUpdateAttachmentValue(item.id, e.target.value)}
                      placeholder="URL da foto (https://...)"
                      className="w-full border border-gray-200 rounded px-2 py-1 text-[11px] bg-white outline-none nowheel"
                    />
                  </div>
                )}

                {item.type === 'video' && (
                  <div>
                    <input
                      type="text"
                      value={item.value}
                      onChange={(e) => handleUpdateAttachmentValue(item.id, e.target.value)}
                      placeholder="URL do vídeo (https://...)"
                      className="w-full border border-gray-200 rounded px-2 py-1 text-[11px] bg-white outline-none nowheel"
                    />
                  </div>
                )}

                {item.type === 'file' && (
                  <div className="flex items-center gap-2 bg-white border border-gray-200 p-2 rounded-lg text-xs font-medium text-gray-700">
                    <FileText className="w-4 h-4 text-purple-600" />
                    <span className="truncate flex-1">{item.label || 'Documento.pdf'}</span>
                  </div>
                )}

                {item.type === 'text' && (
                  <textarea
                    value={item.value}
                    onChange={(e) => handleUpdateAttachmentValue(item.id, e.target.value)}
                    placeholder="Texto adicional..."
                    rows={2}
                    className="w-full border border-gray-200 rounded p-1.5 text-xs bg-white outline-none resize-y max-h-24 overflow-y-auto nowheel"
                  />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Menu Seletor para Encaixar Novos Anexos */}
        <div className="relative pt-1">
          <button 
            onClick={() => setShowAttachMenu(prev => !prev)}
            className="w-full py-2 bg-gray-50 border border-dashed border-gray-300 hover:border-cyan-400 text-cyan-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Encaixar Anexo / Botão <ChevronDown className="w-3 h-3" />
          </button>

          {showAttachMenu && (
            <div className="absolute left-0 right-0 bottom-10 bg-white border border-gray-200 rounded-xl shadow-xl p-1.5 z-50 flex flex-col gap-1 text-xs">
              <button onClick={() => handleAddAttachment('button')} className="w-full text-left px-3 py-1.5 hover:bg-emerald-50 text-emerald-800 rounded-lg font-semibold flex items-center gap-2">
                <span>🔘 Botão de Ação</span>
              </button>
              <button onClick={() => handleAddAttachment('link')} className="w-full text-left px-3 py-1.5 hover:bg-blue-50 text-blue-800 rounded-lg font-semibold flex items-center gap-2">
                <LinkIcon className="w-3.5 h-3.5" /> Link / URL Externa
              </button>
              <button onClick={() => handleAddAttachment('image')} className="w-full text-left px-3 py-1.5 hover:bg-pink-50 text-pink-800 rounded-lg font-semibold flex items-center gap-2">
                <ImageIcon className="w-3.5 h-3.5" /> Imagem
              </button>
              <button onClick={() => handleAddAttachment('video')} className="w-full text-left px-3 py-1.5 hover:bg-purple-50 text-purple-800 rounded-lg font-semibold flex items-center gap-2">
                <Video className="w-3.5 h-3.5" /> Vídeo
              </button>
              <button onClick={() => handleAddAttachment('file')} className="w-full text-left px-3 py-1.5 hover:bg-amber-50 text-amber-800 rounded-lg font-semibold flex items-center gap-2">
                <FileText className="w-3.5 h-3.5" /> Documento / PDF
              </button>
              <button onClick={() => handleAddAttachment('text')} className="w-full text-left px-3 py-1.5 hover:bg-gray-100 text-gray-800 rounded-lg font-semibold flex items-center gap-2">
                <MessageSquare className="w-3.5 h-3.5" /> Texto Extra
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Footer do Nó */}
      <div className="px-4 py-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400 font-medium">
        <span>Próximo Passo</span>
      </div>

      {/* Handles de Saída */}
      <Handle 
        type="source" 
        position={Position.Right} 
        id="right-next"
        className="w-3.5 h-3.5 bg-cyan-400 border-2 border-white"
      />
      <Handle 
        type="source" 
        position={Position.Bottom} 
        id="bottom-next"
        className="w-3.5 h-3.5 bg-cyan-400 border-2 border-white"
      />
    </div>
  );
}
