
import { Webhook } from 'lucide-react';

export default function IntegrationsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Integrações</h1>
      </div>
      
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm text-center">
        <Webhook className="w-12 h-12 text-slate-300 mx-auto mb-4" />
        <h2 className="text-lg font-bold text-slate-800">Em Breve</h2>
        <p className="text-slate-500 max-w-md mx-auto mt-2">Novas integrações com CRMs e plataformas de pagamento estarão disponíveis em breve.</p>
      </div>
    </div>
  );
}
