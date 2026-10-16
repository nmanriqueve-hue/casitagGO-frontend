// @vitest-environment jsdom
import '@angular/compiler';

import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting
} from '@angular/platform-browser-dynamic/testing';
import { of, Subject, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GuestBookingsComponent } from './guest-bookings.component';
import { CatalogService } from '../../core/services/catalog.service';
import { ReservaBack, ReservasBackService } from '../../core/services/reservas-back.service';
import { ToastService } from '../../core/services/toast.service';

try {
  TestBed.initTestEnvironment(
    BrowserDynamicTestingModule,
    platformBrowserDynamicTesting()
  );
} catch (error) {
  if (
    !(error instanceof Error) ||
    !error.message.includes('already been initialized')
  ) {
    throw error;
  }
}

describe('GuestBookingsComponent - resenas', () => {
  let component: GuestBookingsComponent;
  let misReservas: ReturnType<typeof vi.fn>;
  let crearResena: ReturnType<typeof vi.fn>;
  let obtenerDetalle: ReturnType<typeof vi.fn>;
  let obtenerResenas: ReturnType<typeof vi.fn>;
  let mostrarToast: ReturnType<typeof vi.fn>;

  const crearReserva = (cambios: Partial<ReservaBack> = {}): ReservaBack => ({
    id: 'reserva-1',
    creadoEn: '2000-01-01T10:00:00Z',
    publicacionId: 'pub-1',
    fechaLlegada: '2000-01-01',
    fechaSalida: '2000-01-04',
    estado: 'CONFIRMADA',
    total: 300000,
    ...cambios
  });

  const crearError = (
    status: number,
    error: unknown = null
  ): HttpErrorResponse => new HttpErrorResponse({ status, error });

  const respuestaDeResenas = (...reservaIds: string[]) => ({
    promedio: 5,
    total: reservaIds.length,
    resenas: reservaIds.map((reservaId) => ({
      id: `resena-${reservaId}`,
      creadoEn: null,
      reservaId,
      publicacionId: 'pub-1',
      huespedNombre: 'Hugo',
      calificacion: 5,
      comentario: null
    }))
  });

  const crearComponente = (lista: ReservaBack[]): void => {
    misReservas.mockReturnValue(of(lista));

    TestBed.configureTestingModule({
      providers: [
        { provide: ReservasBackService, useValue: { misReservas, crearResena } },
        { provide: CatalogService, useValue: { obtenerDetalle, obtenerResenas } },
        { provide: ToastService, useValue: { show: mostrarToast } }
      ]
    });

    component = TestBed.runInInjectionContext(() => new GuestBookingsComponent());
  };

  const itemDe = (id: string) => component.items().find((item) => item.id === id)!;

  beforeEach(() => {
    TestBed.resetTestingModule();

    misReservas = vi.fn();
    crearResena = vi.fn();
    obtenerDetalle = vi.fn().mockReturnValue(of({ uuid: 'pub-1' }));
    obtenerResenas = vi.fn().mockReturnValue(of(respuestaDeResenas()));
    mostrarToast = vi.fn();
  });

  describe('Quien puede resenar', () => {
    it('debe permitir resenar una estancia terminada sin resena', () => {
      crearComponente([crearReserva()]);

      expect(component.puedeResenar(itemDe('reserva-1'))).toBe(true);
      expect(component.yaResenada(itemDe('reserva-1'))).toBe(false);
    });

    it('no debe permitir resenar una estancia que todavia no termina', () => {
      crearComponente([crearReserva({ fechaLlegada: '2999-01-01', fechaSalida: '2999-01-04' })]);

      expect(component.puedeResenar(itemDe('reserva-1'))).toBe(false);
    });

    it('no debe permitir resenar una reserva cancelada', () => {
      crearComponente([crearReserva({ estado: 'CANCELADA' })]);

      expect(component.puedeResenar(itemDe('reserva-1'))).toBe(false);
    });
  });

  describe('Reservas ya resenadas', () => {
    it('debe marcar como resenadas las reservas que ya tienen resena', () => {
      obtenerResenas.mockReturnValue(of(respuestaDeResenas('reserva-1')));

      crearComponente([crearReserva()]);

      expect(component.resenadas()).toEqual(['reserva-1']);
      expect(component.yaResenada(itemDe('reserva-1'))).toBe(true);
      expect(component.puedeResenar(itemDe('reserva-1'))).toBe(false);
    });

    it('debe consultar las resenas una sola vez por publicacion', () => {
      crearComponente([
        crearReserva({ id: 'reserva-1', publicacionId: 'pub-1' }),
        crearReserva({ id: 'reserva-2', publicacionId: 'pub-1' }),
        crearReserva({ id: 'reserva-3', publicacionId: 'pub-2' })
      ]);

      expect(obtenerResenas).toHaveBeenCalledTimes(2);
      expect(obtenerResenas).toHaveBeenCalledWith('pub-1');
      expect(obtenerResenas).toHaveBeenCalledWith('pub-2');
    });

    it('no debe consultar resenas si no hay estancias terminadas', () => {
      crearComponente([
        crearReserva({ id: 'reserva-1', fechaLlegada: '2999-01-01', fechaSalida: '2999-01-04' }),
        crearReserva({ id: 'reserva-2', estado: 'CANCELADA' })
      ]);

      expect(obtenerResenas).not.toHaveBeenCalled();
    });

    it('no debe mostrar error si falla la consulta de resenas', () => {
      obtenerResenas.mockReturnValue(throwError(() => crearError(500)));

      crearComponente([crearReserva()]);

      expect(component.resenadas()).toEqual([]);
      expect(component.errorCarga()).toBe('');
      expect(mostrarToast).not.toHaveBeenCalled();
      expect(component.puedeResenar(itemDe('reserva-1'))).toBe(true);
    });
  });

  describe('Ventana de resena', () => {
    beforeEach(() => {
      crearComponente([crearReserva()]);
    });

    it('debe abrir con 5 estrellas y el comentario vacio', () => {
      component.calificacion.set(2);
      component.reviewComment = 'anterior';

      component.abrirResena(itemDe('reserva-1'));

      expect(component.reviewTarget()).toBe(itemDe('reserva-1'));
      expect(component.calificacion()).toBe(5);
      expect(component.reviewComment).toBe('');
    });

    it('debe cerrar y limpiar el comentario', () => {
      component.abrirResena(itemDe('reserva-1'));
      component.reviewComment = 'algo';

      component.cerrarResena();

      expect(component.reviewTarget()).toBeNull();
      expect(component.reviewComment).toBe('');
    });
  });

  describe('Enviar resena', () => {
    beforeEach(() => {
      crearComponente([crearReserva()]);
    });

    it('debe enviar la resena, marcarla como existente y avisar', () => {
      crearResena.mockReturnValue(of({}));
      component.abrirResena(itemDe('reserva-1'));
      component.calificacion.set(3);
      component.reviewComment = '  Muy buena estadia  ';

      component.enviarResena();

      expect(crearResena).toHaveBeenCalledWith('reserva-1', 3, 'Muy buena estadia');
      expect(component.resenadas()).toContain('reserva-1');
      expect(component.yaResenada(itemDe('reserva-1'))).toBe(true);
      expect(component.reviewTarget()).toBeNull();
      expect(component.procesando()).toBe(false);
      expect(mostrarToast).toHaveBeenCalledWith(expect.stringContaining('fue publicada'));
    });

    it('no debe hacer nada si no hay una reserva elegida', () => {
      component.enviarResena();

      expect(crearResena).not.toHaveBeenCalled();
    });

    it('no debe enviar dos veces mientras hay un envio en curso', () => {
      crearResena.mockReturnValue(new Subject());
      component.abrirResena(itemDe('reserva-1'));

      component.enviarResena();
      component.enviarResena();

      expect(crearResena).toHaveBeenCalledTimes(1);
      expect(component.procesando()).toBe(true);
    });

    it('debe mostrar el mensaje del back si falla y dejar la ventana abierta', () => {
      crearResena.mockReturnValue(
        throwError(() => crearError(400, 'Ya resenaste esta reserva'))
      );
      component.abrirResena(itemDe('reserva-1'));

      component.enviarResena();

      expect(mostrarToast).toHaveBeenCalledWith('Ya resenaste esta reserva', 'warning');
      expect(component.reviewTarget()).not.toBeNull();
      expect(component.resenadas()).toEqual([]);
      expect(component.procesando()).toBe(false);
    });

    it('debe mostrar un aviso generico ante otro error', () => {
      crearResena.mockReturnValue(throwError(() => crearError(500)));
      component.abrirResena(itemDe('reserva-1'));

      component.enviarResena();

      expect(mostrarToast).toHaveBeenCalledWith(
        expect.stringContaining('No se pudo completar'),
        'warning'
      );
    });
  });
});
