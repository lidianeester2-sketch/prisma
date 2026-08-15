/* ============================================================
   DADOS BASE
============================================================ */
const defaultSubjects = [
  {startDate:'', endDate:'', teacher:'', code:'VIV0106', name:'Inovação e Empreendedorismo', day:'Sexta', dayIdx:4, time:'20:50–22:30', bg:'var(--c-yellow-bg)', fg:'var(--c-yellow-fg)', icon:'💡', type:'presencial'},
  {startDate:'', endDate:'', teacher:'', code:'VIV0481', name:'Profissões em Comunicação', day:'Terça', dayIdx:1, time:'19:00–20:40', bg:'var(--c-mint-bg)', fg:'var(--c-mint-fg)', icon:'🎙️', type:'presencial'},
  {startDate:'', endDate:'', teacher:'', code:'VIV0727', name:'História da Mídia', day:'Quarta', dayIdx:2, time:'19:00–20:40', bg:'var(--c-pink-bg)', fg:'var(--c-pink-fg)', icon:'📺', type:'presencial'},
  {startDate:'', endDate:'', teacher:'', code:'VIV0750', name:'Computação Gráfica e Editoração', day:'Quinta', dayIdx:3, time:'20:50–22:30', bg:'var(--c-sky-bg)', fg:'var(--c-sky-fg)', icon:'🖥️', type:'presencial'},
  {startDate:'', endDate:'', teacher:'', code:'ARA6403', name:'LABVIDA Publicidade e Propaganda 1', day:'—', dayIdx:null, time:'On-line', bg:'var(--c-lav-bg)', fg:'var(--c-lav-fg)', icon:'🎨', type:'online'},
  {startDate:'', endDate:'', teacher:'', code:'ARA1739', name:'Língua Portuguesa', day:'—', dayIdx:null, time:'On-line', bg:'var(--c-peach-bg)', fg:'var(--c-peach-fg)', icon:'📖', type:'online'},
];
let subjects = JSON.parse(JSON.stringify(defaultSubjects));
let archivedSubjects = [];

const events = [
  ['2026-04-03','feriado','Sexta-feira Santa'],
  ['2026-04-21','feriado','Tiradentes'],
  ['2026-06-04','feriado','Corpus Christi'],
  ['2026-06-24','evento','Boleto para renovação de matrícula 2026.2 disponível'],
  ['2026-07-10','prazo','Início da matrícula dirigida'],
  ['2026-07-11','prazo','Término da matrícula dirigida'],
  ['2026-07-16','prazo','Início: renovação de matrícula, movimentação de grade, inclusão/exclusão sem taxa, trancamento sem taxa e transferências'],
  ['2026-07-28','evento','Liberação da Sala de Aula Virtual e acesso às disciplinas on-line'],
  ['2026-08-04','evento','Início das aulas — Veteranos'],
  ['2026-08-18','evento','Início das aulas — Calouros'],
  ['2026-09-07','feriado','Independência do Brasil'],
  ['2026-09-15','prova','Início do simulado — disciplinas on-line'],
  ['2026-09-16','prazo','Início do agendamento da Prova AV — on-line/TEAMS'],
  ['2026-09-21','prazo','Término das solicitações de MSV, TE e 2º curso'],
  ['2026-09-21','prova','Início do simulado 1 — disciplinas TEAMS'],
  ['2026-09-24','prazo','Início do agendamento da Prova AVS — on-line/TEAMS'],
  ['2026-09-26','prova','Término do simulado 1 — disciplinas TEAMS'],
  ['2026-09-28','evento','Início da Semana Acadêmica de Cursos'],
  ['2026-09-29','prova','Início da Prova AV — disciplinas on-line'],
  ['2026-10-02','evento','Término da Semana Acadêmica de Cursos'],
  ['2026-10-05','prazo','Término da reabertura de matrícula'],
  ['2026-10-06','prova','Início da Prova AVS — disciplinas on-line'],
  ['2026-10-08','prazo','Término: renovação de matrícula, movimentação de grade, exclusão sem taxa, trancamento sem taxa e transferências'],
  ['2026-10-09','prazo','Início: exclusão de disciplina e trancamento com cobrança de taxa'],
  ['2026-10-12','feriado','Nossa Senhora Aparecida'],
  ['2026-10-15','evento','Dia do Professor'],
  ['2026-10-21','prazo','Início da pré-matrícula 2027.1 (contrato educacional)'],
  ['2026-11-02','feriado','Finados'],
  ['2026-11-09','prova','Início do simulado 2 — disciplinas TEAMS'],
  ['2026-11-14','prova','Término do simulado 2 — disciplinas TEAMS'],
  ['2026-11-15','feriado','Proclamação da República'],
  ['2026-11-19','prazo','Término do agendamento da Prova AV — on-line/TEAMS'],
  ['2026-11-19','prova','Término do simulado — disciplinas on-line'],
  ['2026-11-20','feriado','Consciência Negra'],
  ['2026-11-21','prova','Término da Prova AV — disciplinas on-line'],
  ['2026-11-23','prova','Início das Provas AV e AVS — disciplinas TEAMS'],
  ['2026-11-25','prazo','Término da pré-matrícula 2027.1'],
  ['2026-11-28','prazo','Data limite de permanência em campo de estágio obrigatório'],
  ['2026-12-01','prazo','Término das disciplinas on-line NF (Estágio, Extensão e TCC) e data limite documentação de estágio'],
  ['2026-12-03','prazo','Término do agendamento da Prova AVS — on-line/TEAMS'],
  ['2026-12-05','prova','Término das Provas AV e AVS — TEAMS, e da Prova AVS on-line'],
  ['2026-12-08','prazo','Encerramento do estudo dirigido, lançamento e acerto de notas, exclusão/trancamento com taxa, alteração de vencimento, AAC externa e término do semestre letivo'],
  ['2026-12-25','feriado','Natal'],
];
const catColor = {feriado:'var(--mint)', prova:'var(--coral)', prazo:'var(--gold)', evento:'var(--sky)'};
const catLabel = {feriado:'Feriado', prova:'Avaliação', prazo:'Prazo', evento:'Evento'};
const monthNames = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const monthAbbr = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

function uid(){ return Date.now().toString(36)+Math.random().toString(36).slice(2,6); }
function fmtDDMM(iso){ const [y,m,d]=iso.split('-'); return `${d}/${m}`; }
function escapeHtml(s){ const d=document.createElement('div'); d.textContent=s; return d.innerHTML; }
function todayISO(){ return new Date().toISOString().slice(0,10); }

/* ============================================================
   ARMAZENAMENTO NA NUVEM — Google Sheets via Apps Script
   Os mesmos dados aparecem em qualquer dispositivo que abrir este arquivo.
============================================================ */
const SHEET_URL = 'https://script.google.com/macros/s/AKfycbw5rt-wrRMq7Rs3tUMcNJ6B5_wB2hVNPKv8d7wRHTs--H4aIMjrkqhs4WXCinwFl81S/exec';

function setSyncStatus(state){
  // state: 'ok' | 'saving' | 'error'
  const el = document.getElementById('syncStatus');
  if(!el) return;
  if(state==='saving'){ el.textContent = '☁️ sincronizando...'; el.style.color = 'var(--gold-dk)'; }
  else if(state==='error'){ el.textContent = '⚠️ falha ao sincronizar'; el.style.color = 'var(--coral)'; }
  else { el.textContent = '☁️ sincronizado'; el.style.color = 'var(--mint-dk)'; }
}

const remoteStorage = {
  async get(key){
    try{
      const res = await fetch(`${SHEET_URL}?action=get&key=${encodeURIComponent(key)}`);
      const data = await res.json();
      setSyncStatus('ok');
      if(!data || data.value===undefined || data.value===null) return null;
      return { key, value: data.value };
    }catch(err){
      console.error('Erro ao ler da planilha:', err);
      setSyncStatus('error');
      return null;
    }
  },
  async set(key, value){
    setSyncStatus('saving');
    try{
      // Sem cabeçalho Content-Type explícito para evitar bloqueio de CORS (preflight) no Apps Script.
      const res = await fetch(SHEET_URL, { method:'POST', body: JSON.stringify({ action:'set', key, value }) });
      const data = await res.json();
      setSyncStatus('ok');
      return data;
    }catch(err){
      console.error('Erro ao salvar na planilha:', err);
      setSyncStatus('error');
      return null;
    }
  }
};

/* ============================================================
   NAV
============================================================ */
document.querySelectorAll('.rail button').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    document.querySelectorAll('.rail button').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
    document.getElementById('page-'+btn.dataset.page).classList.add('active');
  });
});

/* ============================================================
   SAUDAÇÃO + PERSONALIDADE DO PRISMA
============================================================ */
const prismaPhrases = [
  'Bom dia. Infelizmente, o semestre continua.',
  'Você abriu o Prisma. Isso já conta como planejamento.',
  'Seu futuro agradece. Seu presente queria estar dormindo.',
  'Mais um dia fingindo que temos controle da situação.',
  'Respira. A planilha não vai se preencher sozinha.',
  'Tudo sob controle. Exceto aquilo que claramente não está.',
  'Você não veio até aqui para entregar qualquer coisa.',
  'Hoje você tem duas opções: fazer ou continuar pensando em fazer.',
  'O caos pode até existir. Mas aqui ele tem calendário.',
  'Não precisa dominar o mundo hoje. Só a próxima tarefa.',
  'Faça direito. Depois você reclama.',
  'Você vai conseguir. E depois vai fazer com que as pessoas achem que foi fácil.',
  'Você pediu uma vida organizada. Agora aguenta.',
  'Bom dia. Seu café ainda não está cadastrado no sistema.',
  'Você estudou. Ou pelo menos abriu o material.',
  'Mais uma oportunidade de descobrir que o trabalho era para hoje.',
  'Seu semestre mandou lembranças. E alguns prazos.',
  'A faculdade não vai se formar sozinha.',
  'Parabéns por abrir o aplicativo antes do colapso.',
  'Vamos descobrir o que está pegando fogo hoje.',
  'Você não está atrasada. Está trabalhando com uma margem estratégica questionável.',
  'Produtividade é fazer a coisa certa antes de começar outra coisa completamente diferente.',
  'O plano perfeito continua sendo inferior ao plano que você realmente executa.',
  'Organizar a vida não resolve tudo. Mas deixa o caos mais apresentável.',
  'Seu cérebro pediu férias. Seu calendário abriu uma reunião.',
  'Não é procrastinação se você estiver organizando a procrastinação.',
  'Aparentemente, ter um plano não impede imprevistos. Quem diria.',
  'Tudo parece mais administrável quando está em cards bonitos.',
  'Boa noite. Sobreviver ao dia também foi uma entrega.',
  'Encerrando o expediente. O cérebro já pediu demissão.',
  'Hoje acabou. Amanhã a gente finge que começa renovada.',
  'Você fez o que deu. O que não deu fica para a versão de amanhã.',
  'Boa noite. O prazo continua lá amanhã, infelizmente. Mas por enquanto, vamos resolver o que der.',
  'Hora de descansar antes que você comece a estudar por culpa.',
  'Bem-vinda de volta. Temos algumas coisas para resolver.',
  'Prisma online. Sua organização está oficialmente sob supervisão.',
  'Tudo bem. O Prisma está aqui. Pode parar de fingir que lembra de tudo.',
  'Você trouxe os problemas. Eu trouxe os cards.',
  'Vamos transformar esse caos em alguma coisa apresentável.',
  'Prisma aberto. Agora parece que existe um plano.',
  'Hora de pensar o que o Naruto faria...',
  'Taylor Swift ficaria orgulhosa!'
];

function prismaRandomPhrase(){
  let phrase = randomFrom(prismaPhrases);
  try{
    const last = localStorage.getItem('prisma-last-phrase');
    if(prismaPhrases.length > 1 && phrase === last){
      do { phrase = randomFrom(prismaPhrases); } while(phrase === last);
    }
    localStorage.setItem('prisma-last-phrase', phrase);
  }catch(err){}
  return phrase;
}

function updatePrismaGreeting(name=''){
  const now = new Date();
  const hour = now.getHours();
  let greeting;

  if(hour >= 5 && hour < 12) greeting = 'Bom dia';
  else if(hour >= 12 && hour < 18) greeting = 'Boa tarde';
  else greeting = 'Boa noite';

  const greetingEl = document.getElementById('userGreeting');
  if(greetingEl) greetingEl.textContent = name ? `${greeting}, ${name}!` : greeting;

  const phraseEl = document.getElementById('dailyPhrase');
  if(phraseEl) phraseEl.textContent = prismaRandomPhrase();

  const todayEl = document.getElementById('todayChip');
  if(todayEl){
    todayEl.textContent = 'Hoje · ' + now.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric'});
  }
}

async function loadPrismaGreeting(){
  let name = '';
  try{
    const saved = await remoteStorage.get('user-name');
    name = saved && saved.value ? String(saved.value).trim() : '';

    if(!name){
      name = (prompt('Como podemos chamar você?') || '').trim();
      if(name) await remoteStorage.set('user-name', name);
    }
  }catch(err){
    console.error('Erro ao carregar nome do usuário:', err);
  }

  updatePrismaGreeting(name);
}

loadPrismaGreeting();

/* ============================================================
   SELETOR DE PAINÉIS (WORKSPACES)
============================================================ */
let currentWorkspace = 'faculdade';
const workspaceMeta = [
  {key:'faculdade', icon:'🎓', title:'Painel da Faculdade', desc:'Matérias, prazos, calendário acadêmico e progresso do semestre.'},
  {key:'projetos', icon:'💼', title:'Painel de Projetos', desc:'Seus projetos de trabalho, entregas e anotações.'},
  {key:'leituras', icon:'📚', title:'Painel de Leituras', desc:'Livros, artigos e assuntos interessantes que você quer registrar.'},
];

function applyWorkspaceVisibility(ws){
  document.querySelectorAll('.rail button[data-workspace]').forEach(b=>{
    const bw = b.dataset.workspace;
    b.style.display = (bw===ws || bw==='all') ? 'flex' : 'none';
  });
}
function setWorkspace(ws, opts={}){
  currentWorkspace = ws;
  applyWorkspaceVisibility(ws);
  const firstBtn = document.querySelector(`.rail button[data-workspace="${ws}"]`);
  if(firstBtn) firstBtn.click();
  if(!opts.skipSave){ remoteStorage.set('active-workspace', ws); }
}
function renderSwitcherOptions(){
  document.getElementById('switcherGrid').innerHTML = workspaceMeta.map(w=>`
    <button class="switcher-option ${w.key===currentWorkspace?'current':''}" data-ws="${w.key}">
      <div class="so-icon">${w.icon}</div>
      <h3>${w.title}</h3>
      <p>${w.desc}</p>
    </button>`).join('');
}
document.getElementById('brandBtn').addEventListener('click', ()=>{
  renderSwitcherOptions();
  document.getElementById('switcherOverlay').classList.add('show');
});
document.getElementById('switcherClose').addEventListener('click', ()=>{
  document.getElementById('switcherOverlay').classList.remove('show');
});
document.getElementById('switcherOverlay').addEventListener('click', e=>{
  if(e.target.id==='switcherOverlay') document.getElementById('switcherOverlay').classList.remove('show');
});
document.getElementById('switcherGrid').addEventListener('click', e=>{
  const btn = e.target.closest('[data-ws]'); if(!btn) return;
  setWorkspace(btn.dataset.ws);
  document.getElementById('switcherOverlay').classList.remove('show');
});
async function initWorkspace(){
  let ws = 'faculdade';
  try{
    const r = await remoteStorage.get('active-workspace');
    if(r && workspaceMeta.some(w=>w.key===r.value)) ws = r.value;
  }catch(e){}
  setWorkspace(ws, {skipSave:true});
}

/* paleta de cores reaproveitada para itens dinâmicos (projetos/leituras) */
const dynPaletteBg = ['var(--c-yellow-bg)','var(--c-mint-bg)','var(--c-pink-bg)','var(--c-sky-bg)','var(--c-lav-bg)','var(--c-peach-bg)'];
const dynPaletteFg = ['var(--c-yellow-fg)','var(--c-mint-fg)','var(--c-pink-fg)','var(--c-sky-fg)','var(--c-lav-fg)','var(--c-peach-fg)'];
function dynColor(idx){ return {bg:dynPaletteBg[idx%6], fg:dynPaletteFg[idx%6]}; }


/* ============================================================
   MATÉRIAS — cadastro e arquivamento
============================================================ */
async function loadSubjects(){
  try{
    const r = await remoteStorage.get('subjects-list');
    subjects = r ? JSON.parse(r.value) : JSON.parse(JSON.stringify(defaultSubjects));
    subjects = (subjects || []).map(s=>({startDate:'', endDate:'', teacher:'', ...s}));
    const ar = await remoteStorage.get('subjects-archived');
    archivedSubjects = ar ? JSON.parse(ar.value) : [];
  }catch(e){
    subjects = JSON.parse(JSON.stringify(defaultSubjects)).map(s=>({startDate:'', endDate:'', teacher:'', ...s}));
    archivedSubjects = [];
  }
}
async function saveSubjects(){
  try{ await remoteStorage.set('subjects-list', JSON.stringify(subjects)); }catch(e){}
}
async function saveArchivedSubjects(){
  try{ await remoteStorage.set('subjects-archived', JSON.stringify(archivedSubjects)); }catch(e){}
}
function newSubjectProgress(aulasTotal=null, ativTotal=null){
  return {
    aulas:0,
    aulasTotal:Number.isFinite(Number(aulasTotal)) && Number(aulasTotal)>=0 ? Number(aulasTotal) : null,
    ativ:0,
    ativTotal:Number.isFinite(Number(ativTotal)) && Number(ativTotal)>=0 ? Number(ativTotal) : null,
    updated:0,
    lastAction:null
  };
}

function parseSubjectTotal(value, label){
  const v = String(value ?? '').trim().toLowerCase();
  if(v === '' || v === 'não sei' || v === 'nao sei' || v === 'n/a' || v === '?') return null;
  const n = Number(v);
  if(!Number.isInteger(n) || n < 0){
    showToast(`Informe um número válido para ${label} ou escolha “não sei”.`);
    return undefined;
  }
  return n;
}
async function addSubject(){
  const name = prompt('Nome da nova matéria:');
  if(!name || !name.trim()) return;

  const codeInput = prompt('Código da matéria (opcional):');
  const code = (codeInput && codeInput.trim()
    ? codeInput.trim().toUpperCase()
    : 'MAT-'+Date.now().toString().slice(-4));

  if(subjects.some(s=>s.code===code)){
    showToast('Já existe uma matéria com esse código.');
    return;
  }

  const aulasInput = prompt('Quantas aulas essa matéria terá no semestre?\n\nDigite um número ou “não sei”.');
  if(aulasInput === null) return;
  const aulasTotal = parseSubjectTotal(aulasInput, 'aulas');
  if(aulasTotal === undefined) return;

  const ativInput = prompt('Quantas atividades essa matéria terá no semestre?\n\nDigite um número ou “não sei”.');
  if(ativInput === null) return;
  const ativTotal = parseSubjectTotal(ativInput, 'atividades');
  if(ativTotal === undefined) return;

  if(aulasTotal === null && ativTotal === null){
    showToast('Você pode deixar os dois como “não sei”, mas o progresso percentual ficará indisponível até definir pelo menos um total.');
  }
  if(aulasTotal === 0 && ativTotal === 0){
    showToast('Defina pelo menos 1 aula ou atividade, ou use “não sei”.');
    return;
  }

  const online = confirm('É uma matéria on-line? Clique em OK para On-line ou Cancelar para presencial.');
  const idx = subjects.length;
  const color = dynColor(idx);

  const subject = {
    code,
    name:name.trim(),
    day:online?'—':'—',
    dayIdx:null,
    time:online?'On-line':'A definir',
    bg:color.bg,
    fg:color.fg,
    icon:'📚',
    type:online?'online':'presencial'
  };

  subjects.push(subject);
  courseProgress[code] = newSubjectProgress(aulasTotal, ativTotal);

  await saveSubjects();
  await saveCourseProgress();

  buildCourseGrid();
  buildWeekGrid();
  populateSubjectSelects();
  renderProgressPage();
  renderJourneyProgress();
  showToast(`"${subject.name}" criada com ${aulasTotal} aula(s) e ${ativTotal} atividade(s). ✦`);
}

let openedSubjectCode = null;

function formatSubjectDateRange(s){
  const fmt = iso => iso ? new Date(iso+'T00:00:00').toLocaleDateString('pt-BR') : '';
  if(!s.startDate && !s.endDate) return 'Datas não informadas';
  if(s.startDate && s.endDate) return `${fmt(s.startDate)} → ${fmt(s.endDate)}`;
  if(s.startDate) return `Início: ${fmt(s.startDate)}`;
  return `Término: ${fmt(s.endDate)}`;
}

function openSubjectModal(code){
  const subject = subjects.find(s=>s.code===code);
  if(!subject) return;
  const p = courseProgress[code] || newSubjectProgress();
  openedSubjectCode = code;

  document.getElementById('subjectModalTitle').textContent = subject.name;
  document.getElementById('subjectViewTeacher').textContent = subject.teacher || 'Não informado';
  document.getElementById('subjectViewDates').textContent = formatSubjectDateRange(subject);
  document.getElementById('subjectViewProgress').textContent = progressHasKnownTotal(p) ? `${progressPct(p)}%` : 'Sem percentual';
  document.getElementById('subjectViewProgressDetail').textContent = progressDisplay(p);
  document.getElementById('subjectViewArchive').textContent = 'Matéria ativa — você pode arquivá-la pela edição.';

  document.getElementById('subjectModalName').value = subject.name || '';
  document.getElementById('subjectModalCode').value = subject.code || '';
  document.getElementById('subjectModalTeacher').value = subject.teacher || '';
  document.getElementById('subjectModalStart').value = subject.startDate || '';
  document.getElementById('subjectModalEnd').value = subject.endDate || '';
  document.getElementById('subjectModalAulasTotal').value = p.aulasTotal == null ? 'não sei' : String(p.aulasTotal);
  document.getElementById('subjectModalAtivTotal').value = p.ativTotal == null ? 'não sei' : String(p.ativTotal);
  document.getElementById('subjectModalArchive').checked = false;

  document.getElementById('subjectModalView').hidden = false;
  document.getElementById('subjectModalEditForm').hidden = true;
  document.getElementById('subjectModalOverlay').classList.add('show');
}

function closeSubjectModal(){
  openedSubjectCode = null;
  document.getElementById('subjectModalOverlay').classList.remove('show');
}

function setSubjectModalEdit(on){
  document.getElementById('subjectModalView').hidden = on;
  document.getElementById('subjectModalEditForm').hidden = !on;
  document.getElementById('subjectModalEdit').style.display = on ? 'none' : 'inline-flex';
}

async function saveSubjectModal(){
  const code = openedSubjectCode;
  const subject = subjects.find(s=>s.code===code);
  if(!subject) return;

  const name = document.getElementById('subjectModalName').value.trim();
  const newCode = document.getElementById('subjectModalCode').value.trim().toUpperCase() || subject.code;
  const teacher = document.getElementById('subjectModalTeacher').value.trim();
  const startDate = document.getElementById('subjectModalStart').value;
  const endDate = document.getElementById('subjectModalEnd').value;
  const aulasTotal = parseSubjectTotal(document.getElementById('subjectModalAulasTotal').value, 'aulas');
  const ativTotal = parseSubjectTotal(document.getElementById('subjectModalAtivTotal').value, 'atividades');
  const shouldArchive = document.getElementById('subjectModalArchive').checked;
  const p = courseProgress[code] || newSubjectProgress();

  if(!name){ showToast('O nome da matéria não pode ficar vazio.'); return; }
  if(aulasTotal === undefined || ativTotal === undefined) return;
  if(aulasTotal !== null && aulasTotal < p.aulas){
    showToast(`O total de aulas não pode ser menor que ${p.aulas}, que já foram registradas.`); return;
  }
  if(ativTotal !== null && ativTotal < p.ativ){
    showToast(`O total de atividades não pode ser menor que ${p.ativ}, que já foram registradas.`); return;
  }
  if(startDate && endDate && startDate > endDate){
    showToast('A data de início não pode ser depois da data de término.'); return;
  }
  if(newCode !== subject.code && subjects.some(s=>s.code===newCode)){
    showToast('Já existe uma matéria com esse código.'); return;
  }

  subject.name = name;
  subject.teacher = teacher;
  subject.startDate = startDate;
  subject.endDate = endDate;
  subject.code = newCode;
  p.aulasTotal = aulasTotal;
  p.ativTotal = ativTotal;
  p.updated = Date.now();

  if(newCode !== code){
    delete courseProgress[code];
    courseProgress[newCode] = p;
  }

  if(shouldArchive){
    archivedSubjects.push({...subject, archivedAt:Date.now()});
    subjects = subjects.filter(s=>s.code!==newCode);
  }

  await saveSubjects();
  await saveArchivedSubjects();
  await saveCourseProgress();
  buildCourseGrid();
  buildWeekGrid();
  populateSubjectSelects();
  renderProgressPage();
  renderJourneyProgress();
  closeSubjectModal();
  showToast(shouldArchive ? 'Matéria arquivada. ✦' : 'Matéria salva. ✦');
}

async function archiveCompletedSubject(code){
  const subject = subjects.find(s=>s.code===code);
  if(!subject) return;
  if(!confirm(`Arquivar "${subject.name}"? Ela ficará fora das matérias ativas.`)) return;
  archivedSubjects.push({...subject, archivedAt:Date.now()});
  subjects = subjects.filter(s=>s.code!==code);
  await saveSubjects();
  await saveArchivedSubjects();
  buildCourseGrid();
  buildWeekGrid();
  populateSubjectSelects();
  renderProgressPage();
  renderJourneyProgress();
  showToast('Matéria arquivada. ✦');
}

/* ============================================================
   MATÉRIAS — cards + grade semanal
============================================================ */
function buildCourseGrid(){
  const cards = subjects.map(s=>{
    const p = courseProgress[s.code] || newSubjectProgress();
    const completed = progressHasKnownTotal(p) && progressPct(p) >= 100;
    return `<div class="course-card subject-click-card" data-action="open-subject" data-code="${escapeHtml(s.code)}" style="background:${s.bg};color:${s.fg};position:relative;cursor:pointer;" title="Abrir detalhes da matéria">
      <div class="cc-icon">${s.icon}</div>
      <h3>${escapeHtml(s.name)}</h3>
      <div class="cc-meta">${escapeHtml(s.code)} · ${s.day!=='—' ? escapeHtml(s.day+' '+s.time) : escapeHtml(s.time)}</div>
      <div style="margin-top:8px;font-size:11px;opacity:.8;">${escapeHtml(progressDisplay(p))}</div>
      ${completed ? `<div style="margin-top:6px;font-size:11px;opacity:.8;">✓ 100% · abra para arquivar</div>` : `<div style="margin-top:6px;font-size:11px;opacity:.7;">Toque para ver detalhes</div>`}
    </div>`;
  }).join('');
  document.getElementById('courseGrid').innerHTML = cards + `<div class="add-item-card" id="subjectAddCard">＋ Registrar nova matéria</div>`;
}

function buildWeekGrid(){
  const grid = document.getElementById('weekGrid');
  const days = ['Seg','Ter','Qua','Qui','Sex'];
  let html = '<div class="wg-head" style="background:var(--bg-soft);"></div>';
  days.forEach(d=> html += `<div class="wg-head">${d}</div>`);
  const rows = [{label:'19:00',match:'19:00–20:40'},{label:'20:50',match:'20:50–22:30'}];
  rows.forEach(row=>{
    html += `<div class="wg-time">${row.label}</div>`;
    for(let i=0;i<5;i++){
      const subj = subjects.find(s=> s.dayIdx===i && s.time===row.match);
      html += subj
        ? `<div><div class="wg-block" style="background:${subj.bg};color:${subj.fg};"><strong>${subj.name}</strong><span>${subj.code}</span></div></div>`
        : `<div></div>`;
    }
  });
  grid.innerHTML = html;
}


document.getElementById('courseGrid').addEventListener('click', async e=>{
  const add = e.target.closest('#subjectAddCard');
  if(add){ await addSubject(); return; }
  const card = e.target.closest('[data-action="open-subject"]');
  if(card){ openSubjectModal(card.dataset.code); }
});

/* Card de detalhes da matéria */
document.getElementById('subjectModalEdit')?.addEventListener('click', ()=>setSubjectModalEdit(true));
document.getElementById('subjectModalCancel')?.addEventListener('click', ()=>closeSubjectModal());
document.getElementById('subjectModalSave')?.addEventListener('click', saveSubjectModal);
document.getElementById('subjectModalOverlay')?.addEventListener('click', e=>{
  if(e.target.id==='subjectModalOverlay') closeSubjectModal();
});


document.getElementById('subjectAddTopBtn')?.addEventListener('click', addSubject);
document.getElementById('progressAddBtn')?.addEventListener('click', ()=>{
  document.querySelector('.rail button[data-page="progresso"]')?.click();
  setTimeout(()=>showToast('Escolha uma matéria e registre aula ou atividade. ✦'), 100);
});

/* próxima aula */
function computeNextClass(){
  const now = new Date();
  const presenciais = subjects.filter(s=>s.type==='presencial');
  let best = null;
  for(let d=0; d<8; d++){
    const cand = new Date(now); cand.setDate(now.getDate()+d);
    const jsDay = cand.getDay(); // 0=Dom
    presenciais.forEach(s=>{
      if(jsDay === s.dayIdx+1){
        const [h,m] = s.time.split('–')[0].split(':').map(Number);
        const dt = new Date(cand); dt.setHours(h,m,0,0);
        if(dt > now && (!best || dt < best.dt)) best = {dt, subj:s};
      }
    });
  }
  return best;
}
function renderNextClass(){
  const best = computeNextClass();
  if(!best){
    document.getElementById('nextClassName').textContent = 'Nenhuma aula presencial encontrada';
    document.getElementById('nextClassWhen').textContent = '';
    return;
  }
  const diffMs = best.dt - new Date();
  const diffH = diffMs/3600000;
  let when;
  const dayStr = best.dt.toLocaleDateString('pt-BR',{weekday:'long'});
  const timeStr = best.dt.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
  if(diffH < 24) when = `Hoje/logo mais · ${timeStr}`;
  else when = `${dayStr}, ${timeStr}`;
  document.getElementById('nextClassName').textContent = best.subj.name;
  document.getElementById('nextClassWhen').textContent = `${when} · ${best.subj.code}`;
}

/* ============================================================
   TAREFAS RÁPIDAS (quick tasks) — persistido
============================================================ */
let quickTasks = [];
async function loadQuickTasks(){
  try{ const r = await remoteStorage.get('quicktasks'); quickTasks = r? JSON.parse(r.value):[]; }
  catch(e){ quickTasks = []; }
  renderQuickTasks(); renderJourneyProgress();
}
async function saveQuickTasks(){
  try{ await remoteStorage.set('quicktasks', JSON.stringify(quickTasks)); }catch(e){}
}
function renderQuickTasks(){
  const list = document.getElementById('qtList');
  if(!quickTasks.length){ list.innerHTML = '<div class="empty-state">Nenhuma tarefa por aqui ✦</div>'; return; }
  const sorted = [...quickTasks].sort((a,b)=> (a.done - b.done));
  list.innerHTML = sorted.map(t=>`
    <div class="qt-item ${t.done?'done':''}" data-id="${t.id}">
      <div class="qt-check ${t.done?'on':''}" data-action="toggle">${t.done?'✓':''}</div>
      <div class="qt-text">${escapeHtml(t.text)}</div>
      <button class="qt-del" data-action="delete">✕</button>
    </div>`).join('');
}
document.getElementById('qtAddBtn').addEventListener('click', async ()=>{
  const input = document.getElementById('qtInput');
  const text = input.value.trim();
  if(!text) return;
  quickTasks.push({id:uid(), text, done:false});
  input.value='';
  renderQuickTasks(); renderJourneyProgress(); await saveQuickTasks();
});
document.getElementById('qtInput').addEventListener('keydown', e=>{ if(e.key==='Enter') document.getElementById('qtAddBtn').click(); });
document.getElementById('qtList').addEventListener('click', async e=>{
  const item = e.target.closest('.qt-item'); if(!item) return;
  const id = item.dataset.id;
  const action = e.target.closest('[data-action]')?.dataset.action;
  if(action==='toggle'){ const t=quickTasks.find(t=>t.id===id); if(t) t.done=!t.done; }
  else if(action==='delete'){ quickTasks = quickTasks.filter(t=>t.id!==id); }
  renderQuickTasks(); renderJourneyProgress(); await saveQuickTasks();
});

/* ============================================================
   TRABALHOS & PROVAS — planejador com marcos automáticos
============================================================ */
let assignments = [];

function populateSubjectSelects(){
  const opts = subjects.map(s=>`<option value="${s.code}">${s.code} — ${s.name}</option>`).join('');
  document.getElementById('asSubject').innerHTML = opts;
  document.getElementById('noteSubject').innerHTML = opts;
  const filterOpts = '<option value="all">Todas as matérias</option>' + opts;
  document.getElementById('noteFilterSubject').innerHTML = filterOpts;
}

function generateMilestones(dueISO){
  const today = new Date(); today.setHours(0,0,0,0);
  const due = new Date(dueISO+'T00:00:00');
  const totalDays = Math.max(1, Math.round((due-today)/86400000));
  let template;
  if(totalDays > 14) template = [
    {label:'Pesquisar e planejar', pct:0.15},
    {label:'Fazer o rascunho', pct:0.5},
    {label:'Revisar', pct:0.8},
    {label:'Entregar', pct:1}
  ];
  else if(totalDays > 6) template = [
    {label:'Planejar', pct:0.2},
    {label:'Desenvolver', pct:0.65},
    {label:'Revisar e entregar', pct:1}
  ];
  else template = [
    {label:'Fazer', pct:0.5},
    {label:'Entregar', pct:1}
  ];
  return template.map(t=>{
    const d = new Date(today.getTime() + totalDays*t.pct*86400000);
    return {id:uid(), label:t.label, date:d.toISOString().slice(0,10), done:false};
  });
}

async function loadAssignments(){
  try{ const r = await remoteStorage.get('assignments'); assignments = r? JSON.parse(r.value):[]; }
  catch(e){ assignments = []; }
  renderAssignments(); renderMiniDeadlines();
}
async function saveAssignments(){
  try{ await remoteStorage.set('assignments', JSON.stringify(assignments)); }catch(e){}
}

function urgencyInfo(dueISO, progress){
  if(progress>=100) return {cls:'u-concluido', label:'concluído'};
  const days = Math.round((new Date(dueISO+'T00:00:00') - new Date(new Date().toDateString()))/86400000);
  if(days<0) return {cls:'u-atrasado', label:'atrasado'};
  if(days<=3) return {cls:'u-urgente', label:days===0?'entrega hoje':`${days}d restantes`};
  if(days<=7) return {cls:'u-embreve', label:`${days}d restantes`};
  return {cls:'u-tranquilo', label:`${days}d restantes`};
}

function renderAssignments(){
  const wrap = document.getElementById('assignList');
  if(!assignments.length){ wrap.innerHTML = '<div class="empty-state">Nenhum trabalho ou prova cadastrado ainda. Crie o primeiro acima ✦</div>'; return; }
  const sorted = [...assignments].sort((a,b)=> a.due.localeCompare(b.due));
  wrap.innerHTML = sorted.map(a=>{
    const done = a.milestones.filter(m=>m.done).length;
    const total = a.milestones.length;
    const progress = Math.round((done/total)*100);
    const u = urgencyInfo(a.due, progress);
    const subj = subjects.find(s=>s.code===a.subject);
    return `<div class="assign-card" data-id="${a.id}">
      <div class="assign-top">
        <div>
          <p class="assign-title">${a.type==='prova'?'📝':'📄'} ${escapeHtml(a.title)}</p>
          <div class="assign-meta">${subj?subj.code+' · '+subj.name:''} · entrega ${fmtDDMM(a.due)}</div>
        </div>
        <div style="display:flex;align-items:center;gap:8px;">
          <span class="urgency ${u.cls}">${u.label}</span>
          <button class="assign-del" data-action="delete-assignment">✕</button>
        </div>
      </div>
      <div class="progress-bar"><div style="width:${progress}%"></div></div>
      <div class="milestones">
        ${a.milestones.map(m=>`
          <div class="ms-item ${m.done?'on':''}" data-ms="${m.id}">
            <div class="ms-check ${m.done?'on':''}" data-action="toggle-ms">${m.done?'✓':''}</div>
            <span class="ms-label">${escapeHtml(m.label)}</span>
            <span class="ms-date">${fmtDDMM(m.date)}</span>
          </div>`).join('')}
      </div>
    </div>`;
  }).join('');
}

function renderMiniDeadlines(){
  const el = document.getElementById('miniDeadlines');
  const pending = assignments
    .map(a=>{
      const done = a.milestones.filter(m=>m.done).length;
      const progress = Math.round((done/a.milestones.length)*100);
      return {...a, progress};
    })
    .filter(a=>a.progress<100)
    .sort((a,b)=>a.due.localeCompare(b.due))
    .slice(0,3);
  if(!pending.length){ el.innerHTML = '<div class="empty-state">Nada urgente por aqui 🎉</div>'; return; }
  el.innerHTML = pending.map(a=>{
    const u = urgencyInfo(a.due, a.progress);
    const dotColor = u.cls==='u-atrasado'?'var(--coral)':u.cls==='u-urgente'?'var(--pink-soft)':u.cls==='u-embreve'?'var(--gold)':'var(--mint)';
    return `<div class="mini-deadline">
      <div class="dot" style="background:${dotColor}"></div>
      <div class="body">
        <div class="t">${escapeHtml(a.title)}</div>
        <div class="m">entrega ${fmtDDMM(a.due)} · ${u.label}</div>
        <div class="mini-bar"><div style="width:${a.progress}%"></div></div>
      </div>
    </div>`;
  }).join('');
}

document.getElementById('asAddBtn').addEventListener('click', async ()=>{
  const title = document.getElementById('asTitle').value.trim();
  const subject = document.getElementById('asSubject').value;
  const type = document.getElementById('asType').value;
  const due = document.getElementById('asDue').value;
  if(!title || !due) return;
  assignments.push({ id:uid(), title, subject, type, due, milestones: generateMilestones(due) });
  document.getElementById('asTitle').value='';
  document.getElementById('asDue').value='';
  renderAssignments(); renderMiniDeadlines(); renderJourneyProgress();
  await saveAssignments();
});

document.getElementById('assignList').addEventListener('click', async e=>{
  const card = e.target.closest('.assign-card'); if(!card) return;
  const id = card.dataset.id;
  const a = assignments.find(a=>a.id===id);
  if(e.target.closest('[data-action="delete-assignment"]')){
    assignments = assignments.filter(a=>a.id!==id);
  } else if(e.target.closest('[data-action="toggle-ms"]')){
    const msItem = e.target.closest('.ms-item');
    const msId = msItem.dataset.ms;
    const m = a.milestones.find(m=>m.id===msId);
    if(m) m.done = !m.done;
  } else return;
  renderAssignments(); renderMiniDeadlines(); renderJourneyProgress();
  await saveAssignments();
});

/* ============================================================
   CALENDÁRIO
============================================================ */
let calYear = 2026, calMonth = 7; // Agosto (0-indexed) — dentro do semestre
const eventsByDate = {};
events.forEach(([date,cat,text])=>{ (eventsByDate[date] = eventsByDate[date]||[]).push({cat,text}); });

function renderCalendar(){
  document.getElementById('calTitle').textContent = `${monthNames[calMonth]} ${calYear}`;
  const grid = document.getElementById('calGrid');
  const dows = ['D','S','T','Q','Q','S','S'];
  let html = dows.map(d=>`<div class="cal-dow">${d}</div>`).join('');
  const first = new Date(calYear, calMonth, 1);
  const startOffset = first.getDay();
  const daysInMonth = new Date(calYear, calMonth+1, 0).getDate();
  const todayStr = todayISO();
  for(let i=0;i<startOffset;i++) html += '<div class="cal-day empty"></div>';
  for(let d=1; d<=daysInMonth; d++){
    const iso = `${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const isToday = iso===todayStr;
    const dayEvents = eventsByDate[iso] || [];
    const dots = dayEvents.slice(0,4).map(e=>`<span style="background:${catColor[e.cat]}"></span>`).join('');
    html += `<div class="cal-day ${isToday?'today':''}" title="${dayEvents.map(e=>e.text).join(' | ').replace(/"/g,'&quot;')}">
      <div>${d}</div><div class="cal-dots">${dots}</div>
    </div>`;
  }
  grid.innerHTML = html;
}
document.getElementById('calPrev').addEventListener('click', ()=>{
  calMonth--; if(calMonth<0){calMonth=11; calYear--;} renderCalendar();
});
document.getElementById('calNext').addEventListener('click', ()=>{
  calMonth++; if(calMonth>11){calMonth=0; calYear++;} renderCalendar();
});

let activeFilter = 'all';
function renderTimeline(){
  const filtered = events.filter(e=> activeFilter==='all' || e[1]===activeFilter);
  const el = document.getElementById('timeline');
  el.innerHTML = filtered.map(([date,cat,text])=>`
    <div class="tl-item">
      <div class="tl-date">${fmtDDMM(date)}</div>
      <div class="tl-dot" style="background:${catColor[cat]}"></div>
      <div class="tl-text"><span class="badge" style="background:${catColor[cat]}22;color:${catColor[cat]}">${catLabel[cat]}</span>${text}</div>
    </div>`).join('') || '<div class="empty-state">Nada por aqui.</div>';
}
document.getElementById('filterRow').addEventListener('click', e=>{
  const btn = e.target.closest('button'); if(!btn) return;
  document.querySelectorAll('#filterRow button').forEach(b=>b.classList.remove('on'));
  btn.classList.add('on'); activeFilter = btn.dataset.cat; renderTimeline();
});

/* ============================================================
   ANOTAÇÕES
============================================================ */
let notes = [];
let noteFilterSubject = 'all';
let noteFavOnly = false;
let selectedNoteIds = new Set();

async function loadNotes(){
  try{ const r = await remoteStorage.get('notes-list'); notes = r? JSON.parse(r.value):[]; }
  catch(e){ notes = []; }
  renderNotes();
}
async function saveNotes(){
  try{ await remoteStorage.set('notes-list', JSON.stringify(notes)); }catch(e){}
}
function renderNotes(){
  selectedNoteIds = new Set([...selectedNoteIds].filter(id=>notes.some(n=>n.id===id)));
  let list = [...notes];
  if(noteFilterSubject!=='all') list = list.filter(n=>n.subject===noteFilterSubject);
  if(noteFavOnly) list = list.filter(n=>n.favorite);
  list.sort((a,b)=> b.date.localeCompare(a.date));
  const grid = document.getElementById('notesGrid');
  if(!list.length){ grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1;">Nenhuma anotação por aqui ainda ✦</div>'; return; }
  grid.innerHTML = list.map(n=>{
    const subj = subjects.find(s=>s.code===n.subject);
    return `<div class="note-card" style="background:${subj?subj.bg:'var(--bg-soft)'};color:${subj?subj.fg:'var(--text)'}" data-id="${n.id}">
      <div class="note-subject" style="display:flex;justify-content:space-between;align-items:center;">
        <span>${subj?subj.code:'geral'}</span>
        <label style="font-size:11px;display:flex;align-items:center;gap:5px;">
          <input type="checkbox" class="note-select" ${selectedNoteIds.has(n.id)?'checked':''}> selecionar
        </label>
      </div>
      <div class="note-text">${escapeHtml(n.text)}</div>
      <div class="note-foot">
        <span class="note-date">${fmtDDMM(n.date)}</span>
        <span>
          <button class="note-star" data-action="fav">${n.favorite?'⭐':'☆'}</button>
          <button class="note-del" data-action="del">✕</button>
        </span>
      </div>
    </div>`;
  }).join('');
}
document.getElementById('noteAddBtn').addEventListener('click', async ()=>{
  const ta = document.getElementById('noteText');
  const text = ta.value.trim();
  if(!text) return;
  notes.push({ id:uid(), subject:document.getElementById('noteSubject').value, text, favorite:false, date:todayISO() });
  ta.value='';
  renderNotes(); await saveNotes();
});
document.getElementById('noteFilterSubject').addEventListener('change', e=>{ noteFilterSubject = e.target.value; renderNotes(); });
document.getElementById('noteFavFilter').addEventListener('click', e=>{
  noteFavOnly = !noteFavOnly;
  e.target.classList.toggle('on', noteFavOnly);
  renderNotes();
});
document.getElementById('notesGrid').addEventListener('click', async e=>{
  const card = e.target.closest('.note-card'); if(!card) return;
  const id = card.dataset.id;
  const n = notes.find(n=>n.id===id);
  if(e.target.closest('.note-select')){
    if(e.target.checked) selectedNoteIds.add(id); else selectedNoteIds.delete(id);
    return;
  }
  if(e.target.closest('[data-action="fav"]')) n.favorite = !n.favorite;
  else if(e.target.closest('[data-action="del"]')) { notes = notes.filter(n=>n.id!==id); selectedNoteIds.delete(id); }
  else return;
  renderNotes(); await saveNotes();
});


document.getElementById('noteDeleteSelected').addEventListener('click', async ()=>{
  if(!selectedNoteIds.size){ showToast('Selecione pelo menos uma anotação.'); return; }
  if(!confirm(`Apagar ${selectedNoteIds.size} anotação(ões) selecionada(s)?`)) return;
  notes = notes.filter(n=>!selectedNoteIds.has(n.id));
  selectedNoteIds.clear();
  renderNotes();
  await saveNotes();
  showToast('Anotações selecionadas apagadas. ✦');
});
document.getElementById('noteDeleteAll').addEventListener('click', async ()=>{
  if(!notes.length){ showToast('Não há anotações para apagar.'); return; }
  if(!confirm('Apagar todas as anotações? Essa ação não pode ser desfeita.')) return;
  notes = [];
  selectedNoteIds.clear();
  renderNotes();
  await saveNotes();
  showToast('Todas as anotações foram apagadas. ✦');
});

/* ============================================================
   PLAYLIST — YouTube (vídeos, não YouTube Music)
============================================================ */
let playlistId = '';
async function loadPlaylist(){
  try{ const r = await remoteStorage.get('youtube-playlist'); playlistId = r? r.value : ''; }
  catch(e){ playlistId = ''; }
  document.getElementById('playlistInput').value = '';
  renderPlaylist();
}
async function savePlaylist(){
  try{ await remoteStorage.set('youtube-playlist', playlistId); }catch(e){}
}
function extractYoutubePlaylistId(input){
  const trimmed = input.trim();
  const match = trimmed.match(/[?&]list=([a-zA-Z0-9_-]+)/);
  if(match) return match[1];
  if(/^[a-zA-Z0-9_-]{10,}$/.test(trimmed)) return trimmed; // colou só o ID
  return null;
}
function renderPlaylist(){
  const frameWrap = document.getElementById('playlistFrame');
  const mini = document.getElementById('playlistMini');
  if(!playlistId){
    frameWrap.innerHTML = '<div class="playlist-empty">Cole o link de uma playlist pública de vídeos do YouTube acima 🎬</div>';
    mini.innerHTML = '<div class="empty-state">Nenhuma playlist salva ainda.</div>';
    return;
  }
  const src = `https://www.youtube.com/embed/videoseries?list=${playlistId}`;
  frameWrap.innerHTML = `<iframe src="${src}" height="380" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen loading="lazy"></iframe>`;
  mini.innerHTML = `<iframe src="${src}" height="160" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen loading="lazy" style="width:100%;border-radius:12px;border:none;"></iframe>`;
}
document.getElementById('playlistSaveBtn').addEventListener('click', async ()=>{
  const val = document.getElementById('playlistInput').value.trim();
  const id = extractYoutubePlaylistId(val);
  if(!id) return;
  playlistId = id;
  renderPlaylist(); await savePlaylist();
});

/* ============================================================
   HÁBITOS
============================================================ */
let habitNames = [];
let habitChecks = {};
const weekDows = ['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'];

function getWeekKey(){
  const now = new Date();
  const day = (now.getDay()+6)%7; // 0=Mon
  const monday = new Date(now); monday.setDate(now.getDate()-day);
  return monday.toISOString().slice(0,10);
}
async function loadHabits(){
  try{ const r = await remoteStorage.get('habits-config'); habitNames = r? JSON.parse(r.value): ['Fui à aula','Estudei um pouco','Revisei anotações','Bebi água']; }
  catch(e){ habitNames = ['Fui à aula','Estudei um pouco','Revisei anotações','Bebi água']; }
  try{ const r2 = await remoteStorage.get('habits-checks:'+getWeekKey()); habitChecks = r2? JSON.parse(r2.value): {}; }
  catch(e){ habitChecks = {}; }
  renderHabitTable(); renderHabitToday(); renderJourneyProgress();
}
async function saveHabitNames(){ try{ await remoteStorage.set('habits-config', JSON.stringify(habitNames)); }catch(e){} }
async function saveHabitChecks(){ try{ await remoteStorage.set('habits-checks:'+getWeekKey(), JSON.stringify(habitChecks)); }catch(e){} }

function renderHabitTable(){
  const table = document.getElementById('habitTable');
  let html = '<tr><th>Hábito</th>' + weekDows.map(d=>`<th>${d}</th>`).join('') + '<th></th></tr>';
  habitNames.forEach((name, hi)=>{
    html += `<tr><td>${escapeHtml(name)}</td>`;
    for(let di=0; di<7; di++){
      const key = hi+'-'+di;
      const on = !!habitChecks[key];
      html += `<td><div class="habit-check ${on?'on':''}" data-key="${key}">${on?'✓':''}</div></td>`;
    }
    html += `<td><button class="habit-del" data-habit="${hi}">✕</button></td></tr>`;
  });
  table.innerHTML = html;
}
function renderHabitToday(){
  const now = new Date();
  const di = (now.getDay()+6)%7;
  const el = document.getElementById('habitToday');
  if(!habitNames.length){ el.innerHTML='<div class="empty-state">Adicione hábitos na aba Hábitos.</div>'; return; }
  el.innerHTML = habitNames.map((name,hi)=>{
    const key = hi+'-'+di;
    const on = !!habitChecks[key];
    return `<div class="qt-item ${on?'done':''}" data-key="${key}">
      <div class="qt-check ${on?'on':''}" data-action="toggle-habit-today">${on?'✓':''}</div>
      <div class="qt-text">${escapeHtml(name)}</div>
    </div>`;
  }).join('');
}
document.getElementById('habitTable').addEventListener('click', async e=>{
  const check = e.target.closest('.habit-check');
  const del = e.target.closest('.habit-del');
  if(check){
    const key = check.dataset.key;
    habitChecks[key] = !habitChecks[key];
    renderHabitTable(); renderHabitToday();
    await saveHabitChecks();
  } else if(del){
    const hi = parseInt(del.dataset.habit,10);
    habitNames.splice(hi,1);
    // reindex checks
    const newChecks = {};
    Object.keys(habitChecks).forEach(k=>{
      const [oi,di] = k.split('-').map(Number);
      if(oi<hi) newChecks[k]=habitChecks[k];
      else if(oi>hi) newChecks[(oi-1)+'-'+di]=habitChecks[k];
    });
    habitChecks = newChecks;
    renderHabitTable(); renderHabitToday();
    await saveHabitNames(); await saveHabitChecks();
  }
});
document.getElementById('habitToday').addEventListener('click', async e=>{
  const item = e.target.closest('.qt-item'); if(!item) return;
  const key = item.dataset.key;
  habitChecks[key] = !habitChecks[key];
  renderHabitTable(); renderHabitToday(); renderJourneyProgress();
  await saveHabitChecks();
});
document.getElementById('habitAddBtn').addEventListener('click', async ()=>{
  const input = document.getElementById('habitInput');
  const name = input.value.trim();
  if(!name) return;
  habitNames.push(name); input.value='';
  renderHabitTable(); renderHabitToday(); renderJourneyProgress();
  await saveHabitNames();
});
document.getElementById('habitInput').addEventListener('keydown', e=>{ if(e.key==='Enter') document.getElementById('habitAddBtn').click(); });

/* ============================================================
   MEU PROGRESSO — imita o painel da faculdade
============================================================ */

/* mensagens engraçadas / motivacionais ao marcar aula ou atividade */
const hypeMessages = [
  'Mandou bem! 🎉 Mais um passo pra frente.',
  'Isso aí! Seu cérebro agradece o esforço 🧠✨',
  'Boa! Bora manter esse ritmo 🚀',
  'Confesso que fiquei orgulhoso(a) de você 🥹',
  'Passo a passo se chega longe, e você tá indo 👣',
  'Ihul! Progresso registrado com sucesso 📈',
  'Vai que é sua, campeã(ão)! 🏆',
  'Uma aula/atividade a menos entre você e a formatura 🎓',
  'Isso é disciplina! Continue assim 💪',
  'Cadê a faculdade que reclamava que você tava enrolando? Não existe mais 😎',
  'Toma essa, procrastinação! 🥊',
  'Seu eu do futuro tá muito feliz agora mesmo 🌟',
];
const completeMessages = [
  '🎊 MATÉRIA CONCLUÍDA! Você é uma lenda.',
  '🥳 Acabou! Agora é só comemorar (e descansar um pouco).',
  '🏁 Chegou na linha de chegada dessa matéria. Aplausos!',
];
function randomFrom(arr){ return arr[Math.floor(Math.random()*arr.length)]; }

function showToast(msg){
  const host = document.getElementById('toastHost');
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  host.appendChild(el);
  requestAnimationFrame(()=> el.classList.add('show'));
  setTimeout(()=>{
    el.classList.remove('show');
    setTimeout(()=> el.remove(), 300);
  }, 3200);
}

/* metas por matéria, com base no Calendário Acadêmico 2026.2 */
const subjectGoals = {
  VIV0106: { label:'Provas TEAMS (AV/AVS)', date:'2026-11-23' },
  VIV0481: { label:'Provas TEAMS (AV/AVS)', date:'2026-11-23' },
  VIV0727: { label:'Provas TEAMS (AV/AVS)', date:'2026-11-23' },
  VIV0750: { label:'Provas TEAMS (AV/AVS)', date:'2026-11-23' },
  ARA6403: { label:'Prova AV on-line', date:'2026-09-29' },
  ARA1739: { label:'Prova AV on-line', date:'2026-09-29' },
};
const SEMESTER_END = '2026-12-08';

const defaultProgress = {
  VIV0106: { aulas:0, aulasTotal:5,  ativ:0, ativTotal:4,  updated:0 },
  VIV0481: { aulas:0, aulasTotal:5,  ativ:0, ativTotal:3,  updated:0 },
  VIV0727: { aulas:0, aulasTotal:5,  ativ:0, ativTotal:4,  updated:0 },
  VIV0750: { aulas:0, aulasTotal:12, ativ:0, ativTotal:10, updated:0 },
  ARA6403: { aulas:1, aulasTotal:4,  ativ:0, ativTotal:4,  updated:0 },
  ARA1739: { aulas:1, aulasTotal:7,  ativ:0, ativTotal:5,  updated:0 },
};

let courseProgress = {};

async function loadCourseProgress(){
  try{
    const r = await remoteStorage.get('course-progress');
    courseProgress = r ? JSON.parse(r.value) : JSON.parse(JSON.stringify(defaultProgress));
  }catch(e){
    courseProgress = JSON.parse(JSON.stringify(defaultProgress));
  }
  // garante que matérias padrão e novas entrem com valores padrão
  Object.keys(defaultProgress).forEach(code=>{
    if(!courseProgress[code]) courseProgress[code] = {...defaultProgress[code]};
  });
  subjects.forEach(s=>{
    if(!courseProgress[s.code]) courseProgress[s.code] = newSubjectProgress();
    const p = courseProgress[s.code];
    if(p.aulasTotal !== null && !Number.isFinite(Number(p.aulasTotal))) p.aulasTotal = null;
    if(p.ativTotal !== null && !Number.isFinite(Number(p.ativTotal))) p.ativTotal = null;
    if(!Number.isFinite(Number(p.aulas))) p.aulas = 0;
    if(!Number.isFinite(Number(p.ativ))) p.ativ = 0;
    if(p.aulasTotal !== null && p.aulasTotal < 0) p.aulasTotal = 0;
    if(p.ativTotal !== null && p.ativTotal < 0) p.ativTotal = 0;
  });
  renderProgressPage();
  renderJourneyProgress();
}
async function saveCourseProgress(){
  try{ await remoteStorage.set('course-progress', JSON.stringify(courseProgress)); }catch(e){}
}

function progressPct(p){
  let done = 0, total = 0;
  if(Number.isFinite(Number(p.aulasTotal))){ done += Math.min(p.aulas, p.aulasTotal); total += p.aulasTotal; }
  if(Number.isFinite(Number(p.ativTotal))){ done += Math.min(p.ativ, p.ativTotal); total += p.ativTotal; }
  if(total===0) return 0;
  return Math.round((done / total) * 100);
}
function progressHasKnownTotal(p){
  return Number.isFinite(Number(p.aulasTotal)) || Number.isFinite(Number(p.ativTotal));
}
function progressDisplay(p){
  const known=[];
  if(Number.isFinite(Number(p.aulasTotal))) known.push(`${p.aulas}/${p.aulasTotal} aulas`);
  else known.push(`${p.aulas} aulas registradas`);
  if(Number.isFinite(Number(p.ativTotal))) known.push(`${p.ativ}/${p.ativTotal} atividades`);
  else known.push(`${p.ativ} atividades registradas`);
  return known.join(' · ');
}
function daysUntil(dateISO){
  const d = Math.round((new Date(dateISO+'T00:00:00') - new Date(new Date().toDateString()))/86400000);
  return d;
}
function fmtGoalDays(dateISO){
  const d = daysUntil(dateISO);
  if(d<0) return 'prazo passou';
  if(d===0) return 'é hoje!';
  return `faltam ${d} dias`;
}

function renderSemesterCountdown(){
  const d = daysUntil(SEMESTER_END);
  document.getElementById('semesterCountdown').textContent =
    d>=0 ? `⏳ faltam ${d} dias para o fim do semestre` : '🎓 semestre encerrado';
}

function renderContinueCard(){
  const el = document.getElementById('continueCard');
  const candidates = subjects
    .filter(s=>courseProgress[s.code])
    .map(s=>({s, p:courseProgress[s.code], pct:progressPct(courseProgress[s.code])}))
    .filter(c=>c.pct<100);
  if(!candidates.length){
    el.innerHTML = `<div class="continue-card"><div><div class="cc-label">✦ Tudo em dia</div><h3>Todas as matérias concluídas!</h3><p>Você merece um descanso 🎉</p></div></div>`;
    return;
  }
  candidates.sort((a,b)=> (b.p.updated||0) - (a.p.updated||0) || a.pct - b.pct);
  const top = candidates[0];
  el.innerHTML = `<div class="continue-card">
    <div>
      <div class="cc-label">➤ Continue de onde parou</div>
      <h3>${top.s.name}</h3>
      <p>${top.pct}% concluído · ${progressDisplay(top.p)}</p>
    </div>
    <button class="cc-arrow" data-continue="${top.s.code}">→</button>
  </div>`;
}

function renderProgressGrid(){
  const grid = document.getElementById('progressGrid');
  grid.innerHTML = subjects.map(s=>{
    const p = courseProgress[s.code]; if(!p) return '';
    const pct = progressPct(p);
    const goal = subjectGoals[s.code];
    const aulasMax = Number.isFinite(Number(p.aulasTotal)) && p.aulas >= p.aulasTotal;
    const ativMax = Number.isFinite(Number(p.ativTotal)) && p.ativ >= p.ativTotal;
    return `<div class="prog-card" style="background:${s.bg};color:${s.fg};" data-code="${s.code}">
      <div class="pc-top">
        <span class="pc-type">${s.type==='online'?'Digital (EAD)':'Ao Vivo'}</span>
        <button class="pc-reset" data-action="reset-progress" title="Corrigir / zerar">↺</button>
      </div>
      <h3>${s.name}</h3>
      <div class="pc-bar"><div style="width:${pct}%"></div></div>
      <div class="pc-pct">${pct}%</div>
      ${goal ? `<div class="pc-goal">🎯 <span><strong>${goal.label}</strong> — ${fmtGoalDays(goal.date)} (${fmtDDMM(goal.date)})</span></div>` : '<div class="pc-goal">&nbsp;</div>'}
      <div class="pc-counts">
        <button class="pc-count-btn" data-action="inc-aula" ${aulasMax?'disabled':''}>+ Aula ${p.aulas}/${p.aulasTotal == null ? '?' : p.aulasTotal}</button>
        <button class="pc-count-btn" data-action="inc-ativ" ${ativMax?'disabled':''}>+ Ativ. ${p.ativ}/${p.ativTotal == null ? '?' : p.ativTotal}</button>
        <button class="pc-count-btn" data-action="undo-progress" ${!p.lastAction?'disabled':''} title="Desfazer o último registro">↶ Desfazer</button>
      </div>
    </div>`;
  }).join('');
}

function renderProgressPage(){
  renderSemesterCountdown();
  renderContinueCard();
  renderProgressGrid();
}

document.getElementById('progressGrid') && document.getElementById('progressGrid').addEventListener('click', async e=>{
  const card = e.target.closest('.prog-card'); if(!card) return;
  const code = card.dataset.code;
  const p = courseProgress[code];
  const action = e.target.closest('[data-action]')?.dataset.action;
  if(action==='inc-aula' && p.aulas < p.aulasTotal){
    p.aulas++; p.lastAction = 'aula'; p.updated = Date.now();
    finishCheck(p, code);
  } else if(action==='inc-ativ' && p.ativ < p.ativTotal){
    p.ativ++; p.lastAction = 'ativ'; p.updated = Date.now();
    finishCheck(p, code);
  } else if(action==='undo-progress'){
    if(p.lastAction==='aula' && p.aulas>0) p.aulas--;
    else if(p.lastAction==='ativ' && p.ativ>0) p.ativ--;
    else { showToast('Não há registro recente para desfazer.'); return; }
    p.lastAction = null; p.updated = Date.now();
    showToast('Último registro desfeito. ✦');
  } else if(action==='reset-progress'){
    if(confirm('Zerar todo o progresso desta matéria?')){
      p.aulas = 0; p.ativ = 0; p.lastAction = null; p.updated = Date.now();
      renderProgressPage(); await saveCourseProgress();
    }
    return;
  } else return;
  renderProgressPage(); renderJourneyProgress();
  await saveCourseProgress();
});

function finishCheck(p, code){
  const pct = progressPct(p);
  if(pct>=100) showToast(randomFrom(completeMessages));
  else showToast(randomFrom(hypeMessages));
}

document.getElementById('continueCard').addEventListener('click', e=>{
  const btn = e.target.closest('[data-continue]'); if(!btn) return;
  document.querySelector('.rail button[data-page="progresso"]').click();
});

/* ============================================================
   UTILITÁRIO COMPARTILHADO — toast genérico de progresso
============================================================ */
function genericFinishCheck(pct){
  if(pct>=100) showToast(randomFrom(completeMessages));
  else showToast(randomFrom(hypeMessages));
}


/* ============================================================
   JORNADA — progresso geral do Prisma
   O percentual considera apenas coisas que existem e que podem
   ser concluídas. Adicionar algo cria trabalho; marcar como feito
   aumenta a evolução.
============================================================ */
function renderJourneyProgress(){
  const pctEl = document.getElementById('journeyPct');
  if(!pctEl) return;

  let totalUnits = 0, doneUnits = 0;

  // Estudos: aulas + atividades das matérias
  let studyTotal = 0, studyDone = 0;
  Object.values(courseProgress || {}).forEach(p=>{
    const aulasTotal = Number(p.aulasTotal || 0);
    const ativTotal = Number(p.ativTotal || 0);
    studyTotal += aulasTotal + ativTotal;
    studyDone += Math.min(Number(p.aulas || 0), aulasTotal) +
                 Math.min(Number(p.ativ || 0), ativTotal);
  });
  const studyPct = studyTotal ? Math.round((studyDone / studyTotal) * 100) : 0;
  if(studyTotal){ totalUnits += studyTotal; doneUnits += studyDone; }

  // Projetos: etapas definidas no painel de projetos
  let projectTotal = 0, projectDone = 0;
  Object.values(projProgress || {}).forEach(p=>{
    const t = Number(p.total || 0);
    const d = Math.min(Number(p.done || 0), t);
    projectTotal += t;
    projectDone += d;
  });
  if(projectTotal){ totalUnits += projectTotal; doneUnits += projectDone; }

  // Tarefas rápidas
  const allTasks = [...(quickTasks || []), ...(projTasks || [])];
  const taskTotal = allTasks.length;
  const taskDone = allTasks.filter(t=>t.done).length;
  if(taskTotal){ totalUnits += taskTotal; doneUnits += taskDone; }

  // Trabalhos e entregas: cada marco é uma unidade
  let deliverTotal = 0, deliverDone = 0;
  [...(assignments || []), ...(projDeliverables || [])].forEach(a=>{
    (a.milestones || []).forEach(m=>{
      deliverTotal++;
      if(m.done) deliverDone++;
    });
  });
  if(deliverTotal){ totalUnits += deliverTotal; doneUnits += deliverDone; }

  // Hábitos de hoje
  const di = (new Date().getDay() + 6) % 7;
  const habitTotal = (habitNames || []).length;
  let habitDone = 0;
  (habitNames || []).forEach((_,hi)=>{
    if(habitChecks && habitChecks[hi+'-'+di]) habitDone++;
  });
  if(habitTotal){ totalUnits += habitTotal; doneUnits += habitDone; }

  const overall = totalUnits ? Math.round((doneUnits / totalUnits) * 100) : 0;

  // Pendências: somente itens concretos registrados e ainda não concluídos.
  const pendingQuick = (quickTasks || []).filter(t=>!t.done).length;
  const pendingProjTasks = (projTasks || []).filter(t=>!t.done).length;
  const pendingAssignments = (assignments || []).filter(a=>{
    const ms = a.milestones || [];
    return ms.length ? ms.some(m=>!m.done) : true;
  }).length;
  const pendingProjDeliverables = (projDeliverables || []).filter(a=>{
    const ms = a.milestones || [];
    return ms.length ? ms.some(m=>!m.done) : true;
  }).length;
  const pendingProjects = (projects || []).filter(p=>p.status!=='concluido').length;
  const pending = pendingQuick + pendingProjTasks + pendingAssignments +
                  pendingProjDeliverables + pendingProjects;

  pctEl.textContent = `${overall}%`;

  const fill = document.getElementById('journeyProgressFill');
  if(fill) fill.style.width = `${overall}%`;

  const pendingEl = document.getElementById('journeyPending');
  if(pendingEl) pendingEl.textContent = pending;

  const studiesEl = document.getElementById('journeyStudies');
  if(studiesEl) studiesEl.textContent = `${studyPct}%`;

  const habitsEl = document.getElementById('journeyHabits');
  if(habitsEl) habitsEl.textContent = `${habitDone}/${habitTotal}`;

  const readingsEl = document.getElementById('journeyReadings');
  if(readingsEl) readingsEl.textContent =
    String((readings || []).filter(r=>!r.done).length);

  // Frases oficiais da evolução do Prisma.
  const journeyPhrases = {
    start: 'Nada registrado ainda. O caos está surpreendentemente organizado.',
    early: 'Estamos chegando em algum lugar. Ninguém sabe exatamente onde ainda.',
    middle: 'Mais da metade. Agora seria constrangedor desistir.',
    late: 'Está tão perto que até dá para fingir que foi planejado.',
    complete: 'Você fez tudo. Agora pode fingir que foi fácil.'
  };

  const statusEl = document.getElementById('journeyStatus');
  if(statusEl){
    let status;

    if(overall <= 24){
      status = journeyPhrases.start;
    }else if(overall <= 49){
      status = journeyPhrases.early;
    }else if(overall <= 74){
      status = journeyPhrases.middle;
    }else if(overall <= 99){
      status = journeyPhrases.late;
    }else{
      status = journeyPhrases.complete;
    }

    statusEl.textContent = status;
  }
}
async function registerJourneySnapshot(){
  const entry = {
    id: uid(),
    at: Date.now(),
    note: 'Registro de evolução',
    percentage: document.getElementById('journeyPct')?.textContent || '0%',
    pending: Number(document.getElementById('journeyPending')?.textContent || 0)
  };
  try{
    const r = await remoteStorage.get('evolution-log');
    const log = r ? JSON.parse(r.value) : [];
    log.unshift(entry);
    await remoteStorage.set('evolution-log', JSON.stringify(log.slice(0,100)));
    showToast('Evolução registrada. ✦');
  }catch(e){
    showToast('Evolução atualizada nesta sessão. ✦');
  }
}

document.getElementById('journeyAction')?.addEventListener('click', registerJourneySnapshot);

/* ============================================================
   PAINEL DE PROJETOS
============================================================ */
let projects = [];
let projTasks = [];
let projDeliverables = [];
let projNotes = [];
let projProgress = {};
let projModalStatus = 'ativo';
const projStatusLabel = {ativo:'Ativo', pausado:'Pausado', concluido:'Concluído'};

async function loadProjects(){
  try{ const r = await remoteStorage.get('proj-list'); projects = r? JSON.parse(r.value):[]; }
  catch(e){ projects = []; }
  populateProjectSelects();
  renderProjGrid();
  renderHomeProjects();
  renderHomeAlerts();
}
async function saveProjects(){ try{ await remoteStorage.set('proj-list', JSON.stringify(projects)); }catch(e){} }
async function loadProjProgress(){
  try{ const r = await remoteStorage.get('proj-progress'); projProgress = r? JSON.parse(r.value):{}; }
  catch(e){ projProgress = {}; }
}
async function saveProjProgress(){ try{ await remoteStorage.set('proj-progress', JSON.stringify(projProgress)); }catch(e){} }
async function initProjWorkspace(){
  await Promise.all([loadProjects(), loadProjProgress()]);
  renderProjProgressGrid();
  renderProjContinueCard();
  renderHomeProjects();
  renderJourneyProgress();
}

function populateProjectSelects(){
  const opts = projects.map(p=>`<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('');
  document.getElementById('projAsProject').innerHTML = opts;
  document.getElementById('projNoteProject').innerHTML = opts;
  document.getElementById('projNoteFilterProject').innerHTML = '<option value="all">Todos os projetos</option>' + opts;
}
function renderProjGrid(){
  const grid = document.getElementById('projGrid');
  const cards = projects.map((p,idx)=>{
    const c = dynColor(idx);
    return `<div class="course-card dyn-card" style="background:${c.bg};color:${c.fg};">
      <button class="dyn-del" data-del-proj="${p.id}">✕</button>
      <div class="cc-icon">💼</div>
      <h3>${escapeHtml(p.name)}</h3>
      <div class="cc-meta">${escapeHtml(p.client||'—')}</div>
      <div class="status-pill">${projStatusLabel[p.status]||p.status}</div>
    </div>`;
  }).join('');
  grid.innerHTML = cards + `<div class="add-item-card" id="projAddCard">+ Novo projeto</div>`;
}
document.getElementById('projGrid').addEventListener('click', async e=>{
  const del = e.target.closest('[data-del-proj]');
  if(del){
    if(confirm('Excluir este projeto? Entregas e anotações vinculadas continuam salvas, mas somem dos filtros.')){
      const id = del.dataset.delProj;
      projects = projects.filter(p=>p.id!==id);
      delete projProgress[id];
      renderProjGrid(); populateProjectSelects(); renderProjProgressGrid(); renderProjContinueCard();
      await saveProjects(); await saveProjProgress();
    }
    return;
  }
  if(e.target.closest('#projAddCard')) openProjModal();
});
function openProjModal(){
  document.getElementById('projModalName').value='';
  document.getElementById('projModalClient').value='';
  document.getElementById('projModalSteps').value=10;
  projModalStatus='ativo';
  document.querySelectorAll('#projModalStatusRow button').forEach(b=>b.classList.toggle('on', b.dataset.status==='ativo'));
  document.getElementById('projModalOverlay').classList.add('show');
}
document.getElementById('projModalStatusRow').addEventListener('click', e=>{
  const btn = e.target.closest('button'); if(!btn) return;
  projModalStatus = btn.dataset.status;
  document.querySelectorAll('#projModalStatusRow button').forEach(b=>b.classList.remove('on'));
  btn.classList.add('on');
});
document.getElementById('projModalCancel').addEventListener('click', ()=> document.getElementById('projModalOverlay').classList.remove('show'));
document.getElementById('projModalSave').addEventListener('click', async ()=>{
  const name = document.getElementById('projModalName').value.trim();
  if(!name) return;
  const client = document.getElementById('projModalClient').value.trim();
  const steps = Math.max(1, parseInt(document.getElementById('projModalSteps').value,10)||10);
  const id = uid();
  projects.push({id, name, client, status:projModalStatus});
  projProgress[id] = {done:0, total:steps, updated:0};
  document.getElementById('projModalOverlay').classList.remove('show');
  renderProjGrid(); populateProjectSelects(); renderProjProgressGrid(); renderProjContinueCard();
  await saveProjects(); await saveProjProgress();
});

function projProgressPct(p){ if(!p || !p.total) return 0; return Math.round((p.done/p.total)*100); }
function renderProjContinueCard(){
  const el = document.getElementById('projContinueCard');
  const candidates = projects
    .filter(p=>projProgress[p.id] && p.status!=='concluido')
    .map(p=>({p, prog:projProgress[p.id], pct:projProgressPct(projProgress[p.id])}))
    .filter(c=>c.pct<100);
  if(!candidates.length){
    el.innerHTML = `<div class="continue-card"><div><div class="cc-label">✦ Tudo em dia</div><h3>Nenhum projeto ativo em andamento</h3><p>Crie um novo projeto para começar 🎉</p></div></div>`;
    return;
  }
  candidates.sort((a,b)=>(b.prog.updated||0)-(a.prog.updated||0) || a.pct-b.pct);
  const top = candidates[0];
  el.innerHTML = `<div class="continue-card">
    <div>
      <div class="cc-label">➤ Continue de onde parou</div>
      <h3>${escapeHtml(top.p.name)}</h3>
      <p>${top.pct}% concluído · ${top.prog.done}/${top.prog.total} etapas</p>
    </div>
    <button class="cc-arrow" data-continue-proj="${top.p.id}">→</button>
  </div>`;
}
document.getElementById('projContinueCard').addEventListener('click', e=>{
  if(e.target.closest('[data-continue-proj]')) document.querySelector('.rail button[data-page="proj-progresso"]').click();
});
function renderProjProgressGrid(){
  const grid = document.getElementById('projProgressGrid');
  if(!projects.length){ grid.innerHTML = '<div class="empty-state">Nenhum projeto cadastrado ainda.</div>'; return; }
  grid.innerHTML = projects.map((p,idx)=>{
    const c = dynColor(idx);
    const prog = projProgress[p.id] || {done:0,total:10,updated:0};
    const pct = projProgressPct(prog);
    const max = prog.done>=prog.total;
    return `<div class="prog-card" style="background:${c.bg};color:${c.fg};" data-proj="${p.id}">
      <div class="pc-top">
        <span class="pc-type">${projStatusLabel[p.status]||p.status}</span>
        <button class="pc-reset" data-action="reset-proj-progress" title="Zerar">↺</button>
      </div>
      <h3>${escapeHtml(p.name)}</h3>
      <div class="pc-bar"><div style="width:${pct}%"></div></div>
      <div class="pc-pct">${pct}%</div>
      <div class="pc-counts">
        <button class="pc-count-btn" data-action="inc-proj-step" ${max?'disabled':''}>✅ ${prog.done}/${prog.total}</button>
        <button class="pc-main-btn" data-action="inc-proj-step" title="Marcar etapa concluída" ${max?'disabled':''}>→</button>
      </div>
    </div>`;
  }).join('');
}
document.getElementById('projProgressGrid').addEventListener('click', async e=>{
  const card = e.target.closest('.prog-card'); if(!card) return;
  const id = card.dataset.proj;
  const prog = projProgress[id]; if(!prog) return;
  const action = e.target.closest('[data-action]')?.dataset.action;
  if(action==='inc-proj-step' && prog.done<prog.total){
    prog.done++; prog.updated = Date.now();
    genericFinishCheck(projProgressPct(prog));
  } else if(action==='reset-proj-progress'){
    if(confirm('Zerar o progresso deste projeto?')){ prog.done=0; prog.updated=Date.now(); }
    else return;
  } else return;
  renderProjProgressGrid(); renderProjContinueCard(); renderJourneyProgress();
  await saveProjProgress();
});

async function loadProjTasks(){
  try{ const r = await remoteStorage.get('proj-quicktasks'); projTasks = r? JSON.parse(r.value):[]; }
  catch(e){ projTasks = []; }
  renderProjTasks();
}
async function saveProjTasks(){ try{ await remoteStorage.set('proj-quicktasks', JSON.stringify(projTasks)); }catch(e){} }
function renderProjTasks(){
  const list = document.getElementById('projQtList');
  if(!projTasks.length){ list.innerHTML = '<div class="empty-state">Nenhuma tarefa por aqui ✦</div>'; return; }
  const sorted = [...projTasks].sort((a,b)=>(a.done-b.done));
  list.innerHTML = sorted.map(t=>`
    <div class="qt-item ${t.done?'done':''}" data-id="${t.id}">
      <div class="qt-check ${t.done?'on':''}" data-action="toggle">${t.done?'✓':''}</div>
      <div class="qt-text">${escapeHtml(t.text)}</div>
      <button class="qt-del" data-action="delete">✕</button>
    </div>`).join('');
}
document.getElementById('projQtAddBtn').addEventListener('click', async ()=>{
  const input = document.getElementById('projQtInput');
  const text = input.value.trim(); if(!text) return;
  projTasks.push({id:uid(), text, done:false}); input.value='';
  renderProjTasks(); await saveProjTasks();
});
document.getElementById('projQtInput').addEventListener('keydown', e=>{ if(e.key==='Enter') document.getElementById('projQtAddBtn').click(); });
document.getElementById('projQtList').addEventListener('click', async e=>{
  const item = e.target.closest('.qt-item'); if(!item) return;
  const id = item.dataset.id;
  const action = e.target.closest('[data-action]')?.dataset.action;
  if(action==='toggle'){ const t=projTasks.find(t=>t.id===id); if(t) t.done=!t.done; }
  else if(action==='delete'){ projTasks = projTasks.filter(t=>t.id!==id); }
  renderProjTasks(); await saveProjTasks();
});

async function loadProjDeliverables(){
  try{ const r = await remoteStorage.get('proj-deliverables'); projDeliverables = r? JSON.parse(r.value):[]; }
  catch(e){ projDeliverables = []; }
  renderProjDeliverables(); renderProjMiniDeadlines();
}
async function saveProjDeliverables(){ try{ await remoteStorage.set('proj-deliverables', JSON.stringify(projDeliverables)); }catch(e){} }
function renderProjDeliverables(){
  const wrap = document.getElementById('projAssignList');
  if(!projDeliverables.length){ wrap.innerHTML = '<div class="empty-state">Nenhuma entrega cadastrada ainda. Crie a primeira acima ✦</div>'; return; }
  const sorted = [...projDeliverables].sort((a,b)=>a.due.localeCompare(b.due));
  wrap.innerHTML = sorted.map(a=>{
    const done = a.milestones.filter(m=>m.done).length;
    const total = a.milestones.length;
    const progress = Math.round((done/total)*100);
    const u = urgencyInfo(a.due, progress);
    const proj = projects.find(p=>p.id===a.project);
    return `<div class="assign-card" data-id="${a.id}">
      <div class="assign-top">
        <div>
          <p class="assign-title">${a.type==='reuniao'?'🗓️':'📦'} ${escapeHtml(a.title)}</p>
          <div class="assign-meta">${proj?escapeHtml(proj.name):'—'} · entrega ${fmtDDMM(a.due)}</div>
        </div>
        <div style="display:flex;align-items:center;gap:8px;">
          <span class="urgency ${u.cls}">${u.label}</span>
          <button class="assign-del" data-action="delete-proj-assignment">✕</button>
        </div>
      </div>
      <div class="progress-bar"><div style="width:${progress}%"></div></div>
      <div class="milestones">
        ${a.milestones.map(m=>`
          <div class="ms-item ${m.done?'on':''}" data-ms="${m.id}">
            <div class="ms-check ${m.done?'on':''}" data-action="toggle-proj-ms">${m.done?'✓':''}</div>
            <span class="ms-label">${escapeHtml(m.label)}</span>
            <span class="ms-date">${fmtDDMM(m.date)}</span>
          </div>`).join('')}
      </div>
    </div>`;
  }).join('');
}
function renderProjMiniDeadlines(){
  const el = document.getElementById('projMiniDeadlines');
  const pending = projDeliverables
    .map(a=>{ const done=a.milestones.filter(m=>m.done).length; return {...a, progress:Math.round((done/a.milestones.length)*100)}; })
    .filter(a=>a.progress<100)
    .sort((a,b)=>a.due.localeCompare(b.due)).slice(0,3);
  if(!pending.length){ el.innerHTML = '<div class="empty-state">Nada urgente por aqui 🎉</div>'; return; }
  el.innerHTML = pending.map(a=>{
    const u = urgencyInfo(a.due, a.progress);
    const dotColor = u.cls==='u-atrasado'?'var(--coral)':u.cls==='u-urgente'?'var(--pink-soft)':u.cls==='u-embreve'?'var(--gold)':'var(--mint)';
    return `<div class="mini-deadline">
      <div class="dot" style="background:${dotColor}"></div>
      <div class="body">
        <div class="t">${escapeHtml(a.title)}</div>
        <div class="m">entrega ${fmtDDMM(a.due)} · ${u.label}</div>
        <div class="mini-bar"><div style="width:${a.progress}%"></div></div>
      </div>
    </div>`;
  }).join('');
}
document.getElementById('projAsAddBtn').addEventListener('click', async ()=>{
  const title = document.getElementById('projAsTitle').value.trim();
  const project = document.getElementById('projAsProject').value;
  const type = document.getElementById('projAsType').value;
  const due = document.getElementById('projAsDue').value;
  if(!title || !due || !project) return;
  projDeliverables.push({id:uid(), title, project, type, due, milestones:generateMilestones(due)});
  document.getElementById('projAsTitle').value='';
  document.getElementById('projAsDue').value='';
  renderProjDeliverables(); renderProjMiniDeadlines(); await saveProjDeliverables();
});
document.getElementById('projAssignList').addEventListener('click', async e=>{
  const card = e.target.closest('.assign-card'); if(!card) return;
  const id = card.dataset.id;
  const a = projDeliverables.find(a=>a.id===id);
  if(e.target.closest('[data-action="delete-proj-assignment"]')){
    projDeliverables = projDeliverables.filter(a=>a.id!==id);
  } else if(e.target.closest('[data-action="toggle-proj-ms"]')){
    const msItem = e.target.closest('.ms-item'); const msId = msItem.dataset.ms;
    const m = a.milestones.find(m=>m.id===msId); if(m) m.done=!m.done;
  } else return;
  renderProjDeliverables(); renderProjMiniDeadlines(); await saveProjDeliverables();
});

let projNoteFilterProject = 'all';
let projNoteFavOnly = false;
async function loadProjNotes(){
  try{ const r = await remoteStorage.get('proj-notes-list'); projNotes = r? JSON.parse(r.value):[]; }
  catch(e){ projNotes = []; }
  renderProjNotes();
}
async function saveProjNotesFn(){ try{ await remoteStorage.set('proj-notes-list', JSON.stringify(projNotes)); }catch(e){} }
function renderProjNotes(){
  let list = [...projNotes];
  if(projNoteFilterProject!=='all') list = list.filter(n=>n.project===projNoteFilterProject);
  if(projNoteFavOnly) list = list.filter(n=>n.favorite);
  list.sort((a,b)=>b.date.localeCompare(a.date));
  const grid = document.getElementById('projNotesGrid');
  if(!list.length){ grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1;">Nenhuma anotação por aqui ainda ✦</div>'; return; }
  grid.innerHTML = list.map(n=>{
    const proj = projects.find(p=>p.id===n.project);
    const idx = projects.findIndex(p=>p.id===n.project);
    const c = idx>=0 ? dynColor(idx) : {bg:'var(--bg-soft)', fg:'var(--text)'};
    return `<div class="note-card" style="background:${c.bg};color:${c.fg}" data-id="${n.id}">
      <div class="note-subject">${proj?escapeHtml(proj.name):'geral'}</div>
      <div class="note-text">${escapeHtml(n.text)}</div>
      <div class="note-foot">
        <span class="note-date">${fmtDDMM(n.date)}</span>
        <span>
          <button class="note-star" data-action="fav">${n.favorite?'⭐':'☆'}</button>
          <button class="note-del" data-action="del">✕</button>
        </span>
      </div>
    </div>`;
  }).join('');
}
document.getElementById('projNoteAddBtn').addEventListener('click', async ()=>{
  const ta = document.getElementById('projNoteText');
  const text = ta.value.trim(); if(!text) return;
  projNotes.push({id:uid(), project:document.getElementById('projNoteProject').value, text, favorite:false, date:todayISO()});
  ta.value=''; renderProjNotes(); await saveProjNotesFn();
});
document.getElementById('projNoteFilterProject').addEventListener('change', e=>{ projNoteFilterProject=e.target.value; renderProjNotes(); });
document.getElementById('projNoteFavFilter').addEventListener('click', e=>{
  projNoteFavOnly = !projNoteFavOnly; e.target.classList.toggle('on', projNoteFavOnly); renderProjNotes();
});
document.getElementById('projNotesGrid').addEventListener('click', async e=>{
  const card = e.target.closest('.note-card'); if(!card) return;
  const id = card.dataset.id;
  const n = projNotes.find(n=>n.id===id);
  if(e.target.closest('[data-action="fav"]')) n.favorite=!n.favorite;
  else if(e.target.closest('[data-action="del"]')) projNotes = projNotes.filter(n=>n.id!==id);
  else return;
  renderProjNotes(); await saveProjNotesFn();
});

/* ============================================================
   PAINEL DE LEITURAS
============================================================ */

/* ============================================================
   HOME — LEITURAS E PROJETOS EM ANDAMENTO
============================================================ */
function renderHomeReadings(){
  const list = document.getElementById('homeReadingsList');
  const count = document.getElementById('homeReadingsCount');
  if(!list || !count) return;

  const active = (readings || [])
    .filter(r => r.status === 'lendo')
    .sort((a,b) => (b.updated||0) - (a.updated||0));

  count.textContent = active.length;

  if(!active.length){
    list.innerHTML = `
      <div class="home-empty">
        <span>📖</span>
        <div>
          <strong>Nenhuma leitura em andamento.</strong>
          <small>Quando você começar uma, ela aparece aqui.</small>
        </div>
      </div>`;
    return;
  }

  list.innerHTML = active.slice(0,4).map(r=>{
    const pct = leitPct(r);
    return `
      <div class="home-progress-item">
        <div class="home-progress-top">
          <div class="home-progress-title">
            <strong>${escapeHtml(r.title)}</strong>
            <small>${escapeHtml(r.author || '—')} · Lendo</small>
          </div>
          <strong class="home-progress-pct">${pct}%</strong>
        </div>
        <div class="home-progress-bar"><div style="width:${pct}%"></div></div>
      </div>`;
  }).join('');
}

function renderHomeProjects(){
  const list = document.getElementById('homeProjectsList');
  const count = document.getElementById('homeProjectsCount');
  if(!list || !count) return;

  const active = (projects || [])
    .filter(p => p.status !== 'concluido')
    .map(p=>{
      const prog = projProgress[p.id] || {done:0,total:10,updated:0};
      return {p, prog, pct: projProgressPct(prog)};
    })
    .sort((a,b) => {
      if((a.prog.updated||0) !== (b.prog.updated||0)){
        return (b.prog.updated||0) - (a.prog.updated||0);
      }
      return a.pct - b.pct;
    });

  count.textContent = active.length;

  if(!active.length){
    list.innerHTML = `
      <div class="home-empty">
        <span>💼</span>
        <div>
          <strong>Nenhum projeto em andamento.</strong>
          <small>Quando você criar um, ele aparece aqui.</small>
        </div>
      </div>`;
    return;
  }

  list.innerHTML = active.slice(0,4).map(({p,prog,pct})=>`
    <div class="home-progress-item">
      <div class="home-progress-top">
        <div class="home-progress-title">
          <strong>${escapeHtml(p.name)}</strong>
          <small>${escapeHtml(p.client||'Projeto')} · ${prog.done}/${prog.total} etapas</small>
        </div>
        <strong class="home-progress-pct">${pct}%</strong>
      </div>
      <div class="home-progress-bar"><div style="width:${pct}%"></div></div>
    </div>
  `).join('');
}

let readings = [];
let leitTasks = [];
let leitNotes = [];
let leitModalStatus = 'quero-ler';
const leitStatusLabel = {'quero-ler':'Quero ler', lendo:'Lendo', concluido:'Concluído', pausado:'Pausado'};
const leitTypeIcon = {livro:'📖', artigo:'📰', podcast:'🎧', curso:'🎓', video:'🎬'};

async function loadReadings(){
  try{ const r = await remoteStorage.get('leit-list'); readings = r? JSON.parse(r.value):[]; }
  catch(e){ readings = []; }
  populateReadingSelects();
  renderLeitGrid();
  renderLeitProgressGrid();
  renderLeitContinueCard();
  renderLeitQueue();
  updateLeitStatsChip();
  renderHomeReadings();
}
async function saveReadings(){ try{ await remoteStorage.set('leit-list', JSON.stringify(readings)); }catch(e){} }

function populateReadingSelects(){
  const opts = readings.map(r=>`<option value="${r.id}">${escapeHtml(r.title)}</option>`).join('');
  document.getElementById('leitNoteReading').innerHTML = opts;
  document.getElementById('leitNoteFilterReading').innerHTML = '<option value="all">Todas as leituras</option>' + opts;
}
function leitPct(r){ if(!r.pagesTotal) return 0; return Math.min(100, Math.round((r.pagesCurrent/r.pagesTotal)*100)); }
function updateLeitStatsChip(){
  const lendo = readings.filter(r=>r.status==='lendo').length;
  const concluido = readings.filter(r=>r.status==='concluido').length;
  const fila = readings.filter(r=>r.status==='quero-ler').length;
  document.getElementById('leitStatsChip').textContent = `📖 ${lendo} lendo · ✅ ${concluido} concluídos · 🗂️ ${fila} na fila`;
}
function renderLeitGrid(){
  const grid = document.getElementById('leitGrid');
  const cards = readings.map((r,idx)=>{
    const c = dynColor(idx);
    const pct = leitPct(r);
    const rating = r.rating||0;
    const stars = '★★★★★'.slice(0,rating) + '☆☆☆☆☆'.slice(0,5-rating);
    return `<div class="course-card dyn-card" style="background:${c.bg};color:${c.fg};min-height:130px;">
      <button class="dyn-del" data-del-leit="${r.id}">✕</button>
      <div class="cc-icon">${leitTypeIcon[r.type]||'📖'}</div>
      <h3>${escapeHtml(r.title)}</h3>
      <div class="cc-meta">${escapeHtml(r.author||'—')}</div>
      <div class="status-pill">${leitStatusLabel[r.status]||r.status}</div>
      <div class="pc-bar" style="margin-top:4px;"><div style="width:${pct}%"></div></div>
      <div class="stars" data-rate="${r.id}" title="Clique para avaliar">${stars}</div>
    </div>`;
  }).join('');
  grid.innerHTML = cards + `<div class="add-item-card" id="leitAddCard">+ Nova leitura</div>`;
}
document.getElementById('leitGrid').addEventListener('click', async e=>{
  const del = e.target.closest('[data-del-leit]');
  if(del){
    if(confirm('Excluir esta leitura?')){
      readings = readings.filter(r=>r.id!==del.dataset.delLeit);
      renderLeitGrid(); populateReadingSelects(); renderLeitProgressGrid(); renderLeitContinueCard(); renderLeitQueue(); updateLeitStatsChip();
      await saveReadings();
    }
    return;
  }
  const star = e.target.closest('[data-rate]');
  if(star){
    const rect = star.getBoundingClientRect();
    const starWidth = rect.width/5;
    const rating = Math.max(1, Math.min(5, Math.ceil((e.clientX-rect.left)/starWidth)));
    const r = readings.find(r=>r.id===star.dataset.rate);
    if(r){ r.rating = rating; renderLeitGrid(); await saveReadings(); }
    return;
  }
  if(e.target.closest('#leitAddCard')) openLeitModal();
});
function openLeitModal(){
  document.getElementById('leitModalTitle').value='';
  document.getElementById('leitModalAuthor').value='';
  document.getElementById('leitModalType').value='livro';
  document.getElementById('leitModalTotal').value=200;
  leitModalStatus='quero-ler';
  document.querySelectorAll('#leitModalStatusRow button').forEach(b=>b.classList.toggle('on', b.dataset.status==='quero-ler'));
  document.getElementById('leitModalOverlay').classList.add('show');
}
document.getElementById('leitModalStatusRow').addEventListener('click', e=>{
  const btn = e.target.closest('button'); if(!btn) return;
  leitModalStatus = btn.dataset.status;
  document.querySelectorAll('#leitModalStatusRow button').forEach(b=>b.classList.remove('on'));
  btn.classList.add('on');
});
document.getElementById('leitModalCancel').addEventListener('click', ()=> document.getElementById('leitModalOverlay').classList.remove('show'));
document.getElementById('leitModalSave').addEventListener('click', async ()=>{
  const title = document.getElementById('leitModalTitle').value.trim();
  if(!title) return;
  const author = document.getElementById('leitModalAuthor').value.trim();
  const type = document.getElementById('leitModalType').value;
  const pagesTotal = Math.max(1, parseInt(document.getElementById('leitModalTotal').value,10)||200);
  readings.push({id:uid(), title, author, type, status:leitModalStatus, pagesCurrent:0, pagesTotal, rating:0, updated:0});
  document.getElementById('leitModalOverlay').classList.remove('show');
  renderLeitGrid(); populateReadingSelects(); renderLeitProgressGrid(); renderLeitContinueCard(); renderLeitQueue(); updateLeitStatsChip();
  await saveReadings();
});
function renderLeitContinueCard(){
  const el = document.getElementById('leitContinueCard');
  const candidates = readings.filter(r=>r.status==='lendo' && leitPct(r)<100);
  if(!candidates.length){
    el.innerHTML = `<div class="continue-card"><div><div class="cc-label">✦ Nada em andamento</div><h3>Nenhuma leitura ativa agora</h3><p>Adicione uma leitura e marque como "Lendo" 📚</p></div></div>`;
    return;
  }
  candidates.sort((a,b)=>(b.updated||0)-(a.updated||0));
  const top = candidates[0];
  const pct = leitPct(top);
  el.innerHTML = `<div class="continue-card">
    <div>
      <div class="cc-label">➤ Continue lendo</div>
      <h3>${escapeHtml(top.title)}</h3>
      <p>${pct}% · ${top.pagesCurrent}/${top.pagesTotal} páginas</p>
    </div>
    <button class="cc-arrow" data-continue-leit="${top.id}">→</button>
  </div>`;
}
document.getElementById('leitContinueCard').addEventListener('click', e=>{
  if(e.target.closest('[data-continue-leit]')) document.querySelector('.rail button[data-page="leit-progresso"]').click();
});
function renderLeitQueue(){
  const el = document.getElementById('leitQueueList');
  const queue = readings.filter(r=>r.status==='quero-ler');
  if(!queue.length){ el.innerHTML = '<div class="empty-state">Fila vazia — adicione algo na aba Leituras ✦</div>'; return; }
  el.innerHTML = queue.map(r=>`
    <div class="mini-deadline">
      <div class="dot" style="background:var(--sky)"></div>
      <div class="body">
        <div class="t">${escapeHtml(r.title)}</div>
        <div class="m">${escapeHtml(r.author||'—')} · ${leitTypeIcon[r.type]||''} ${r.type}</div>
      </div>
    </div>`).join('');
}
function renderLeitProgressGrid(){
  const grid = document.getElementById('leitProgressGrid');
  const active = readings.filter(r=>r.status!=='concluido');
  if(!active.length){ grid.innerHTML = '<div class="empty-state">Nenhuma leitura em progresso.</div>'; return; }
  grid.innerHTML = active.map((r)=>{
    const idx = readings.indexOf(r);
    const c = dynColor(idx);
    const pct = leitPct(r);
    const max = r.pagesCurrent>=r.pagesTotal;
    return `<div class="prog-card" style="background:${c.bg};color:${c.fg};" data-leit="${r.id}">
      <div class="pc-top">
        <span class="pc-type">${leitStatusLabel[r.status]||r.status}</span>
        <button class="pc-reset" data-action="reset-leit-progress" title="Zerar">↺</button>
      </div>
      <h3>${escapeHtml(r.title)}</h3>
      <div class="pc-bar"><div style="width:${pct}%"></div></div>
      <div class="pc-pct">${pct}%</div>
      <div class="pc-counts">
        <button class="pc-count-btn" data-action="dec-leit-page">−10</button>
        <button class="pc-count-btn" data-action="inc-leit-page" ${max?'disabled':''}>📖 ${r.pagesCurrent}/${r.pagesTotal}</button>
        <button class="pc-main-btn" data-action="inc-leit-page" title="+10 páginas" ${max?'disabled':''}>→</button>
      </div>
    </div>`;
  }).join('');
}
document.getElementById('leitProgressGrid').addEventListener('click', async e=>{
  const card = e.target.closest('.prog-card'); if(!card) return;
  const id = card.dataset.leit;
  const r = readings.find(r=>r.id===id); if(!r) return;
  const action = e.target.closest('[data-action]')?.dataset.action;
  if(action==='inc-leit-page'){
    r.pagesCurrent = Math.min(r.pagesTotal, r.pagesCurrent+10); r.updated = Date.now();
    if(r.pagesCurrent>=r.pagesTotal) r.status='concluido';
    genericFinishCheck(leitPct(r));
  } else if(action==='dec-leit-page'){
    r.pagesCurrent = Math.max(0, r.pagesCurrent-10); r.updated = Date.now();
  } else if(action==='reset-leit-progress'){
    if(confirm('Zerar o progresso desta leitura?')){ r.pagesCurrent=0; r.updated=Date.now(); }
    else return;
  } else return;
  renderLeitProgressGrid(); renderLeitContinueCard(); renderLeitGrid(); updateLeitStatsChip();
  await saveReadings();
});

async function loadLeitTasks(){
  try{ const r = await remoteStorage.get('leit-quicktasks'); leitTasks = r? JSON.parse(r.value):[]; }
  catch(e){ leitTasks = []; }
  renderLeitTasks();
}
async function saveLeitTasks(){ try{ await remoteStorage.set('leit-quicktasks', JSON.stringify(leitTasks)); }catch(e){} }
function renderLeitTasks(){
  const list = document.getElementById('leitQtList');
  if(!leitTasks.length){ list.innerHTML = '<div class="empty-state">Nada por aqui ✦</div>'; return; }
  const sorted = [...leitTasks].sort((a,b)=>(a.done-b.done));
  list.innerHTML = sorted.map(t=>`
    <div class="qt-item ${t.done?'done':''}" data-id="${t.id}">
      <div class="qt-check ${t.done?'on':''}" data-action="toggle">${t.done?'✓':''}</div>
      <div class="qt-text">${escapeHtml(t.text)}</div>
      <button class="qt-del" data-action="delete">✕</button>
    </div>`).join('');
}
document.getElementById('leitQtAddBtn').addEventListener('click', async ()=>{
  const input = document.getElementById('leitQtInput');
  const text = input.value.trim(); if(!text) return;
  leitTasks.push({id:uid(), text, done:false}); input.value='';
  renderLeitTasks(); await saveLeitTasks();
});
document.getElementById('leitQtInput').addEventListener('keydown', e=>{ if(e.key==='Enter') document.getElementById('leitQtAddBtn').click(); });
document.getElementById('leitQtList').addEventListener('click', async e=>{
  const item = e.target.closest('.qt-item'); if(!item) return;
  const id = item.dataset.id;
  const action = e.target.closest('[data-action]')?.dataset.action;
  if(action==='toggle'){ const t=leitTasks.find(t=>t.id===id); if(t) t.done=!t.done; }
  else if(action==='delete'){ leitTasks = leitTasks.filter(t=>t.id!==id); }
  renderLeitTasks(); await saveLeitTasks();
});

let leitNoteFilterReading = 'all';
let leitNoteFavOnly = false;
async function loadLeitNotes(){
  try{ const r = await remoteStorage.get('leit-notes-list'); leitNotes = r? JSON.parse(r.value):[]; }
  catch(e){ leitNotes = []; }
  renderLeitNotes();
}
async function saveLeitNotesFn(){ try{ await remoteStorage.set('leit-notes-list', JSON.stringify(leitNotes)); }catch(e){} }
function renderLeitNotes(){
  let list = [...leitNotes];
  if(leitNoteFilterReading!=='all') list = list.filter(n=>n.reading===leitNoteFilterReading);
  if(leitNoteFavOnly) list = list.filter(n=>n.favorite);
  list.sort((a,b)=>b.date.localeCompare(a.date));
  const grid = document.getElementById('leitNotesGrid');
  if(!list.length){ grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1;">Nenhuma anotação por aqui ainda ✦</div>'; return; }
  grid.innerHTML = list.map(n=>{
    const reading = readings.find(r=>r.id===n.reading);
    const idx = readings.findIndex(r=>r.id===n.reading);
    const c = idx>=0 ? dynColor(idx) : {bg:'var(--bg-soft)', fg:'var(--text)'};
    return `<div class="note-card" style="background:${c.bg};color:${c.fg}" data-id="${n.id}">
      <div class="note-subject">${reading?escapeHtml(reading.title):'geral'}</div>
      <div class="note-text">${escapeHtml(n.text)}</div>
      <div class="note-foot">
        <span class="note-date">${fmtDDMM(n.date)}</span>
        <span>
          <button class="note-star" data-action="fav">${n.favorite?'⭐':'☆'}</button>
          <button class="note-del" data-action="del">✕</button>
        </span>
      </div>
    </div>`;
  }).join('');
}
document.getElementById('leitNoteAddBtn').addEventListener('click', async ()=>{
  const ta = document.getElementById('leitNoteText');
  const text = ta.value.trim(); if(!text) return;
  leitNotes.push({id:uid(), reading:document.getElementById('leitNoteReading').value, text, favorite:false, date:todayISO()});
  ta.value=''; renderLeitNotes(); await saveLeitNotesFn();
});
document.getElementById('leitNoteFilterReading').addEventListener('change', e=>{ leitNoteFilterReading=e.target.value; renderLeitNotes(); });
document.getElementById('leitNoteFavFilter').addEventListener('click', e=>{
  leitNoteFavOnly = !leitNoteFavOnly; e.target.classList.toggle('on', leitNoteFavOnly); renderLeitNotes();
});
document.getElementById('leitNotesGrid').addEventListener('click', async e=>{
  const card = e.target.closest('.note-card'); if(!card) return;
  const id = card.dataset.id;
  const n = leitNotes.find(n=>n.id===id);
  if(e.target.closest('[data-action="fav"]')) n.favorite=!n.favorite;
  else if(e.target.closest('[data-action="del"]')) leitNotes = leitNotes.filter(n=>n.id!==id);
  else return;
  renderLeitNotes(); await saveLeitNotesFn();
});

/* chips de data dos novos painéis */
(function(){
  const now = new Date();
  const str = 'Hoje · ' + now.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric'});
  const a = document.getElementById('projTodayChip'); if(a) a.textContent = str;
  const b = document.getElementById('leitTodayChip'); if(b) b.textContent = str;
})();

/* ============================================================
   INIT
============================================================ */
async function initPrisma(){
  await loadSubjects();
  buildCourseGrid();
  buildWeekGrid();
  renderNextClass();
  populateSubjectSelects();
  renderCalendar();
  renderTimeline();
  loadQuickTasks();
  loadAssignments();
  loadNotes();
  loadPlaylist();
  loadHabits();
  loadCourseProgress();

  initProjWorkspace();
  loadProjTasks();
  loadProjDeliverables();
  loadProjNotes();

  loadReadings();
  loadLeitTasks();
  loadLeitNotes();

  initWorkspace();
  setTimeout(()=>{
    renderJourneyProgress();
    renderHomeReadings();
    renderHomeProjects();
  }, 1200);
}


/* ============================================================
   HOME MOBILE — navegação horizontal por telas
   Reorganiza apenas a apresentação da Home. Os IDs dos elementos
   permanecem os mesmos para não interferir na sincronização.
============================================================ */

/* ============================================================
   PRISMA — NOTIFICAÇÕES DO NAVEGADOR
============================================================ */
let prismaNotificationRegistration = null;

async function getPrismaNotificationRegistration(){
  if(!('serviceWorker' in navigator)) return null;

  try{
    if(!prismaNotificationRegistration){
      prismaNotificationRegistration =
        await navigator.serviceWorker.register('./sw.js?v=29g', {scope:'./'});
    }
    return await navigator.serviceWorker.ready;
  }catch(err){
    console.error('Prisma: não foi possível registrar o service worker.', err);
    return null;
  }
}

function updateNotificationStatus(){
  const status=document.getElementById('notificationStatus');
  const btn=document.getElementById('enableNotificationsBtn');
  const test=document.getElementById('testNotificationBtn');
  if(!status) return;

  if(!('Notification' in window)){
    status.textContent='Este navegador não oferece notificações.';
    if(btn) btn.disabled=true;
    if(test) test.disabled=true;
    return;
  }

  const permission=Notification.permission;

  if(permission==='granted'){
    status.textContent='Notificações ativadas. ✦';
    if(btn) btn.textContent='✓ Notificações ativas';
    if(test) test.disabled=false;
  }else if(permission==='denied'){
    status.textContent='Notificações bloqueadas no navegador. Reative-as nas configurações do site.';
    if(btn) btn.textContent='🔔 Ativar nas configurações';
    if(test) test.disabled=true;
  }else{
    status.textContent='O Prisma ainda não tem permissão para enviar notificações.';
    if(btn) btn.textContent='🔔 Ativar notificações';
    if(test) test.disabled=true;
  }
}

async function requestPrismaNotifications(){
  if(!('Notification' in window)){
    updateNotificationStatus();
    return;
  }

  try{
    // O registro acontece junto da ação do usuário.
    await getPrismaNotificationRegistration();

    const permission=await Notification.requestPermission();
    updateNotificationStatus();

    if(permission==='granted'){
      await showPrismaTestNotification();
    }
  }catch(err){
    console.error('Prisma: erro ao ativar notificações.',err);
    const status=document.getElementById('notificationStatus');
    if(status) status.textContent='Não consegui ativar a notificação. Tente novamente pelo aplicativo instalado.';
  }
}

async function showPrismaTestNotification(){
  if(!('Notification' in window) || Notification.permission!=='granted') return;

  try{
    const registration=await getPrismaNotificationRegistration();

    if(!registration){
      throw new Error('Service Worker indisponível.');
    }

    await registration.showNotification('Prisma', {
      body:'Você pediu uma notificação. Eu trouxe. O caos pode esperar um minuto.',
      tag:'prisma-test-notification',
      renotify:true,
      data:{url:'./'}
    });
  }catch(err){
    console.error('Prisma: erro ao mostrar notificação.',err);
    const status=document.getElementById('notificationStatus');
    if(status) status.textContent='A permissão foi concedida, mas o navegador não conseguiu exibir a notificação. Confirme que o Prisma está instalado na tela inicial.';
  }
}

function initPrismaNotifications(){
  // As notificações não aparecem mais no Início.
  // O teste fica disponível somente em Configurações.
  const testBtn = document.getElementById('settingsTestNotificationBtn');
  testBtn?.addEventListener('click', async ()=>{
    if('Notification' in window && Notification.permission !== 'granted'){
      await requestPrismaNotifications();
    }else{
      await showPrismaTestNotification();
    }
    updatePrismaSettingsNotificationStatus();
  });
  updatePrismaSettingsNotificationStatus();
}

function updatePrismaSettingsNotificationStatus(){
  const status = document.getElementById('notificationSettingsStatus');
  if(!status) return;

  if(!('Notification' in window)){
    status.textContent = 'Seu navegador não oferece notificações.';
    return;
  }

  const permission = Notification.permission;
  if(permission === 'granted'){
    status.textContent = '✓ Notificações permitidas neste navegador.';
  }else if(permission === 'denied'){
    status.textContent = 'Notificações bloqueadas. Reative nas configurações do navegador.';
  }else{
    status.textContent = 'Notificações ainda não autorizadas.';
  }
}


/* ============================================================
   PRISMA — ALERTAS E PRIORIDADE
============================================================ */
function prismaDaysUntil(v){
  if(!v) return null;
  const d=new Date(String(v).length<=10 ? v+'T00:00:00' : v);
  if(Number.isNaN(d.getTime())) return null;
  const t=new Date(); t.setHours(0,0,0,0); d.setHours(0,0,0,0);
  return Math.ceil((d-t)/86400000);
}
function prismaAlertLevel(days){
  if(days===null) return 'normal';
  if(days<=1) return 'urgent';
  if(days<=3) return 'high';
  if(days<=7) return 'medium';
  return 'normal';
}
function prismaAlertLabel(days){
  if(days===null) return 'sem prazo';
  if(days<0) return `atrasado ${Math.abs(days)}d`;
  if(days===0) return 'vence hoje';
  if(days===1) return 'vence amanhã';
  return `em ${days} dias`;
}
function buildPrismaAlerts(){
  const alerts=[];
  (assignments||[]).forEach(a=>{
    const ms=a.milestones||[];
    if(ms.length && !ms.some(m=>!m.done)) return;
    const days=prismaDaysUntil(a.due);
    alerts.push({title:a.title||'Trabalho',meta:`${a.subject||'Trabalho'} · ${prismaAlertLabel(days)}`,days,level:prismaAlertLevel(days),icon:'📋'});
  });
  (projects||[]).filter(p=>p.status!=='concluido').forEach(p=>{
    const ds=(projDeliverables||[]).filter(d=>d.projectId===p.id&&!d.done)
      .map(d=>({d,days:prismaDaysUntil(d.due)})).filter(x=>x.days!==null).sort((a,b)=>a.days-b.days);
    const days=ds.length?ds[0].days:prismaDaysUntil(p.due);
    alerts.push({title:ds.length?`${p.name} · ${ds[0].d.title||'entrega'}`:p.name,meta:`Projeto · ${prismaAlertLabel(days)}`,days,level:prismaAlertLevel(days),icon:'💼'});
  });
  (classes||[]).forEach(c=>{
    const days=prismaDaysUntil(c.date||c.day);
    if(!c.done && days===0) alerts.push({title:c.title||c.subject||'Aula hoje',meta:`Aula · hoje${c.time?' às '+c.time:''}`,days:0,level:'urgent',icon:'📚'});
  });
  (quickTasks||[]).forEach(t=>{
    if(t.done) return;
    const days=prismaDaysUntil(t.due||t.date);
    if(days!==null) alerts.push({title:t.text||t.title||'Tarefa rápida',meta:`Tarefa · ${prismaAlertLabel(days)}`,days,level:prismaAlertLevel(days),icon:'✓'});
  });
  return alerts.sort((a,b)=>(a.days??9999)-(b.days??9999));
}
function renderHomeAlerts(){
  const list=document.getElementById('homeAlertsList'), count=document.getElementById('homeAlertsCount');
  if(!list||!count) return;
  const alerts=buildPrismaAlerts();
  count.textContent=alerts.length;
  if(!alerts.length){
    list.innerHTML='<div class="home-empty"><span>😌</span><div><strong>Nenhum incêndio importante detectado.</strong><small>O Prisma continuará observando.</small></div></div>';
    return;
  }
  list.innerHTML=alerts.slice(0,6).map(a=>{
    const tone=a.level==='urgent'?'🔴':a.level==='high'?'🟠':a.level==='medium'?'🟡':'🟢';
    return `<div class="prisma-alert-row ${a.level}"><span class="prisma-alert-icon">${a.icon}</span><div class="prisma-alert-main"><strong>${escapeHtml(a.title)}</strong><small>${tone} ${escapeHtml(a.meta)}</small></div><span class="prisma-alert-days">${escapeHtml(prismaAlertLabel(a.days))}</span></div>`;
  }).join('');
}

function setupMobileHomeCarousel(){
  const page = document.getElementById('page-inicio');
  if(!page || page.dataset.mobileCarouselReady === '1') return;
  page.dataset.mobileCarouselReady = '1';

  const topbar = page.querySelector('.topbar');
  const journey = document.getElementById('journeyCard');
  const nextClass = document.getElementById('nextClassCard');
  const qtList = document.getElementById('qtList');
  const miniDeadlines = document.getElementById('miniDeadlines');
  const habitToday = document.getElementById('habitToday');
  const playlistMini = document.getElementById('playlistMini');
  const readingsCard = document.getElementById('homeReadingsCard');
  const projectsCard = document.getElementById('homeProjectsCard');

  if(!journey || !nextClass || !qtList || !miniDeadlines || !habitToday ||
     !playlistMini || !readingsCard || !projectsCard) return;

  const taskCard = qtList.closest('.card');
  const deadlineCard = miniDeadlines.closest('.card');
  const habitCard = habitToday.closest('.card');
  const playlistCard = playlistMini.closest('.card');

  if(!taskCard || !deadlineCard || !habitCard || !playlistCard) return;

  const oldGrids = [...page.querySelectorAll(':scope > .grid2')];
  const carousel = document.createElement('div');
  carousel.className = 'home-mobile-carousel';
  carousel.id = 'homeMobileCarousel';

  const makePanel = (name, ...items) => {
    const panel = document.createElement('section');
    panel.className = 'home-mobile-panel';
    panel.dataset.panel = name;
    items.forEach(item => panel.appendChild(item));
    return panel;
  };

  carousel.appendChild(makePanel('jornada', journey));
  carousel.appendChild(makePanel('hoje', nextClass, taskCard));
  carousel.appendChild(makePanel('prazos', deadlineCard));
  carousel.appendChild(makePanel('habitos', habitCard));
  carousel.appendChild(makePanel('playlist', playlistCard));
  carousel.appendChild(makePanel('leituras', readingsCard));
  carousel.appendChild(makePanel('projetos', projectsCard));
  const alertsCard=document.getElementById('homeAlertsCard');
  if(alertsCard) carousel.appendChild(makePanel('alertas', alertsCard));

  oldGrids.forEach(grid => grid.remove());
  topbar?.insertAdjacentElement('afterend', carousel);

  const dots = document.createElement('div');
  dots.className = 'home-mobile-dots';
  dots.setAttribute('aria-label','Navegação da página inicial');

  for(let i=0;i<8;i++){
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.className = 'home-mobile-dot' + (i===0?' on':'');
    dot.setAttribute('aria-label', `Tela ${i+1}`);
    dot.addEventListener('click', ()=>{
      const panel = carousel.children[i];
      if(panel) panel.scrollIntoView({behavior:'smooth', inline:'start', block:'nearest'});
    });
    dots.appendChild(dot);
  }
  carousel.insertAdjacentElement('afterend', dots);

  let ticking = false;
  carousel.addEventListener('scroll', ()=>{
    if(ticking) return;
    ticking = true;
    requestAnimationFrame(()=>{
      const index = Math.max(0, Math.min(7,
        Math.round(carousel.scrollLeft / Math.max(1, carousel.clientWidth))
      ));
      dots.querySelectorAll('.home-mobile-dot')
        .forEach((dot,i)=>dot.classList.toggle('on', i===index));
      ticking = false;
    });
  }, {passive:true});
}
setupMobileHomeCarousel();

initPrisma();


document.addEventListener('DOMContentLoaded', initPrismaNotifications);
