/* ============================================================
   PRISMA — Política de Privacidade, Termos de Uso e
   "Excluir minha conta" (a Play Store exige as três).
   As páginas abrem para qualquer pessoa, logada ou não:
     #privacidade · #termos · #excluir-conta
   Contato e responsável ficam em config.js (contatoEmail, responsavel, cnpj).
============================================================ */
(function () {
  const esc = P.esc;
  const cfg = () => P.CONFIG || {};
  const who = () => esc(cfg().responsavel || 'Lidiane Ester Pereira Florêncio');
  const mail = () => (cfg().contatoEmail ? `<a href="mailto:${esc(cfg().contatoEmail)}">${esc(cfg().contatoEmail)}</a>` : 'o e-mail de contato informado na página do aplicativo');
  const UPDATED = '10 de novembro de 2026';
  const page = (title, body) => `
    <header class="page-head big-head"><span class="head-date">Última atualização: ${UPDATED}</span><h1>${title}</h1></header>
    <article class="legal">${body}</article>
    <p class="legal-links"><a href="#privacidade">Privacidade</a> · <a href="#termos">Termos de uso</a> · <a href="#excluir-conta">Excluir conta</a>${P.store.settings().onboarded ? ' · <a href="#ajustes">Voltar aos Ajustes</a>' : ' · <a href="#boasvindas">Voltar</a>'}</p>`;

  const cnpj = () => (cfg().cnpj ? `, inscrita no CNPJ sob o nº ${esc(cfg().cnpj)}` : '');
  const foro = () => (cfg().cidade ? `da Comarca de ${esc(cfg().cidade)}` : 'da Comarca do domicílio da Controladora');

  P.views.privacidade = () => page('Política de Privacidade', `
    <h2>1. Disposições iniciais</h2>
    <p>A presente Política de Privacidade descreve de que forma o aplicativo Prisma (“Prisma” ou “aplicativo”) coleta, utiliza, armazena, compartilha e protege os dados pessoais de seus usuários (“Usuário”), em conformidade com a Lei nº 13.709/2018 (Lei Geral de Proteção de Dados Pessoais — LGPD) e com a Lei nº 12.965/2014 (Marco Civil da Internet).</p>
    <p>O controlador dos dados pessoais é ${who()}${cnpj()} (“Controladora”).</p>
    <h2>2. Dados pessoais coletados</h2>
    <ul>
      <li><b>Dados de cadastro:</b> endereço de e-mail e senha. A senha é armazenada pelo provedor de autenticação de forma criptografada e não é acessível à Controladora.</li>
      <li><b>Dados inseridos pelo Usuário:</b> nome ou apelido, disciplinas, projetos, leituras, tarefas, anotações, hábitos, eventos de agenda e preferências de uso.</li>
      <li><b>Dados financeiros:</b> contas, lançamentos, categorias e planejamentos. Esses dados são criptografados no próprio dispositivo do Usuário antes do envio aos servidores, por meio de chave vinculada exclusivamente à senha e ao código de recuperação do Usuário, de modo que não podem ser lidos pela Controladora.</li>
      <li><b>Dados técnicos para notificações:</b> identificador de inscrição do dispositivo e fuso horário. Para o envio de lembretes financeiros com o aplicativo fechado, são transmitidas apenas as quantidades de contas com vencimento em cada data, sem descrições ou valores.</li>
    </ul>
    <h2>3. Finalidades do tratamento</h2>
    <p>Os dados pessoais são tratados exclusivamente para:</p>
    <ol>
      <li>viabilizar o funcionamento do aplicativo e a sincronização dos dados entre os dispositivos do Usuário;</li>
      <li>enviar os lembretes e notificações ativados pelo Usuário;</li>
      <li>responder às solicitações feitas ao assistente de inteligência artificial;</li>
      <li>garantir a segurança do serviço e prevenir fraudes e abusos.</li>
    </ol>
    <p>A Controladora não comercializa dados pessoais, não exibe publicidade e não utiliza os dados para finalidades diversas das aqui descritas.</p>
    <h2>4. Bases legais</h2>
    <ul>
      <li><b>Execução de contrato</b> (art. 7º, V, da LGPD): para a prestação do serviço contratado com a criação da conta.</li>
      <li><b>Consentimento</b> (art. 7º, I): para o envio de notificações e o uso do assistente de inteligência artificial, revogável a qualquer tempo nas configurações do aplicativo.</li>
      <li><b>Legítimo interesse</b> (art. 7º, IX): para a segurança do serviço e a prevenção de abusos.</li>
    </ul>
    <h2>5. Compartilhamento de dados</h2>
    <p>Os dados pessoais poderão ser compartilhados com os seguintes operadores, exclusivamente para as finalidades descritas:</p>
    <ul>
      <li><b>Provedor de armazenamento em nuvem e autenticação</b>, com servidores localizados nos Estados Unidos da América, o que caracteriza transferência internacional de dados, realizada nos termos do art. 33 da LGPD e necessária à execução do serviço;</li>
      <li><b>Serviço de inteligência artificial do Google (Gemini)</b>, utilizado apenas quando o Usuário aciona o assistente, que recebe somente o resumo de informações necessário à resposta, não armazenado pela Controladora;</li>
      <li><b>Serviços de notificação do navegador ou do sistema operacional</b> do dispositivo do Usuário, responsáveis pela entrega dos avisos.</li>
    </ul>
    <h2>6. Dados não coletados</h2>
    <p>O aplicativo não coleta senhas bancárias, números de cartão ou dados de contas bancárias, nem se conecta a instituições financeiras. Eventuais pagamentos de assinatura serão processados pela Google Play, que detém os dados de pagamento; a Controladora recebe apenas a confirmação da assinatura.</p>
    <h2>7. Armazenamento local</h2>
    <p>O aplicativo não utiliza cookies de publicidade nem ferramentas de rastreamento. Para funcionar sem conexão e com maior rapidez, mantém no dispositivo do Usuário uma cópia dos dados, as preferências e a chave de criptografia do módulo financeiro, eliminadas quando o Usuário encerra a sessão.</p>
    <h2>8. Direitos do titular</h2>
    <p>Nos termos do art. 18 da LGPD, o Usuário pode, a qualquer tempo: (i) confirmar a existência de tratamento e acessar seus dados; (ii) corrigir dados incompletos ou desatualizados; (iii) solicitar a portabilidade, por meio da função “Baixar backup”; (iv) revogar o consentimento; e (v) solicitar a eliminação dos dados, por meio da função “Excluir minha conta”. Demais solicitações podem ser enviadas para ${mail()}.</p>
    <h2>9. Retenção e eliminação</h2>
    <p>Os dados são mantidos enquanto a conta estiver ativa. Com a exclusão da conta, os dados são eliminados dos servidores imediatamente, ressalvadas as hipóteses legais de conservação previstas no art. 16 da LGPD.</p>
    <h2>10. Segurança</h2>
    <p>A Controladora adota medidas técnicas e administrativas para proteger os dados pessoais, incluindo o isolamento de acesso por conta e a criptografia dos dados financeiros no dispositivo. Recomenda-se ao Usuário o uso de senha forte e a guarda do código de recuperação em local seguro.</p>
    <h2>11. Encarregado pelo tratamento</h2>
    <p>A encarregada pelo tratamento de dados pessoais é ${who()}, que pode ser contatada pelo e-mail ${mail()}.</p>
    <h2>12. Menores de idade</h2>
    <p>O aplicativo destina-se a maiores de 18 (dezoito) anos. O uso por menores deve ocorrer com o consentimento e o acompanhamento de pelo menos um dos pais ou responsável legal, nos termos do art. 14 da LGPD.</p>
    <h2>13. Alterações</h2>
    <p>Esta Política poderá ser alterada a qualquer tempo. Alterações relevantes serão comunicadas no aplicativo antes de entrarem em vigor.</p>`);

  P.views.termos = () => page('Termos de Uso', `
    <h2>1. Aceitação</h2>
    <p>Ao criar uma conta ou utilizar o aplicativo Prisma, o Usuário declara ter lido, compreendido e aceito integralmente estes Termos de Uso e a <a href="#privacidade">Política de Privacidade</a>. Caso não concorde, o Usuário não deverá utilizar o aplicativo.</p>
    <h2>2. Objeto</h2>
    <p>O Prisma é um aplicativo de organização pessoal destinado ao planejamento de estudos, projetos, leituras, atividades pessoais e finanças. As informações e os cálculos apresentados são estimativas baseadas exclusivamente nos dados inseridos pelo Usuário e <b>não constituem consultoria financeira, contábil ou jurídica</b>. As decisões tomadas a partir do uso do aplicativo são de responsabilidade exclusiva do Usuário.</p>
    <h2>3. Conta e segurança</h2>
    <p>O Usuário é responsável pela veracidade dos dados de cadastro e pela guarda de sua senha e de seu código de recuperação. Em caso de esquecimento da senha, poderá redefini-la por e-mail; os dados financeiros, porém, somente poderão ser recuperados a partir de um dispositivo com sessão ativa ou do código de recuperação. Na ausência de ambos, esses dados não poderão ser recuperados, inclusive pela Controladora.</p>
    <h2>4. Condutas proibidas</h2>
    <p>É vedado ao Usuário: (i) inserir dados pessoais de terceiros sem autorização; (ii) utilizar o aplicativo para fins ilícitos; (iii) tentar acessar contas, sistemas ou dados de terceiros; e (iv) praticar qualquer ato que comprometa o funcionamento ou a segurança do serviço.</p>
    <h2>5. Propriedade intelectual</h2>
    <p>A marca, o nome, a identidade visual, os textos e o código-fonte do Prisma são de titularidade de ${who()} e protegidos pela legislação aplicável. O conteúdo inserido pelo Usuário permanece de sua titularidade, sendo utilizado exclusivamente para a prestação do serviço.</p>
    <h2>6. Versão de testes</h2>
    <p>O aplicativo encontra-se em fase de testes e poderá apresentar falhas, instabilidades ou alterações de funcionalidades. Recomenda-se ao Usuário a realização periódica de cópias de segurança por meio da função “Baixar backup”.</p>
    <h2>7. Planos e pagamentos</h2>
    <p>Durante a fase de testes, todas as funcionalidades estão disponíveis sem custo. A eventual oferta de plano pago (Premium) será precedida da informação clara de preço, funcionalidades incluídas e forma de cancelamento, e nenhuma cobrança será realizada sem a confirmação expressa do Usuário. Os pagamentos serão processados pela Google Play, segundo as regras dessa plataforma.</p>
    <h2>8. Limitação de responsabilidade</h2>
    <p>A Controladora empenha-se em manter o serviço disponível e seguro, mas não garante seu funcionamento ininterrupto e não se responsabiliza por danos decorrentes de decisões tomadas pelo Usuário com base nas informações do aplicativo, de falhas de conexão ou de perda de dados causada pelo próprio Usuário, ressalvados os direitos previstos no Código de Defesa do Consumidor.</p>
    <h2>9. Encerramento</h2>
    <p>O Usuário poderá encerrar sua conta a qualquer tempo, por meio da função “Excluir minha conta”. A Controladora poderá suspender ou encerrar contas que violem estes Termos.</p>
    <h2>10. Alterações</h2>
    <p>Estes Termos poderão ser alterados a qualquer tempo. Alterações relevantes serão comunicadas no aplicativo antes de entrarem em vigor, e as versões anteriores permanecerão disponíveis para consulta.</p>
    <h2>11. Disposições gerais</h2>
    <p>A eventual invalidade de qualquer disposição destes Termos não afetará as demais. A tolerância quanto ao descumprimento de qualquer cláusula não implicará renúncia ao direito de exigi-la.</p>
    <h2>12. Lei aplicável e foro</h2>
    <p>Estes Termos são regidos pelas leis da República Federativa do Brasil. Fica eleito o foro ${foro()} para dirimir quaisquer controvérsias, ressalvado o direito do consumidor de ajuizar ação no foro de seu domicílio.</p>
    <h2>13. Contato</h2>
    <p>Dúvidas e solicitações podem ser encaminhadas para ${mail()}.</p>`);

  P.views['excluir-conta'] = () => page('Exclusão de conta e de dados', `
    <p>O Usuário poderá solicitar, a qualquer tempo, a exclusão de sua conta e de <b>todos os dados pessoais</b> a ela vinculados, incluindo estudos, tarefas, anotações, dados financeiros e inscrições de notificação, nos termos do art. 18, VI, da LGPD.</p>
    <h2>Pelo aplicativo</h2>
    <ol><li>Acesse o Prisma com a conta que deseja excluir.</li><li>Selecione <b>Ajustes → Sua conta → Excluir minha conta</b>.</li><li>Confirme a operação digitando <b>EXCLUIR</b>.</li></ol>
    <p>Os dados são eliminados dos servidores imediatamente e o acesso à conta é encerrado. A operação é irreversível.</p>
    <h2>Sem acesso ao aplicativo</h2>
    <p>O pedido poderá ser enviado para ${mail()}, a partir do endereço de e-mail cadastrado na conta. A exclusão será concluída em até 15 (quinze) dias a contar do recebimento da solicitação.</p>
    ${P.sync?.user() ? '<div class="form-actions"><button class="btn danger" type="button" data-act="deleteAccount">Excluir minha conta agora</button></div>' : ''}`);

  // ---------- excluir minha conta ----------
  const deleteSheet = () => P.sheet({
    title: 'Excluir minha conta', kicker: 'Não dá para desfazer', keep: true,
    render: () => `<form class="form">
      <p class="ask-msg">Isso apaga <b>todos os seus dados</b> da nuvem (estudos, tarefas, notas, financeiro, avisos) e o seu login. Os outros aparelhos deixam de ter acesso.</p>
      <p class="hint">Se quiser guardar uma cópia, baixe o backup antes, em Ajustes → Seus dados.</p>
      <label class="field"><span class="field-label">Para confirmar, digite EXCLUIR</span><input name="ok" autocomplete="off" autocapitalize="characters" required></label>
      <p class="form-error" hidden></p>
      <div class="form-actions"><button class="btn ghost" type="button" data-cancel>Cancelar</button><button class="btn danger" type="submit">Excluir tudo</button></div></form>`,
    mount: api => {
      const b = api.body;
      b.querySelector('[data-cancel]').onclick = () => api.close();
      b.querySelector('form').onsubmit = async e => {
        e.preventDefault();
        const err = m => { const p = b.querySelector('.form-error'); p.textContent = m; p.hidden = false; };
        if (e.target.ok.value.trim().toUpperCase() !== 'EXCLUIR') return err('Digite EXCLUIR para confirmar.');
        if (!navigator.onLine) return err('Precisa de internet para excluir da nuvem.');
        const btn = b.querySelector('[type=submit]'); btn.disabled = true; b.querySelector('[data-cancel]').disabled = true;
        try {
          await P.sync.deleteAccount(n => { btn.textContent = `Apagando… (${n})`; });
          api.close();
          P.toast('Conta e dados excluídos. Obrigada por ter usado o Prisma.');
          setTimeout(() => { location.hash = '#boasvindas'; location.reload(); }, 1400);
        } catch (x) { btn.disabled = false; btn.textContent = 'Excluir tudo'; b.querySelector('[data-cancel]').disabled = false; err('Não consegui excluir agora: ' + (x.message || x) + ' Tente de novo.'); }
      };
    }
  });
  Object.assign(P.actions, { deleteAccount: deleteSheet });
})();
