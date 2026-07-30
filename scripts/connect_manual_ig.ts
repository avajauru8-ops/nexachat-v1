import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function connectInstagram() {
  const accessToken = 'IGAAZACpEV8heZABZAFlPekl6ZAklUN2Noam9kbWZAnNXlObjVxX19Fd0FqSVA0TXFLTkt6U0dCWTZABU1o1VVRUNWZAyNXJoYXVfTzZAIbFJ1bGxWVWp4MnV2S2RpVUpIZA2Qya0M2TjN5eFpxTDBkN1d2dmNLNWVHOFJvUzUwTGtPeE5MOAZDZD'
  
  console.log('Verificando token com a API da Meta...');
  
  // O endpoint /me em tokens do Instagram (API Helper) costuma retornar o ID e nome do Instagram
  const res = await fetch(`https://graph.instagram.com/v19.0/me?fields=id,username&access_token=${accessToken}`)
  const data = await res.json()
  
  if (data.error) {
    console.error('Erro na Meta API:', data.error);
    return;
  }
  
  console.log('Dados recebidos da Meta:', data);
  const igUserId = data.id || '17841425588804605';
  
  // Buscar o primeiro workspace (já que é ambiente dev/local, só deve ter 1 ou 2)
  const { data: workspaces } = await supabase.from('workspaces').select('id').limit(1);
  if (!workspaces || workspaces.length === 0) {
    console.error('Nenhum workspace encontrado no banco.');
    return;
  }
  const workspaceId = workspaces[0].id;
  
  // Atualiza ou insere a conta na tabela instagram_accounts
  const { error } = await supabase.from('instagram_accounts').upsert({
    workspace_id: workspaceId,
    ig_user_id: igUserId,
    page_id: 'manual_connect', // Pode não ter page_id se for token direto
    access_token: accessToken,
    status: 'active'
  }, { onConflict: 'ig_user_id' });
  
  if (error) {
    console.error('Erro ao salvar no banco:', error);
  } else {
    console.log(`Sucesso! A conta do Instagram (ID: ${igUserId}) foi conectada ao Workspace ${workspaceId}!`);
    console.log('Você já pode verificar a Caixa de Entrada.');
  }
}

connectInstagram();
