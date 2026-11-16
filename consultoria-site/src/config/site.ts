/**
 * FONTE ÚNICA DE CONTEÚDO DO SITE
 * ------------------------------------------------------------------
 * Tudo o que é específico da empresa mora aqui: nome, logotipo, contatos,
 * fotos, fundador e artigos. Os itens marcados com "PROVISÓRIO" precisam
 * ser confirmados ou substituídos antes da publicação.
 */

export type MediaSlot = { src: string; alt: string } | null;

export const brand = {
  /** PROVISÓRIO: nome proposto. Verificar disponibilidade no INPI e de domínio antes de registrar. */
  name: "Cadência",
  /** Assinatura exibida junto ao nome. */
  descriptor: "IA aplicada",
  /** Caminho de um logotipo em /public (ex.: "/media/logo.svg"). Com `null`, usa o nome em tipografia. */
  logoSrc: null as string | null,
  tagline: "Transformamos inteligência artificial em produtividade real.",
  description:
    "Consultoria brasileira de inteligência artificial aplicada à produtividade. Diagnóstico de processos, implementação de assistentes e automações e medição do retorno, para indústrias, distribuidoras e empresas de serviços.",
  /** PROVISÓRIO: defina NEXT_PUBLIC_SITE_URL com o domínio definitivo. */
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  locale: "pt_BR",
};

export const contact = {
  /** PROVISÓRIO: e-mail comercial. */
  email: "contato@seudominio.com.br",
  /** PROVISÓRIO: WhatsApp com DDI e DDD, somente dígitos. Ex.: 5511999999999 */
  whatsapp: "5500000000000",
  whatsappMessage: "Olá! Quero entender como a IA pode aumentar a produtividade da minha empresa.",
  /** Perfis sociais (opcional). Vazio oculta a lista. */
  social: [] as { label: string; href: string }[],
};

/**
 * FOTOGRAFIA
 * Coloque os arquivos em /public/media e aponte aqui.
 * Enquanto um espaço estiver `null`, o site exibe uma arte gerada em código.
 */
export const media = {
  /** Foto de ambiente industrial para a abertura (paisagem, 2400px ou mais). */
  hero: null as MediaSlot,
  /** Retrato principal do fundador. */
  founder: { src: "/media/founder-desk.jpg", alt: "Fundador da consultoria apoiado sobre a mesa de trabalho" } as MediaSlot,
  /** Cor de fundo da foto do fundador: o painel usa a mesma cor para o retrato se fundir a ele. */
  founderBackdrop: "#dcdce1",
  /** Fotos da galeria horizontal, na ordem das áreas de experiência do fundador. `null` = arte gerada. */
  gallery: [
    { src: "/media/founder-tablet.jpg", alt: "Fundador analisando informações em um tablet" },
    null,
    { src: "/media/founder-portrait.jpg", alt: "Retrato do fundador" },
    null,
    { src: "/media/founder-tablet-cutout.png", alt: "Fundador em pé, com um tablet nas mãos" },
    null,
  ] as MediaSlot[],
};

export const nav = [
  { id: "solucoes", label: "Soluções", hint: "Três serviços" },
  { id: "metodologia", label: "Metodologia", hint: "Entender, identificar, implementar, medir" },
  { id: "sobre", label: "Sobre", hint: "Trajetória do fundador" },
  { id: "insights", label: "Insights", hint: "Artigos e análises" },
  { id: "contato", label: "Contato", hint: "Fale com a consultoria" },
] as const;

export const hero = {
  headline: ["Mais produtividade.", "Menos complexidade."],
  sub: "Aplicamos inteligência artificial para simplificar processos, automatizar tarefas e melhorar a produtividade das empresas.",
  cta: "Conhecer as soluções",
  pillars: ["Diagnosticar", "Implementar", "Medir"],
  labels: { from: "Processo como está", to: "Processo com IA" },
};

/** Texto revelado palavra a palavra na rolagem. */
export const manifesto =
  "Inteligência artificial só tem valor quando vira hora economizada, retrabalho eliminado e processo mais simples. Por isso começamos pelo processo. A ferramenta vem depois.";

/** Letreiro: o que costuma travar a produtividade. */
export const frictions = [
  "Tarefas repetitivas",
  "Relatórios manuais",
  "Retrabalho",
  "Gargalos",
  "Planilhas desconectadas",
  "Documentos sem fim",
  "Informação espalhada",
  "Decisão sem dado",
];

export const audience = ["Pequenas e médias indústrias", "Distribuidoras", "Empresas de serviços"];

export type MotifKind = "rings" | "takt" | "steps" | "grid" | "untangle" | "network";

export const solutions: { title: string; lead: string; items: string[]; motif: MotifKind; tag: string }[] = [
  {
    title: "Diagnóstico de produtividade com IA",
    lead: "Antes de qualquer ferramenta, um retrato fiel de como o trabalho acontece e de onde o tempo se perde.",
    items: [
      "Mapeamento de processos",
      "Identificação de tarefas repetitivas",
      "Localização de gargalos",
      "Oportunidades de automação priorizadas",
    ],
    motif: "untangle",
    tag: "Onde está a oportunidade",
  },
  {
    title: "Implementação de soluções com IA",
    lead: "Soluções colocadas para rodar dentro da rotina da empresa, com tecnologias como ChatGPT, Claude e n8n.",
    items: [
      "Assistentes inteligentes",
      "Automações e fluxos de trabalho",
      "Análise de documentos",
      "Geração de relatórios",
      "Integração de ferramentas",
    ],
    motif: "network",
    tag: "A solução em operação",
  },
  {
    title: "Gestão de produtividade e ROI",
    lead: "O que não é medido vira opinião. Cada solução é acompanhada por números que mostram se valeu o investimento.",
    items: [
      "Tempo economizado",
      "Produtividade",
      "Redução de retrabalho",
      "Custos das ferramentas",
      "Retorno sobre o investimento",
    ],
    motif: "takt",
    tag: "O retorno comprovado",
  },
];

export const methodology = [
  {
    n: "01",
    title: "Entender",
    text: "Conhecer a operação por dentro: como o trabalho flui, quem faz o quê e quais indicadores importam.",
  },
  {
    n: "02",
    title: "Identificar",
    text: "Apontar tarefas repetitivas, gargalos e retrabalho, e escolher onde a IA traz mais retorno com menos esforço.",
  },
  {
    n: "03",
    title: "Implementar",
    text: "Colocar a solução em uso na rotina da equipe, começando pequeno e ajustando com quem opera.",
  },
  {
    n: "04",
    title: "Medir",
    text: "Comparar antes e depois: tempo economizado, retrabalho, custo das ferramentas e retorno sobre o investimento.",
  },
];

export const founder = {
  /** PROVISÓRIO: nome do fundador. */
  name: "Nome do Fundador",
  role: "Fundador",
  years: 20,
  bio: "Mais de 20 anos de experiência na indústria, em gestão de operações, produção, manutenção, estoques, logística e qualidade.",
  story:
    "Depois de duas décadas reduzindo custos e aumentando a produtividade de operações industriais, inicia agora uma atuação independente: aplicar inteligência artificial aos problemas de processo que conhece na prática.",
  /** Aviso de transparência exibido no painel do fundador. */
  stage: "Consultoria em início de atuação",
  /** Áreas de experiência: legendas das molduras da galeria. */
  disciplines: ["Operações", "Produção", "Manutenção", "Estoques e logística", "Qualidade", "Melhoria contínua"],
  methods: ["Lean Manufacturing", "Six Sigma", "Gestão de processos", "Indicadores", "Redução de custos"],
  callouts: [
    "Vinte anos resolvendo problemas de operação por dentro da indústria.",
    "A mesma disciplina, agora aplicada à inteligência artificial.",
    "Primeiro o processo. Depois a ferramenta.",
  ],
};

export const insightTopics = ["Inteligência artificial", "Produtividade", "Automação", "Gestão industrial", "Eficiência operacional"];

/** Artigos publicados. Enquanto vazio, a seção apresenta as linhas editoriais. */
export const articles: {
  topic: string;
  title: string;
  date: string;
  readingTime: string;
  href: string;
}[] = [];

export const whatsappHref = (message = contact.whatsappMessage) =>
  `https://wa.me/${contact.whatsapp}?text=${encodeURIComponent(message)}`;
