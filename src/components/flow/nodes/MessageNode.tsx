import { Handle, Position, NodeProps, useReactFlow } from '@xyflow/react';
import { X, Plus, Image as ImageIcon, Video, FileText, Link as LinkIcon, MessageSquare, Trash2, ChevronDown, MousePointerClick } from 'lucide-react';
import { useState } from 'react';

export interface AttachmentItem {
  id: string;
  type: 'text' | 'button' | 'link' | 'image' | 'video' | 'file';
  value: string;
  label?: string;
}

export function MessageNode({ id, data, selected }: NodeProps) {
  const { setNodes, setEdges, updateNodeData } = useReactFlow();
  
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
      value = prompt('Payload (identificador interno do botão, opcional):', label) || label;
    } else if (type === 'link') {
      value = prompt('URL de destino (https://...):', 'https://') || '';
      if (!value.trim()) return;
      label = prompt('Texto do Link (opcional):', '') || '';
    } else if (type === 'image' || type === 'video') {
      value = prompt('URL da mídia (https://...):', 'https://') || '';
      if (!value.trim()) return;
    } else if (type === 'file') {
      value = prompt('URL do Arquivo (https://...):', 'https://') || '';
      if (!value.trim()) return;
      label = prompt('Nome do Arquivo/PDF (opcional):', 'Documento.pdf') || '';
    } else if (type === 'text') {
      value = '';
    }

    const newItem: AttachmentItem = {
      id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
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
    setEdges(eds => eds.filter(e => e.sourceHandle !== `btn-${attachId}`));
  };

  const handleUpdateAttachment = (attachId: string, patch: Partial<AttachmentItem>) => {
    const updated = attachments.map(a => a.id === attachId ? { ...a, ...patch } : a);
    setAttachments(updated);
    updateNodeData(id, { attachments: updated });
  };

  const attachTypeLabel = (type: AttachmentItem['type']) => {
    switch (type) {
      case 'button': return '🔘 Botão de Ação';
      case 'link': return '🔗 Link Externo';
      case 'image': return '🖼️ Imagem';
      case 'video': return '🎥 Vídeo';
      case 'file': return '📄 Documento PDF';
      case 'text': return '💬 Texto Extra';
    }
  };

  const hasEditableLabel = (type: AttachmentItem['type']) => type === 'button' || type === 'link' || type === 'file';

  return (
    <div className={`bg-white border-2 rounded-2xl min-w-[300px] max-w-[360px] group overflow-visible transition-all duration-200 relative ${
      selected 
        ? 'border-pink-500 ring-4 ring-pink-400/40 shadow-2xl scale-[1.02] z-50' 
        : 'border-pink-200 hover:border-pink-400 shadow-md'
    }`}>
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

      <div className="px-4 py-3 bg-gradient-to-r from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] text-white flex items-center justify-between shadow-xs rounded-t-2xl">
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

      <div className="p-4 flex flex-col gap-3">
        <div className="bg-gray-50/80 border border-gray-200 rounded-xl p-3">
          <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Texto da Mensagem</label>
          <textarea 
            value={(data.text as string) || ''} 
            onChange={(e) => updateNodeData(id, { text: e.target.value })}
            rows={3}
            placeholder="Escreva sua mensagem aqui..."
            className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-xs text-gray-900 outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 resize-y max-h-44 overflow-y-auto nowheel font-medium leading-relaxed"
          />
        </div>

        {attachments.length > 0 && (
          <div className="space-y-2 pt-1 border-t border-gray-100">
            {attachments.map((item) => (
              <div key={item.id} className="relative group/item bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-xs shadow-xs">
                
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1">
                    {attachTypeLabel(item.type)}
                  </span>
                  <button 
                    onClick={() => handleRemoveAttachment(item.id)}
                    className="text-gray-400 hover:text-red-500 transition-colors p-0.5"
                    title="Remover encaixe"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {item.type === 'button' && (
                  <div className="space-y-1.5">
                    <div className="bg-white border border-emerald-300 text-emerald-800 font-bold py-1.5 px-3 rounded-lg text-center shadow-xs flex items-center justify-between relative">
                      <input
                        type="text"
                        value={item.label || ''}
                        onChange={(e) => handleUpdateAttachment(item.id, { label: e.target.value })}
                        placeholder="Texto do botão"
                        className="w-full bg-transparent border-none outline-none text-center text-emerald-800 font-bold text-xs nowheel"
                      />
                      <Handle 
                        type="source" 
                        position={Position.Right} 
                        id={`btn-${item.id}`}
                        className="w-3.5 h-3.5 bg-cyan-400 border-2 border-white -right-4"
                      />
                    </div>
                    <input
                      type="text"
                      value={item.value || ''}
                      onChange={(e) => handleUpdateAttachment(item.id, { value: e.target.value })}
                      placeholder="Payload (identificador interno, opcional)"
                      className="w-full border border-gray-200 rounded px-2 py-1 text-[11px] bg-white outline-none nowheel"
                    />
                  </div>
                )}

                {item.type === 'link' && (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <LinkIcon className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <input
                        type="text"
                        value={item.label || ''}
                        onChange={(e) => handleUpdateAttachment(item.id, { label: e.target.value })}
                        placeholder="Texto do link (opcional)"
                        className="flex-1 border border-gray-200 rounded px-2 py-1 text-[11px] bg-white outline-none nowheel"
                      />
                    </div>
                    <input
                      type="text"
                      value={item.value || ''}
                      onChange={(e) => handleUpdateAttachment(item.id, { value: e.target.value })}
                      placeholder="URL de destino (https://...)"
                      className="w-full border border-gray-200 rounded px-2 py-1 text-[11px] bg-white outline-none nowheel"
                    />
                  </div>
                )}

                {item.type === 'image' && (
                  <div className="space-y-1.5">
                    {item.value ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={item.value} alt="Anexo" className="w-full h-24 object-cover rounded-lg mb-1" />
                    ) : null}
                    <input
                      type="text"
                      value={item.value || ''}
                      onChange={(e) => handleUpdateAttachment(item.id, { value: e.target.value })}
                      placeholder="URL da foto (https://...)"
                      className="w-full border border-gray-200 rounded px-2 py-1 text-[11px] bg-white outline-none nowheel"
                    />
                  </div>
                )}

                {item.type === 'video' && (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-gray-400">
                      <Video className="w-3.5 h-3.5" />
                      <span className="text-[10px]">Vídeo enviado como anexo</span>
                    </div>
                    <input
                      type="text"
                      value={item.value || ''}
                      onChange={(e) => handleUpdateAttachment(item.id, { value: e.target.value })}
                      placeholder="URL do vídeo (https://...)"
                      className="w-full border border-gray-200 rounded px-2 py-1 text-[11px] bg-white outline-none nowheel"
                    />
                  </div>
                )}

                {item.type === 'file' && (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 bg-white border border-gray-200 p-2 rounded-lg text-xs font-medium text-gray-700">
                      <FileText className="w-4 h-4 text-purple-600 shrink-0" />
                      <input
                        type="text"
                        value={item.label || ''}
                        onChange={(e) => handleUpdateAttachment(item.id, { label: e.target.value })}
                        placeholder="Nome do arquivo"
                        className="flex-1 bg-transparent border-none outline-none text-xs font-medium nowheel"
                      />
                    </div>
                    <input
                      type="text"
                      value={item.value || ''}
                      onChange={(e) => handleUpdateAttachment(item.id, { value: e.target.value })}
                      placeholder="URL do arquivo (https://...)"
                      className="w-full border border-gray-200 rounded px-2 py-1 text-[11px] bg-white outline-none nowheel"
                    />
                  </div>
                )}

                {item.type === 'text' && (
                  <textarea
                    value={item.value || ''}
                    onChange={(e) => handleUpdateAttachment(item.id, { value: e.target.value })}
                    placeholder="Texto adicional..."
                    rows={2}
                    className="w-full border border-gray-200 rounded p-1.5 text-xs bg-white outline-none resize-y max-h-24 overflow-y-auto nowheel"
                  />
                )}

                {hasEditableLabel(item.type) && item.type !== 'button' && (
                  <p className="text-[9px] text-gray-400 mt-1">O texto será enviado junto com o anexo.</p>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="relative pt-1">
          <button 
            onClick={() => setShowAttachMenu(prev => !prev)}
            className="w-full py-2 bg-gray-50 border border-dashed border-gray-300 hover:border-pink-400 text-pink-600 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Encaixar Anexo / Botão <ChevronDown className="w-3 h-3" />
          </button>

          {showAttachMenu && (
            <div className="absolute left-0 right-0 bottom-10 bg-white border border-gray-200 rounded-xl shadow-xl p-1.5 z-50 flex flex-col gap-1 text-xs">
              <button onClick={() => handleAddAttachment('button')} className="w-full text-left px-3 py-1.5 hover:bg-emerald-50 text-emerald-800 rounded-lg font-semibold flex items-center gap-2">
                <MousePointerClick className="w-3.5 h-3.5" /> Botão de Ação
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

      <div className="px-4 py-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400 font-medium">
        <span>Próximo Passo</span>
        {attachments.length > 0 && (
          <span className="bg-pink-50 text-pink-600 font-bold px-1.5 py-0.5 rounded-full">
            {attachments.length} anexo{attachments.length > 1 ? 's' : ''}
          </span>
        )}
      </div>

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
