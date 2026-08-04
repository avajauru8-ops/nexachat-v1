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

// ── Helpers para montar nós com os formatos atuais dos blocos ──

const n = (id: string, type: string, x: number, y: number, data: Record<string, unknown>): Node => ({
  id,
  type,
  position: { x, y },
  className: 'node-pop',
  data
});

const e = (id: string, source: string, target: string, sourceHandle?: string): Edge => ({
  id,
  source,
  target,
  type: 'customEdge',
  ...(sourceHandle ? { sourceHandle } : {})
});

const att = (id: string, type: 'button' | 'link' | 'text', label?: string, value?: string) => ({
  id,
  type,
  label: label || '',
  value: value || ''
});

const trigger = (id: string, x: number, y: number, triggerType: string, keyword?: string) =>
  n(id, 'triggerNode', x, y, {
    label: 'Gatilho Inicial',
    triggerType,
    ...(keyword ? { keyword } : {})
  });

const msg = (id: string, x: number, y: number, text: string, attachments: ReturnType<typeof att>[] = []) =>
  n(id, 'messageNode', x, y, { label: 'Mensagem do Bot', text, attachments });

const note = (id: string, x: number, y: number, text: string) =>
  n(id, 'noteNode', x, y, { text });

const action = (id: string, x: number, y: number, actionType: 'add_tag' | 'remove_tag' | 'set_field', actionValue: string, fieldKey?: string) =>
  n(id, 'actionNode', x, y, { actionType, actionValue, ...(fieldKey ? { fieldKey } : {}) });

// ══════════════════════════════════════════════════════════════
// 🚀 CRESCIMENTO & DMs
// ══════════════════════════════════════════════════════════════

const crescimentoTemplates: FlowTemplate[] = [
  {
    id: 'dm-lead-restaurante',
    title: 'Cardápio no Direct — Restaurantes',
    description: 'Quem enviar "cardápio" na DM recebe o menu com link e vira lead "interessado" para ofertas.',
    category: 'Crescimento',
    badge: 'POPULAR',
    nodes: [
      trigger('t-cardapio', 60, 200, 'dm_keyword', 'cardapio'),
      msg('m-cardapio', 400, 200, 'Olá! 😋 Que bom te ver por aqui! Aqui está nosso cardápio completo com os preços de hoje. Qualquer dúvida, é só chamar!', [
        att('att-btn-cardapio', 'button', 'Ver Cardápio 📋'),
        att('att-link-cardapio', 'link', 'Acessar Cardápio', 'https://seusite.com/cardapio')
      ]),
      action('a-cardapio', 740, 200, 'add_tag', 'interessado_cardapio'),
      msg('m-cardapio-2', 1080, 200, 'Se preferir, me chama com a palavra "pedido" que já começo seu pedido por aqui! 🛵'),
      note('nota-cardapio', 400, 430, '💡 Troque a URL do botão pelo link do seu cardápio no site ou iFood.')
    ],
    edges: [
      e('e1-cardapio', 't-cardapio', 'm-cardapio', 'right'),
      e('e2-cardapio', 'm-cardapio', 'a-cardapio', 'att-btn-cardapio'),
      e('e3-cardapio', 'a-cardapio', 'm-cardapio-2')
    ]
  },
  {
    id: 'dm-consultoria',
    title: 'Captura de Leads — Consultoria & Serviços',
    description: 'Resposta automática com link de agendamento para quem pedir orçamento na DM.',
    category: 'Crescimento',
    nodes: [
      trigger('t-cons', 60, 200, 'dm_keyword', 'orçamento'),
      msg('m-cons', 400, 200, 'Recebemos seu pedido de orçamento! 📩 Para agilizar, agenda uma conversa rápida e gratuita comigo:', [
        att('att-btn-cons', 'button', 'Agendar Reunião 🗓️'),
        att('att-link-cons', 'link', 'Escolher Horário', 'https://calendly.com/seu-link')
      ]),
      action('a-cons', 740, 200, 'add_tag', 'lead_orcamento'),
      note('nota-cons', 400, 430, '💡 Conecte o link do Calendly no botão. O lead chega com a tag "lead_orcamento" para priorizar no CRM.')
    ],
    edges: [
      e('e1-cons', 't-cons', 'm-cons', 'right'),
      e('e2-cons', 'm-cons', 'a-cons', 'att-btn-cons')
    ]
  },
  {
    id: 'dm-fitness',
    title: 'Treino & Dieta — Academia e Fitness',
    description: 'Lead que manda "treino" recebe plano de treino grátis e ganha tag para campanhas de matrícula.',
    category: 'Crescimento',
    nodes: [
      trigger('t-fit', 60, 200, 'dm_keyword', 'treino'),
      msg('m-fit', 400, 200, 'Bora treinar! 💪 Aqui vai seu treino da semana grátis. Quer um plano de dieta montado por nossa nutricionista?', [
        att('att-btn-fit', 'button', 'Quero a Dieta 🥗')
      ]),
      action('a-fit', 740, 200, 'add_tag', 'lead_fit'),
      msg('m-fit-2', 1080, 200, 'Perfeito! Em instantes nossa nutricionista vai te chamar por aqui. Continue na academia! 🔥')
    ],
    edges: [
      e('e1-fit', 't-fit', 'm-fit', 'right'),
      e('e2-fit', 'm-fit', 'a-fit', 'att-btn-fit'),
      e('e3-fit', 'a-fit', 'm-fit-2')
    ]
  },
  {
    id: 'dm-imoveis',
    title: 'Imóveis na DM — Imobiliárias',
    description: 'Quem enviar "alugar" ou "comprar" recebe opções e vira lead qualificado para o corretor.',
    category: 'Crescimento',
    nodes: [
      trigger('t-imv', 60, 200, 'dm_keyword', 'alugar'),
      msg('m-imv', 400, 200, 'Ótima escolha! 🏠 Temos imóveis com condições especiais essa semana. Dá uma olhada nas opções:', [
        att('att-btn-imv', 'button', 'Ver Imóveis 📌'),
        att('att-link-imv', 'link', 'Catálogo Completo', 'https://seusite.com/imoveis')
      ]),
      action('a-imv', 740, 200, 'add_tag', 'procura_aluguel'),
      note('nota-imv', 400, 430, '💡 Adicione também a palavra-chave "comprar" em outro gatilho e conecte ao mesmo fluxo.')
    ],
    edges: [
      e('e1-imv', 't-imv', 'm-imv', 'right'),
      e('e2-imv', 'm-imv', 'a-imv', 'att-btn-imv')
    ]
  },
  {
    id: 'dm-estetica',
    title: 'Agendamento Rápido — Estética & Beleza',
    description: 'Quem mandar "agenda" no Direct recebe os horários disponíveis e link de reserva direto.',
    category: 'Crescimento',
    badge: 'NOVO',
    nodes: [
      trigger('t-est', 60, 200, 'dm_keyword', 'agenda'),
      msg('m-est', 400, 200, 'Oi, linda! ✨ Temos horários hoje e amanhã para você. Escolha o melhor:', [
        att('att-btn-est', 'button', 'Quero Reservar 💅'),
        att('att-link-est', 'link', 'Ver Agenda', 'https://seusite.com/agenda')
      ]),
      action('a-est', 740, 200, 'add_tag', 'lead_estetica')
    ],
    edges: [
      e('e1-est', 't-est', 'm-est', 'right'),
      e('e2-est', 'm-est', 'a-est', 'att-btn-est')
    ]
  }
];

// ══════════════════════════════════════════════════════════════
// 💰 VENDAS & AGENTE IA
// ══════════════════════════════════════════════════════════════

const vendasTemplates: FlowTemplate[] = [
  {
    id: 'ia-ecommerce',
    title: 'Agente IA de Vendas — E-commerce',
    description: 'O Agente de IA tira dúvidas de produto, preço e entrega e transfere para o humano quando precisar.',
    category: 'Vendas',
    badge: 'IA',
    nodes: [
      trigger('t-ecom', 60, 200, 'dm_keyword', 'comprar'),
      msg('m-ecom', 400, 200, 'Que bom que você quer comprar com a gente! 🛒 Me conta o que procura que eu te ajudo na hora.'),
      n('ai-ecom', 'aiHandoffNode', 740, 200, { label: 'Assistente IA atende o cliente' }),
      n('hu-ecom', 'humanHandoffNode', 1080, 200, { label: 'Encaminha para atendente humano' }),
      note('nota-ecom', 400, 430, '💡 O Agente de IA responde preço, prazo e troca. Se o cliente pedir "atendente", ele transfere sozinho.')
    ],
    edges: [
      e('e1-ecom', 't-ecom', 'm-ecom', 'right'),
      e('e2-ecom', 'm-ecom', 'ai-ecom'),
      e('e3-ecom', 'ai-ecom', 'hu-ecom')
    ]
  },
  {
    id: 'ia-moda-vip',
    title: 'IA + Condição — Cliente VIP (Moda)',
    description: 'IA detecta interesse e a condição libera cupom maior para clientes com tag VIP.',
    category: 'Vendas',
    badge: 'IA',
    nodes: [
      trigger('t-moda', 60, 200, 'dm_keyword', 'promo'),
      msg('m-moda', 400, 200, 'Achamos a promoção ideal! 😍 Antes, me confirma uma coisinha:', [
        att('att-btn-moda', 'button', 'Sou cliente antigo 👀')
      ]),
      n('c-moda', 'conditionNode', 740, 200, { conditionValue: 'vip' }),
      msg('m-moda-vip', 1080, 60, 'Presente de VIP! 🖤 Cupom de 20% OFF: VIP20. Use hoje mesmo!'),
      msg('m-moda-novo', 1080, 340, 'Para começar, um cupom de 10% OFF: BEMVINDA10. Aproveite! 🛍️'),
      action('a-moda', 400, 430, 'add_tag', 'vip')
    ],
    edges: [
      e('e1-moda', 't-moda', 'm-moda', 'right'),
      e('e2-moda', 'm-moda', 'c-moda', 'att-btn-moda'),
      e('e3-moda', 'c-moda', 'm-moda-vip', 'true'),
      e('e4-moda', 'c-moda', 'm-moda-novo', 'false')
    ]
  },
  {
    id: 'ia-saude',
    title: 'Agente IA de Clínica — Saúde',
    description: 'IA agenda consultas, tira dúvidas de convênios e transfere para a recepção quando preciso.',
    category: 'Vendas',
    nodes: [
      trigger('t-saude', 60, 200, 'dm_keyword', 'consulta'),
      msg('m-saude', 400, 200, 'Ficaremos felizes em te atender! 🏥 Me conta qual especialidade você procura.'),
      n('ai-saude', 'aiHandoffNode', 740, 200, { label: 'Agente IA da clínica' }),
      n('hu-saude', 'humanHandoffNode', 1080, 200, { label: 'Recepção humana' })
    ],
    edges: [
      e('e1-saude', 't-saude', 'm-saude', 'right'),
      e('e2-saude', 'm-saude', 'ai-saude'),
      e('e3-saude', 'ai-saude', 'hu-saude')
    ]
  },
  {
    id: 'ia-petshop',
    title: 'Pet Shop com IA — Pets',
    description: 'IA responde sobre banho, tosa e produtos, e marca o serviço com tag de retorno.',
    category: 'Vendas',
    nodes: [
      trigger('t-pet', 60, 200, 'dm_keyword', 'banho'),
      msg('m-pet', 400, 200, 'Awww! 🐶 Quer agendar um banho para seu pet? Me diz o porte e o horário que prefere.'),
      n('ai-pet', 'aiHandoffNode', 740, 200, { label: 'IA do Pet Shop' }),
      action('a-pet', 1080, 200, 'add_tag', 'servico_banho'),
      note('nota-pet', 740, 430, '💡 Depois do atendimento da IA, o lead fica com a tag "servico_banho" para campanhas de retorno.')
    ],
    edges: [
      e('e1-pet', 't-pet', 'm-pet', 'right'),
      e('e2-pet', 'm-pet', 'ai-pet'),
      e('e3-pet', 'ai-pet', 'a-pet')
    ]
  },
  {
    id: 'ia-educacao',
    title: 'Matrícula com IA — Cursos Online',
    description: 'Quem enviar "curso" ganha atendimento da IA e link direto para a matrícula.',
    category: 'Vendas',
    badge: 'NOVO',
    nodes: [
      trigger('t-edu', 60, 200, 'dm_keyword', 'curso'),
      msg('m-edu', 400, 200, 'Oba, mais um aluno! 🎓 Qual área você quer dominar? Te mostro o curso perfeito.'),
      n('ai-edu', 'aiHandoffNode', 740, 200, { label: 'IA de matrículas' }),
      n('hu-edu', 'humanHandoffNode', 1080, 200, { label: 'Consultor de matrícula' })
    ],
    edges: [
      e('e1-edu', 't-edu', 'm-edu', 'right'),
      e('e2-edu', 'm-edu', 'ai-edu'),
      e('e3-edu', 'ai-edu', 'hu-edu')
    ]
  }
];

// ══════════════════════════════════════════════════════════════
// 🔥 ENGAJAMENTO NOS STORIES
// ══════════════════════════════════════════════════════════════

const engajamentoTemplates: FlowTemplate[] = [
  {
    id: 'story-cupom-loja',
    title: 'Cupom por Resposta ao Story — Loja',
    description: 'Seguidor responde "quero" no Story e recebe cupom de 15% na DM na hora.',
    category: 'Engajamento',
    badge: 'POPULAR',
    nodes: [
      trigger('t-cupom', 60, 200, 'story_reply', 'quero'),
      msg('m-cupom', 400, 200, 'Você ganhou! 🎉 Use o cupom abaixo na sua próxima compra:', [
        att('att-btn-cupom', 'button', 'Copiar Cupom 🎁', 'NEXA15'),
        att('att-link-cupom', 'link', 'Ir para a Loja', 'https://seusite.com')
      ]),
      action('a-cupom', 740, 200, 'add_tag', 'cupom_resgatado')
    ],
    edges: [
      e('e1-cupom', 't-cupom', 'm-cupom', 'right'),
      e('e2-cupom', 'm-cupom', 'a-cupom', 'att-btn-cupom')
    ]
  },
  {
    id: 'story-sorteio',
    title: 'Sorteio no Story — Marcas',
    description: 'Quem responder "participei" entra no sorteio e recebe as regras automaticamente.',
    category: 'Engajamento',
    nodes: [
      trigger('t-sort', 60, 200, 'story_reply', 'participei'),
      msg('m-sort', 400, 200, 'Parabéns, você está concorrendo! 🍀 Regras: siga a página, curta o post fixo e marque 2 amigos nos comentários.'),
      action('a-sort', 740, 200, 'add_tag', 'sorteio'),
      msg('m-sort-2', 1080, 200, 'O resultado sai no Story do dia 15! Fique de olho. Boa sorte! ✨')
    ],
    edges: [
      e('e1-sort', 't-sort', 'm-sort', 'right'),
      e('e2-sort', 'm-sort', 'a-sort'),
      e('e3-sort', 'a-sort', 'm-sort-2')
    ]
  },
  {
    id: 'story-mention-obrigado',
    title: 'Agradecimento por Menção — Influenciadores',
    description: 'Toda vez que te marcarem no Story, receba a DM perfeita: agradecimento + link relevante.',
    category: 'Engajamento',
    badge: 'NOVO',
    nodes: [
      trigger('t-men', 60, 200, 'story_mention'),
      msg('m-men', 400, 200, 'Valeu demais pela menção! 🙌 Você é incrível. Se quiser conhecer meu conteúdo completo:', [
        att('att-btn-men', 'button', 'Quero Conhecer 🔗'),
        att('att-link-men', 'link', 'Meu Link', 'https://seusite.com')
      ])
    ],
    edges: [
      e('e1-men', 't-men', 'm-men', 'right')
    ]
  },
  {
    id: 'story-feedback',
    title: 'Feedback & Avaliação — Restaurantes e Serviços',
    description: 'Resposta ao Story vira avaliação rápida e tag de cliente que já consumiu.',
    category: 'Engajamento',
    nodes: [
      trigger('t-fb', 60, 200, 'story_reply', 'nota'),
      msg('m-fb', 400, 200, 'Agora quero saber sua opinião! ⭐ De 1 a 5, como foi sua experiência?'),
      action('a-fb', 740, 200, 'add_tag', 'avaliou'),
      msg('m-fb-2', 1080, 200, 'Obrigado pelo feedback! 💜 Ele ajuda demais a gente a melhorar. Volte sempre!')
    ],
    edges: [
      e('e1-fb', 't-fb', 'm-fb', 'right'),
      e('e2-fb', 'm-fb', 'a-fb'),
      e('e3-fb', 'a-fb', 'm-fb-2')
    ]
  },
  {
    id: 'story-lista-espera',
    title: 'Lista de Espera — Serviços & Clínicas',
    description: 'Quem responder "agenda" no Story entra na lista e é transferido para o atendimento.',
    category: 'Engajamento',
    nodes: [
      trigger('t-le', 60, 200, 'story_reply', 'agenda'),
      msg('m-le', 400, 200, 'Você entrou na nossa lista de espera! 🗓️ Assim que abrir vaga, chamamos você por aqui.'),
      action('a-le', 740, 200, 'add_tag', 'lista_espera'),
      n('hu-le', 'humanHandoffNode', 1080, 200, { label: 'Atendente confirma os dados' })
    ],
    edges: [
      e('e1-le', 't-le', 'm-le', 'right'),
      e('e2-le', 'm-le', 'a-le'),
      e('e3-le', 'a-le', 'hu-le')
    ]
  }
];

export const PREBUILT_TEMPLATES: FlowTemplate[] = [
  ...crescimentoTemplates,
  ...vendasTemplates,
  ...engajamentoTemplates
];
