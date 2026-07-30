import { Node, Edge } from '@xyflow/react';

export interface FlowTemplate {
  id: string;
  title: string;
  description: string;
  category: string;
  badge?: string | null;
  nodes: Node[];
  edges: Edge[];
}

export const PREBUILT_TEMPLATES: FlowTemplate[] = [
  {
    id: 'dm-link-funnel',
    title: 'Captura de Leads na DM com Botão e Link (Exemplo da Foto)',
    description: 'Envie um recurso ou link direto para quem te mandar uma palavra-chave mágica no Instagram Direct com follow-up de 60s.',
    category: 'Crescimento',
    badge: 'POPULAR',
    nodes: [
      {
        id: 'n-note-1',
        type: 'noteNode',
        position: { x: 50, y: 50 },
        data: { text: 'Peça para seus seguidores enviarem uma mensagem direta com uma palavra-chave mágica (escolhida por você).' }
      },
      {
        id: 'n-trigger-1',
        type: 'triggerNode',
        position: { x: 350, y: 150 },
        data: { label: 'Gatilho Inicial', keyword: 'preço' }
      },
      {
        id: 'n-note-2',
        type: 'noteNode',
        position: { x: 350, y: 20 },
        data: { text: 'A NexaChat envia uma automação com um Botão que inclui um Link para seu site.' }
      },
      {
        id: 'n-msg-1',
        type: 'messageNode',
        position: { x: 680, y: 150 },
        data: { 
          text: 'Quer conferir o sistema de vídeos virais que vai te ajudar a desvendar o segredo para o seu próximo Reel do Instagram?',
          buttons: ['Sim, por favor! 🔥']
        }
      },
      {
        id: 'n-note-3',
        type: 'noteNode',
        position: { x: 680, y: 20 },
        data: { text: 'Certifique-se de atualizar o URL deste botão para que ele abra no seu site!' }
      },
      {
        id: 'n-note-4',
        type: 'noteNode',
        position: { x: 950, y: 20 },
        data: { text: 'As pessoas clicam no botão e são levadas diretamente para o link do site para compras.' }
      },
      {
        id: 'n-msg-2',
        type: 'messageNode',
        position: { x: 1050, y: 150 },
        data: { 
          text: 'Aqui está! Confira o link ⚡',
          buttons: ['Consiga aqui 🔗'],
          delaySeconds: 60
        }
      },
      {
        id: 'n-note-5',
        type: 'noteNode',
        position: { x: 800, y: 500 },
        data: { text: 'Aqui está o seu lembrete (também conhecido como "boop" após 1 minuto). Você pode mudar o texto!' }
      }
    ],
    edges: [
      { id: 'e-t1-m1', source: 'n-trigger-1', target: 'n-msg-1', sourceHandle: 'right' },
      { id: 'e-m1-m2', source: 'n-msg-1', target: 'n-msg-2', sourceHandle: 'btn-0' }
    ]
  },
  {
    id: 'ai-sales-assistant',
    title: 'Qualificação Inteligente com Agente de IA',
    description: 'Deixe o Agente de IA tirar dúvidas de vendas e transferir para atendimento humano quando necessário.',
    category: 'Vendas',
    badge: 'IA',
    nodes: [
      {
        id: 'n-trigger-ai',
        type: 'triggerNode',
        position: { x: 250, y: 150 },
        data: { label: 'Gatilho DM', keyword: 'ajuda' }
      },
      {
        id: 'n-ai-agent',
        type: 'aiHandoffNode',
        position: { x: 600, y: 150 },
        data: { label: 'Assistente IA atende o cliente' }
      },
      {
        id: 'n-human-handoff',
        type: 'humanHandoffNode',
        position: { x: 950, y: 150 },
        data: { label: 'Encaminha para Atendente Humano se solicitado' }
      }
    ],
    edges: [
      { id: 'e-ai-1', source: 'n-trigger-ai', target: 'n-ai-agent' },
      { id: 'e-ai-2', source: 'n-ai-agent', target: 'n-human-handoff' }
    ]
  },
  {
    id: 'story-reply-coupon',
    title: 'Cupom de Desconto em Resposta ao Story',
    description: 'Envie um cupom de presente automaticamente quando um seguidor responder ao seu Story.',
    category: 'Engajamento',
    badge: 'NOVO',
    nodes: [
      {
        id: 'n-trigger-story',
        type: 'triggerNode',
        position: { x: 250, y: 150 },
        data: { label: 'Resposta a Story', keyword: 'cupom' }
      },
      {
        id: 'n-msg-story',
        type: 'messageNode',
        position: { x: 600, y: 150 },
        data: { 
          text: 'Obrigado por interagir no nosso Story! Aqui está seu cupom de 15% OFF 🎟️',
          buttons: ['Resgatar Cupom 🎁']
        }
      }
    ],
    edges: [
      { id: 'e-story-1', source: 'n-trigger-story', target: 'n-msg-story' }
    ]
  }
];
