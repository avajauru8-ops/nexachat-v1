'use client';

import { useState, useEffect, useCallback } from 'react';
import { BarChart3, Users, Link2, UserPlus, Globe, Play, Clock, FileText, Filter, Download, RefreshCw, Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

type GenderFilter = 'all' | 'male' | 'female' | 'non_informed';

interface SummaryData {
  views: number;
  interactions: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
}

interface GenderSummary {
  label: string;
  views: number;
  interactions: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
}

interface LinkClickData {
  url: string;
  clicks: number;
  unique_clicks: number;
}

interface FollowerData {
  total_followers: number;
  new_followers: number;
  lost_followers: number;
  daily_change: number;
}

interface DemographicGender {
  gender: string;
  count: number;
  percentage: number;
}

interface DemographicAge {
  age_range: string;
  count: number;
  percentage: number;
}

interface DemographicCountry {
  country: string;
  count: number;
  percentage: number;
}

interface DemographicCity {
  city: string;
  count: number;
  percentage: number;
}

interface ReelData {
  id: string;
  caption: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  timestamp: string;
  permalink: string;
}

interface ReelDayHourData {
  day: string;
  hour: string;
  count: number;
  total_views: number;
}

interface PostData {
  id: string;
  caption: string;
  media_type: string;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  timestamp: string;
  permalink: string;
}

interface PostTypeData {
  type: string;
  count: number;
  total_likes: number;
  total_comments: number;
  total_views: number;
}

interface PostDayHourData {
  day: string;
  hour: string;
  count: number;
  total_likes: number;
  total_comments: number;
}

interface ApiError {
  error: string;
}

function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

function formatNumberFull(num: number): string {
  return num.toLocaleString('pt-BR');
}

export default function ReportPage() {
  const [activeTab, setActiveTab] = useState<string>('summary');
  const [postSubTab, setPostSubTab] = useState<string>('posts-type');
  const [genderFilter, setGenderFilter] = useState<GenderFilter>('all');
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [refreshing, setRefreshing] = useState(false);
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
  const [genderSummary, setGenderSummary] = useState<GenderSummary[]>([]);
  const [linkClickData, setLinkClickData] = useState<LinkClickData[]>([]);
  const [followerData, setFollowerData] = useState<FollowerData | null>(null);
  const [demographicGender, setDemographicGender] = useState<DemographicGender[]>([]);
  const [demographicAge, setDemographicAge] = useState<DemographicAge[]>([]);
  const [demographicCountry, setDemographicCountry] = useState<DemographicCountry[]>([]);
  const [demographicCity, setDemographicCity] = useState<DemographicCity[]>([]);
  const [topReels, setTopReels] = useState<ReelData[]>([]);
  const [reelsDayHour, setReelsDayHour] = useState<ReelDayHourData[]>([]);
  const [topPosts, setTopPosts] = useState<PostData[]>([]);
  const [postsByType, setPostsByType] = useState<PostTypeData[]>([]);
  const [postsDayHour, setPostsDayHour] = useState<PostDayHourData[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = useCallback(async (section: string, signal?: AbortSignal) => {
    setLoading((prev) => ({ ...prev, [section]: true }));
    setError(null);
    try {
      const res = await fetch(`/api/report/${section}`, { signal });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      switch (section) {
        case 'summary':
          setSummaryData(data.summary);
          setGenderSummary(data.by_gender || []);
          break;
        case 'link-clicks':
          setLinkClickData(data.data || []);
          break;
        case 'followers':
          setFollowerData(data.data);
          break;
        case 'demographics':
          setDemographicGender(data.by_gender || []);
          setDemographicAge(data.by_age || []);
          setDemographicCountry(data.by_country || []);
          setDemographicCity(data.by_city || []);
          break;
        case 'top-reels':
          setTopReels(data.data || []);
          break;
        case 'reels-day-hour':
          setReelsDayHour(data.data || []);
          break;
        case 'top-posts':
          setTopPosts(data.data || []);
          break;
        case 'posts-type':
          setPostsByType(data.data || []);
          break;
        case 'posts-day-hour':
          setPostsDayHour(data.data || []);
          break;
      }
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      console.error(`Error fetching ${section}:`, err);
    } finally {
      setLoading((prev) => ({ ...prev, [section]: false }));
    }
  }, []);

  const fetchAllData = useCallback(async () => {
    setRefreshing(true);
    const sections = ['summary', 'link-clicks', 'followers', 'demographics', 'top-reels', 'reels-day-hour', 'top-posts', 'posts-type', 'posts-day-hour'];
    const controller = new AbortController();
    const { signal } = controller;

    await Promise.all(sections.map((s) => fetchReport(s, signal)));
    setRefreshing(false);
  }, [fetchReport]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const handleGenderFilter = (filter: GenderFilter) => {
    setGenderFilter(filter);
    fetchReport('summary');
  };

  const tabs = [
    { id: 'summary', label: 'Resumo Geral', icon: BarChart3 },
    { id: 'link-clicks', label: 'Links do Perfil', icon: Link2 },
    { id: 'followers', label: 'Seguidores', icon: UserPlus },
    { id: 'demographics', label: 'Demográfico', icon: Globe },
    { id: 'top-reels', label: 'Top Reels', icon: Play },
    { id: 'reels-day-hour', label: 'Reels por Dia/Hora', icon: Clock },
    { id: 'top-posts', label: 'Top Posts', icon: FileText },
  ];

  const subTabs = [
    { id: 'posts-type', label: 'Por Tipo' },
    { id: 'posts-day-hour', label: 'Por Dia e Hora' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </Link>
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
              <BarChart3 className="w-8 h-8 text-instagram" />
              Relatório
            </h1>
            <p className="text-gray-500 mt-1">Análise completa do perfil do Instagram</p>
          </div>
        </div>
        <button
          onClick={fetchAllData}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Atualizando...' : 'Atualizar'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm font-medium">
          {error}
        </div>
      )}

      <div className="flex gap-2 overflow-x-auto pb-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-instagram-gradient text-white shadow-md shadow-pink-500/20'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="glass-panel rounded-3xl p-6">
        {loading[activeTab] && !refreshing && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-instagram" />
          </div>
        )}

        {activeTab === 'summary' && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-xl font-bold text-gray-900">Resumo Geral do Perfil</h2>
              <div className="flex gap-2 ml-auto">
                {(['all', 'male', 'female', 'non_informed'] as GenderFilter[]).map((f) => (
                  <button
                    key={f}
                    onClick={() => handleGenderFilter(f)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                      genderFilter === f
                        ? 'bg-instagram-gradient text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {f === 'all' ? 'Todos' : f === 'male' ? 'Homem' : f === 'female' ? 'Mulher' : 'Não informado'}
                  </button>
                ))}
              </div>
            </div>

            {summaryData && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {[
                  { label: 'Visualizações', value: summaryData.views, color: 'from-blue-500 to-blue-600' },
                  { label: 'Interações', value: summaryData.interactions, color: 'from-purple-500 to-purple-600' },
                  { label: 'Curtidas', value: summaryData.likes, color: 'from-pink-500 to-pink-600' },
                  { label: 'Comentários', value: summaryData.comments, color: 'from-indigo-500 to-indigo-600' },
                  { label: 'Compartilhamentos', value: summaryData.shares, color: 'from-emerald-500 to-emerald-600' },
                  { label: 'Salvos', value: summaryData.saves, color: 'from-amber-500 to-amber-600' },
                ].map((stat) => (
                  <div key={stat.label} className={`bg-gradient-to-br ${stat.color} rounded-2xl p-4 text-white shadow-lg shadow-black/5`}>
                    <p className="text-xs font-semibold opacity-80 uppercase tracking-wider">{stat.label}</p>
                    <p className="text-2xl font-black mt-1">{formatNumber(stat.value)}</p>
                  </div>
                ))}
              </div>
            )}

            {genderSummary.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Detalhamento por Gênero</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-semibold text-gray-600">Gênero</th>
                        <th className="text-right py-3 px-4 font-semibold text-gray-600">Visualizações</th>
                        <th className="text-right py-3 px-4 font-semibold text-gray-600">Interações</th>
                        <th className="text-right py-3 px-4 font-semibold text-gray-600">Curtidas</th>
                        <th className="text-right py-3 px-4 font-semibold text-gray-600">Comentários</th>
                        <th className="text-right py-3 px-4 font-semibold text-gray-600">Compartilhamentos</th>
                        <th className="text-right py-3 px-4 font-semibold text-gray-600">Salvos</th>
                      </tr>
                    </thead>
                    <tbody>
                      {genderSummary.map((row) => (
                        <tr key={row.label} className="border-b border-gray-100 hover:bg-gray-50/50">
                          <td className="py-3 px-4 font-medium text-gray-900">{row.label}</td>
                          <td className="text-right py-3 px-4 text-gray-700">{formatNumberFull(row.views)}</td>
                          <td className="text-right py-3 px-4 text-gray-700">{formatNumberFull(row.interactions)}</td>
                          <td className="text-right py-3 px-4 text-gray-700">{formatNumberFull(row.likes)}</td>
                          <td className="text-right py-3 px-4 text-gray-700">{formatNumberFull(row.comments)}</td>
                          <td className="text-right py-3 px-4 text-gray-700">{formatNumberFull(row.shares)}</td>
                          <td className="text-right py-3 px-4 text-gray-700">{formatNumberFull(row.saves)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'link-clicks' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-gray-900">Click em Links do Perfil</h2>
            {linkClickData.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-semibold text-gray-600">URL</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-600">Cliques</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-600">Cliques Únicos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {linkClickData.map((row, idx) => (
                      <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50/50">
                        <td className="py-3 px-4 text-blue-600 font-medium truncate max-w-xs">
                          <a href={row.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                            {row.url}
                          </a>
                        </td>
                        <td className="text-right py-3 px-4 text-gray-700 font-semibold">{formatNumberFull(row.clicks)}</td>
                        <td className="text-right py-3 px-4 text-gray-700">{formatNumberFull(row.unique_clicks)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">Nenhum dado de clique em links disponível.</p>
            )}
          </div>
        )}

        {activeTab === 'followers' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-gray-900">Seguidores e Novos Seguidores</h2>
            {followerData && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
                  <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Total de Seguidores</p>
                  <p className="text-3xl font-black text-blue-900 mt-2">{formatNumberFull(followerData.total_followers)}</p>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5">
                  <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Novos Seguidores</p>
                  <p className="text-3xl font-black text-emerald-900 mt-2">+{formatNumberFull(followerData.new_followers)}</p>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
                  <p className="text-xs font-semibold text-red-600 uppercase tracking-wider">Perdidos</p>
                  <p className="text-3xl font-black text-red-900 mt-2">-{formatNumberFull(followerData.lost_followers)}</p>
                </div>
                <div className="bg-purple-50 border border-purple-200 rounded-2xl p-5">
                  <p className="text-xs font-semibold text-purple-600 uppercase tracking-wider">Mudança Diária</p>
                  <p className={`text-3xl font-black mt-2 ${followerData.daily_change >= 0 ? 'text-emerald-900' : 'text-red-900'}`}>
                    {followerData.daily_change >= 0 ? '+' : ''}{followerData.daily_change}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'demographics' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-900">Demográfico</h2>

            <div>
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Por Gênero</h3>
              {demographicGender.length > 0 ? (
                <div className="space-y-2">
                  {demographicGender.map((item) => (
                    <div key={item.gender} className="flex items-center gap-3">
                      <span className="w-24 text-sm font-medium text-gray-700">{item.gender}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                        <div
                          className="h-full bg-instagram-gradient rounded-full flex items-center justify-end pr-2"
                          style={{ width: `${item.percentage}%` }}
                        >
                          <span className="text-[10px] font-bold text-white">{item.count.toLocaleString('pt-BR')}</span>
                        </div>
                      </div>
                      <span className="text-sm font-semibold text-gray-600 w-12 text-right">{item.percentage.toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">Sem dados de gênero disponíveis.</p>
              )}
            </div>

            <div>
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Faixa Etária</h3>
              {demographicAge.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 px-3 font-semibold text-gray-600">Faixa Etária</th>
                        <th className="text-right py-2 px-3 font-semibold text-gray-600">Quantidade</th>
                        <th className="text-right py-2 px-3 font-semibold text-gray-600">Percentual</th>
                      </tr>
                    </thead>
                    <tbody>
                      {demographicAge.map((row) => (
                        <tr key={row.age_range} className="border-b border-gray-100">
                          <td className="py-2 px-3 font-medium text-gray-900">{row.age_range}</td>
                          <td className="text-right py-2 px-3 text-gray-700">{formatNumberFull(row.count)}</td>
                          <td className="text-right py-2 px-3 text-gray-700">{row.percentage.toFixed(1)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500 text-sm">Sem dados de faixa etária disponíveis.</p>
              )}
            </div>

            <div>
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Por País</h3>
              {demographicCountry.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 px-3 font-semibold text-gray-600">País</th>
                        <th className="text-right py-2 px-3 font-semibold text-gray-600">Quantidade</th>
                        <th className="text-right py-2 px-3 font-semibold text-gray-600">Percentual</th>
                      </tr>
                    </thead>
                    <tbody>
                      {demographicCountry.map((row) => (
                        <tr key={row.country} className="border-b border-gray-100">
                          <td className="py-2 px-3 font-medium text-gray-900">{row.country}</td>
                          <td className="text-right py-2 px-3 text-gray-700">{formatNumberFull(row.count)}</td>
                          <td className="text-right py-2 px-3 text-gray-700">{row.percentage.toFixed(1)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500 text-sm">Sem dados de país disponíveis.</p>
              )}
            </div>

            <div>
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Por Cidade</h3>
              {demographicCity.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 px-3 font-semibold text-gray-600">Cidade</th>
                        <th className="text-right py-2 px-3 font-semibold text-gray-600">Quantidade</th>
                        <th className="text-right py-2 px-3 font-semibold text-gray-600">Percentual</th>
                      </tr>
                    </thead>
                    <tbody>
                      {demographicCity.map((row) => (
                        <tr key={row.city} className="border-b border-gray-100">
                          <td className="py-2 px-3 font-medium text-gray-900">{row.city}</td>
                          <td className="text-right py-2 px-3 text-gray-700">{formatNumberFull(row.count)}</td>
                          <td className="text-right py-2 px-3 text-gray-700">{row.percentage.toFixed(1)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500 text-sm">Sem dados de cidade disponíveis.</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'top-reels' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-gray-900">Top 20 Reels</h2>
            {topReels.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 px-3 font-semibold text-gray-600">#</th>
                      <th className="text-left py-2 px-3 font-semibold text-gray-600">Legenda</th>
                      <th className="text-right py-2 px-3 font-semibold text-gray-600">Visualizações</th>
                      <th className="text-right py-2 px-3 font-semibold text-gray-600">Curtidas</th>
                      <th className="text-right py-2 px-3 font-semibold text-gray-600">Comentários</th>
                      <th className="text-right py-2 px-3 font-semibold text-gray-600">Compartilhamentos</th>
                      <th className="text-right py-2 px-3 font-semibold text-gray-600">Salvos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topReels.map((row, idx) => (
                      <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                        <td className="py-2 px-3 font-bold text-gray-400">{idx + 1}</td>
                        <td className="py-2 px-3 text-gray-700 max-w-xs truncate">{row.caption || '-'}</td>
                        <td className="text-right py-2 px-3 text-gray-700 font-semibold">{formatNumberFull(row.views)}</td>
                        <td className="text-right py-2 px-3 text-gray-700">{formatNumberFull(row.likes)}</td>
                        <td className="text-right py-2 px-3 text-gray-700">{formatNumberFull(row.comments)}</td>
                        <td className="text-right py-2 px-3 text-gray-700">{formatNumberFull(row.shares)}</td>
                        <td className="text-right py-2 px-3 text-gray-700">{formatNumberFull(row.saves)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">Nenhum Reel encontrado.</p>
            )}
          </div>
        )}

        {activeTab === 'reels-day-hour' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-gray-900">Reels por Dia e Hora</h2>
            {reelsDayHour.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 px-3 font-semibold text-gray-600">Dia</th>
                      <th className="text-left py-2 px-3 font-semibold text-gray-600">Hora</th>
                      <th className="text-right py-2 px-3 font-semibold text-gray-600">Quantidade</th>
                      <th className="text-right py-2 px-3 font-semibold text-gray-600">Total de Visualizações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reelsDayHour.map((row, idx) => (
                      <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50/50">
                        <td className="py-2 px-3 font-medium text-gray-900">{row.day}</td>
                        <td className="py-2 px-3 font-medium text-gray-900">{row.hour}</td>
                        <td className="text-right py-2 px-3 text-gray-700">{row.count}</td>
                        <td className="text-right py-2 px-3 text-gray-700 font-semibold">{formatNumberFull(row.total_views)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">Nenhum dado de Reels por dia/hora disponível.</p>
            )}
          </div>
        )}

        {activeTab === 'top-posts' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-900">Top 20 Posts</h2>
            {topPosts.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 px-3 font-semibold text-gray-600">#</th>
                      <th className="text-left py-2 px-3 font-semibold text-gray-600">Tipo</th>
                      <th className="text-left py-2 px-3 font-semibold text-gray-600">Legenda</th>
                      <th className="text-right py-2 px-3 font-semibold text-gray-600">Curtidas</th>
                      <th className="text-right py-2 px-3 font-semibold text-gray-600">Comentários</th>
                      <th className="text-right py-2 px-3 font-semibold text-gray-600">Compartilhamentos</th>
                      <th className="text-right py-2 px-3 font-semibold text-gray-600">Salvos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topPosts.map((row, idx) => (
                      <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                        <td className="py-2 px-3 font-bold text-gray-400">{idx + 1}</td>
                        <td className="py-2 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            row.media_type === 'REELS' ? 'bg-purple-100 text-purple-700' :
                            row.media_type === 'IMAGE' ? 'bg-blue-100 text-blue-700' :
                            row.media_type === 'VIDEO' ? 'bg-red-100 text-red-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {row.media_type}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-gray-700 max-w-xs truncate">{row.caption || '-'}</td>
                        <td className="text-right py-2 px-3 text-gray-700 font-semibold">{formatNumberFull(row.likes)}</td>
                        <td className="text-right py-2 px-3 text-gray-700">{formatNumberFull(row.comments)}</td>
                        <td className="text-right py-2 px-3 text-gray-700">{formatNumberFull(row.shares)}</td>
                        <td className="text-right py-2 px-3 text-gray-700">{formatNumberFull(row.saves)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">Nenhum post encontrado.</p>
            )}

            <div className="border-t border-gray-200 pt-6 mt-6">
              <div className="flex gap-2 mb-4">
                {subTabs.map((st) => (
                  <button
                    key={st.id}
                    onClick={() => setPostSubTab(st.id)}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                      postSubTab === st.id
                        ? 'bg-instagram-gradient text-white shadow-md shadow-pink-500/20'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>

              {postSubTab === 'posts-type' && (
                <div>
                  <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Posts por Tipo</h3>
                  {postsByType.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="text-left py-2 px-3 font-semibold text-gray-600">Tipo</th>
                            <th className="text-right py-2 px-3 font-semibold text-gray-600">Quantidade</th>
                            <th className="text-right py-2 px-3 font-semibold text-gray-600">Total de Curtidas</th>
                            <th className="text-right py-2 px-3 font-semibold text-gray-600">Total de Comentários</th>
                            <th className="text-right py-2 px-3 font-semibold text-gray-600">Total de Visualizações</th>
                          </tr>
                        </thead>
                        <tbody>
                          {postsByType.map((row) => (
                            <tr key={row.type} className="border-b border-gray-100">
                              <td className="py-2 px-3 font-medium text-gray-900">{row.type}</td>
                              <td className="text-right py-2 px-3 text-gray-700">{row.count}</td>
                              <td className="text-right py-2 px-3 text-gray-700">{formatNumberFull(row.total_likes)}</td>
                              <td className="text-right py-2 px-3 text-gray-700">{formatNumberFull(row.total_comments)}</td>
                              <td className="text-right py-2 px-3 text-gray-700">{formatNumberFull(row.total_views)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">Sem dados de posts por tipo.</p>
                  )}
                </div>
              )}

              {postSubTab === 'posts-day-hour' && (
                <div>
                  <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Posts por Dia e Hora</h3>
                  {postsDayHour.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="text-left py-2 px-3 font-semibold text-gray-600">Dia</th>
                            <th className="text-left py-2 px-3 font-semibold text-gray-600">Hora</th>
                            <th className="text-right py-2 px-3 font-semibold text-gray-600">Quantidade</th>
                            <th className="text-right py-2 px-3 font-semibold text-gray-600">Total de Curtidas</th>
                            <th className="text-right py-2 px-3 font-semibold text-gray-600">Total de Comentários</th>
                          </tr>
                        </thead>
                        <tbody>
                          {postsDayHour.map((row, idx) => (
                            <tr key={idx} className="border-b border-gray-100">
                              <td className="py-2 px-3 font-medium text-gray-900">{row.day}</td>
                              <td className="py-2 px-3 font-medium text-gray-900">{row.hour}</td>
                              <td className="text-right py-2 px-3 text-gray-700">{row.count}</td>
                              <td className="text-right py-2 px-3 text-gray-700">{formatNumberFull(row.total_likes)}</td>
                              <td className="text-right py-2 px-3 text-gray-700">{formatNumberFull(row.total_comments)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">Sem dados de posts por dia/hora.</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}