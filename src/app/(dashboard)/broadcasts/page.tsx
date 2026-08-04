import { createClient } from '@/utils/supabase/server';
import { Megaphone, Send, CheckCircle2, Users } from 'lucide-react';
import { redirect } from 'next/navigation';
import { inngest } from '@/inngest/client';

interface Props {
  searchParams: Promise<{ success?: string }>;
}

export default async function BroadcastsPage({ searchParams }: Props) {
  const { success } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  // Obter o workspace primário do usuário
  const { data: workspace } = await supabase
    .from('workspaces')
    .select('id')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle();

  if (!workspace) {
    return <div>Workspace não encontrado.</div>;
  }

  // Buscar as Tags disponíveis neste workspace com a contagem de leads
  const { data: tags } = await supabase
    .from('tags')
    .select('id, name')
    .eq('workspace_id', workspace.id);

  let leadCountByTag: Record<string, number> = {};
  if (tags && tags.length > 0) {
    const { data: tagCounts } = await supabase
      .from('contact_tags')
      .select('tag_id')
      .in('tag_id', tags.map(t => t.id));

    leadCountByTag = (tagCounts || []).reduce<Record<string, number>>((acc, row) => {
      acc[row.tag_id] = (acc[row.tag_id] || 0) + 1;
      return acc;
    }, {});
  }

  // Ação de envio do broadcast (Server Action inline)
  async function sendBroadcastAction(formData: FormData) {
    'use server';
    const tagId = formData.get('tagId') as string;
    const message = formData.get('message') as string;
    const wsId = formData.get('workspaceId') as string;

    if (!tagId || !message || !wsId) return;

    // Dispara o evento pro Inngest rodar o disparo em lote no background
    await inngest.send({
      name: 'broadcast/send',
      data: {
        workspaceId: wsId,
        tagId: tagId,
        messageText: message
      }
    });

    redirect('/broadcasts?success=true');
  }

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-2">
          <Megaphone className="w-8 h-8 text-pink-600" />
          Broadcasts (Disparos em Massa)
        </h1>
        <p className="text-gray-600 mt-1">Envie uma mensagem instantânea para todos os leads que possuem uma determinada Tag.</p>
      </div>

      {success === 'true' && (
        <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-2xl px-4 py-3 text-sm text-green-700">
          <CheckCircle2 className="w-5 h-5 text-green-500" />
          Broadcast enfileirado! O disparo está sendo processado em segundo plano (apenas leads com janela de 24h ativa receberão a mensagem).
        </div>
      )}

      <div className="glass-panel p-6 rounded-3xl border border-white/60 shadow-lg">
        <form action={sendBroadcastAction} className="flex flex-col gap-5">
          <input type="hidden" name="workspaceId" value={workspace.id} />
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Selecione o Público (Tag)</label>
            <select 
              name="tagId" 
              required
              className="w-full bg-white/60 border border-white rounded-xl px-4 py-3 text-gray-700 focus:ring-2 focus:ring-pink-300 outline-none shadow-sm backdrop-blur-sm"
            >
              <option value="">-- Selecione uma Tag --</option>
              {tags && tags.map((tag) => (
                <option key={tag.id} value={tag.id}>
                  {tag.name} ({leadCountByTag[tag.id] || 0} leads)
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">A mensagem será enviada apenas para os contatos que tiverem esta tag e estiverem com a janela de 24h ativa.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mensagem a ser enviada</label>
            <textarea 
              name="message" 
              required
              rows={4}
              placeholder="Digite a sua mensagem aqui... ex: Temos uma promoção especial para você hoje!"
              className="w-full bg-white/60 border border-white rounded-xl px-4 py-3 text-gray-700 focus:ring-2 focus:ring-pink-300 outline-none resize-none shadow-sm backdrop-blur-sm"
            ></textarea>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row sm:items-center gap-4">
            <button 
              type="submit" 
              className="w-full sm:w-auto px-8 py-3 bg-instagram-gradient text-white font-bold rounded-xl hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-pink-500/20 hover:scale-[1.02]"
            >
              <Send className="w-4 h-4" />
              Disparar Broadcast Agora
            </button>
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              O envio acontece em segundo plano via fila (Inngest)
            </span>
          </div>
        </form>
      </div>
    </div>
  );
}
