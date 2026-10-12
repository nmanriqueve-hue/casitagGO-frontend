
// @vitest-environment jsdom
import '@angular/compiler';

import { TestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting
} from '@angular/platform-browser-dynamic/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject, of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AvailabilityComponent } from './availability.component';
import { PublicacionesBackService } from '../../core/services/publicaciones-back.service';
import { ReservasBackService } from '../../core/services/reservas-back.service';
import { DisponibilidadBackService } from '../../core/services/disponibilidad-back.service';
import { ToastService } from '../../core/services/toast.service';
import { addDays } from '../../core/models/date-rules';

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

describe('AvailabilityComponent', () => {
  let component: AvailabilityComponent;
  let mias: ReturnType<typeof vi.fn>;
  let recibidas: ReturnType<typeof vi.fn>;
  let periodos: ReturnType<typeof vi.fn>;
  let bloquear: ReturnType<typeof vi.fn>;
  let liberar: ReturnType<typeof vi.fn>;
  let showToast: ReturnType<typeof vi.fn>;

  const alojamiento1 = { id: 'alojamiento-1', titulo: 'Casa 1' };
  const alojamiento2 = { id: 'alojamiento-2', titulo: 'Casa 2' };

  let inicio: string;
  let fin: string;
  let bloqueo: any;
  let reserva: any;

  const errorHttp = (status: number, error: unknown = null) =>
    new HttpErrorResponse({ status, error });

  const crearComponente = () => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: PublicacionesBackService,
          useValue: { mias }
        },
        {
          provide: ReservasBackService,
          useValue: { recibidas }
        },
        {
          provide: DisponibilidadBackService,
          useValue: { periodos, bloquear, liberar }
        },
        {
          provide: ToastService,
          useValue: { show: showToast }
        }
      ]
    });

    component = TestBed.runInInjectionContext(
      () => new AvailabilityComponent()
    );
  };

  const configurarFechas = () => {
    component.blockStart = inicio;
    component.blockEnd = fin;
  };

  beforeEach(() => {
    TestBed.resetTestingModule();

    const base = new Date();
    base.setDate(15);
    base.setMonth(base.getMonth() + 2);

    const fechaBase = [
      base.getFullYear(),
      String(base.getMonth() + 1).padStart(2, '0'),
      String(base.getDate()).padStart(2, '0')
    ].join('-');

    inicio = fechaBase;
    fin = addDays(inicio, 3);

    bloqueo = {
      id: 'bloqueo-1',
      publicacionId: 'alojamiento-1',
      fechaInicio: inicio,
      fechaFin: fin,
      estado: 'BLOQUEADO'
    };

    reserva = {
      id: 'reserva-1',
      publicacionId: 'alojamiento-1',
      fechaLlegada: inicio,
      fechaSalida: fin,
      estado: 'CONFIRMADA',
      tituloPublicacion: 'Casa 1',
      huespedNombre: 'Huésped',
      total: 300000
    };

    mias = vi.fn().mockReturnValue(
      of([alojamiento1, alojamiento2])
    );
    recibidas = vi.fn().mockReturnValue(of([]));
    periodos = vi.fn().mockReturnValue(of([]));
    bloquear = vi.fn().mockReturnValue(of({}));
    liberar = vi.fn().mockReturnValue(of({}));
    showToast = vi.fn();
  });

  describe('Inicialización', () => {
    it('debe crear el componente', () => {
      crearComponente();
      expect(component).toBeTruthy();
    });

    it('debe consultar los alojamientos propios', () => {
      crearComponente();
      expect(mias).toHaveBeenCalledTimes(1);
    });

    it('debe consultar las reservas recibidas', () => {
      crearComponente();
      expect(recibidas).toHaveBeenCalledTimes(1);
    });

    it('debe cargar los alojamientos', () => {
      crearComponente();
      expect(component.listings()).toHaveLength(2);
    });

    it('debe seleccionar el primer alojamiento', () => {
      crearComponente();
      expect(component.selectedListing()).toBe('alojamiento-1');
    });

    it('debe cargar los periodos del primer alojamiento', () => {
      crearComponente();
      expect(periodos).toHaveBeenCalledWith('alojamiento-1');
    });

    it('debe finalizar el estado de carga', () => {
      crearComponente();
      expect(component.cargando()).toBe(false);
    });

    it('debe iniciar sin error de carga', () => {
      crearComponente();
      expect(component.errorCarga()).toBe('');
    });

    it('debe manejar una lista vacía de alojamientos', () => {
      mias.mockReturnValue(of([]));
      crearComponente();

      expect(component.selectedListing()).toBe('');
      expect(component.cargando()).toBe(false);
      expect(periodos).not.toHaveBeenCalled();
    });

    it('debe mostrar errores al cargar alojamientos', () => {
      mias.mockReturnValue(
        throwError(() => errorHttp(500))
      );

      crearComponente();

      expect(component.cargando()).toBe(false);
      expect(component.errorCarga()).not.toBe('');
    });
  });

  describe('Selección de alojamientos', () => {
    it('debe cambiar el alojamiento seleccionado', () => {
      crearComponente();
      component.elegir('alojamiento-2');

      expect(component.selectedListing()).toBe('alojamiento-2');
    });

    it('debe consultar los bloqueos del nuevo alojamiento', () => {
      crearComponente();
      component.elegir('alojamiento-2');

      expect(periodos).toHaveBeenCalledWith('alojamiento-2');
    });

    it('debe limpiar los bloqueos anteriores', () => {
      periodos.mockReturnValue(of([bloqueo]));
      crearComponente();

      periodos.mockReturnValue(of([]));
      component.elegir('alojamiento-2');

      expect(component.bloqueos()).toEqual([]);
    });

    it('debe conservar únicamente los periodos bloqueados', () => {
      periodos.mockReturnValue(
        of([
          bloqueo,
          { ...bloqueo, id: 'periodo-2', estado: 'DISPONIBLE' }
        ])
      );

      crearComponente();

      expect(component.bloqueos()).toHaveLength(1);
      expect(component.bloqueos()[0].estado).toBe('BLOQUEADO');
    });

    it('debe manejar errores al consultar bloqueos', () => {
      periodos.mockReturnValue(
        throwError(() => errorHttp(403))
      );

      crearComponente();

      expect(component.errorCarga()).toContain('sesión');
    });
  });

  describe('Calendario', () => {
    it('debe comenzar en el mes actual', () => {
      crearComponente();
      expect(component.monthOffset()).toBe(0);
    });

    it('debe avanzar al mes siguiente', () => {
      crearComponente();
      component.nextMonth();

      expect(component.monthOffset()).toBe(1);
    });

    it('debe retroceder al mes anterior', () => {
      crearComponente();
      component.previousMonth();

      expect(component.monthOffset()).toBe(-1);
    });

    it('debe recuperar el mes original', () => {
      crearComponente();
      component.nextMonth();
      component.previousMonth();

      expect(component.monthOffset()).toBe(0);
    });

    it('debe generar los días del calendario', () => {
      crearComponente();

      expect(component.days().length % 7).toBe(0);
      expect(component.days().length).toBeGreaterThanOrEqual(28);
    });

    it('debe generar una etiqueta para el mes', () => {
      crearComponente();

      expect(component.monthLabel().length).toBeGreaterThan(0);
    });

    it('debe identificar las celdas fuera del mes', () => {
      crearComponente();

      expect(component.dayState(0)).toBe('outside');
    });

    it('debe identificar días anteriores a hoy', () => {
      crearComponente();
      component.previousMonth();

      expect(component.dayState(1)).toBe('past');
    });

    it('debe identificar fechas disponibles', () => {
      crearComponente();

      const fecha = new Date(inicio + 'T12:00:00');
      const mesActual = new Date();

      component.monthOffset.set(
        (fecha.getFullYear() - mesActual.getFullYear()) * 12 +
        fecha.getMonth() - mesActual.getMonth()
      );

      expect(component.dayState(fecha.getDate())).toBe('available');
    });
  });

  describe('Bloqueos y reservas', () => {
    it('debe identificar un día bloqueado', () => {
      periodos.mockReturnValue(of([bloqueo]));
      crearComponente();

      const fecha = new Date(inicio + 'T12:00:00');
      const hoy = new Date();

      component.monthOffset.set(
        (fecha.getFullYear() - hoy.getFullYear()) * 12 +
        fecha.getMonth() - hoy.getMonth()
      );

      expect(component.dayState(fecha.getDate())).toBe('blocked');
    });

    it('debe identificar un día reservado', () => {
      recibidas.mockReturnValue(of([reserva]));
      crearComponente();

      const fecha = new Date(inicio + 'T12:00:00');
      const hoy = new Date();

      component.monthOffset.set(
        (fecha.getFullYear() - hoy.getFullYear()) * 12 +
        fecha.getMonth() - hoy.getMonth()
      );

      expect(component.dayState(fecha.getDate())).toBe('reserved');
    });

    it('debe ignorar reservas canceladas', () => {
      recibidas.mockReturnValue(
        of([{ ...reserva, estado: 'CANCELADA' }])
      );

      crearComponente();
      configurarFechas();
      component.blockPeriod();

      expect(bloquear).toHaveBeenCalledTimes(1);
    });

    it('debe impedir bloqueos sobre reservas confirmadas', () => {
      recibidas.mockReturnValue(of([reserva]));
      crearComponente();
      configurarFechas();
      component.blockPeriod();

      expect(bloquear).not.toHaveBeenCalled();
      expect(component.dateError()).toContain('superpone');
    });

    it('debe impedir bloqueos sobre reservas pendientes', () => {
      recibidas.mockReturnValue(
        of([{ ...reserva, estado: 'PENDIENTE' }])
      );

      crearComponente();
      configurarFechas();
      component.blockPeriod();

      expect(bloquear).not.toHaveBeenCalled();
    });

    it('debe impedir bloqueos sobre periodos ya bloqueados', () => {
      periodos.mockReturnValue(of([bloqueo]));
      crearComponente();
      configurarFechas();
      component.blockPeriod();

      expect(bloquear).not.toHaveBeenCalled();
      expect(component.dateError()).toContain('superpone');
    });

    it('debe permitir periodos sin superposición', () => {
      crearComponente();
      configurarFechas();
      component.blockPeriod();

      expect(bloquear).toHaveBeenCalledWith(
        'alojamiento-1',
        inicio,
        fin
      );
    });
  });

  describe('Crear y liberar bloqueos', () => {
    it('debe abrir el modal de bloqueo', () => {
      crearComponente();
      component.abrirBloqueo();

      expect(component.showBlockModal()).toBe(true);
    });

    it('debe limpiar errores al abrir el modal', () => {
      crearComponente();
      component.dateError.set('Error anterior');
      component.abrirBloqueo();

      expect(component.dateError()).toBe('');
    });

    it('debe impedir bloquear sin alojamiento seleccionado', () => {
      mias.mockReturnValue(of([]));
      crearComponente();
      configurarFechas();

      component.blockPeriod();

      expect(component.dateError()).toContain('Selecciona');
      expect(bloquear).not.toHaveBeenCalled();
    });

    it('debe rechazar fechas invertidas', () => {
      crearComponente();

      component.blockStart = fin;
      component.blockEnd = inicio;
      component.blockPeriod();

      expect(bloquear).not.toHaveBeenCalled();
      expect(component.dateError()).not.toBe('');
    });

    it('debe crear un bloqueo válido', () => {
      crearComponente();
      configurarFechas();

      component.blockPeriod();

      expect(bloquear).toHaveBeenCalledTimes(1);
      expect(component.procesando()).toBe(false);
    });

    it('debe cerrar el modal después de bloquear', () => {
      crearComponente();
      configurarFechas();
      component.abrirBloqueo();
      component.blockPeriod();

      expect(component.showBlockModal()).toBe(false);
    });

    it('debe mostrar una notificación después de bloquear', () => {
      crearComponente();
      configurarFechas();
      component.blockPeriod();

      expect(showToast).toHaveBeenCalledWith(
        'El periodo fue bloqueado en la disponibilidad.',
        'warning'
      );
    });

    it('debe manejar errores al crear bloqueos', () => {
      bloquear.mockReturnValue(
        throwError(() => errorHttp(400, 'Periodo no disponible'))
      );

      crearComponente();
      configurarFechas();
      component.blockPeriod();

      expect(component.procesando()).toBe(false);
      expect(component.dateError()).toBe('Periodo no disponible');
    });

    it('debe liberar un periodo bloqueado', () => {
      crearComponente();
      component.release('bloqueo-1');

      expect(liberar).toHaveBeenCalledWith(
        'alojamiento-1',
        'bloqueo-1'
      );
    });

    it('debe notificar cuando se libera un periodo', () => {
      crearComponente();
      component.release('bloqueo-1');

      expect(showToast).toHaveBeenCalledWith(
        'Periodo disponible nuevamente.'
      );
    });

    it('debe manejar errores al liberar un periodo', () => {
      liberar.mockReturnValue(
        throwError(() => errorHttp(500))
      );

      crearComponente();
      component.release('bloqueo-1');

      expect(showToast).toHaveBeenCalledWith(
        expect.any(String),
        'warning'
      );
    });
  });
});
