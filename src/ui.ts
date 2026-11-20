import * as store from './store';
import {
  CAP, allocate, currentGoal, jarCoins, jarFull, hoursFor, fmtHours, fmtWeeks, forecast, dayStreak, weekStreak,
  challenges, BADGES, usd, fmt, money, other, toUzs, addSavings, buyBlock, editDeposit, deleteDeposit, undoBlock,
  newId, defaultState, type State, type Goal, type Cur, type Deposit,
} from './state';
import type { Jar } from './jar/scene';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const ic = (p: string) => `<svg viewBox="0 0 24 24" aria-hidden="true">${p}</svg>`;
const I = {
  home: '<path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  goals: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/>',
  future: '<path d="M4 19V9M10 19V5M16 19v-7M22 19H2"/>',
  trophy: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  up: '<path d="M6 15l6-6 6 6"/>', down: '<path d="M6 9l6 6 6-6"/>',
  edit: '<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  trash: '<path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v6M14 11v6"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  jar: '<path d="M8 3h8v3H8zM6 6h12v3l1 2v8a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-8l1-2z"/>',
};
const TABS = [['inicio', 'Inicio', I.home], ['metas', 'Metas', I.goals], ['futuro', 'Futuro', I.future], ['retos', 'Retos', I.trophy], ['ajustes', 'Ajustes', I.gear]] as const;

let jar: Jar;
let buying = false;
let tab = 'inicio';

/* ---------- Avisos y celebración ---------- */
export function celebrate(news: string[]) {
  if (!news.length) return;
  const box = $('toasts');
  news.forEach((n, i) => setTimeout(() => {
    const t = document.createElement('div'); t.className = 'toast'; t.textContent = '🎉 ' + n;
    box.appendChild(t); setTimeout(() => t.remove(), 3700);
  }, i * 500));
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const cols = ['#E2A21E', '#0F6B4F', '#16A36F', '#FFCB3A', '#5DAEDC'];
  for (let i = 0; i < 36; i++) {
    const c = document.createElement('i'); c.className = 'conf';
    c.style.left = Math.random() * 100 + 'vw'; c.style.background = cols[i % cols.length];
    c.style.setProperty('--dx', (Math.random() * 120 - 60) + 'px'); c.style.setProperty('--r', (Math.random() * 720 - 360) + 'deg');
    c.style.animationDelay = Math.random() * 0.4 + 's';
    document.body.appendChild(c); setTimeout(() => c.remove(), 2400);
  }
}

/* ---------- Hojas modales y navegación (el gesto "atrás" cierra la hoja o vuelve a Inicio) ---------- */
let sheetOpen = false;
function openSheet(html: string, mount: (close: () => void) => void) {
  const w = $('sheet'), b = $('sheetBody');
  if (!sheetOpen) { history.pushState({ tab, sheet: 1 }, ''); sheetOpen = true; }
  b.innerHTML = html; w.classList.add('on'); w.scrollTop = 0; mount(closeSheet);
}
function hideSheet() { sheetOpen = false; $('sheet').classList.remove('on'); }
function closeSheet() {
  if (!sheetOpen) return;
  if (history.state?.sheet) history.back(); else hideSheet();
}
$('sheet').addEventListener('click', (e) => { if (e.target === $('sheet')) closeSheet(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSheet(); });
window.addEventListener('popstate', (e) => {
  if (sheetOpen) { hideSheet(); return; }
  applyTab(e.state?.tab ?? 'inicio');
});

/* ---------- Render ---------- */
function render(s: State) {
  const a = allocate(s.goals, s.blocks.length * 100);
  const cur = currentGoal(a);
  const inJar = jarCoins(s);
  $('pct').textContent = Math.round((Math.min(CAP, inJar) / CAP) * 100) + ' %';
  $('totalUsd').textContent = usd(s.blocks.length * 100 + inJar);
  document.body.classList.toggle('hc', s.settings.contrast);

  if (!cur) {
    $('goalBlock').innerHTML = `<div class="muted" style="margin-top:6px">Aún no tienes metas. Crea la primera para ponerle nombre al frasco.</div><button type="button" class="primary" id="goFirst" style="margin-top:10px">Crear mi primera meta</button>`;
    $('goFirst').onclick = () => showTab('metas');
    jar.setLabel('Mi meta');
  } else {
    const pc = Math.min(100, Math.round(((cur.saved + inJar) / cur.usd) * 100));
    const h = hoursFor(s, cur.usd);
    $('goalBlock').innerHTML =
      `<div class="rowb"><b>${esc(cur.name)}</b><span class="muted">${usd(cur.saved)} de ${usd(cur.usd)}</span></div>` +
      `<div class="bar" role="progressbar" aria-label="Progreso de la meta" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pc}"><i style="width:${pc}%"></i></div>` +
      `<div class="muted">Te faltan ${usd(Math.max(0, cur.usd - cur.saved - inJar))} para esta meta.</div>` +
      `<div class="muted" style="margin-top:6px">${h != null ? `Tu ${esc(cur.name.toLowerCase())} = <b>${fmtHours(h)}</b> de trabajo` : 'Pon tu sueldo por hora en Ajustes y verás cuántas horas de trabajo cuesta.'}</div>`;
    jar.setLabel(cur.name);
  }
  const ds = dayStreak(s);
  if (!buying) jar.setCount(Math.min(CAP, inJar));
  $('full').classList.toggle('on', jarFull(s) && !buying);
  ($('add') as HTMLButtonElement).disabled = buying;
  ($('buy') as HTMLButtonElement).disabled = buying || !jarFull(s) || jar.count() < CAP;
  void ds;

  const screens: Record<string, () => string> = { historial: () => viewHistory(s), metas: () => viewGoals(s, a, cur), futuro: () => viewFuture(s), retos: () => viewChallenges(s), ajustes: () => viewSettings(s) };
  for (const [k, f] of Object.entries(screens)) {
    const el = $('s-' + k);
    if (k === 'futuro' && el.contains(document.activeElement) && document.activeElement instanceof HTMLInputElement) { renderFutureResults(s); continue; }
    if (el.contains(document.activeElement) && document.activeElement instanceof HTMLInputElement) continue;
    el.innerHTML = f();
  }
}

function viewGoals(s: State, a: ReturnType<typeof allocate>, cur?: ReturnType<typeof currentGoal>): string {
  const rows = a.map((g, i) => {
    const pc = Math.round((g.saved / g.usd) * 100);
    const curLbl = g.currency === 'USD' ? 'USD' : 'sum';
    const state = g.saved >= g.usd ? '<span class="tag">Completa</span>' : g.id === cur?.id ? '<span class="tag gold">Llenando ahora</span>' : '<span class="tag">En espera</span>';
    const h = hoursFor(s, g.usd);
    return `<div class="panel stack"><div class="rowb"><h2>${i + 1}. ${esc(g.name)}</h2>${state}</div>
      <div class="bar" style="margin:0"><i style="width:${pc}%"></i></div>
      <div class="rowb"><b>${usd(g.saved)}</b><span class="muted">de ${usd(g.usd)}</span></div>
      <div class="muted">Ahorras en ${curLbl}</div>
      ${h != null ? `<div class="muted">≈ ${fmtHours(h)} de trabajo</div>` : ''}
      <div class="rowc">
        <button class="icon" type="button" data-up="${g.id}" aria-label="Subir ${esc(g.name)}" ${i === 0 ? 'disabled' : ''}>${ic(I.up)}</button>
        <button class="icon" type="button" data-down="${g.id}" aria-label="Bajar ${esc(g.name)}" ${i === a.length - 1 ? 'disabled' : ''}>${ic(I.down)}</button>
        <span class="grow"></span>
        <button class="icon" type="button" data-edit="${g.id}" aria-label="Editar ${esc(g.name)}">${ic(I.edit)}</button>
        <button class="icon danger" type="button" data-del="${g.id}" aria-label="Borrar ${esc(g.name)}">${ic(I.trash)}</button>
      </div></div>`;
  }).join('');
  const empty = `<div class="panel empty">${ic(I.goals)}<h2>Sin metas todavía</h2><div class="muted">Una meta es algo que quieres pagar en dólares, como un billete o una multa. Cada bloque de $100 llena la primera de la lista.</div></div>`;
  return `<header><h1>Tus metas</h1><p class="sub">Cada bloque de $100 llena primero la de arriba.</p></header>${rows || empty}<button class="primary" type="button" id="newGoal">Añadir meta</button>`;
}

function viewFuture(s: State): string {
  const per = s.settings.weekly;
  return `<header><h1>Yo del futuro</h1><p class="sub">Cuánto ahorras por semana decide cuándo llegas.</p></header>
  <div class="panel stack"><label class="f" for="week">Ahorro por semana (sum)
  <input id="week" type="number" inputmode="numeric" value="${per}" min="0" step="50000"></label>
  <div class="muted">Equivale a <b id="weekUsd">${usd(per / s.settings.rate)}</b> por semana</div></div>
  <div id="future" class="stack">${futureCards(s)}</div>`;
}
function futureCards(s: State): string {
  const f = forecast(s);
  if (!f.length) return `<div class="panel empty">${ic(I.future)}<h2>Sin metas</h2><div class="muted">Crea una meta para ver cuándo la alcanzas.</div></div>`;
  return f.map((x) => {
    const txt = x.state === 'done' ? 'Ya la tienes cubierta' : x.state === 'nosave' ? 'Añade un ahorro semanal para ver la fecha'
      : x.date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }) + ' · en ' + fmtWeeks(x.weeks);
    return `<div class="panel"><div class="muted">${esc(x.goal.name)}</div><b style="font-size:17px;display:block;margin-top:4px">${txt}</b></div>`;
  }).join('');
}
function renderFutureResults(s: State) {
  const f = $('future'); if (f) f.innerHTML = futureCards(s);
  const w = $('weekUsd'); if (w) w.textContent = usd(s.settings.weekly / s.settings.rate);
}

function viewChallenges(s: State): string {
  const ds = dayStreak(s), ws = weekStreak(s);
  const ch = challenges(s).map((c) => `<div class="panel stack"><div class="rowb"><h3>${c.title}</h3>${c.done ? '<span class="tag">¡Logrado!</span>' : `<span class="muted">${c.target >= 1000 ? fmt(c.value) + ' / ' + fmt(c.target) : c.value + ' / ' + c.target}</span>`}</div>
    <div class="muted">${c.hint}</div><div class="bar gold" style="margin:0" role="progressbar" aria-valuemin="0" aria-valuemax="${c.target}" aria-valuenow="${c.value}" aria-label="${c.title}"><i style="width:${(c.value / c.target) * 100}%"></i></div></div>`).join('');
  const bd = BADGES.map((b) => { const on = s.badges.includes(b.id); return `<div class="badge ${on ? '' : 'lock'}"><span class="m" aria-hidden="true">${on ? '★' : '🔒'}</span>${b.name}<small>${b.desc}</small></div>`; }).join('');
  return `<header><h1>Retos y rachas</h1><p class="sub">Ahorra seguido y sube de nivel.</p></header>
  <div class="rowc"><div class="panel stat grow"><b>${ds}</b><span class="muted">${ds === 1 ? 'día' : 'días'} seguidos</span></div><div class="panel stat grow"><b>${ws}</b><span class="muted">${ws === 1 ? 'semana' : 'semanas'} seguidas</span></div></div>
  <h2>Retos de esta semana</h2>${ch}<h2>Insignias</h2><div class="badges">${bd}</div>`;
}

function viewSettings(s: State): string {
  const st = s.settings;
  return `<header><h1>Ajustes</h1><p class="sub">Tus datos se guardan solo en este teléfono.</p></header>
  <div class="panel stack">
    <label class="f" for="set-rate">Tipo de cambio (sum por 1 USD)<input id="set-rate" type="number" inputmode="numeric" min="1" value="${st.rate}"></label>
    <label class="f" for="set-hourly">Sueldo por hora (sum)<input id="set-hourly" type="number" inputmode="numeric" min="0" value="${st.hourly || ''}" placeholder="Ej. 25000"></label>
    <label class="f" for="set-weekly">Objetivo de ahorro semanal (sum)<input id="set-weekly" type="number" inputmode="numeric" min="0" value="${st.weekly}"></label>
    <div class="f" role="group" aria-label="Contraste"><span class="muted" style="font-weight:600">Alto contraste</span>
      <div class="seg"><button type="button" data-hc="0" aria-pressed="${!st.contrast}">Normal</button><button type="button" data-hc="1" aria-pressed="${st.contrast}">Alto</button></div></div>
  </div>
  <button class="danger" type="button" id="wipe">Borrar todos mis datos</button>`;
}

/* ---------- Eventos ---------- */
function setSettings(patch: Partial<State['settings']>) { store.commit({ ...store.get(), settings: { ...store.get().settings, ...patch } }); }

function goalSheet(g?: Goal) {
  let cur: Cur = g?.currency ?? 'UZS';
  openSheet(`<h2>${g ? 'Editar meta' : 'Nueva meta'}</h2>
    <label class="f" for="g-name">Nombre<input id="g-name" type="text" maxlength="28" value="${g ? esc(g.name) : ''}" placeholder="Ej. Billete a casa"></label>
    <label class="f" for="g-usd">Monto de la meta en USD<input id="g-usd" type="number" inputmode="numeric" min="1" value="${g ? g.usd : ''}" placeholder="Ej. 700"></label>
    <div class="f" role="group" aria-label="Moneda del ahorro"><span class="muted" style="font-weight:600">¿En qué moneda ahorrarás para esta meta?</span>
      <div class="seg" id="g-cur"><button type="button" data-gc="UZS" aria-pressed="${cur === 'UZS'}">Sum uzbeko</button><button type="button" data-gc="USD" aria-pressed="${cur === 'USD'}">Dólares</button></div>
      <span class="muted">Así introducirás los ahorros de esta meta. Verás siempre su equivalente en la otra moneda.</span></div>
    <p id="g-err" class="muted" style="color:var(--danger);margin:0" role="alert"></p>
    <button class="primary" type="button" id="g-ok">Guardar meta</button><button type="button" id="g-no">Cancelar</button>`, (close) => {
    $('g-no').onclick = close;
    $('g-cur').onclick = (e) => {
      const b = (e.target as HTMLElement).closest('button'); if (!b) return;
      cur = b.dataset.gc as Cur;
      $('g-cur').querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    };
    $('g-ok').onclick = () => {
      const name = ($('g-name') as HTMLInputElement).value.trim(), amt = Number(($('g-usd') as HTMLInputElement).value);
      if (!name || !(amt > 0)) { $('g-err').textContent = 'Escribe un nombre y un monto mayor que 0.'; return; }
      const s = store.get();
      const goals = g ? s.goals.map((x) => x.id === g.id ? { ...x, name, usd: Math.round(amt), currency: cur } : x) : [...s.goals, { id: newId(), name, usd: Math.round(amt), currency: cur }];
      close(); celebrate(store.commit({ ...s, goals }));
    };
    ($('g-name') as HTMLInputElement).focus();
  });
}

/** Hoja para añadir ahorro a una meta, en la moneda de esa meta, con equivalente en pequeño. */
function addSheet(goalId?: string, keep = '') {
  const s = store.get();
  if (!s.goals.length) {
    return openSheet(`<h2>Primero crea una meta</h2><div class="muted">Los ahorros se anotan en una meta, en la moneda que elijas para ella.</div><button class="primary" type="button" id="mk">Crear meta</button><button type="button" id="no">Cancelar</button>`, (close) => {
      $('no').onclick = close; $('mk').onclick = () => { close(); setTimeout(() => { go('metas'); goalSheet(); }, 60); };
    });
  }
  const cur0 = currentGoal(allocate(s.goals, s.blocks.length * 100));
  const g = s.goals.find((x) => x.id === goalId) ?? cur0!;
  const cur = g.currency, rate = s.settings.rate;
  const chips = cur === 'UZS' ? [50000, 100000, 250000] : [10, 25, 50];
  openSheet(`<h2>¿Cuánto vas a guardar?</h2>
    ${s.goals.length > 1 ? `<div class="f" role="group" aria-label="Meta"><span class="muted" style="font-weight:600">Para la meta</span><div class="chips" id="pick">${s.goals.map((x) => `<button type="button" data-pick="${x.id}" aria-pressed="${x.id === g.id}" class="${x.id === g.id ? 'primary' : ''}" style="width:auto">${esc(x.name)}</button>`).join('')}</div></div>` : `<div class="muted">Meta: <b>${esc(g.name)}</b></div>`}
    <label class="f" for="amt">Cantidad en ${cur === 'UZS' ? 'sum uzbeko' : 'dólares (USD)'}<input id="amt" type="number" inputmode="numeric" placeholder="Ej. ${cur === 'UZS' ? '250000' : '20'}" min="0" value="${keep}"></label>
    <div class="muted" id="amtHint" aria-live="polite"></div>
    <div class="chips" id="quick">${chips.map((v) => `<button type="button" data-v="${v}">+${fmt(v)}</button>`).join('')}</div>
    <button class="primary" id="save" type="button">Guardar en el frasco</button><button id="cancel" type="button">Cancelar</button>`, (close) => {
    const amt = $('amt') as HTMLInputElement;
    const hint = () => {
      const v = Number(amt.value) || 0;
      $('amtHint').textContent = v ? `≈ ${other(v, cur, rate)} · ${Math.floor(toUzs(v, cur, rate) / rate)} monedas nuevas` : `1 USD = ${fmt(rate)} sum`;
    };
    hint(); amt.focus();
    amt.oninput = hint;
    const pick = document.getElementById('pick');
    if (pick) pick.onclick = (e) => { const b = (e.target as HTMLElement).closest('button'); if (b && b.dataset.pick !== g.id) addSheet(b.dataset.pick); };
    $('quick').onclick = (e) => { const b = (e.target as HTMLElement).closest('button'); if (b) { amt.value = String((Number(amt.value) || 0) + Number(b.dataset.v)); hint(); } };
    $('cancel').onclick = close;
    $('save').onclick = () => {
      const v = Number(amt.value) || 0;
      if (v <= 0) { amt.focus(); return; }
      close(); celebrate(store.commit(addSavings(store.get(), g.id, v)));
    };
  });
}

/* ---------- Historial ---------- */
function viewHistory(s: State): string {
  const rows = [
    ...s.deposits.map((d) => ({ t: d.t, d, b: undefined as undefined | State['blocks'][number] })),
    ...s.blocks.map((b) => ({ t: b.t, d: undefined as undefined | Deposit, b })),
  ].sort((x, y) => y.t - x.t);
  const date = (t: number) => t ? new Date(t).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Antes del historial';
  const list = rows.map(({ t, d, b }) => {
    if (d) {
      const g = s.goals.find((x) => x.id === d.goalId);
      return `<div class="panel rowc"><div class="grow"><div class="muted">${date(t)}${g ? ' · ' + esc(g.name) : ''}</div>
        <b style="font-size:17px">+ ${money(d.amount, d.cur)}</b><div class="muted">≈ ${other(d.amount, d.cur, d.rate)}</div></div>
        <button class="icon" type="button" data-hedit="${d.id}" aria-label="Editar ahorro">${ic(I.edit)}</button>
        <button class="icon danger" type="button" data-hdel="${d.id}" aria-label="Borrar ahorro">${ic(I.trash)}</button></div>`;
    }
    return `<div class="panel rowc"><div class="grow"><div class="muted">${date(t)}</div><b style="font-size:17px">Bloque de $100 comprado</b>
      <div class="muted">Costó ${money(b!.cost, 'UZS')}</div></div><button type="button" data-hundo="${b!.id}">Deshacer</button></div>`;
  }).join('');
  const empty = `<div class="panel empty">${ic(I.jar)}<h2>Aún no hay movimientos</h2><div class="muted">Cada ahorro que añadas y cada bloque que compres aparecerá aquí. Podrás corregirlos o borrarlos.</div></div>`;
  return `<header class="rowc"><button class="icon" type="button" id="hback" aria-label="Volver">${ic(I.back)}</button><div><h1>Historial</h1><p class="sub">Corrige o borra y el frasco se ajusta solo.</p></div></header>${list || empty}`;
}

function editDepositSheet(d: Deposit) {
  openSheet(`<h2>Editar ahorro</h2>
    <label class="f" for="e-amt">Cantidad en ${d.cur === 'UZS' ? 'sum uzbeko' : 'dólares (USD)'}<input id="e-amt" type="number" inputmode="numeric" min="0" value="${d.amount}"></label>
    <div class="muted" id="e-hint" aria-live="polite"></div>
    <p id="e-err" class="muted" style="color:var(--danger);margin:0" role="alert"></p>
    <button class="primary" id="e-ok" type="button">Guardar cambio</button><button id="e-no" type="button">Cancelar</button>`, (close) => {
    const inp = $('e-amt') as HTMLInputElement;
    const hint = () => { const v = Number(inp.value) || 0; $('e-hint').textContent = v ? `≈ ${other(v, d.cur, d.rate)} (cambio de ese día: ${fmt(d.rate)} sum)` : ''; };
    hint(); inp.oninput = hint; inp.focus();
    $('e-no').onclick = close;
    $('e-ok').onclick = () => {
      const r = editDeposit(store.get(), d.id, Number(inp.value));
      if (!r.ok) { $('e-err').textContent = r.msg; return; }
      close(); celebrate(store.commit(r.state));
    };
  });
}
function deleteDepositSheet(d: Deposit) {
  openSheet(`<h2>¿Borrar este ahorro?</h2><div class="muted">+ ${money(d.amount, d.cur)} (≈ ${other(d.amount, d.cur, d.rate)}). Las monedas correspondientes saldrán del frasco.</div>
    <p id="e-err" class="muted" style="color:var(--danger);margin:0" role="alert"></p>
    <button class="danger" id="y" type="button">Sí, borrar</button><button id="n" type="button">Cancelar</button>`, (close) => {
    $('n').onclick = close;
    $('y').onclick = () => {
      const r = deleteDeposit(store.get(), d.id);
      if (!r.ok) { $('e-err').textContent = r.msg; return; }
      close(); store.commit(r.state);
    };
  });
}

async function buy() {
  const s = store.get();
  if (buying || !jarFull(s) || jar.count() < CAP) return;
  buying = true;
  const news = store.commit(buyBlock(s));
  celebrate(news);
  await jar.vanishAll();
  buying = false;
  render(store.get());
}

function onClick(e: Event) {
  const t = (e.target as HTMLElement).closest('button') as HTMLButtonElement | null;
  if (!t) return;
  const s = store.get(), d = t.dataset;
  if (t.id === 'newGoal') return goalSheet();
  if (t.id === 'goHist') return go('historial');
  if (t.id === 'hback') return history.back();
  if (d.hedit) return editDepositSheet(s.deposits.find((x) => x.id === d.hedit)!);
  if (d.hdel) return deleteDepositSheet(s.deposits.find((x) => x.id === d.hdel)!);
  if (d.hundo) return openSheet(`<h2>¿Deshacer la compra?</h2><div class="muted">Los $100 dejan de contar en tus metas y sus monedas vuelven al frasco.</div><button class="danger" type="button" id="y">Sí, deshacer</button><button type="button" id="n">Cancelar</button>`, (close) => {
    $('n').onclick = close; $('y').onclick = () => { close(); store.commit(undoBlock(store.get(), d.hundo!)); };
  });
  if (d.edit) return goalSheet(s.goals.find((g) => g.id === d.edit));
  if (d.up || d.down) {
    const id = (d.up || d.down)!, i = s.goals.findIndex((g) => g.id === id), j = d.up ? i - 1 : i + 1;
    if (j < 0 || j >= s.goals.length) return;
    const goals = [...s.goals]; [goals[i], goals[j]] = [goals[j], goals[i]];
    return void store.commit({ ...s, goals });
  }
  if (d.del) {
    const g = s.goals.find((x) => x.id === d.del)!;
    return openSheet(`<h2>¿Borrar “${esc(g.name)}”?</h2><div class="muted">Los dólares ya comprados no se pierden: pasan a la siguiente meta.</div><button class="danger" type="button" id="y">Sí, borrar</button><button type="button" id="n">Cancelar</button>`, (close) => {
      $('n').onclick = close; $('y').onclick = () => { close(); store.commit({ ...store.get(), goals: store.get().goals.filter((x) => x.id !== g.id) }); };
    });
  }
  if (d.hc) return setSettings({ contrast: d.hc === '1' });
  if (t.id === 'wipe') return openSheet(`<h2>¿Borrar todo?</h2><div class="muted">Se eliminan tus metas, ahorros, bloques, rachas e insignias de este teléfono. No se puede deshacer.</div><button class="danger" type="button" id="y">Sí, borrar todo</button><button type="button" id="n">Cancelar</button>`, (close) => {
    $('n').onclick = close; $('y').onclick = () => { close(); store.commit(defaultState()); };
  });
}

function onChange(e: Event) {
  const el = e.target as HTMLInputElement;
  const n = Number(el.value);
  if (el.id === 'set-rate' && n > 0) setSettings({ rate: n });
  else if (el.id === 'set-hourly') setSettings({ hourly: n > 0 ? n : 0 });
  else if (el.id === 'set-weekly') setSettings({ weekly: n > 0 ? n : 0 });
  else if (el.id === 'set-rate') el.value = String(store.get().settings.rate);
}

function applyTab(t: string) {
  tab = t;
  document.querySelectorAll('#tabs button').forEach((b) => b.setAttribute('aria-selected', String((b as HTMLElement).dataset.t === t)));
  document.querySelectorAll('.screen').forEach((sc) => sc.classList.toggle('on', sc.id === 's-' + t));
  scrollTo(0, 0); jar.resize();
}
/** Cambia de pantalla guardando el historial del navegador: "atrás" desde cualquier pantalla vuelve a Inicio. */
function go(t: string) {
  if (t === tab) return;
  const cur = history.state?.tab ?? 'inicio';
  if (t === 'inicio') { if (cur !== 'inicio') history.back(); else applyTab('inicio'); return; }
  if (cur === 'inicio') history.pushState({ tab: t }, ''); else history.replaceState({ tab: t }, '');
  applyTab(t);
}
const showTab = go;

export function initUI(j: Jar) {
  jar = j;
  $('tabs').innerHTML = TABS.map(([k, n, p]) => `<button role="tab" type="button" data-t="${k}" aria-selected="${k === tab}">${ic(p)}${n}</button>`).join('');
  $('tabs').addEventListener('click', (e) => { const b = (e.target as HTMLElement).closest('button'); if (b) go(b.dataset.t!); });
  history.replaceState({ tab: 'inicio' }, '');
  $('add').onclick = () => addSheet();
  $('buy').onclick = buy;
  document.querySelector('.app')!.addEventListener('click', onClick);
  document.querySelector('.app')!.addEventListener('change', onChange);
  document.querySelector('.app')!.addEventListener('input', (e) => {
    const el = e.target as HTMLInputElement;
    if (el.id === 'week') { const s = store.get(); store.commit({ ...s, settings: { ...s.settings, weekly: Math.max(0, Number(el.value) || 0) } }); }
  });
  store.subscribe(render);
  render(store.get());
}
export const onCoinCount = (n: number) => { $('count').textContent = String(n); if (!buying) { const b = $('buy') as HTMLButtonElement; b.disabled = !jarFull(store.get()) || n < CAP; } };
