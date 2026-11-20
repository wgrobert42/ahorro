import { Preferences } from '@capacitor/preferences';
import { defaultState, settle, type State, type Cur } from './state';

const KEY = 'ahorro.v1';
let state: State = defaultState();
const subs: ((s: State) => void)[] = [];

export const get = () => state;
export const subscribe = (f: (s: State) => void) => { subs.push(f); };

/** Lee cualquier versión guardada (v1 o v2) y devuelve un estado v2 válido. */
export function sanitize(raw: unknown): State {
  const d = defaultState();
  if (!raw || typeof raw !== 'object') return d;
  const r = raw as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  const num = (v: unknown, f: number) => (typeof v === 'number' && isFinite(v) && v >= 0 ? v : f);
  const rate = Math.max(1, num(r.settings?.rate, d.settings.rate));
  const legacyCur = r.settings?.currency === 'USD' ? 'USD' : 'UZS';
  const goals = Array.isArray(r.goals)
    ? r.goals.filter((g: any) => g && typeof g.name === 'string' && g.usd > 0)
        .map((g: any) => ({ id: String(g.id), name: g.name, usd: g.usd, currency: ((g.currency ?? legacyCur) === 'USD' ? 'USD' : 'UZS') as Cur }))
    : d.goals;
  const blocks = Array.isArray(r.blocks)
    ? r.blocks.map((b: any, i: number) => typeof b === 'number' ? { id: 'b' + i, t: b, cost: 100 * rate }
        : { id: String(b?.id ?? 'b' + i), t: num(b?.t, 0), cost: num(b?.cost, 100 * rate) })
    : [];
  const deposits = Array.isArray(r.deposits)
    ? r.deposits.filter((x: any) => x && x.uzs > 0 && typeof x.t === 'number').map((x: any, i: number) => ({
        id: String(x.id ?? 'd' + i), t: x.t, goalId: String(x.goalId ?? ''), cur: (x.cur === 'USD' ? 'USD' : 'UZS') as Cur,
        amount: num(x.amount, x.uzs), rate: num(x.rate, rate) || rate, uzs: x.uzs }))
    : [];
  // v1 guardaba el sum del frasco aparte: si no cuadra con los ahorros, se añade un saldo anterior.
  if (r.v !== 2 && typeof r.jarUzs === 'number') {
    const diff = r.jarUzs + blocks.reduce((a: number, b: any) => a + b.cost, 0) - deposits.reduce((a: number, x: any) => a + x.uzs, 0);
    if (diff > 0) deposits.unshift({ id: 'saldo', t: 0, goalId: '', cur: 'UZS' as Cur, amount: diff, rate, uzs: diff });
  }
  return {
    v: 2,
    settings: { rate, hourly: num(r.settings?.hourly, 0), weekly: num(r.settings?.weekly, d.settings.weekly), contrast: !!r.settings?.contrast },
    goals, blocks, deposits,
    badges: Array.isArray(r.badges) ? r.badges.map(String) : [],
    done: Array.isArray(r.done) ? r.done.map(String) : [],
  };
}

export async function load() {
  try {
    const { value } = await Preferences.get({ key: KEY });
    if (value) state = sanitize(JSON.parse(value));
  } catch { /* estado inicial */ }
  return state;
}

let writing: Promise<unknown> = Promise.resolve();
function persist() {
  const v = JSON.stringify(state);
  writing = writing.then(() => Preferences.set({ key: KEY, value: v })).catch(() => {});
}

/** Aplica un cambio, registra logros nuevos, guarda y avisa. Devuelve los logros. */
export function commit(next: State): string[] {
  const { state: s, news } = settle(next);
  state = s;
  persist();
  subs.forEach((f) => f(state));
  return news;
}

export function reset() { return commit(defaultState()); }
