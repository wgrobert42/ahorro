import { sanitize } from '../src/store';
import { describe, it, expect } from 'vitest';
import { editDeposit, deleteDeposit, undoBlock, fmtWeeks, jarUzs, money, other, defaultState, addSavings, buyBlock, jarCoins, allocate, currentGoal, dayStreak, settle, hoursFor, bankUsd, forecast } from '../src/state';

const day = 864e5;
describe('state', () => {
  it('cada 12.500 sum es una moneda y el sobrante se conserva', () => {
    let s = addSavings(defaultState(), 'g1', 12500 * 100 + 3000);
    expect(jarCoins(s)).toBe(100);
    s = buyBlock(s);
    expect(jarUzs(s)).toBe(3000);
    expect(bankUsd(s)).toBe(100);
  });
  it('no compra bloque si el frasco no está lleno', () => {
    const s = addSavings(defaultState(), 'g1', 12500 * 99);
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
    for (const i of [0, 1, 2]) s = addSavings(s, 'g1', 1000, now - i * day);
    expect(dayStreak(s, now)).toBe(3);
    expect(dayStreak(s, now + 2 * day)).toBe(0);
  });
  it('insignias y retos se registran una sola vez', () => {
    const now = Date.UTC(2026, 5, 10, 12);
    const r1 = settle(addSavings(defaultState(), 'g1', 1000, now), now);
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
  for (const i of [0, 7, 14]) s = addSavings(s, 'g1', 1000, now - i * day);
  expect(weekStreak(s, now)).toBe(3);
  expect(weekStreak(s, now + 14 * day)).toBe(0);
});

describe('historial y concordancia', () => {
  it('moneda por meta: ahorro en USD se convierte al cambio', () => {
    const s0 = defaultState(); s0.goals[0].currency = 'USD';
    const s = addSavings(s0, 'g1', 20);
    expect(s.deposits[0].uzs).toBe(250000);
    expect(jarCoins(s)).toBe(20);
    expect(other(20, 'USD', 12500)).toBe('250.000 sum');
    expect(other(250000, 'UZS', 12500)).toBe('$20');
    expect(money(12.5, 'USD')).toBe('$12,5');
  });
  it('editar y borrar un ahorro cambia las monedas del frasco', () => {
    let s = addSavings(defaultState(), 'g1', 125000);
    const id = s.deposits[0].id;
    expect(jarCoins(s)).toBe(10);
    const e = editDeposit(s, id, 250000); if (!e.ok) throw 0; s = e.state;
    expect(jarCoins(s)).toBe(20);
    const d = deleteDeposit(s, id); if (!d.ok) throw 0;
    expect(jarCoins(d.state)).toBe(0);
  });
  it('no deja borrar un ahorro ya gastado en un bloque, pero sí deshacer el bloque', () => {
    let s = buyBlock(addSavings(defaultState(), 'g1', 12500 * 100));
    expect(bankUsd(s)).toBe(100);
    expect(deleteDeposit(s, s.deposits[0].id).ok).toBe(false);
    s = undoBlock(s, s.blocks[0].id);
    expect(bankUsd(s)).toBe(0); expect(jarCoins(s)).toBe(100);
    expect(deleteDeposit(s, s.deposits[0].id).ok).toBe(true);
  });
  it('semanas -> meses a partir de 4 semanas', () => {
    expect(fmtWeeks(1)).toBe('1 semana'); expect(fmtWeeks(4)).toBe('4 semanas');
    expect(fmtWeeks(5)).toBe('1 mes'); expect(fmtWeeks(13)).toBe('3 meses');
    expect(fmtWeeks(52)).toBe('1 año'); expect(fmtWeeks(65)).toBe('1 año y 3 meses');
  });
  it('migra el estado v1', () => {
    const s = sanitize({ v: 1, settings: { rate: 12500, currency: 'USD' }, goals: [{ id: 'a', name: 'X', usd: 100 }], blocks: [1], jarUzs: 50000, deposits: [{ t: 5, uzs: 100000 }] });
    expect(s.goals[0].currency).toBe('USD');
    expect(jarUzs(s)).toBe(50000);
    expect(s.blocks[0].cost).toBe(1250000);
  });
});
