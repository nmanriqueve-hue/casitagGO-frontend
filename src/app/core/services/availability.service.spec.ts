
// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AvailabilityService } from './availability.service';

describe('AvailabilityService', () => {
  let service: AvailabilityService;

  const start = '2099-06-10';
  const end = '2099-06-15';

  beforeEach(() => {
    service = new AvailabilityService();
    vi.restoreAllMocks();
  });

  describe('Estado inicial', () => {
    it('debe crearse correctamente', () => {
      expect(service).toBeTruthy();
    });

    it('debe iniciar sin periodos bloqueados', () => {
      expect(service.periods()).toEqual([]);
    });

    it('debe indicar que las fechas estan disponibles inicialmente', () => {
      expect(service.blocked(1, start, end)).toBe(false);
    });
  });

  describe('Bloqueo de fechas', () => {
    it('debe agregar un periodo bloqueado', () => {
      service.block(1, start, end);

      expect(service.periods()).toHaveLength(1);
      expect(service.periods()[0]).toMatchObject({
        listingId: 1,
        start,
        end
      });
    });

    it('debe asignar un identificador al bloqueo', () => {
      const spy = vi.spyOn(Date, 'now').mockReturnValue(123456);

      service.block(1, start, end);

      expect(service.periods()[0].id).toBe(123456);
      spy.mockRestore();
    });

    it('debe bloquear las fechas registradas', () => {
      service.block(1, start, end);

      expect(service.blocked(1, start, end)).toBe(true);
    });

    it('debe permitir bloquear fechas diferentes', () => {
      service.block(1, '2099-06-10', '2099-06-15');
      service.block(1, '2099-06-20', '2099-06-25');

      expect(service.periods()).toHaveLength(2);
    });

    it('debe permitir bloqueos en alojamientos diferentes', () => {
      service.block(1, start, end);
      service.block(2, start, end);

      expect(service.periods()).toHaveLength(2);
    });

    it('debe rechazar fechas iguales', () => {
      expect(() =>
        service.block(1, '2099-06-10', '2099-06-10')
      ).toThrow();
    });

    it('debe rechazar una fecha final anterior a la inicial', () => {
      expect(() =>
        service.block(1, '2099-06-15', '2099-06-10')
      ).toThrow();
    });

    it('debe rechazar fechas con formato invalido', () => {
      expect(() =>
        service.block(1, 'fecha-invalida', '2099-06-15')
      ).toThrow();
    });

    it('debe rechazar un bloqueo exactamente duplicado', () => {
      service.block(1, start, end);

      expect(() =>
        service.block(1, start, end)
      ).toThrow('El periodo se superpone con otro bloqueo.');
    });

    it('debe rechazar periodos parcialmente superpuestos', () => {
      service.block(1, start, end);

      expect(() =>
        service.block(1, '2099-06-13', '2099-06-18')
      ).toThrow('El periodo se superpone con otro bloqueo.');
    });

    it('debe conservar el bloqueo original si falla uno nuevo', () => {
      service.block(1, start, end);

      expect(() =>
        service.block(1, '2099-06-12', '2099-06-17')
      ).toThrow();

      expect(service.periods()).toHaveLength(1);
    });
  });

  describe('Consulta de disponibilidad', () => {
    it('debe ignorar los bloqueos de otros alojamientos', () => {
      service.block(1, start, end);

      expect(service.blocked(2, start, end)).toBe(false);
    });

    it('debe permitir un periodo que termina cuando comienza otro', () => {
      service.block(1, start, end);

      expect(
        service.blocked(1, '2099-06-15', '2099-06-20')
      ).toBe(false);
    });
  });

  describe('Liberacion de bloqueos', () => {
    it('debe eliminar un bloqueo mediante su identificador', () => {
      service.block(1, start, end);
      const id = service.periods()[0].id;

      service.release(id);

      expect(service.periods()).toHaveLength(0);
      expect(service.blocked(1, start, end)).toBe(false);
    });

    it('no debe eliminar otros bloqueos al liberar uno', () => {
      service.periods.set([
        { id: 1, listingId: 1, start: '2099-06-10', end: '2099-06-15' },
        { id: 2, listingId: 2, start: '2099-06-10', end: '2099-06-15' }
      ]);

      service.release(1);

      expect(service.periods()).toHaveLength(1);
      expect(service.periods()[0].id).toBe(2);
    });
  });
});
