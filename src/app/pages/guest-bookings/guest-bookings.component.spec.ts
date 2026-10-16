
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
import { ReservasBackService } from '../../core/services/reservas-back.service';
import { CatalogService } from '../../core/services/catalog.service';
import { ToastService } from '../../core/services/toast.service';
import { Listing } from '../../core/models/marketplace.models';
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

describe('GuestBookingsComponent', () => {
  let component: GuestBookingsComponent;

  let misReservas: ReturnType<typeof vi.fn>;
  let cancelar: ReturnType<typeof vi.fn>;
  let obtenerDetalle: ReturnType<typeof vi.fn>;
  let mostrarToast: ReturnType<typeof vi.fn>;

  const hoy = () => localToday();
  const fecha = (dias: number) => addDays(hoy(), dias);

  const alojamiento = (
    id: number,
    cambios: Record<string, unknown> = {}
  ): Listing => ({
    id,
    title: `Alojamiento ${id}`,
    city: 'Bogotá',
    status: 'ACTIVA',
    capacity: 4,
    ...cambios
  } as Listing);

  const reserva = (
    id: string,
    cambios: Record<string, unknown> = {}
  ) => ({
    id,
    publicacionId: `publicacion-${id}`,
    estado: 'CONFIRMADA',
    fechaLlegada: fecha(5),
    fechaSalida: fecha(8),
    total: 500000,
    ...cambios
  });

  const errorHttp = (
    status: number,
    error: unknown = null
  ) => new HttpErrorResponse({ status, error });

  const crearComponente = () => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: ReservasBackService,
          useValue: { misReservas, cancelar }
        },
        {
          provide: CatalogService,
          useValue: { obtenerDetalle, obtenerResenas: vi.fn().mockReturnValue(of({ promedio: 0, total: 0, resenas: [] })) }
        },
        {
          provide: ToastService,
          useValue: { show: mostrarToast }
        }
      ]
    });

    component = TestBed.runInInjectionContext(
      () => new GuestBookingsComponent()
    );
  };

  const establecerReservas = (
    ...reservas: ReturnType<typeof reserva>[]
  ) => {
    misReservas.mockReturnValue(of(reservas));
  };

  const seleccionarCancelacion = (id: string) => {
    const seleccionada = component.items().find(
      item => item.id === id
    );

    expect(seleccionada).toBeDefined();
    component.cancelTarget.set(seleccionada!);
  };

  beforeEach(() => {
    TestBed.resetTestingModule();

    misReservas = vi.fn().mockReturnValue(of([]));

    cancelar = vi.fn().mockReturnValue(
      of({ valorDevolucion: 0 })
    );

    obtenerDetalle = vi.fn().mockReturnValue(
      of(alojamiento(1))
    );

    mostrarToast = vi.fn();
  });

  describe('Inicialización', () => {
    it('debe crear el componente', () => {
      crearComponente();
      expect(component).toBeTruthy();
    });

    it('debe iniciar en la pestaña de próximas reservas', () => {
      crearComponente();
      expect(component.tab()).toBe('upcoming');
    });

    it('debe iniciar sin reservas cuando el backend devuelve una lista vacía', () => {
      crearComponente();
      expect(component.items()).toEqual([]);
    });

    it('debe iniciar sin errores', () => {
      crearComponente();
      expect(component.errorCarga()).toBe('');
    });

    it('debe iniciar sin procesamiento de cancelación', () => {
      crearComponente();
      expect(component.procesando()).toBe(false);
    });

    it('debe iniciar sin reserva seleccionada para cancelar', () => {
      crearComponente();
      expect(component.cancelTarget()).toBeNull();
    });

    it('debe iniciar con motivo de cancelación vacío', () => {
      crearComponente();
      expect(component.cancelReason).toBe('');
    });

    it('debe guardar la fecha actual', () => {
      crearComponente();
      expect(component.today).toBe(hoy());
    });

    it('debe consultar las reservas al crear el componente', () => {
      crearComponente();
      expect(misReservas).toHaveBeenCalledTimes(1);
    });
  });

  describe('Carga de reservas', () => {
    it('debe cargar una reserva', () => {
      establecerReservas(reserva('abc12345'));
      crearComponente();

      expect(component.items()).toHaveLength(1);
    });

    it('debe cargar varias reservas', () => {
      establecerReservas(
        reserva('reserva1'),
        reserva('reserva2'),
        reserva('reserva3')
      );

      crearComponente();

      expect(component.items()).toHaveLength(3);
    });

    it('debe generar el código de reserva con prefijo LR', () => {
      establecerReservas(reserva('abcdefgh123456'));
      crearComponente();

      expect(component.items()[0].codigo).toBe('LR-ABCDEFGH');
    });

    it('debe conservar el estado de la reserva', () => {
      establecerReservas(
        reserva('abc12345', { estado: 'PENDIENTE' })
      );

      crearComponente();

      expect(component.items()[0].estado).toBe('PENDIENTE');
    });

    it('debe conservar el valor total de la reserva', () => {
      establecerReservas(
        reserva('abc12345', { total: 750000 })
      );

      crearComponente();

      expect(component.items()[0].total).toBe(750000);
    });

    it('debe conservar las fechas de la reserva', () => {
      establecerReservas(
        reserva('abc12345', {
          fechaLlegada: fecha(3),
          fechaSalida: fecha(6)
        })
      );

      crearComponente();

      expect(component.items()[0].fechaLlegada).toBe(fecha(3));
      expect(component.items()[0].fechaSalida).toBe(fecha(6));
    });

    it('debe consultar el alojamiento asociado', () => {
      establecerReservas(reserva('abc12345'));
      crearComponente();

      expect(obtenerDetalle).toHaveBeenCalledWith(
        'publicacion-abc12345'
      );
    });

    it('debe asociar los datos del alojamiento a la reserva', () => {
      establecerReservas(reserva('abc12345'));

      obtenerDetalle.mockReturnValue(
        of(alojamiento(5, { title: 'Casa en la playa' }))
      );

      crearComponente();

      expect(component.items()[0].publicacion?.title).toBe(
        'Casa en la playa'
      );
    });

    it('debe asociar cada alojamiento con su reserva correspondiente', () => {
      establecerReservas(
        reserva('reserva1'),
        reserva('reserva2')
      );

      obtenerDetalle.mockImplementation((id: string) =>
        of(alojamiento(
          id === 'publicacion-reserva1' ? 1 : 2
        ))
      );

      crearComponente();

      expect(component.items()[0].publicacion?.id).toBe(1);
      expect(component.items()[1].publicacion?.id).toBe(2);
    });

    it('debe activar la carga mientras espera el backend', () => {
      const pendiente = new Subject<
        ReturnType<typeof reserva>[]
      >();

      misReservas.mockReturnValue(pendiente.asObservable());

      crearComponente();

      expect(component.cargando()).toBe(true);

      pendiente.next([]);
      pendiente.complete();

      expect(component.cargando()).toBe(false);
    });

    it('debe permitir recargar las reservas', () => {
      crearComponente();

      establecerReservas(reserva('nueva123'));
      component.cargar();

      expect(misReservas).toHaveBeenCalledTimes(2);
      expect(component.items()).toHaveLength(1);
    });
  });

  describe('Pestañas y estados', () => {
    it('debe mostrar reservas confirmadas futuras en próximas', () => {
      establecerReservas(
        reserva('abc12345', {
          estado: 'CONFIRMADA',
          fechaSalida: fecha(5)
        })
      );

      crearComponente();

      expect(component.visible()).toHaveLength(1);
    });

    it('debe mostrar reservas pendientes futuras en próximas', () => {
      establecerReservas(
        reserva('abc12345', {
          estado: 'PENDIENTE',
          fechaSalida: fecha(5)
        })
      );

      crearComponente();

      expect(component.visible()).toHaveLength(1);
    });

    it('debe excluir reservas canceladas de próximas', () => {
      establecerReservas(
        reserva('abc12345', {
          estado: 'CANCELADA'
        })
      );

      crearComponente();

      expect(component.visible()).toEqual([]);
    });

    it('debe mostrar reservas canceladas en historial', () => {
      establecerReservas(
        reserva('abc12345', {
          estado: 'CANCELADA'
        })
      );

      crearComponente();
      component.tab.set('history');

      expect(component.visible()).toHaveLength(1);
    });

    it('debe mostrar reservas pasadas en historial', () => {
      establecerReservas(
        reserva('abc12345', {
          fechaLlegada: fecha(-8),
          fechaSalida: fecha(-5)
        })
      );

      crearComponente();
      component.tab.set('history');

      expect(component.visible()).toHaveLength(1);
    });

    it('debe mostrar COMPLETADA para una reserva confirmada finalizada', () => {
      establecerReservas(
        reserva('abc12345', {
          estado: 'CONFIRMADA',
          fechaSalida: fecha(-1)
        })
      );

      crearComponente();

      expect(
        component.estadoMostrado(component.items()[0])
      ).toBe('COMPLETADA');
    });

    it('debe conservar CONFIRMADA para una reserva futura', () => {
      establecerReservas(reserva('abc12345'));
      crearComponente();

      expect(
        component.estadoMostrado(component.items()[0])
      ).toBe('CONFIRMADA');
    });

    it('debe conservar CANCELADA en el estado mostrado', () => {
      establecerReservas(
        reserva('abc12345', {
          estado: 'CANCELADA'
        })
      );

      crearComponente();

      expect(
        component.estadoMostrado(component.items()[0])
      ).toBe('CANCELADA');
    });
  });

  describe('Reembolsos', () => {
    it('debe devolver el total cuando faltan más de tres días', () => {
      establecerReservas(
        reserva('abc12345', {
          fechaLlegada: fecha(5),
          total: 500000
        })
      );

      crearComponente();

      expect(
        component.reembolsoEstimado(component.items()[0])
      ).toBe(500000);
    });

    it('debe devolver el total cuando faltan exactamente tres días', () => {
      establecerReservas(
        reserva('abc12345', {
          fechaLlegada: fecha(3),
          total: 400000
        })
      );

      crearComponente();

      expect(
        component.reembolsoEstimado(component.items()[0])
      ).toBe(400000);
    });

    it('no debe estimar reembolso cuando faltan dos días', () => {
      establecerReservas(
        reserva('abc12345', {
          fechaLlegada: fecha(2)
        })
      );

      crearComponente();

      expect(
        component.reembolsoEstimado(component.items()[0])
      ).toBe(0);
    });

    it('no debe estimar reembolso el día de llegada', () => {
      establecerReservas(
        reserva('abc12345', {
          fechaLlegada: hoy()
        })
      );

      crearComponente();

      expect(
        component.reembolsoEstimado(component.items()[0])
      ).toBe(0);
    });
  });

  describe('Cancelaciones', () => {
    it('no debe cancelar si no hay reserva seleccionada', () => {
      crearComponente();

      component.cancelReason = 'Cambio de planes';
      component.confirmCancel();

      expect(cancelar).not.toHaveBeenCalled();
    });

    it('no debe cancelar si el motivo está vacío', () => {
      establecerReservas(reserva('abc12345'));
      crearComponente();

      seleccionarCancelacion('abc12345');
      component.cancelReason = '';
      component.confirmCancel();

      expect(cancelar).not.toHaveBeenCalled();
    });

    it('no debe cancelar si el motivo solo contiene espacios', () => {
      establecerReservas(reserva('abc12345'));
      crearComponente();

      seleccionarCancelacion('abc12345');
      component.cancelReason = '   ';
      component.confirmCancel();

      expect(cancelar).not.toHaveBeenCalled();
    });

    it('debe enviar el identificador y motivo al backend', () => {
      establecerReservas(reserva('abc12345'));
      crearComponente();

      seleccionarCancelacion('abc12345');
      component.cancelReason = 'Cambio de planes';
      component.confirmCancel();

      expect(cancelar).toHaveBeenCalledWith(
        'abc12345',
        'Cambio de planes'
      );
    });

    it('debe eliminar espacios del motivo de cancelación', () => {
      establecerReservas(reserva('abc12345'));
      crearComponente();

      seleccionarCancelacion('abc12345');
      component.cancelReason = '  Cambio de planes  ';
      component.confirmCancel();

      expect(cancelar).toHaveBeenCalledWith(
        'abc12345',
        'Cambio de planes'
      );
    });

    it('debe bloquear otra cancelación mientras procesa', () => {
      establecerReservas(reserva('abc12345'));
      crearComponente();

      seleccionarCancelacion('abc12345');
      component.cancelReason = 'Cambio de planes';
      component.procesando.set(true);

      component.confirmCancel();

      expect(cancelar).not.toHaveBeenCalled();
    });

    it('debe activar procesamiento durante la cancelación', () => {
      const pendiente = new Subject<{
        valorDevolucion: number
      }>();

      cancelar.mockReturnValue(pendiente.asObservable());

      establecerReservas(reserva('abc12345'));
      crearComponente();

      seleccionarCancelacion('abc12345');
      component.cancelReason = 'Cambio de planes';
      component.confirmCancel();

      expect(component.procesando()).toBe(true);

      pendiente.next({ valorDevolucion: 500000 });
      pendiente.complete();

      expect(component.procesando()).toBe(false);
    });

    it('debe limpiar la selección después de cancelar', () => {
      establecerReservas(reserva('abc12345'));
      crearComponente();

      seleccionarCancelacion('abc12345');
      component.cancelReason = 'Cambio de planes';
      component.confirmCancel();

      expect(component.cancelTarget()).toBeNull();
    });

    it('debe limpiar el motivo después de cancelar', () => {
      establecerReservas(reserva('abc12345'));
      crearComponente();

      seleccionarCancelacion('abc12345');
      component.cancelReason = 'Cambio de planes';
      component.confirmCancel();

      expect(component.cancelReason).toBe('');
    });

    it('debe mostrar confirmación de cancelación', () => {
      establecerReservas(reserva('abc12345'));
      crearComponente();

      seleccionarCancelacion('abc12345');
      component.cancelReason = 'Cambio de planes';
      component.confirmCancel();

      expect(mostrarToast).toHaveBeenCalledWith(
        expect.stringContaining('La reserva fue cancelada'),
        'warning'
      );
    });

    it('debe mostrar el valor de devolución', () => {
      establecerReservas(reserva('abc12345'));

      cancelar.mockReturnValue(
        of({ valorDevolucion: 500000 })
      );

      crearComponente();

      seleccionarCancelacion('abc12345');
      component.cancelReason = 'Cambio de planes';
      component.confirmCancel();

      expect(mostrarToast).toHaveBeenCalledWith(
        expect.stringContaining('500.000'),
        'warning'
      );
    });

    it('debe recargar reservas después de cancelar', () => {
      establecerReservas(reserva('abc12345'));
      crearComponente();

      seleccionarCancelacion('abc12345');
      component.cancelReason = 'Cambio de planes';
      component.confirmCancel();

      expect(misReservas).toHaveBeenCalledTimes(2);
    });
  });

  describe('Errores del backend', () => {
    it('debe mostrar error de conexión al cargar reservas', () => {
      misReservas.mockReturnValue(
        throwError(() => errorHttp(0))
      );

      crearComponente();

      expect(component.errorCarga()).toContain(
        'No se pudo conectar con el servidor'
      );
    });

    it('debe mostrar el mensaje del backend para error 400', () => {
      misReservas.mockReturnValue(
        throwError(() => errorHttp(400, 'Solicitud inválida'))
      );

      crearComponente();

      expect(component.errorCarga()).toBe('Solicitud inválida');
    });

    it('debe mostrar error de sesión para estado 401', () => {
      misReservas.mockReturnValue(
        throwError(() => errorHttp(401))
      );

      crearComponente();

      expect(component.errorCarga()).toContain(
        'Tu sesión venció'
      );
    });

    it('debe mostrar error de sesión para estado 403', () => {
      misReservas.mockReturnValue(
        throwError(() => errorHttp(403))
      );

      crearComponente();

      expect(component.errorCarga()).toContain(
        'Tu sesión venció'
      );
    });

    it('debe mostrar error general para estado 500', () => {
      misReservas.mockReturnValue(
        throwError(() => errorHttp(500))
      );

      crearComponente();

      expect(component.errorCarga()).toBe(
        'No se pudo completar la operación. Intenta de nuevo.'
      );
    });

    it('debe detener la carga cuando falla la consulta', () => {
      misReservas.mockReturnValue(
        throwError(() => errorHttp(500))
      );

      crearComponente();

      expect(component.cargando()).toBe(false);
    });

    it('debe mostrar un aviso cuando falla la cancelación', () => {
      establecerReservas(reserva('abc12345'));

      cancelar.mockReturnValue(
        throwError(() => errorHttp(500))
      );

      crearComponente();

      seleccionarCancelacion('abc12345');
      component.cancelReason = 'Cambio de planes';
      component.confirmCancel();

      expect(mostrarToast).toHaveBeenCalledWith(
        'No se pudo completar la operación. Intenta de nuevo.',
        'warning'
      );
    });

    it('debe detener el procesamiento si falla la cancelación', () => {
      establecerReservas(reserva('abc12345'));

      cancelar.mockReturnValue(
        throwError(() => errorHttp(500))
      );

      crearComponente();

      seleccionarCancelacion('abc12345');
      component.cancelReason = 'Cambio de planes';
      component.confirmCancel();

      expect(component.procesando()).toBe(false);
    });

    it('debe conservar la reserva seleccionada si falla la cancelación', () => {
      establecerReservas(reserva('abc12345'));

      cancelar.mockReturnValue(
        throwError(() => errorHttp(500))
      );

      crearComponente();

      seleccionarCancelacion('abc12345');
      component.cancelReason = 'Cambio de planes';
      component.confirmCancel();

      expect(component.cancelTarget()?.id).toBe('abc12345');
    });

    it('debe limpiar el error al recargar correctamente', () => {
      misReservas.mockReturnValue(
        throwError(() => errorHttp(500))
      );

      crearComponente();

      expect(component.errorCarga()).not.toBe('');

      establecerReservas();
      component.cargar();

      expect(component.errorCarga()).toBe('');
      expect(component.items()).toEqual([]);
      expect(component.cargando()).toBe(false);
    });
  });
});
