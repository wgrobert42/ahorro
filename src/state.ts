/* Estado de la app y reglas de negocio (puro, sin DOM). */
export const CAP = 100;

export type Cur = 'UZS' | 'USD';
export interface Goal { id: string; name: string; usd: number; currency: Cur }
export interface Settings { rate: number; hourly: number; weekly: number; contrast: boolean }
/** Ahorro anotado en una meta, en la moneda de esa meta. `uzs` es su equivalente al cambio de ese día. */
export interface Deposit { id: string; t: number; goalId: string; cur: Cur; amount: number; rate: number; uzs: number }
export interface Block { id: string; t: number; cost: number }  // cost = sum que costó el bloque
export interface State {
  v: 2;
  settings: Settings;
  goals: Goal[];
  blocks: Block[];
  deposits: Deposit[];
  badges: string[];
  done: string[];          // retos completados: "<semana>:<id>"
}

export const defaultState = (): State => ({
  v: 2,
  settings: { rate: 12500, hourly: 0, weekly: 600000, contrast: false },
  goals: [
    { id: 'g1', name: 'Billete a casa', usd: 700, currency: 'UZS' },
    { id: 'g2', name: 'Multa de salida', usd: 400, currency: 'UZS' },
  ],
  blocks: [],
  deposits: [],
  badges: [],
  done: [],
});

/* ---------- Cálculos ---------- */
export const bankUsd = (s: State) => s.blocks.length * 100;
/** Sum en el frasco = todo lo ahorrado menos lo que costaron los bloques ya comprados. */
export const jarUzs = (s: State) => s.deposits.reduce((a, d) => a + d.uzs, 0) - s.blocks.reduce((a, b) => a + b.cost, 0);
export const jarCoins = (s: State) => s.settings.rate > 0 ? Math.max(0, Math.floor(jarUzs(s) / s.settings.rate)) : 0;
export const jarFull = (s: State) => jarCoins(s) >= CAP;

export interface Alloc extends Goal { saved: number }
export function allocate(goals: Goal[], bank: number): Alloc[] {
  let left = bank;
  return goals.map((g) => { const saved = Math.min(g.usd, left); left -= saved; return { ...g, saved }; });
}
export const currentGoal = (a: Alloc[]) => a.find((g) => g.saved < g.usd) ?? a[a.length - 1];

/** Horas de trabajo que cuesta `usd` dólares; null si no hay sueldo por hora. */
export function hoursFor(s: State, usd: number): number | null {
  const h = s.settings.hourly;
  return h > 0 ? (usd * s.settings.rate) / h : null;
}
export function fmtHours(h: number): string {
  if (h < 1) return 'menos de 1 hora';
  const r = Math.round(h);
  return r.toLocaleString('es-ES') + (r === 1 ? ' hora' : ' horas');
}

/** Hasta 4 semanas se dice en semanas; a partir de ahí, en meses (y años). */
export function fmtWeeks(w: number): string {
  if (w <= 4) return w + (w === 1 ? ' semana' : ' semanas');
  const m = Math.max(1, Math.round(w / 4.345));
  if (m < 12) return m + (m === 1 ? ' mes' : ' meses');
  const y = Math.floor(m / 12), r = m % 12;
  return y + (y === 1 ? ' año' : ' años') + (r ? ' y ' + r + (r === 1 ? ' mes' : ' meses') : '');
}

/** Semanas hasta cubrir cada meta con ahorro semanal `per` (sum). */
export function forecast(s: State, now = Date.now()) {
  const a = allocate(s.goals, bankUsd(s));
  const per = s.settings.weekly;
  const have = bankUsd(s) * s.settings.rate + jarUzs(s);
  let need = 0;
  return a.map((g) => {
    need += g.usd * s.settings.rate;
    const miss = Math.max(0, need - have);
    if (miss <= 0) return { goal: g, state: 'done' as const };
    if (per <= 0) return { goal: g, state: 'nosave' as const };
    const weeks = Math.ceil(miss / per);
    return { goal: g, state: 'date' as const, weeks, date: new Date(now + weeks * 7 * 864e5) };
  });
}

/* ---------- Fechas, rachas, retos ---------- */
export const dayKey = (t: number) => { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
export function weekStart(t: number): number { const d = new Date(t); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d.getTime(); }
export const weekKey = (t: number) => dayKey(weekStart(t));

export function dayStreak(s: State, now = Date.now()): number {
  const days = new Set(s.deposits.map((d) => dayKey(d.t)));
  const d = new Date(now); d.setHours(12, 0, 0, 0);
  if (!days.has(dayKey(d.getTime()))) d.setDate(d.getDate() - 1);
  let n = 0;
  while (days.has(dayKey(d.getTime()))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}
export function weekStreak(s: State, now = Date.now()): number {
  const weeks = new Set(s.deposits.map((d) => weekKey(d.t)));
  const prev = (w: number) => weekStart(w - 3 * 864e5);
  let w = weekStart(now);
  if (!weeks.has(dayKey(w))) w = prev(w);
  let n = 0;
  while (weeks.has(dayKey(w))) { n++; w = prev(w); }
  return n;
}

export interface Challenge { id: string; title: string; hint: string; value: number; target: number; done: boolean }
export function challenges(s: State, now = Date.now()): Challenge[] {
  const ws = weekStart(now), wk = weekKey(now);
  const dep = s.deposits.filter((d) => d.t >= ws);
  const days = new Set(dep.map((d) => dayKey(d.t))).size;
  const sum = dep.reduce((a, d) => a + d.uzs, 0);
  const blocks = s.blocks.filter((b) => b.t >= ws).length;
  const mk = (id: string, title: string, hint: string, value: number, target: number): Challenge =>
    ({ id, title, hint, value: Math.min(value, target), target, done: value >= target || s.done.includes(`${wk}:${id}`) });
  const list = [
    mk('dias3', 'Constante', 'Ahorra en 3 días distintos esta semana', days, 3),
    mk('bloque', 'Bloque de la semana', 'Compra un bloque de $100 esta semana', blocks, 1),
  ];
  if (s.settings.weekly > 0) list.unshift(mk('meta', 'Meta semanal', 'Ahorra tu objetivo semanal en sum', sum, s.settings.weekly));
  return list;
}

export interface Badge { id: string; name: string; desc: string }
export const BADGES: Badge[] = [
  { id: 'first', name: 'Primer paso', desc: 'Tu primer ahorro' },
  { id: 'streak3', name: 'En racha', desc: '3 días seguidos ahorrando' },
  { id: 'streak7', name: 'Semana perfecta', desc: '7 días seguidos' },
  { id: 'block1', name: 'Primer bloque', desc: 'Compraste tus primeros $100' },
  { id: 'block5', name: 'Medio billete', desc: '5 bloques comprados' },
  { id: 'goal1', name: 'Meta lograda', desc: 'Completaste una meta' },
  { id: 'reto', name: 'Retador', desc: 'Superaste un reto semanal' },
];
export function earnedBadges(s: State, now = Date.now()): string[] {
  const out: string[] = [];
  if (s.deposits.length) out.push('first');
  const ds = dayStreak(s, now);
  if (ds >= 3 || s.badges.includes('streak3')) out.push('streak3');
  if (ds >= 7 || s.badges.includes('streak7')) out.push('streak7');
  if (s.blocks.length >= 1) out.push('block1');
  if (s.blocks.length >= 5) out.push('block5');
  if (allocate(s.goals, bankUsd(s)).some((g) => g.saved >= g.usd)) out.push('goal1');
  if (s.done.length) out.push('reto');
  return out;
}

/* ---------- Conversión y formato de dinero ---------- */
export const fmt = (n: number) => Math.round(n).toLocaleString('es-ES');
export const usd = (n: number) => '$' + fmt(n);
const trim = (n: number) => n.toLocaleString('es-ES', { maximumFractionDigits: n >= 100 ? 0 : 2 });
export const money = (amount: number, cur: Cur) => cur === 'USD' ? '$' + trim(amount) : fmt(amount) + ' sum';
/** Lo mismo expresado en la otra moneda. */
export const other = (amount: number, cur: Cur, rate: number) => cur === 'USD' ? money(amount * rate, 'UZS') : money(amount / rate, 'USD');
export const toUzs = (amount: number, cur: Cur, rate: number) => cur === 'USD' ? amount * rate : amount;

/* ---------- Acciones (devuelven estado nuevo) ---------- */
export type Result = { ok: true; state: State } | { ok: false; msg: string };
const uid = () => Math.random().toString(36).slice(2, 10);

export function addSavings(s: State, goalId: string, amount: number, now = Date.now()): State {
  const g = s.goals.find((x) => x.id === goalId);
  if (!g || !(amount > 0)) return s;
  const rate = s.settings.rate;
  const d: Deposit = { id: uid(), t: now, goalId, cur: g.currency, amount, rate, uzs: toUzs(amount, g.currency, rate) };
  return { ...s, deposits: [...s.deposits, d] };
}

export const buyBlock = (s: State, now = Date.now()): State =>
  jarFull(s) ? { ...s, blocks: [...s.blocks, { id: uid(), t: now, cost: CAP * s.settings.rate }] } : s;

const NEG = 'Ese ahorro ya se usó en un bloque comprado. Deshaz primero la compra de ese bloque en el historial.';

export function editDeposit(s: State, id: string, amount: number): Result {
  const d = s.deposits.find((x) => x.id === id);
  if (!d || !(amount > 0)) return { ok: false, msg: 'Escribe una cantidad mayor que 0.' };
  const nd = { ...d, amount, uzs: toUzs(amount, d.cur, d.rate) };
  const next = { ...s, deposits: s.deposits.map((x) => x.id === id ? nd : x) };
  return jarUzs(next) < -1e-6 ? { ok: false, msg: NEG } : { ok: true, state: next };
}
export function deleteDeposit(s: State, id: string): Result {
  const next = { ...s, deposits: s.deposits.filter((x) => x.id !== id) };
  return jarUzs(next) < -1e-6 ? { ok: false, msg: NEG } : { ok: true, state: next };
}
/** Deshace la compra de un bloque: sus monedas vuelven al frasco. */
export const undoBlock = (s: State, id: string): State => ({ ...s, blocks: s.blocks.filter((b) => b.id !== id) });

/** Registra logros/retos nuevos; devuelve el estado y los mensajes a celebrar. */
export function settle(s: State, now = Date.now()): { state: State; news: string[] } {
  const news: string[] = [];
  const wk = weekKey(now);
  const done = [...s.done];
  for (const c of challenges(s, now)) {
    const k = `${wk}:${c.id}`;
    if (c.done && !done.includes(k)) { done.push(k); news.push(`Reto superado: ${c.title}`); }
  }
  const s2 = { ...s, done };
  const badges = [...s.badges];
  for (const id of earnedBadges(s2, now)) if (!badges.includes(id)) { badges.push(id); news.push(`Insignia: ${BADGES.find((b) => b.id === id)!.name}`); }
  return { state: { ...s2, badges }, news };
}

export const newId = () => 'g' + Math.random().toString(36).slice(2, 9);
