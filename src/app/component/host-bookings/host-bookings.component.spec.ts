
// @vitest-environment jsdom
import '@angular/compiler';

import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting
} from '@angular/platform-browser-dynamic/testing';
import { Subject, of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { HostBookingsComponent } from './host-bookings.component';
import { ReservasBackService } from '../../core/services/reservas-back.service';
import { addDays, localToday } from '../../core/models/date-rules';

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

describe('HostBookingsComponent', () => {
  let component: HostBookingsComponent;
  let recibidas: ReturnType<typeof vi.fn>;

  let reservas: any[];

  const crearError = (
    status: number,
    error: unknown = null
  ) => new HttpErrorResponse({ status, error });

  const crearComponente = () => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: ReservasBackService,
          useValue: { recibidas }
        }
      ]
    });

    component = TestBed.runInInjectionContext(
      () => new HostBookingsComponent()
    );
  };

  beforeEach(() => {
    TestBed.resetTestingModule();

    reservas = [
      {
        id: '12345678-aaaa-bbbb-cccc-123456789012',
        publicacionId: 'publicacion-1',
        estado: 'PENDIENTE',
        fechaLlegada: addDays(localToday(), 5),
        fechaSalida: addDays(localToday(), 8),
        total: 400000
      },
      {
        id: '87654321-aaaa-bbbb-cccc-123456789012',
        publicacionId: 'publicacion-2',
        estado: 'CONFIRMADA',
        fechaLlegada: addDays(localToday(), 3),
        fechaSalida: addDays(localToday(), 6),
        total: 600000
      },
      {
        id: 'abcdef12-aaaa-bbbb-cccc-123456789012',
        publicacionId: 'publicacion-3',
        estado: 'CONFIRMADA',
        fechaLlegada: addDays(localToday(), -7),
        fechaSalida: addDays(localToday(), -4),
        total: 350000
      },
      {
        id: 'fedcba98-aaaa-bbbb-cccc-123456789012',
        publicacionId: 'publicacion-4',
        estado: 'CANCELADA',
        fechaLlegada: addDays(localToday(), 2),
        fechaSalida: addDays(localToday(), 5),
        total: 250000
      }
    ];

    recibidas = vi.fn().mockReturnValue(of(reservas));
  });

  describe('Inicialización', () => {
    it('debe crear el componente correctamente', () => {
      crearComponente();

      expect(component).toBeTruthy();
    });

    it('debe consultar las reservas recibidas', () => {
      crearComponente();

      expect(recibidas).toHaveBeenCalledTimes(1);
    });

    it('debe cargar todas las reservas', () => {
      crearComponente();

      expect(component.items()).toHaveLength(4);
    });

    it('debe conservar los datos de las reservas', () => {
      crearComponente();

      expect(component.items()).toEqual(reservas);
    });

    it('debe iniciar con el filtro TODAS', () => {
      crearComponente();

      expect(component.filter()).toBe('TODAS');
    });

    it('debe iniciar sin errores de carga', () => {
      crearComponente();

      expect(component.errorCarga()).toBe('');
    });

    it('debe finalizar el estado de carga', () => {
      crearComponente();

      expect(component.cargando()).toBe(false);
    });

    it('debe incluir los cinco filtros disponibles', () => {
      crearComponente();

      expect(component.filtros).toEqual([
        'TODAS',
        'PENDIENTE',
        'CONFIRMADA',
        'COMPLETADA',
        'CANCELADA'
      ]);
    });

    it('debe permitir una lista vacía de reservas', () => {
      recibidas.mockReturnValue(of([]));
      crearComponente();

      expect(component.items()).toEqual([]);
      expect(component.visible()).toEqual([]);
    });

    it('debe finalizar la carga con una lista vacía', () => {
      recibidas.mockReturnValue(of([]));
      crearComponente();

      expect(component.cargando()).toBe(false);
    });
  });

  describe('Filtros de reservas', () => {
    it('debe mostrar todas las reservas inicialmente', () => {
      crearComponente();

      expect(component.visible()).toHaveLength(4);
    });

    it('debe filtrar las reservas pendientes', () => {
      crearComponente();
      component.filter.set('PENDIENTE');

      expect(component.visible()).toHaveLength(1);
      expect(component.visible()[0].estado).toBe('PENDIENTE');
    });

    it('debe filtrar las reservas confirmadas futuras', () => {
      crearComponente();
      component.filter.set('CONFIRMADA');

      expect(component.visible()).toHaveLength(1);
      expect(component.visible()[0].id).toBe(reservas[1].id);
    });

    it('debe filtrar las reservas completadas', () => {
      crearComponente();
      component.filter.set('COMPLETADA');

      expect(component.visible()).toHaveLength(1);
      expect(component.visible()[0].id).toBe(reservas[2].id);
    });

    it('debe filtrar las reservas canceladas', () => {
      crearComponente();
      component.filter.set('CANCELADA');

      expect(component.visible()).toHaveLength(1);
      expect(component.visible()[0].id).toBe(reservas[3].id);
    });

    it('debe regresar a todas las reservas', () => {
      crearComponente();

      component.filter.set('PENDIENTE');
      component.filter.set('TODAS');

      expect(component.visible()).toHaveLength(4);
    });

    it('debe devolver una lista vacía para un filtro desconocido', () => {
      crearComponente();
      component.filter.set('DESCONOCIDO');

      expect(component.visible()).toEqual([]);
    });

    it('debe actualizar las reservas visibles al cambiar el filtro', () => {
      crearComponente();

      component.filter.set('PENDIENTE');
      expect(component.visible()[0].id).toBe(reservas[0].id);

      component.filter.set('CANCELADA');
      expect(component.visible()[0].id).toBe(reservas[3].id);
    });

    it('debe actualizar las reservas visibles cuando cambian los datos', () => {
      crearComponente();
      component.filter.set('PENDIENTE');

      component.items.set([
        ...reservas,
        {
          ...reservas[0],
          id: 'nueva-reserva-pendiente'
        }
      ]);

      expect(component.visible()).toHaveLength(2);
    });

    it('debe conservar el orden original de las reservas filtradas', () => {
      crearComponente();

      component.filter.set('TODAS');

      expect(component.visible().map((r) => r.id)).toEqual(
        reservas.map((r) => r.id)
      );
    });
  });

  describe('Códigos y estados', () => {
    it('debe generar el código de la primera reserva', () => {
      crearComponente();

      expect(component.codigo(reservas[0])).toBe('LR-12345678');
    });

    it('debe generar el código de otra reserva', () => {
      crearComponente();

      expect(component.codigo(reservas[1])).toBe('LR-87654321');
    });

    it('debe convertir letras del código a mayúsculas', () => {
      crearComponente();

      expect(component.codigo(reservas[2])).toBe('LR-ABCDEF12');
    });

    it('debe mostrar una reserva pendiente como PENDIENTE', () => {
      crearComponente();

      expect(component.estadoMostrado(reservas[0])).toBe('PENDIENTE');
    });

    it('debe mostrar una reserva futura confirmada como CONFIRMADA', () => {
      crearComponente();

      expect(component.estadoMostrado(reservas[1])).toBe('CONFIRMADA');
    });

    it('debe mostrar una reserva pasada confirmada como COMPLETADA', () => {
      crearComponente();

      expect(component.estadoMostrado(reservas[2])).toBe('COMPLETADA');
    });

    it('debe mostrar una reserva cancelada como CANCELADA', () => {
      crearComponente();

      expect(component.estadoMostrado(reservas[3])).toBe('CANCELADA');
    });

    it('debe completar una reserva cuya salida es hoy', () => {
      crearComponente();

      const reserva = {
        ...reservas[1],
        fechaSalida: localToday()
      };

      expect(component.estadoMostrado(reserva)).toBe('COMPLETADA');
    });

    it('no debe completar una reserva pendiente aunque su fecha haya pasado', () => {
      crearComponente();

      const reserva = {
        ...reservas[0],
        fechaSalida: addDays(localToday(), -1)
      };

      expect(component.estadoMostrado(reserva)).toBe('PENDIENTE');
    });
  });

  describe('Errores y carga asíncrona', () => {
    it('debe mostrar error de conexión con el servidor', () => {
      recibidas.mockReturnValue(
        throwError(() => crearError(0))
      );

      crearComponente();

      expect(component.errorCarga()).toContain(
        'No se pudo conectar con el servidor'
      );
    });

    it('debe mostrar el mensaje del backend para error 400', () => {
      recibidas.mockReturnValue(
        throwError(() => crearError(400, 'Solicitud inválida'))
      );

      crearComponente();

      expect(component.errorCarga()).toBe('Solicitud inválida');
    });

    it('debe informar cuando la sesión venció', () => {
      recibidas.mockReturnValue(
        throwError(() => crearError(401))
      );

      crearComponente();

      expect(component.errorCarga()).toContain('sesión venció');
    });

    it('debe informar cuando no hay permisos', () => {
      recibidas.mockReturnValue(
        throwError(() => crearError(403))
      );

      crearComponente();

      expect(component.errorCarga()).toContain('no tienes permiso');
    });

    it('debe mostrar un mensaje general para errores del servidor', () => {
      recibidas.mockReturnValue(
        throwError(() => crearError(500))
      );

      crearComponente();

      expect(component.errorCarga()).toBe(
        'No se pudieron cargar las reservas. Intenta de nuevo.'
      );
    });

    it('debe mantener la carga activa mientras espera la respuesta', () => {
      const pendiente = new Subject<any[]>();
      recibidas.mockReturnValue(pendiente.asObservable());

      crearComponente();

      expect(component.cargando()).toBe(true);
      expect(component.items()).toEqual([]);

      pendiente.next(reservas);
      pendiente.complete();

      expect(component.cargando()).toBe(false);
      expect(component.items()).toHaveLength(4);
    });
  });
});
