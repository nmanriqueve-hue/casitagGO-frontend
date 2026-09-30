import { describe, expect, it } from 'vitest';
import { validDate } from './date-rules';

describe('validDate', () => {

  it('debe aceptar una fecha válida con formato AAAA-MM-DD', () => {
    const resultado = validDate('2026-09-30');

    expect(resultado).toBe(true);
  });
  it('debe rechazar una fecha que no existe', () => {
  const resultado = validDate('2026-02-30');

  expect(resultado).toBe(false);
});
it('debe rechazar una fecha con formato diferente a AAAA-MM-DD', () => {
  const resultado = validDate('30/09/2026');

  expect(resultado).toBe(false);
});

});