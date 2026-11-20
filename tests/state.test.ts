import { describe, it, expect } from 'vitest';
import { defaultState, addSavings, buyBlock, jarCoins, allocate, currentGoal, dayStreak, settle, hoursFor, bankUsd, forecast } from '../src/state';

const day = 864e5;
describe('state', () => {
  it('cada 12.500 sum es una moneda y el sobrante se conserva', () => {
    let s = addSavings(defaultState(), 12500 * 100 + 3000);
    expect(jarCoins(s)).toBe(100);
    s = buyBlock(s);
    expect(s.jarUzs).toBe(3000);
    expect(bankUsd(s)).toBe(100);
  });
  it('no compra bloque si el frasco no está lleno', () => {
    const s = addSavings(defaultState(), 12500 * 99);
    expect(buyBlock(s)).toBe(s);
  });
  it('los bloques llenan la primera meta incompleta y luego la siguiente', () => {
    const s = defaultState();
    const a = allocate(s.goals, 800);
    expect(a[0].saved).toBe(700); expect(a[1].saved).toBe(100);
    expect(currentGoal(a).id).toBe('g2');
  });
  it('racha de días', () => {
    const now = Date.UTC(2026, 5, 10, 12);
    let s = defaultState();
    for (const i of [0, 1, 2]) s = addSavings(s, 1000, now - i * day);
    expect(dayStreak(s, now)).toBe(3);
    expect(dayStreak(s, now + 2 * day)).toBe(0);
  });
  it('insignias y retos se registran una sola vez', () => {
    const now = Date.UTC(2026, 5, 10, 12);
    const r1 = settle(addSavings(defaultState(), 1000, now), now);
    expect(r1.news.some((n) => n.includes('Primer paso'))).toBe(true);
    expect(settle(r1.state, now).news).toHaveLength(0);
  });
  it('horas de trabajo', () => {
    const s = defaultState();
    expect(hoursFor(s, 100)).toBeNull();
    s.settings.hourly = 25000;
    expect(hoursFor(s, 100)).toBe(50);
  });
  it('pronóstico en semanas', () => {
    const f = forecast(defaultState(), 0);
    expect(f[0].state).toBe('date');
    if (f[0].state === 'date') expect(f[0].weeks).toBe(Math.ceil((700 * 12500) / 600000));
  });
});
import { weekStreak } from '../src/state';
it('racha de semanas', () => {
  const now = Date.UTC(2026, 5, 10, 12);
  let s = defaultState();
  for (const i of [0, 7, 14]) s = addSavings(s, 1000, now - i * day);
  expect(weekStreak(s, now)).toBe(3);
  expect(weekStreak(s, now + 14 * day)).toBe(0);
});
