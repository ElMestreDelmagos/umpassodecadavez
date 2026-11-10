'use strict';
/* =====================================================================
   UM PASSO DE CADA VEZ — organização para pessoas com TDAH
   HTML + CSS + JavaScript puro. Dados salvos no localStorage.
   Seções deste arquivo:
   1. Estado e utilitários   5. Tarefas              9. Calendário
   2. Mensagens/avisos       6. Agenda e lembretes  10. Despejo mental
   3. Navegação e tema       7. Temporizador        11. Ações e eventos
   4. Início (dashboard)     8. Quebre sua tarefa   12. Inicialização
   ===================================================================== */

/* ---------- 1. ESTADO E UTILITÁRIOS ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const KEY = 'passoAPasso';
const DEF = { tasks: [], agenda: [], rem: [], proj: [], notes: [], checkins: {}, theme: null, timer: { f: 25, s: 5, l: 15 }, fired: [] };
let S;
try { S = { ...DEF, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch (e) { S = { ...DEF }; }
S.timer = { ...DEF.timer, ...S.timer };

const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* armazenamento indisponível */ } };
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const pad = n => String(n).padStart(2, '0');
const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const today = () => iso(new Date());
const fd = s => s ? s.split('-').reverse().join('/') : '';
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const PR = { alta: 'Alta', media: 'Média', baixa: 'Baixa' };
const PO = { alta: 0, media: 1, baixa: 2 };
const empty = t => `<li class="empty">${t}</li>`;

/* ---------- 2. MENSAGENS E AVISOS ---------- */
let toastTimer;
function toast(msg, undo) {
  const t = $('#toast');
  t.innerHTML = `<span>${esc(msg)}</span>`;
  if (undo) {
    const b = document.createElement('button');
    b.type = 'button'; b.textContent = 'Desfazer';
    b.onclick = () => { undo(); t.hidden = true; };
    t.append(b);
  }
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.hidden = true, undo ? 7000 : 3000);
}

/* Exclusão com confirmação e opção de desfazer (restaura o estado anterior) */
function del(fn, msg) {
  if (!confirm('Tem certeza que quer excluir?')) return;
  const snap = JSON.stringify(S);
  fn(); save(); render();
  toast(msg, () => { S = JSON.parse(snap); save(); render(); toast('Ação desfeita.'); });
}

function showAlert(title, text) {
  const d = document.createElement('div');
  d.className = 'alert';
  d.innerHTML = `<div><strong>${esc(title)}</strong><p>${esc(text)}</p></div><button class="sm" type="button" data-act="alertX">Ok</button>`;
  $('#alerts').append(d);
}

/* ---------- 3. NAVEGAÇÃO E TEMA ---------- */
const PAGES = ['inicio', 'agenda', 'tarefas', 'foco', 'quebre', 'calendario', 'despejo'];
let firstRoute = true;
function route() {
  const h = (location.hash || '#inicio').slice(1);
  const id = PAGES.includes(h) ? h : 'inicio';
  $$('.page').forEach(s => s.hidden = s.id !== id);
  $$('.side a').forEach(a => a.dataset.p === id ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current'));
  window.scrollTo(0, 0);
  if (!firstRoute) $('#' + id + ' h1').focus({ preventScroll: true });
  firstRoute = false;
}
const curTheme = () => S.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
function applyTheme() {
  const dark = curTheme() === 'dark';
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  const b = $('#themeBtn');
  b.setAttribute('aria-pressed', dark);
  b.innerHTML = dark ? '<i aria-hidden="true">☀️</i><span>Tema claro</span>' : '<i aria-hidden="true">🌙</i><span>Tema escuro</span>';
}

/* ---------- 4. INÍCIO (DASHBOARD) ---------- */
const MOODS = [
  ['😴', 'Muito cansado', 'Hoje pode ser um dia mais leve. Respeite seu ritmo.', 'Sugestão: comece pelas tarefas mais simples ou pela mais importante. O resto pode esperar.'],
  ['😔', 'Cansado', 'Faça o que conseguir, uma coisa de cada vez.', 'Sugestão: que tal escolher uma tarefa pequena para começar?'],
  ['🙂', 'Normal', 'Vamos organizar seu dia com tranquilidade.', 'Sugestão: escolha uma tarefa e use o temporizador de foco.'],
  ['😊', 'Disposto', 'Aproveite sua disposição para começar por algo importante.', 'Sugestão: bom momento para uma tarefa que exige mais concentração.'],
  ['🤩', 'Muito disposto', 'Ótimo! Organize suas prioridades e aproveite seu ritmo.', 'Sugestão: aproveite para avançar nas tarefas de prioridade alta.']
];
const QUOTES = ['Um passo de cada vez.', 'Você não precisa fazer tudo de uma vez.', 'Pequenos progressos também são progressos.', 'Vamos começar por algo simples?', 'Descansar também faz parte do caminho.', 'Seu ritmo é válido.'];
const dayTasks = () => S.tasks.filter(t => t.date ? t.date === today() : t.created === today());

function progMsg(p, n) {
  if (!n) return 'Quando quiser, adicione uma tarefa para o dia.';
  if (p >= 100) return 'Parabéns! Você concluiu seu planejamento de hoje!';
  if (p >= 75) return 'Está quase lá! Continue assim.';
  if (p >= 50) return 'Metade do caminho! Você está avançando.';
  if (p >= 25) return 'Você já começou! Continue no seu ritmo.';
  return 'Tudo bem começar devagar. Escolha uma pequena tarefa.';
}

function upcoming() {
  const now = `${today()}T${pad(new Date().getHours())}:${pad(new Date().getMinutes())}`;
  return [
    ...S.rem.map(r => ({ ...r, kind: '🔔' })),
    ...S.agenda.filter(a => !a.done).map(a => ({ ...a, kind: '🗓️' }))
  ].filter(x => `${x.date}T${x.time}` >= now)
    .sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`));
}


let dashMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
let dashSelectedDate = '';

function renderNextCalendar() {
  const root = $('#nextCalendar');
  if (!root) return;

  const year = dashMonth.getFullYear();
  const month = dashMonth.getMonth();
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  // Semana iniciando na segunda-feira.
  const offset = (first.getDay() + 6) % 7;
  const monthName = first.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const eventDates = new Set([
    ...S.agenda.filter(a => !a.done).map(a => a.date),
    ...S.rem.map(r => r.date)
  ]);

  let cells = '';
  for (let i = 0; i < offset; i++) cells += '<span class="nc-empty" aria-hidden="true"></span>';
  for (let day = 1; day <= daysInMonth; day++) {
    const date = iso(new Date(year, month, day));
    const classes = [
      'nc-day',
      date === today() ? 'is-today' : '',
      date === dashSelectedDate ? 'is-selected' : '',
      eventDates.has(date) ? 'has-event' : ''
    ].filter(Boolean).join(' ');
    cells += `<button type="button" class="${classes}" data-act="selectDashDate" data-id="${date}" aria-label="${day} ${monthName}${eventDates.has(date) ? ', tem compromisso' : ''}" aria-pressed="${date === dashSelectedDate}">
      <span>${day}</span>${eventDates.has(date) ? '<i aria-hidden="true"></i>' : ''}
    </button>`;
  }

  root.innerHTML = `
    <div class="nc-header">
      <button type="button" class="nc-nav" data-act="dashMonthPrev" aria-label="Mês anterior">‹</button>
      <strong>${monthName.charAt(0).toUpperCase() + monthName.slice(1)}</strong>
      <button type="button" class="nc-nav" data-act="dashMonthNext" aria-label="Próximo mês">›</button>
    </div>
    <div class="nc-grid nc-weekdays" aria-hidden="true">
      ${['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map(d => `<span>${d}</span>`).join('')}
    </div>
    <div class="nc-grid">${cells}</div>
    <p class="nc-legend"><span></span> Dia com compromisso</p>`;
}

function renderDash() {
  const now = new Date(), h = now.getHours();
  $('#greet').textContent = (h < 12 ? 'Bom dia! ' : h < 18 ? 'Boa tarde! ' : 'Boa noite! ') + 'Vamos organizar seu dia?';
  const ds = now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  $('#dateTxt').textContent = ds.charAt(0).toUpperCase() + ds.slice(1);

  // Check-in
  const lv = S.checkins[today()];
  $('#moods').innerHTML = MOODS.map((m, i) =>
    `<button type="button" class="mood" data-act="mood" data-id="${i}" aria-pressed="${lv === i}"><b aria-hidden="true">${m[0]}</b>${m[1]}</button>`).join('');
  $('#moodMsg').textContent = lv != null ? MOODS[lv][2] : 'Escolha como você se sente. Dá para mudar quando quiser.';
  $('#moodTip').textContent = lv != null ? MOODS[lv][3] : '';

  // Progresso diário
  const tt = dayTasks(), d = tt.filter(t => t.done).length, n = tt.length, p = n ? Math.round(d / n * 100) : 0;
  $('#progTxt').textContent = n ? `Você concluiu ${d} de ${n} tarefa${n > 1 ? 's' : ''}!` : 'Nenhuma tarefa para hoje ainda.';
  $('#progFill').style.width = p + '%';
  $('#progBar').setAttribute('aria-valuenow', p);
  $('#progPct').textContent = `Progresso: ${p}%`;
  $('#progMsg').textContent = progMsg(p, n);

  // Resumo
  const pend = S.tasks.filter(t => !t.done).length;
  $('#sum').innerHTML = `<div class="stat"><b>${d}</b><span>Concluídas hoje</span></div><div class="stat"><b>${n - d}</b><span>Pendentes hoje</span></div><div class="stat"><b>${pend}</b><span>Pendentes no total</span></div>`;

  // Calendário visual e próximos compromissos
  renderNextCalendar();
  const allUpcoming = upcoming();
  const nx = dashSelectedDate
    ? allUpcoming.filter(x => x.date === dashSelectedDate)
    : allUpcoming.slice(0, 4);
  $('#nextListTitle').textContent = dashSelectedDate
    ? `Compromissos de ${fd(dashSelectedDate)}`
    : 'Seus próximos compromissos';
  const clearDate = $('[data-act="clearDashDate"]');
  if (clearDate) clearDate.hidden = !dashSelectedDate;
  $('#next').innerHTML = nx.length ? nx.map(x =>
    `<li class="item"><span aria-hidden="true">${x.kind}</span><div class="grow"><strong>${esc(x.title)}</strong><p class="muted">${x.date === today() ? 'Hoje' : fd(x.date)} às ${x.time}</p></div></li>`).join('')
    : empty(dashSelectedDate ? 'Nenhum compromisso neste dia.' : 'Nenhum compromisso próximo. Dia tranquilo!');

  $('#quote').textContent = QUOTES[Math.floor(Date.now() / 864e5) % QUOTES.length];
}

/* ---------- 5. TAREFAS ---------- */
let dlgCtx = null;
let taskCategory = 'Geral';
function openTask(ctx) {
  dlgCtx = ctx;
  const f = $('#formTask').elements, t = ctx.task || {};
  $('#dlgTitle').textContent = ctx.heading;
  f.title.value = t.title || ctx.title || '';
  f.desc.value = t.desc || '';
  f.date.value = t.date || '';
  f.prio.value = t.prio || 'media';
  f.cat.value = t.cat || 'Pessoal';
  $('#dlg').showModal();
  f.title.focus();
}

function renderTasks() {
  const st = $('#fStatus').value, so = $('#fSort').value;
  let l = S.tasks.filter(t =>
    (taskCategory === 'Geral' || t.cat === taskCategory) &&
    (st === 'todas' || (st === 'pendentes' ? !t.done : t.done))
  );
  $$('.task-category').forEach(b => {
    const selected = b.dataset.cat === taskCategory;
    b.setAttribute('aria-selected', String(selected));
    b.classList.toggle('is-active', selected);
  });
  l.sort((a, b) => (a.done - b.done) ||
    (so === 'prioridade' ? PO[a.prio] - PO[b.prio] || (a.date || '9').localeCompare(b.date || '9')
      : (a.date || '9').localeCompare(b.date || '9') || PO[a.prio] - PO[b.prio]));
  $('#taskList').innerHTML = l.length ? l.map(t => `
    <li class="item ${t.done ? 'done' : ''}">
      <input type="checkbox" aria-label="Concluir: ${esc(t.title)}" data-chg="tTog" data-id="${t.id}" ${t.done ? 'checked' : ''}>
      <div class="grow"><strong>${esc(t.title)}</strong>${t.desc ? `<p class="muted">${esc(t.desc)}</p>` : ''}
        <p class="meta"><span class="tag p-${t.prio}">Prioridade ${PR[t.prio].toLowerCase()}</span><span class="tag">${esc(t.cat)}</span>${t.date ? `<span class="tag">📅 ${fd(t.date)}</span>` : ''}</p></div>
      <div class="acts"><button class="sm" type="button" data-act="tEdit" data-id="${t.id}" aria-label="Editar tarefa ${esc(t.title)}">Editar</button>
      <button class="sm del" type="button" data-act="tDel" data-id="${t.id}" aria-label="Excluir tarefa ${esc(t.title)}">Excluir</button></div>
    </li>`).join('') : empty('Nada por aqui. Vamos começar por algo simples?');
}

/* ---------- 6. AGENDA E LEMBRETES ---------- */
let agEdit = null, rmEdit = null;

function renderAgenda() {
  const day = $('#agView').value || today();
  const l = S.agenda.filter(a => a.date === day).sort((a, b) => a.time.localeCompare(b.time));
  $('#agList').innerHTML = l.length ? l.map(a => `
    <li class="item ${a.done ? 'done' : ''}">
      <input type="checkbox" aria-label="Concluir: ${esc(a.title)}" data-chg="agTog" data-id="${a.id}" ${a.done ? 'checked' : ''}>
      <span class="time">${a.time}</span>
      <div class="grow"><strong>${esc(a.title)}</strong>${a.desc ? `<p class="muted">${esc(a.desc)}</p>` : ''}</div>
      <div class="acts"><button class="sm" type="button" data-act="agEdit" data-id="${a.id}" aria-label="Editar ${esc(a.title)}">Editar</button>
      <button class="sm del" type="button" data-act="agDel" data-id="${a.id}" aria-label="Excluir ${esc(a.title)}">Excluir</button></div>
    </li>`).join('') : empty('Dia livre por enquanto. Sem pressa.');

  const r = [...S.rem].sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`));
  $('#rmList').innerHTML = r.length ? r.map(x => `
    <li class="item"><span aria-hidden="true">🔔</span>
      <div class="grow"><strong>${esc(x.title)}</strong><p class="muted">${fd(x.date)} às ${x.time}${x.desc ? ' — ' + esc(x.desc) : ''}</p></div>
      <div class="acts"><button class="sm" type="button" data-act="rmEdit" data-id="${x.id}" aria-label="Editar lembrete ${esc(x.title)}">Editar</button>
      <button class="sm del" type="button" data-act="rmDel" data-id="${x.id}" aria-label="Excluir lembrete ${esc(x.title)}">Excluir</button></div>
    </li>`).join('') : empty('Nenhum lembrete cadastrado.');
}

function resetAgForm() {
  agEdit = null; $('#formAg').reset(); $('#agDate').value = $('#agView').value || today();
  $('#agBtn').textContent = 'Adicionar'; $('#agFormTitle').textContent = 'Nova atividade'; $('#agCancel').hidden = true;
}
function resetRmForm() {
  rmEdit = null; $('#formRem').reset(); $('#rmDate').value = today();
  $('#rmBtn').textContent = 'Salvar lembrete'; $('#rmFormTitle').textContent = 'Novo lembrete'; $('#rmCancel').hidden = true;
}

/* Verifica a cada 20s se algum compromisso chegou na hora (aviso dentro do site) */
function checkAlerts() {
  const now = new Date(), nowS = `${today()}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
  const lim = new Date(now - 10 * 60000), limS = `${iso(lim)}T${pad(lim.getHours())}:${pad(lim.getMinutes())}`;
  let ch = false;
  [...S.rem.map(x => ({ ...x, t: 'Lembrete' })), ...S.agenda.filter(a => !a.done).map(x => ({ ...x, t: 'Agora na agenda' }))].forEach(x => {
    const dt = `${x.date}T${x.time}`, k = x.id + dt;
    if (dt <= nowS && dt >= limS && !S.fired.includes(k)) {
      S.fired.push(k); ch = true;
      showAlert(x.t + ': ' + x.title, `Às ${x.time}. ${x.desc || 'Um passo de cada vez.'}`);
    }
  });
  if (ch) { S.fired = S.fired.slice(-200); save(); }
  renderDash();
}

/* ---------- 7. TEMPORIZADOR ---------- */
const tm = { mode: 'f', left: S.timer.f * 60, run: false, end: 0, iv: null, cycles: 0 };
const dur = m => S.timer[m] * 60;
const MODE_NAME = { f: 'Foco', s: 'Pausa curta', l: 'Pausa longa' };

function drawTimer() {
  const t = `${pad(Math.floor(tm.left / 60))}:${pad(tm.left % 60)}`;
  $('#tmClock').textContent = t;
  $('#tmFill').style.width = (100 - tm.left / dur(tm.mode) * 100) + '%';
  $$('.tab').forEach(b => b.setAttribute('aria-pressed', b.dataset.m === tm.mode));
  document.title = tm.run ? `${t} · ${MODE_NAME[tm.mode]}` : 'Um passo de cada vez';
}
function tmPauseFn() { clearInterval(tm.iv); tm.run = false; drawTimer(); }
function tmSetMode(m) { tmPauseFn(); tm.mode = m; tm.left = dur(m); drawTimer(); }
function tmStartFn() {
  if (tm.run) return;
  if (tm.left <= 0) tm.left = dur(tm.mode);
  tm.end = Date.now() + tm.left * 1000; tm.run = true;
  tm.iv = setInterval(tmTick, 250);
  $('#tmMsg').textContent = tm.mode === 'f' ? 'Foco em andamento. Um passo de cada vez.' : 'Hora de descansar. Respire fundo.';
  drawTimer();
}
function tmTick() {
  tm.left = Math.max(0, Math.round((tm.end - Date.now()) / 1000));
  drawTimer();
  if (tm.left <= 0) tmFinish();
}
function tmFinish() {
  const wasFocus = tm.mode === 'f';
  let msg;
  if (wasFocus) { tm.cycles++; msg = 'Muito bem! Você concluiu um bloco de foco. Que tal uma pausa?'; tmSetMode(tm.cycles % 4 === 0 ? 'l' : 's'); }
  else { msg = 'Pausa concluída. Pronto para continuar, no seu ritmo?'; tmSetMode('f'); }
  $('#tmMsg').textContent = msg;
  showAlert(wasFocus ? 'Tempo de foco concluído' : 'Pausa concluída', msg);
}

/* ---------- 8. QUEBRE SUA TAREFA ---------- */
function renderProj() {
  $('#projList').innerHTML = S.proj.length ? S.proj.map(p => {
    const d = p.steps.filter(s => s.d).length, n = p.steps.length, pc = n ? Math.round(d / n * 100) : 0;
    return `<div class="card">
      <div class="proj-h"><h2>${esc(p.title)}</h2><div class="acts">
        <button class="sm" type="button" data-act="pEdit" data-id="${p.id}" aria-label="Renomear ${esc(p.title)}">Renomear</button>
        <button class="sm del" type="button" data-act="pDel" data-id="${p.id}" aria-label="Excluir ${esc(p.title)}">Excluir</button></div></div>
      <div class="bar" role="progressbar" aria-label="Progresso de ${esc(p.title)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pc}"><div style="width:${pc}%"></div></div>
      <p class="muted">${n ? `${d} de ${n} etapas concluídas (${pc}%)` : 'Comece por uma ação bem pequena, de 2 minutos.'}</p>
      <ul class="steps">${p.steps.map(s => `
        <li class="item ${s.d ? 'done' : ''}">
          <input type="checkbox" aria-label="Concluir etapa: ${esc(s.t)}" data-chg="sTog" data-id="${p.id}" data-sid="${s.id}" ${s.d ? 'checked' : ''}>
          <div class="grow"><strong>${esc(s.t)}</strong></div>
          <div class="acts"><button class="sm" type="button" data-act="sEdit" data-id="${p.id}" data-sid="${s.id}" aria-label="Editar etapa ${esc(s.t)}">Editar</button>
          <button class="sm del" type="button" data-act="sDel" data-id="${p.id}" data-sid="${s.id}" aria-label="Excluir etapa ${esc(s.t)}">Excluir</button></div>
        </li>`).join('')}</ul>
      <form class="add-step" data-form="step" data-id="${p.id}">
        <label class="sr" for="st-${p.id}">Nova etapa</label>
        <input id="st-${p.id}" type="text" required maxlength="100" placeholder="Próxima pequena etapa...">
        <button class="btn" type="submit">Adicionar etapa</button>
      </form></div>`;
  }).join('') : '<div class="card"><p class="empty">Nenhuma tarefa principal ainda. Escolha algo que parece grande e vamos dividir juntos.</p></div>';
}

/* ---------- 9. CALENDÁRIO MENSAL ---------- */
let calMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
let selectedCalDate = today();
const dateEvents = k => [
  ...S.agenda.filter(a => a.date === k).map(a => ({ time:a.time, kind:'a', done:a.done, title:a.title, label:'Compromisso' })),
  ...S.rem.filter(r => r.date === k).map(r => ({ time:r.time, kind:'r', done:false, title:r.title, label:'Lembrete' })),
  ...S.tasks.filter(t => t.date === k).map(t => ({ time:'', kind:'t', done:t.done, title:t.title, label:'Tarefa' }))
].sort((a,b) => (a.time || '99').localeCompare(b.time || '99'));
function renderCal() {
  const y=calMonth.getFullYear(), m=calMonth.getMonth();
  $('#calMonthTitle').textContent=calMonth.toLocaleDateString('pt-BR',{month:'long',year:'numeric'});
  $('#calRange').textContent='Seus dias, tarefas e compromissos em um só lugar';
  const first=new Date(y,m,1), offset=first.getDay(), count=new Date(y,m+1,0).getDate();
  const cells=[];
  for(let i=0;i<offset;i++) cells.push('<span class="month-empty" aria-hidden="true"></span>');
  for(let day=1;day<=count;day++){
    const d=new Date(y,m,day), k=iso(d), events=dateEvents(k);
    cells.push(`<button type="button" class="month-day ${k===today()?'is-today':''} ${k===selectedCalDate?'is-selected':''} ${events.length?'has-events':''}" data-cal-date="${k}" aria-pressed="${k===selectedCalDate}" aria-label="${d.toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long'})}, ${events.length} compromisso(s)"><span>${day}</span>${events.length?'<i></i>':''}</button>`);
  }
  $('#week').innerHTML=cells.join('');
  renderSelectedCalDay();
}
function renderSelectedCalDay(){
  const d=new Date(selectedCalDate+'T12:00:00');
  $('#selectedDateTitle').textContent=d.toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  const events=dateEvents(selectedCalDate);
  $('#selectedDayEvents').innerHTML=events.length?events.map(e=>`<article class="agenda-event ${e.kind} ${e.done?'done':''}"><span class="agenda-event-icon">${e.kind==='a'?'◷':e.kind==='r'?'♧':'✓'}</span><div><strong>${esc(e.title)}</strong><small>${e.time?esc(e.time)+' · ':''}${e.label}${e.done?' · Concluído':''}</small></div></article>`).join(''):'<div class="agenda-empty"><span>✦</span><strong>Dia livre por aqui</strong><p>Que tal aproveitar esse espaço para respirar ou planejar algo novo?</p></div>';
}
$('#week').addEventListener('click',e=>{
  const btn=e.target.closest('[data-cal-date]');
  if(!btn)return;
  selectedCalDate=btn.dataset.calDate;
  const d=new Date(selectedCalDate+'T12:00:00');
  calMonth=new Date(d.getFullYear(),d.getMonth(),1);
  renderCal();
});
/* ---------- 10. DESPEJO MENTAL ---------- */
let noteEdit = null;
const fdt = s => new Date(s).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
function addNote(text) {
  text = text.trim(); if (!text) return false;
  S.notes.unshift({ id: uid(), text, created: new Date().toISOString() });
  save(); renderNotes(); toast('Anotação salva.'); return true;
}
function renderNotes() {
  $('#noteList').innerHTML = S.notes.length ? S.notes.map(n => `
    <article class="note"><small>${fdt(n.created)}</small>
    ${noteEdit === n.id
      ? `<label class="sr" for="ed-${n.id}">Editar anotação</label><textarea id="ed-${n.id}" rows="4">${esc(n.text)}</textarea>
         <div class="acts"><button class="btn" type="button" data-act="nSave" data-id="${n.id}">Salvar</button><button class="btn ghost" type="button" data-act="nCancel">Cancelar</button></div>`
      : `<p>${esc(n.text)}</p>
         <div class="acts"><button class="sm" type="button" data-act="nTask" data-id="${n.id}">Virar tarefa</button><button class="sm" type="button" data-act="nEdit" data-id="${n.id}">Editar</button><button class="sm del" type="button" data-act="nDel" data-id="${n.id}">Excluir</button></div>`}
    </article>`).join('') : '<p class="empty">Sua caixa está vazia. Escreva o que vier à cabeça.</p>';
}

/* ---------- 11. AÇÕES E EVENTOS ---------- */
function render() { renderDash(); renderTasks(); renderAgenda(); renderProj(); renderCal(); renderNotes(); }

const find = (arr, id) => arr.find(x => x.id === id);
const ACT = {
  dashMonthPrev: () => { dashMonth = new Date(dashMonth.getFullYear(), dashMonth.getMonth() - 1, 1); renderDash(); },
  dashMonthNext: () => { dashMonth = new Date(dashMonth.getFullYear(), dashMonth.getMonth() + 1, 1); renderDash(); },
  selectDashDate: date => { dashSelectedDate = date; renderDash(); },
  clearDashDate: () => { dashSelectedDate = ''; renderDash(); },
  mood: id => { S.checkins[today()] = +id; save(); renderDash(); toast('Check-in salvo.'); },
  // tarefas
  tTog: id => { const t = find(S.tasks, id); t.done = !t.done; save(); render(); if (t.done) toast('Muito bem! Tarefa concluída.'); },
  tEdit: id => openTask({ task: find(S.tasks, id), heading: 'Editar tarefa' }),
  tDel: id => del(() => S.tasks = S.tasks.filter(x => x.id !== id), 'Tarefa excluída.'),
  // agenda
  agTog: id => { const a = find(S.agenda, id); a.done = !a.done; save(); render(); if (a.done) toast('Muito bem! Atividade concluída.'); },
  agEdit: id => {
    const a = find(S.agenda, id); agEdit = id;
    $('#agDate').value = a.date; $('#agTime').value = a.time; $('#agTitle').value = a.title; $('#agDesc').value = a.desc || '';
    $('#agBtn').textContent = 'Salvar alterações'; $('#agFormTitle').textContent = 'Editar atividade'; $('#agCancel').hidden = false;
    $('#agTitle').focus(); $('#formAg').scrollIntoView({ block: 'center' });
  },
  agDel: id => del(() => S.agenda = S.agenda.filter(x => x.id !== id), 'Atividade excluída.'),
  rmEdit: id => {
    const r = find(S.rem, id); rmEdit = id;
    $('#rmTitle').value = r.title; $('#rmDate').value = r.date; $('#rmTime').value = r.time; $('#rmDesc').value = r.desc || '';
    $('#rmBtn').textContent = 'Salvar alterações'; $('#rmFormTitle').textContent = 'Editar lembrete'; $('#rmCancel').hidden = false;
    $('#rmTitle').focus(); $('#formRem').scrollIntoView({ block: 'center' });
  },
  rmDel: id => del(() => S.rem = S.rem.filter(x => x.id !== id), 'Lembrete excluído.'),
  // quebre sua tarefa
  sTog: (id, sid) => {
    const s = find(find(S.proj, id).steps, sid); s.d = !s.d; save(); renderProj();
    if (s.d) toast('Muito bem! Mais uma etapa concluída.');
  },
  sEdit: (id, sid) => {
    const s = find(find(S.proj, id).steps, sid), v = prompt('Editar etapa:', s.t);
    if (v && v.trim()) { s.t = v.trim(); save(); renderProj(); toast('Etapa salva.'); }
  },
  sDel: (id, sid) => del(() => { const p = find(S.proj, id); p.steps = p.steps.filter(x => x.id !== sid); }, 'Etapa excluída.'),
  pEdit: id => {
    const p = find(S.proj, id), v = prompt('Novo nome da tarefa principal:', p.title);
    if (v && v.trim()) { p.title = v.trim(); save(); renderProj(); toast('Tarefa salva.'); }
  },
  pDel: id => del(() => S.proj = S.proj.filter(x => x.id !== id), 'Tarefa principal excluída.'),
  // despejo mental
  nEdit: id => { noteEdit = id; renderNotes(); $('#ed-' + id).focus(); },
  nCancel: () => { noteEdit = null; renderNotes(); },
  nSave: id => {
    const v = $('#ed-' + id).value.trim(); if (!v) return;
    find(S.notes, id).text = v; noteEdit = null; save(); renderNotes(); toast('Anotação salva.');
  },
  nDel: id => del(() => S.notes = S.notes.filter(x => x.id !== id), 'Anotação excluída.'),
  nTask: id => openTask({ title: find(S.notes, id).text.slice(0, 100), heading: 'Transformar em tarefa' }),
  // diversos
  close: () => $('#dlg').close(),
  alertX: (id, sid, b) => b.parentElement.remove()
};

document.addEventListener('click', e => {
  const b = e.target.closest('[data-act]');
  if (b && ACT[b.dataset.act]) ACT[b.dataset.act](b.dataset.id, b.dataset.sid, b);
});
document.addEventListener('change', e => {
  const b = e.target.closest('input[data-chg]');
  if (b) ACT[b.dataset.chg](b.dataset.id, b.dataset.sid, b);
});

/* Formulários */
$('#formTask').addEventListener('submit', e => {
  e.preventDefault();
  const f = e.target.elements, v = { title: f.title.value.trim(), desc: f.desc.value.trim(), date: f.date.value, prio: f.prio.value, cat: f.cat.value };
  if (!v.title) return;
  if (dlgCtx && dlgCtx.task) Object.assign(dlgCtx.task, v);
  else S.tasks.push({ id: uid(), done: false, created: today(), ...v });
  $('#dlg').close(); save(); render(); toast('Tarefa salva.');
});
$('#newTask').onclick = () => openTask({ heading: 'Nova tarefa' });
$('#fStatus').onchange = $('#fSort').onchange = renderTasks;
$$('.task-category').forEach(b => {
  b.addEventListener('click', () => {
    taskCategory = b.dataset.cat;
    renderTasks();
  });
});

$('#formAg').addEventListener('submit', e => {
  e.preventDefault();
  const v = { date: $('#agDate').value, time: $('#agTime').value, title: $('#agTitle').value.trim(), desc: $('#agDesc').value.trim() };
  if (!v.title) return;
  if (agEdit) Object.assign(find(S.agenda, agEdit), v); else S.agenda.push({ id: uid(), done: false, ...v });
  $('#agView').value = v.date; resetAgForm(); save(); render(); toast('Atividade salva.');
});
$('#agCancel').onclick = resetAgForm;
$('#agView').onchange = renderAgenda;

$('#formRem').addEventListener('submit', e => {
  e.preventDefault();
  const v = { title: $('#rmTitle').value.trim(), date: $('#rmDate').value, time: $('#rmTime').value, desc: $('#rmDesc').value.trim() };
  if (!v.title) return;
  if (rmEdit) Object.assign(find(S.rem, rmEdit), v); else S.rem.push({ id: uid(), ...v });
  resetRmForm(); save(); render(); toast('Lembrete salvo.');
});
$('#rmCancel').onclick = resetRmForm;

$('#formProj').addEventListener('submit', e => {
  e.preventDefault();
  const v = $('#prTitle').value.trim(); if (!v) return;
  S.proj.unshift({ id: uid(), title: v, steps: [] });
  e.target.reset(); save(); renderProj(); toast('Tarefa criada. Agora adicione a primeira etapa.');
});
document.addEventListener('submit', e => {
  const f = e.target.closest('[data-form="step"]'); if (!f) return;
  e.preventDefault();
  const i = f.querySelector('input'), v = i.value.trim(); if (!v) return;
  find(S.proj, f.dataset.id).steps.push({ id: uid(), t: v, d: false });
  save(); renderProj(); $('#st-' + f.dataset.id).focus(); toast('Etapa adicionada.');
});

$('#formNote').addEventListener('submit', e => { e.preventDefault(); if (addNote($('#noteTxt').value)) e.target.reset(); });
$('#quickSave').onclick = () => { if (addNote($('#quick').value)) $('#quick').value = ''; };

/* Calendário */
$('#calPrev').onclick = () => { calMonth.setMonth(calMonth.getMonth()-1); renderCal(); };
$('#calNext').onclick = () => { calMonth.setMonth(calMonth.getMonth()+1); renderCal(); };
$('#calNow').onclick = () => { calMonth = new Date(new Date().getFullYear(),new Date().getMonth(),1); selectedCalDate = today(); renderCal(); };

/* Temporizador */
$('#tmStart').onclick = tmStartFn;
$('#tmPause').onclick = () => { if (tm.run) { tmPauseFn(); $('#tmMsg').textContent = 'Em pausa. Retome quando quiser.'; } };
$('#tmReset').onclick = () => { tmSetMode(tm.mode); $('#tmMsg').textContent = 'Reiniciado. Vamos começar por algo simples?'; };
$$('.tab').forEach(b => b.onclick = () => tmSetMode(b.dataset.m));
[['cfF', 'f'], ['cfS', 's'], ['cfL', 'l']].forEach(([id, m]) => {
  const el = $('#' + id); el.value = S.timer[m];
  el.onchange = () => {
    const v = Math.min(+el.max, Math.max(1, Math.round(+el.value) || S.timer[m]));
    el.value = v; S.timer[m] = v; save();
    if (!tm.run && tm.mode === m) { tm.left = dur(m); drawTimer(); }
    toast('Tempo salvo.');
  };
});

/* Tema */
$('#themeBtn').onclick = () => { S.theme = curTheme() === 'dark' ? 'light' : 'dark'; save(); applyTheme(); };

/* ---------- 12. INICIALIZAÇÃO ---------- */
$('#agView').value = today();
$('#agDate').value = today();
$('#rmDate').value = today();
applyTheme();
render();
drawTimer();
route();
window.addEventListener('hashchange', route);
checkAlerts();
setInterval(checkAlerts, 20000);
