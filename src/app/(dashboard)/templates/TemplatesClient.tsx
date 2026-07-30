'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, ChevronRight, Sparkles, Folder, Plus } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { PREBUILT_TEMPLATES } from '@/utils/flowTemplates';
import { saveFlow } from '@/app/(dashboard)/flows/actions';

export function TemplatesClient() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [isInstalling, setIsInstalling] = useState<string | null>(null);

  const filteredTemplates = PREBUILT_TEMPLATES.filter(t => {
    const matchSearch = t.title.toLowerCase().includes(search.toLowerCase()) || t.description.toLowerCase().includes(search.toLowerCase());
    const matchCat = activeCategory === 'all' || t.category.toLowerCase() === activeCategory.toLowerCase();
    return matchSearch && matchCat;
  });

  const handleInstallTemplate = async (templateId: string) => {
    const template = PREBUILT_TEMPLATES.find(t => t.id === templateId);
    if (!template) return;

    setIsInstalling(templateId);
    const toastId = toast.loading(`Instalando modelo "${template.title}"...`);

    try {
      const flowData = {
        nodes: template.nodes,
        edges: template.edges
      };

      const triggerKeyword = (template.nodes.find(n => n.type === 'triggerNode')?.data?.keyword as string) || '';

      const newId = await saveFlow(
        'new',
        template.title,
        flowData,
        { triggerType: 'keyword', keyword: triggerKeyword },
        'draft'
      );

      toast.success('Modelo instalado com sucesso!', { id: toastId });
      router.push(`/flows/builder/${newId}`);
    } catch (err: unknown) {
      toast.error('Erro ao instalar modelo: ' + (err instanceof Error ? err.message : String(err)), { id: toastId });
      setIsInstalling(null);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] -m-6 bg-white overflow-hidden">
      
      {/* Header Bar */}
      <div className="h-16 flex items-center justify-between px-6 border-b border-gray-200 shrink-0">
        <h1 className="text-xl font-bold text-gray-900">Biblioteca de Modelos de Automação</h1>
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input 
            type="text" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Procurar em Modelos..." 
            className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm w-72 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-gray-800 bg-gray-50"
          />
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        
        {/* Sidebar Categorias */}
        <div className="w-64 border-r border-gray-200 bg-[#f9fafb] p-4 flex flex-col shrink-0 overflow-y-auto">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 px-3">Por Objetivo</h3>
          <button 
            onClick={() => setActiveCategory('all')}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium mb-1 transition-colors ${
              activeCategory === 'all' ? 'bg-gray-200/80 text-gray-900 font-semibold shadow-xs' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Todos os modelos ({PREBUILT_TEMPLATES.length})
          </button>
          <button 
            onClick={() => setActiveCategory('Crescimento')}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium mb-1 transition-colors ${
              activeCategory === 'Crescimento' ? 'bg-purple-100 text-purple-900 font-semibold' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            🚀 Crescimento & DMs
          </button>
          <button 
            onClick={() => setActiveCategory('Vendas')}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium mb-1 transition-colors ${
              activeCategory === 'Vendas' ? 'bg-green-100 text-green-900 font-semibold' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            💰 Vendas & Agente IA
          </button>
          <button 
            onClick={() => setActiveCategory('Engajamento')}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium mb-1 transition-colors ${
              activeCategory === 'Engajamento' ? 'bg-orange-100 text-orange-900 font-semibold' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            🔥 Engajamento nos Stories
          </button>
        </div>

        {/* Área Principal de Modelos */}
        <div className="flex-1 overflow-y-auto p-8 bg-white">
          <div className="max-w-5xl mx-auto">
            
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Modelos Prontos Recomendados</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
              {filteredTemplates.map((template) => (
                <div 
                  key={template.id} 
                  onClick={() => handleInstallTemplate(template.id)}
                  className="bg-white border border-gray-200 rounded-2xl p-5 hover:border-blue-400 hover:shadow-xl transition-all cursor-pointer flex flex-col group relative overflow-hidden h-56"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      template.category === 'Crescimento' ? 'bg-purple-100 text-purple-700' : template.category === 'Vendas' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                    }`}>
                      {template.category}
                    </span>
                    {template.badge && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border border-orange-200 bg-orange-50 text-orange-600">
                        {template.badge}
                      </span>
                    )}
                  </div>
                  
                  <h3 className="font-bold text-gray-900 text-base mb-2 leading-snug group-hover:text-blue-600 transition-colors">
                    {template.title}
                  </h3>
                  
                  <p className="text-xs text-gray-500 leading-relaxed flex-1">
                    {template.description}
                  </p>
                  
                  <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-blue-600 text-xs font-bold">
                    <span>{isInstalling === template.id ? 'Instalando...' : 'Usar este Modelo'}</span>
                    <ChevronRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              ))}

              <Link 
                href="/flows/builder/new" 
                className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-2xl p-5 hover:bg-blue-50 hover:border-blue-400 transition-all cursor-pointer flex flex-col items-center justify-center text-gray-500 group relative overflow-hidden h-56"
              >
                <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <Plus className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="font-bold text-gray-900 mb-1">Começar do Zero</h3>
                <p className="text-xs text-center text-gray-500 px-4">Crie sua própria automação a partir de um canvas em branco.</p>
              </Link>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
