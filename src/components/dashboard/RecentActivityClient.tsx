'use client';

import { useState } from 'react';
import { MessageCircle, Zap, Play, Key, ChevronLeft, ChevronRight } from 'lucide-react';

export default function RecentActivityClient({ recentLogs, userTimezone }: { recentLogs: any[], userTimezone: string }) {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 4;
  
  const totalPages = Math.ceil(recentLogs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const visibleLogs = recentLogs.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="glass-panel rounded-3xl p-6 lg:col-span-2">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-bold text-gray-900 tracking-tight">Atividade Recente</h2>
        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1 rounded-md text-gray-500 hover:bg-gray-100 disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-xs font-semibold text-gray-500">
              {currentPage} / {totalPages}
            </span>
            <button 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1 rounded-md text-gray-500 hover:bg-gray-100 disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
      
      {recentLogs.length > 0 ? (
        <div className="space-y-4">
          {visibleLogs.map((log) => (
            <div key={log.id} className="group flex items-start gap-4 p-4 rounded-2xl bg-white/40 border border-white hover:bg-white/70 transition-all shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
              <div className="w-12 h-12 rounded-2xl bg-instagram-gradient flex items-center justify-center text-white flex-shrink-0 shadow-md shadow-pink-500/20 group-hover:scale-110 transition-transform duration-300">
                <Zap className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">
                  O fluxo <span className="font-bold text-transparent bg-clip-text bg-instagram-gradient">&quot;{log.flows?.name || 'Fluxo Excluído'}&quot;</span> foi ativado para <span className="font-bold text-gray-900">@{log.lead_username}</span>
                </p>
                <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                    <Key className="w-3 h-3" />
                    Gatilho: {(log.trigger_type === 'dm_keyword' || log.trigger_type === 'comment_keyword' || log.trigger_type === 'keyword') ? `Palavra "${log.keyword_matched}"` : 
                                log.trigger_type === 'story_mention' ? 'Menção no Story' :
                                log.trigger_type === 'story_reply' ? 'Resposta ao Story' :
                                log.trigger_type === 'welcome_dm' ? 'Nova Conversa (Boas-Vindas)' : log.trigger_type}
                  </div>
                  <div className="flex items-center gap-1">
                    <Play className="w-3 h-3" />
                    {new Date(log.created_at).toLocaleString('pt-BR', { timeZone: userTimezone })}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="h-[340px] flex flex-col items-center justify-center border-2 border-dashed border-gray-200/50 rounded-3xl bg-white/30">
          <MessageCircle className="w-10 h-10 text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">Nenhuma atividade recente.</p>
          <p className="text-gray-400 text-sm mt-1">Os disparos do seu fluxo aparecerão aqui.</p>
        </div>
      )}
    </div>
  );
}
