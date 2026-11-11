/* ============================================================
   PRISMA 2 — configuração
   Opcional: se preencher aqui, todos os aparelhos já abrem
   conectados ao seu Appwrite (sem colar nada em Ajustes).
   Esses dois códigos não são segredo: quem protege seus dados
   são as permissões da tabela e o login.
============================================================ */
window.P = window.P || {};
P.CONFIG = {
  appwriteEndpoint: 'https://nyc.cloud.appwrite.io/v1',
  appwriteProject: '6ae688590001378b6f42',
  // ID da função do robô de notificações (Appwrite → Functions → Prisma Robô)
  roboFunction: '6ae69619001fca9407c7',
  // planos: durante o beta, todo mundo tem o Premium liberado
  betaPremium: true,
  // aparecem na Política de Privacidade e nos Termos (preencha antes da Play Store)
  responsavel: 'Lidiane Ester Pereira Florêncio',
  cnpj: '',
  cidade: '',
  contatoEmail: ''
};
