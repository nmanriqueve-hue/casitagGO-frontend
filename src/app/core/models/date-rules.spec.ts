import { describe, expect, it } from 'vitest';
import { validDate, dateRangeError } from './date-rules';

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


describe('dateRangeError', () => {

  it('no debe mostrar error cuando el rango de fechas es válido', () => {
    const resultado = dateRangeError(
      '2026-10-10',
      '2026-10-15',
      true,
      '2026-09-30'
    );

    expect(resultado).toBe('');
  });

  it('debe rechazar una fecha de llegada que esté en el pasado', () => {
  const resultado = dateRangeError(
    '2026-09-29',
    '2026-10-02',
    true,
    '2026-09-30'
  );

  expect(resultado).toBe(
    'La fecha de llegada no puede estar en el pasado.'
  );
});
it('debe rechazar cuando la salida es el mismo día de la llegada', () => {
  const resultado = dateRangeError(
    '2026-10-10',
    '2026-10-10',
    true,
    '2026-09-30'
  );

  expect(resultado).toBe(
    'La salida debe ser posterior a la llegada.'
  );
});
it('debe mostrar error cuando falta la fecha de salida', () => {
  const resultado = dateRangeError(
    '2026-10-10',
    null,
    true,
    '2026-09-30'
  );

  expect(resultado).toBe(
    'Selecciona la fecha de llegada y la fecha de salida.'
  );
});
it('debe rechazar un rango que contenga una fecha inválida', () => {
  const resultado = dateRangeError(
    '2026-10-10',
    '2026-02-30',
    true,
    '2026-09-30'
  );

  expect(resultado).toBe(
    'Introduce fechas válidas.'
  );
});
it('no debe mostrar error si las fechas son opcionales y están vacías', () => {
  const resultado = dateRangeError(
    null,
    null,
    false,
    '2026-09-30'
  );

  expect(resultado).toBe('');
});

});

