import { Preferences } from '@capacitor/preferences';
import { defaultState, settle, type State } from './state';

const KEY = 'ahorro.v1';
let state: State = defaultState();
const subs: ((s: State) => void)[] = [];

export const get = () => state;
export const subscribe = (f: (s: State) => void) => { subs.push(f); };

function sanitize(raw: unknown): State {
  const d = defaultState();
  if (!raw || typeof raw !== 'object') return d;
  const r = raw as Partial<State>;
  const num = (v: unknown, f: number) => (typeof v === 'number' && isFinite(v) && v >= 0 ? v : f);
  return {
    v: 1,
    settings: {
      rate: Math.max(1, num(r.settings?.rate, d.settings.rate)),
      hourly: num(r.settings?.hourly, 0),
      currency: r.settings?.currency === 'USD' ? 'USD' : 'UZS',
      weekly: num(r.settings?.weekly, d.settings.weekly),
      contrast: !!r.settings?.contrast,
    },
    goals: Array.isArray(r.goals) ? r.goals.filter((g) => g && typeof g.name === 'string' && g.usd > 0).map((g) => ({ id: String(g.id), name: g.name, usd: g.usd })) : d.goals,
    blocks: Array.isArray(r.blocks) ? r.blocks.filter((t) => typeof t === 'number') : [],
    jarUzs: num(r.jarUzs, 0),
    deposits: Array.isArray(r.deposits) ? r.deposits.filter((x) => x && x.uzs > 0 && typeof x.t === 'number') : [],
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
