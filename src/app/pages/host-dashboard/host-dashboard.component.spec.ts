
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

import { HostDashboardComponent } from './host-dashboard.component';
import {
  CatalogService,
  PublicacionBack,
  ResenasPublicacionBack
} from '../../core/services/catalog.service';
import { PublicacionesBackService } from '../../core/services/publicaciones-back.service';
import {
  ReservaRecibidaBack,
  ReservasBackService
} from '../../core/services/reservas-back.service';
import { SessionService } from '../../core/services/session.service';
import { localToday } from '../../core/models/date-rules';

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

describe('HostDashboardComponent', () => {
  let component: HostDashboardComponent;
  let mias: ReturnType<typeof vi.fn>;
  let recibidas: ReturnType<typeof vi.fn>;
  let obtenerResenas: ReturnType<typeof vi.fn>;

  const fechaRelativa = (dias: number): string => {
    const [anio, mes, dia] = localToday().split('-').map(Number);
    const fecha = new Date(Date.UTC(anio, mes - 1, dia + dias));
    return fecha.toISOString().slice(0, 10);
  };

  const crearPublicacion = (
    id: number,
    estado = 'ACTIVA'
  ): PublicacionBack => ({
    id,
    estado
  } as unknown as PublicacionBack);

  const crearReserva = (
    id: string,
    estado = 'CONFIRMADA',
    total = 100000,
    fechaSalida = fechaRelativa(5)
  ): ReservaRecibidaBack => ({
    id,
    estado,
    total,
    fechaSalida
  } as unknown as ReservaRecibidaBack);

  const crearResenas = (
    promedio: number,
    total: number
  ): ResenasPublicacionBack => ({
    promedio,
    total,
    resenas: []
  });

  const crearError = (
    status: number,
    error: unknown = null
  ): HttpErrorResponse =>
    new HttpErrorResponse({ status, error });

  const crearComponente = (): void => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: SessionService,
          useValue: {}
        },
        {
          provide: CatalogService,
          useValue: { obtenerResenas }
        },
        {
          provide: PublicacionesBackService,
          useValue: { mias }
        },
        {
          provide: ReservasBackService,
          useValue: { recibidas }
        }
      ]
    });

    component = TestBed.runInInjectionContext(
      () => new HostDashboardComponent()
    );
  };

  beforeEach(() => {
    TestBed.resetTestingModule();

    mias = vi.fn().mockReturnValue(of([]));
    recibidas = vi.fn().mockReturnValue(of([]));
    obtenerResenas = vi.fn().mockReturnValue(
      of(crearResenas(0, 0))
    );
  });

  describe('Inicialización', () => {
    it('debe crear el componente', () => {
      crearComponente();
      expect(component).toBeTruthy();
    });

    it('debe consultar las publicaciones del anfitrión', () => {
      crearComponente();
      expect(mias).toHaveBeenCalledTimes(1);
    });

    it('debe consultar las reservas recibidas', () => {
      crearComponente();
      expect(recibidas).toHaveBeenCalledTimes(1);
    });

    it('debe iniciar sin publicaciones cuando el backend devuelve vacío', () => {
      crearComponente();
      expect(component.listings()).toEqual([]);
    });

    it('debe iniciar sin reservas cuando el backend devuelve vacío', () => {
      crearComponente();
      expect(component.bookings()).toEqual([]);
    });

    it('debe iniciar con cero reseñas', () => {
      crearComponente();
      expect(component.resenasTotal()).toBe(0);
    });

    it('debe iniciar con calificación cero', () => {
      crearComponente();
      expect(component.rating()).toBe(0);
    });

    it('debe terminar la carga cuando recibe los datos', () => {
      crearComponente();
      expect(component.cargando()).toBe(false);
    });

    it('debe iniciar sin errores cuando las consultas funcionan', () => {
      crearComponente();
      expect(component.errorCarga()).toBe('');
    });

    it('debe conservar la sesión inyectada', () => {
      crearComponente();
      expect(component.session).toBeDefined();
    });

    it('debe mantener la carga hasta completar ambas consultas', () => {
      const publicacionesPendientes =
        new Subject<PublicacionBack[]>();

      const reservasPendientes =
        new Subject<ReservaRecibidaBack[]>();

      mias.mockReturnValue(publicacionesPendientes.asObservable());
      recibidas.mockReturnValue(reservasPendientes.asObservable());

      crearComponente();

      expect(component.cargando()).toBe(true);

      publicacionesPendientes.next([crearPublicacion(1)]);
      publicacionesPendientes.complete();

      expect(component.cargando()).toBe(true);

      reservasPendientes.next([crearReserva('reserva-1')]);
      reservasPendientes.complete();

      expect(component.cargando()).toBe(false);
      expect(component.listings()).toHaveLength(1);
      expect(component.bookings()).toHaveLength(1);
    });
  });

  describe('Publicaciones del anfitrión', () => {
    it('debe cargar las publicaciones recibidas', () => {
      mias.mockReturnValue(
        of([
          crearPublicacion(1),
          crearPublicacion(2, 'PAUSADA')
        ])
      );

      crearComponente();
      expect(component.listings()).toHaveLength(2);
    });

    it('debe contar las publicaciones activas', () => {
      mias.mockReturnValue(
        of([
          crearPublicacion(1, 'ACTIVA'),
          crearPublicacion(2, 'ACTIVA'),
          crearPublicacion(3, 'PAUSADA')
        ])
      );

      crearComponente();
      expect(component.activas()).toBe(2);
    });

    it('debe devolver cero si no hay publicaciones activas', () => {
      mias.mockReturnValue(
        of([
          crearPublicacion(1, 'PAUSADA'),
          crearPublicacion(2, 'BLOQUEADA')
        ])
      );

      crearComponente();
      expect(component.activas()).toBe(0);
    });

    it('debe contar únicamente las publicaciones con estado ACTIVA', () => {
      mias.mockReturnValue(
        of([
          crearPublicacion(1, 'ACTIVA'),
          crearPublicacion(2, 'PENDIENTE'),
          crearPublicacion(3, 'BLOQUEADA')
        ])
      );

      crearComponente();
      expect(component.activas()).toBe(1);
    });

    it('debe actualizar el número de publicaciones activas', () => {
      crearComponente();

      component.listings.set([
        crearPublicacion(1, 'ACTIVA'),
        crearPublicacion(2, 'ACTIVA'),
        crearPublicacion(3, 'ACTIVA')
      ]);

      expect(component.activas()).toBe(3);
    });

    it('debe conservar el orden de las publicaciones', () => {
      mias.mockReturnValue(
        of([
          crearPublicacion(3),
          crearPublicacion(1),
          crearPublicacion(2)
        ])
      );

      crearComponente();

      expect(component.listings().map(item => item.id)).toEqual([
        3, 1, 2
      ]);
    });

    it('no debe consultar reseñas cuando no hay publicaciones', () => {
      crearComponente();
      expect(obtenerResenas).not.toHaveBeenCalled();
    });
  });

  describe('Reservas próximas', () => {
    beforeEach(() => {
      crearComponente();
    });

    it('debe contar reservas confirmadas futuras', () => {
      component.bookings.set([
        crearReserva('reserva-1', 'CONFIRMADA', 100000, fechaRelativa(5)),
        crearReserva('reserva-2', 'CONFIRMADA', 200000, fechaRelativa(10))
      ]);

      expect(component.proximas()).toBe(2);
    });

    it('no debe contar reservas pendientes', () => {
      component.bookings.set([
        crearReserva('reserva-1', 'PENDIENTE', 100000, fechaRelativa(5))
      ]);

      expect(component.proximas()).toBe(0);
    });

    it('no debe contar reservas canceladas', () => {
      component.bookings.set([
        crearReserva('reserva-1', 'CANCELADA', 100000, fechaRelativa(5))
      ]);

      expect(component.proximas()).toBe(0);
    });

    it('no debe contar reservas con salida anterior a hoy', () => {
      component.bookings.set([
        crearReserva('reserva-1', 'CONFIRMADA', 100000, fechaRelativa(-1))
      ]);

      expect(component.proximas()).toBe(0);
    });

    it('no debe contar reservas cuya salida es hoy', () => {
      component.bookings.set([
        crearReserva('reserva-1', 'CONFIRMADA', 100000, localToday())
      ]);

      expect(component.proximas()).toBe(0);
    });

    it('debe contar únicamente las reservas confirmadas vigentes', () => {
      component.bookings.set([
        crearReserva('reserva-1', 'CONFIRMADA', 100000, fechaRelativa(5)),
        crearReserva('reserva-2', 'PENDIENTE', 100000, fechaRelativa(5)),
        crearReserva('reserva-3', 'CONFIRMADA', 100000, fechaRelativa(-5))
      ]);

      expect(component.proximas()).toBe(1);
    });

    it('debe actualizar las reservas próximas al cambiar los datos', () => {
      component.bookings.set([
        crearReserva('reserva-1', 'CONFIRMADA', 100000, fechaRelativa(5))
      ]);

      expect(component.proximas()).toBe(1);

      component.bookings.set([]);
      expect(component.proximas()).toBe(0);
    });
  });

  describe('Ingresos', () => {
    beforeEach(() => {
      crearComponente();
    });

    it('debe iniciar con ingresos cero', () => {
      expect(component.income()).toBe(0);
    });

    it('debe sumar las reservas confirmadas', () => {
      component.bookings.set([
        crearReserva('reserva-1', 'CONFIRMADA', 100000),
        crearReserva('reserva-2', 'CONFIRMADA', 200000)
      ]);

      expect(component.income()).toBe(300000);
    });

    it('no debe incluir reservas pendientes', () => {
      component.bookings.set([
        crearReserva('reserva-1', 'CONFIRMADA', 100000),
        crearReserva('reserva-2', 'PENDIENTE', 500000)
      ]);

      expect(component.income()).toBe(100000);
    });

    it('no debe incluir reservas canceladas', () => {
      component.bookings.set([
        crearReserva('reserva-1', 'CONFIRMADA', 100000),
        crearReserva('reserva-2', 'CANCELADA', 200000)
      ]);

      expect(component.income()).toBe(100000);
    });

    it('debe incluir reservas confirmadas aunque ya finalizaron', () => {
      component.bookings.set([
        crearReserva('reserva-1', 'CONFIRMADA', 150000, fechaRelativa(-5))
      ]);

      expect(component.income()).toBe(150000);
    });

    it('debe actualizar los ingresos cuando cambian las reservas', () => {
      component.bookings.set([
        crearReserva('reserva-1', 'CONFIRMADA', 100000)
      ]);

      expect(component.income()).toBe(100000);

      component.bookings.set([
        crearReserva('reserva-1', 'CONFIRMADA', 300000)
      ]);

      expect(component.income()).toBe(300000);
    });

    it('debe calcular cero cuando no hay reservas confirmadas', () => {
      component.bookings.set([
        crearReserva('reserva-1', 'PENDIENTE', 100000)
      ]);

      expect(component.income()).toBe(0);
    });
  });

  describe('Reservas recientes', () => {
    beforeEach(() => {
      crearComponente();
    });

    it('debe mostrar una lista vacía sin reservas', () => {
      expect(component.recientes()).toEqual([]);
    });

    it('debe mostrar las primeras cinco reservas', () => {
      component.bookings.set(
        Array.from(
          { length: 8 },
          (_, i) => crearReserva(`reserva-${i + 1}`)
        )
      );

      expect(component.recientes()).toHaveLength(5);
    });

    it('debe conservar el orden original', () => {
      component.bookings.set([
        crearReserva('reserva-3'),
        crearReserva('reserva-1'),
        crearReserva('reserva-2')
      ]);

      expect(component.recientes().map(item => item.id)).toEqual([
        'reserva-3',
        'reserva-1',
        'reserva-2'
      ]);
    });

    it('debe mostrar todas si existen menos de cinco', () => {
      component.bookings.set([
        crearReserva('reserva-1'),
        crearReserva('reserva-2')
      ]);

      expect(component.recientes()).toHaveLength(2);
    });

    it('debe actualizar las reservas recientes', () => {
      component.bookings.set([
        crearReserva('reserva-1')
      ]);

      expect(component.recientes()).toHaveLength(1);

      component.bookings.set([
        crearReserva('reserva-1'),
        crearReserva('reserva-2')
      ]);

      expect(component.recientes()).toHaveLength(2);
    });
  });

  describe('Calificaciones y reseñas', () => {
    it('debe consultar las reseñas de cada publicación', () => {
      mias.mockReturnValue(
        of([
          crearPublicacion(1),
          crearPublicacion(2)
        ])
      );

      crearComponente();

      expect(obtenerResenas).toHaveBeenCalledTimes(2);
      expect(obtenerResenas).toHaveBeenCalledWith(1);
      expect(obtenerResenas).toHaveBeenCalledWith(2);
    });

    it('debe calcular el total de reseñas', () => {
      mias.mockReturnValue(
        of([
          crearPublicacion(1),
          crearPublicacion(2)
        ])
      );

      obtenerResenas
        .mockReturnValueOnce(of(crearResenas(4, 3)))
        .mockReturnValueOnce(of(crearResenas(5, 2)));

      crearComponente();

      expect(component.resenasTotal()).toBe(5);
    });

    it('debe calcular la calificación ponderada', () => {
      mias.mockReturnValue(
        of([
          crearPublicacion(1),
          crearPublicacion(2)
        ])
      );

      obtenerResenas
        .mockReturnValueOnce(of(crearResenas(4, 3)))
        .mockReturnValueOnce(of(crearResenas(5, 2)));

      crearComponente();

      expect(component.rating()).toBe(4.4);
    });

    it('debe redondear la calificación a un decimal', () => {
      mias.mockReturnValue(
        of([
          crearPublicacion(1),
          crearPublicacion(2)
        ])
      );

      obtenerResenas
        .mockReturnValueOnce(of(crearResenas(4.333, 3)))
        .mockReturnValueOnce(of(crearResenas(5, 1)));

      crearComponente();

      expect(component.rating()).toBe(4.5);
    });

    it('debe mantener cero cuando no hay reseñas', () => {
      mias.mockReturnValue(
        of([crearPublicacion(1)])
      );

      crearComponente();

      expect(component.rating()).toBe(0);
      expect(component.resenasTotal()).toBe(0);
    });

    it('debe tolerar errores al consultar reseñas', () => {
      mias.mockReturnValue(
        of([crearPublicacion(1)])
      );

      obtenerResenas.mockReturnValue(
        throwError(() => new Error('Error de reseñas'))
      );

      crearComponente();

      expect(component.rating()).toBe(0);
      expect(component.resenasTotal()).toBe(0);
    });

    it('debe conservar las reseñas correctas si una consulta falla', () => {
      mias.mockReturnValue(
        of([
          crearPublicacion(1),
          crearPublicacion(2)
        ])
      );

      obtenerResenas
        .mockReturnValueOnce(of(crearResenas(5, 2)))
        .mockReturnValueOnce(
          throwError(() => new Error('Error'))
        );

      crearComponente();

      expect(component.resenasTotal()).toBe(2);
      expect(component.rating()).toBe(5);
    });
  });

  describe('Código y estado de reservas', () => {
    beforeEach(() => {
      crearComponente();
    });

    it('debe generar el código de una reserva', () => {
      const reserva = crearReserva('abc12345xyz');

      expect(component.codigo(reserva)).toBe('LR-ABC12345');
    });

    it('debe convertir el código a mayúsculas', () => {
      const reserva = crearReserva('abcdef12');

      expect(component.codigo(reserva)).toBe('LR-ABCDEF12');
    });

    it('debe utilizar únicamente ocho caracteres del identificador', () => {
      const reserva = crearReserva('123456789012345');

      expect(component.codigo(reserva)).toBe('LR-12345678');
    });

    it('debe mostrar COMPLETADA para una reserva confirmada vencida', () => {
      const reserva = crearReserva(
        'reserva-1',
        'CONFIRMADA',
        100000,
        fechaRelativa(-1)
      );

      expect(component.estadoMostrado(reserva)).toBe('COMPLETADA');
    });

    it('debe mostrar COMPLETADA si la salida es hoy', () => {
      const reserva = crearReserva(
        'reserva-1',
        'CONFIRMADA',
        100000,
        localToday()
      );

      expect(component.estadoMostrado(reserva)).toBe('COMPLETADA');
    });

    it('debe mantener CONFIRMADA para una reserva futura', () => {
      const reserva = crearReserva(
        'reserva-1',
        'CONFIRMADA',
        100000,
        fechaRelativa(5)
      );

      expect(component.estadoMostrado(reserva)).toBe('CONFIRMADA');
    });

    it('debe conservar el estado PENDIENTE', () => {
      const reserva = crearReserva('reserva-1', 'PENDIENTE');

      expect(component.estadoMostrado(reserva)).toBe('PENDIENTE');
    });

    it('debe conservar el estado CANCELADA', () => {
      const reserva = crearReserva('reserva-1', 'CANCELADA');

      expect(component.estadoMostrado(reserva)).toBe('CANCELADA');
    });
  });

  describe('Errores del backend', () => {
    it('debe mostrar error de conexión', () => {
      mias.mockReturnValue(
        throwError(() => crearError(0))
      );

      crearComponente();

      expect(component.errorCarga()).toContain(
        'No se pudo conectar con el servidor'
      );
    });

    it('debe mostrar el mensaje del backend para error 400', () => {
      mias.mockReturnValue(
        throwError(() => crearError(400, 'Datos inválidos'))
      );

      crearComponente();

      expect(component.errorCarga()).toBe('Datos inválidos');
    });

    it('debe mostrar error de sesión para 401', () => {
      recibidas.mockReturnValue(
        throwError(() => crearError(401))
      );

      crearComponente();

      expect(component.errorCarga()).toContain('Tu sesión venció');
    });

    it('debe mostrar error de permisos para 403', () => {
      recibidas.mockReturnValue(
        throwError(() => crearError(403))
      );

      crearComponente();

      expect(component.errorCarga()).toContain('no tienes permiso');
    });

    it('debe mostrar error general para 500', () => {
      mias.mockReturnValue(
        throwError(() => crearError(500))
      );

      crearComponente();

      expect(component.errorCarga()).toBe(
        'No se pudo cargar el panel. Intenta de nuevo.'
      );
    });

    it('debe detener la carga cuando ocurre un error', () => {
      mias.mockReturnValue(
        throwError(() => crearError(500))
      );

      crearComponente();

      expect(component.cargando()).toBe(false);
    });

    it('debe conservar las listas vacías cuando falla la carga', () => {
      mias.mockReturnValue(
        throwError(() => crearError(500))
      );

      crearComponente();

      expect(component.listings()).toEqual([]);
      expect(component.bookings()).toEqual([]);
    });
  });
});
