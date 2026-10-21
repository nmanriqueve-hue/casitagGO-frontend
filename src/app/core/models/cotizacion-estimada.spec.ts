import { describe, expect, it } from 'vitest';

import { PORCENTAJE_SERVICIO_BACK, TARIFA_LIMPIEZA_BACK, estimarCotizacion } from './cotizacion-estimada';

describe('estimarCotizacion', () => {
  it('usa las mismas constantes que el back', () => {
    expect(TARIFA_LIMPIEZA_BACK).toBe(25000);
    expect(PORCENTAJE_SERVICIO_BACK).toBe(0.05);
  });

  it('coincide con el back en 3 noches sin extras', () => {
    const q = estimarCotizacion(100000, '2027-03-01', '2027-03-04');

    expect(q).toEqual({ nights: 3, base: 300000, cleaning: 25000, service: 15000, extras: 0, discount: 0, total: 340000 });
  });

  it('coincide con el back en 3 noches con extras', () => {
    const q = estimarCotizacion(100000, '2027-03-01', '2027-03-04', 45000);

    expect(q.extras).toBe(45000);
    expect(q.total).toBe(385000);
  });

  it('coincide con el back en 8 noches sin extras y sin descuento', () => {
    const q = estimarCotizacion(100000, '2027-03-10', '2027-03-18');

    expect(q.nights).toBe(8);
    expect(q.service).toBe(40000);
    expect(q.discount).toBe(0);
    expect(q.total).toBe(865000);
  });

  it('coincide con el back en 8 noches con extras', () => {
    const q = estimarCotizacion(100000, '2027-03-10', '2027-03-18', 45000);

    expect(q.total).toBe(910000);
  });

  it('el servicio se calcula solo sobre el precio base', () => {
    const sinExtras = estimarCotizacion(200000, '2027-03-01', '2027-03-03');
    const conExtras = estimarCotizacion(200000, '2027-03-01', '2027-03-03', 90000);

    expect(conExtras.service).toBe(sinExtras.service);
  });

  it('cuenta minimo una noche si las fechas son iguales', () => {
    const q = estimarCotizacion(100000, '2027-03-01', '2027-03-01');

    expect(q.nights).toBe(1);
    expect(q.total).toBe(130000);
  });

  it('cuenta minimo una noche si las fechas no son validas', () => {
    const q = estimarCotizacion(100000, 'no-es-fecha', '2027-03-01');

    expect(q.nights).toBe(1);
  });
});
