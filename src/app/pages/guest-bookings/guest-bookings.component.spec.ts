
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

import { GuestBookingsComponent } from './guest-bookings.component';
import { CatalogService } from '../../core/services/catalog.service';
import { ReservasBackService } from '../../core/services/reservas-back.service';
import { ToastService } from '../../core/services/toast.service';
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
  let obtenerDetalle: ReturnType<typeof vi.fn>;
  let cancelar: ReturnType<typeof vi.fn>;
  let showToast: ReturnType<typeof vi.fn>;

  let reservaFutura: any;
  let reservaPasada: any;
  let publicacion: any;

  const crearError = (
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
          useValue: { obtenerDetalle }
        },
        {
          provide: ToastService,
          useValue: { show: showToast }
        }
      ]
    });

    component = TestBed.runInInjectionContext(
      () => new GuestBookingsComponent()
    );
  };

  const seleccionarCancelacion = () => {
    component.cancelTarget.set(component.items()[0]);
    component.cancelReason = 'Cambio de planes';
  };

  beforeEach(() => {
    TestBed.resetTestingModule();

    reservaFutura = {
      id: '12345678-aaaa-bbbb-cccc-123456789012',
      publicacionId: 'publicacion-1',
      fechaLlegada: addDays(localToday(), 5),
      fechaSalida: addDays(localToday(), 8),
      estado: 'CONFIRMADA',
      total: 450000
    };

    reservaPasada = {
      id: '87654321-aaaa-bbbb-cccc-123456789012',
      publicacionId: 'publicacion-2',
      fechaLlegada: addDays(localToday(), -8),
      fechaSalida: addDays(localToday(), -5),
      estado: 'CONFIRMADA',
      total: 300000
    };

    publicacion = {
      uuid: 'publicacion-1',
      title: 'Apartamento de prueba',
      status: 'ACTIVA',
      capacity: 4
    };

    misReservas = vi.fn().mockReturnValue(
      of([reservaFutura, reservaPasada])
    );

    obtenerDetalle = vi.fn().mockReturnValue(of(publicacion));

    cancelar = vi.fn().mockReturnValue(
      of({ valorDevolucion: 450000 })
    );

    showToast = vi.fn();
  });

  describe('Inicialización y carga', () => {
    it('debe crear el componente', () => {
      crearComponente();

      expect(component).toBeTruthy();
    });

    it('debe consultar las reservas al iniciar', () => {
      crearComponente();

      expect(misReservas).toHaveBeenCalledTimes(1);
    });

    it('debe cargar las reservas recibidas', () => {
      crearComponente();

      expect(component.items()).toHaveLength(2);
    });

    it('debe iniciar en la pestaña de próximas reservas', () => {
      crearComponente();

      expect(component.tab()).toBe('upcoming');
    });

    it('debe finalizar el estado de carga', () => {
      crearComponente();

      expect(component.cargando()).toBe(false);
    });

    it('debe iniciar sin errores de carga', () => {
      crearComponente();

      expect(component.errorCarga()).toBe('');
    });

    it('debe generar el código de reserva correctamente', () => {
      crearComponente();

      expect(component.items()[0].codigo).toBe('LR-12345678');
    });

    it('debe conservar el total de la reserva', () => {
      crearComponente();

      expect(component.items()[0].total).toBe(450000);
    });

    it('debe consultar el detalle de cada publicación', () => {
      crearComponente();

      expect(obtenerDetalle).toHaveBeenCalledWith('publicacion-1');
      expect(obtenerDetalle).toHaveBeenCalledWith('publicacion-2');
    });

    it('debe asociar la publicación a la reserva', () => {
      crearComponente();

      expect(component.items()[0].publicacion).toEqual(publicacion);
    });

    it('debe permitir una lista vacía de reservas', () => {
      misReservas.mockReturnValue(of([]));
      crearComponente();

      expect(component.items()).toEqual([]);
      expect(component.cargando()).toBe(false);
    });

    it('debe mostrar un error cuando falla la carga', () => {
      misReservas.mockReturnValue(
        throwError(() => crearError(500))
      );

      crearComponente();

      expect(component.errorCarga()).not.toBe('');
      expect(component.cargando()).toBe(false);
    });
  });

  describe('Pestañas y estados', () => {
    it('debe mostrar reservas futuras confirmadas', () => {
      crearComponente();

      expect(component.visible()).toHaveLength(1);
      expect(component.visible()[0].id).toBe(reservaFutura.id);
    });

    it('debe mostrar el historial al cambiar de pestaña', () => {
      crearComponente();
      component.tab.set('history');

      expect(component.visible()).toHaveLength(1);
      expect(component.visible()[0].id).toBe(reservaPasada.id);
    });

    it('debe incluir reservas futuras pendientes', () => {
      reservaFutura.estado = 'PENDIENTE';
      crearComponente();

      expect(component.visible()).toHaveLength(1);
    });

    it('debe enviar reservas canceladas al historial', () => {
      reservaFutura.estado = 'CANCELADA';
      crearComponente();

      expect(component.visible()).toHaveLength(0);

      component.tab.set('history');

      expect(component.visible()).toHaveLength(2);
    });

    it('debe mostrar una reserva pasada confirmada como completada', () => {
      crearComponente();

      expect(
        component.estadoMostrado(component.items()[1])
      ).toBe('COMPLETADA');
    });

    it('debe conservar el estado de una reserva futura', () => {
      crearComponente();

      expect(
        component.estadoMostrado(component.items()[0])
      ).toBe('CONFIRMADA');
    });

    it('debe conservar el estado cancelado', () => {
      reservaFutura.estado = 'CANCELADA';
      crearComponente();

      expect(
        component.estadoMostrado(component.items()[0])
      ).toBe('CANCELADA');
    });

    it('debe actualizar los resultados al cambiar de pestaña', () => {
      crearComponente();

      component.tab.set('history');
      expect(component.visible()[0].id).toBe(reservaPasada.id);

      component.tab.set('upcoming');
      expect(component.visible()[0].id).toBe(reservaFutura.id);
    });
  });

  describe('Reembolsos', () => {
    it('debe calcular reembolso completo con cinco días de anticipación', () => {
      crearComponente();

      expect(
        component.reembolsoEstimado(component.items()[0])
      ).toBe(450000);
    });

    it('debe calcular reembolso completo con tres días de anticipación', () => {
      reservaFutura.fechaLlegada = addDays(localToday(), 3);
      crearComponente();

      expect(
        component.reembolsoEstimado(component.items()[0])
      ).toBe(450000);
    });

    it('debe calcular reembolso cero con dos días de anticipación', () => {
      reservaFutura.fechaLlegada = addDays(localToday(), 2);
      crearComponente();

      expect(
        component.reembolsoEstimado(component.items()[0])
      ).toBe(0);
    });

    it('debe calcular reembolso cero el mismo día de llegada', () => {
      reservaFutura.fechaLlegada = localToday();
      crearComponente();

      expect(
        component.reembolsoEstimado(component.items()[0])
      ).toBe(0);
    });

    it('debe calcular reembolso cero después de la llegada', () => {
      crearComponente();

      expect(
        component.reembolsoEstimado(component.items()[1])
      ).toBe(0);
    });
  });

  describe('Cancelación de reservas', () => {
    it('no debe cancelar sin seleccionar una reserva', () => {
      crearComponente();

      component.confirmCancel();

      expect(cancelar).not.toHaveBeenCalled();
    });

    it('no debe cancelar sin motivo', () => {
      crearComponente();

      component.cancelTarget.set(component.items()[0]);
      component.cancelReason = '';

      component.confirmCancel();

      expect(cancelar).not.toHaveBeenCalled();
    });

    it('no debe aceptar un motivo compuesto solo por espacios', () => {
      crearComponente();

      component.cancelTarget.set(component.items()[0]);
      component.cancelReason = '   ';

      component.confirmCancel();

      expect(cancelar).not.toHaveBeenCalled();
    });

    it('debe enviar el identificador y motivo de cancelación', () => {
      crearComponente();
      seleccionarCancelacion();

      component.confirmCancel();

      expect(cancelar).toHaveBeenCalledWith(
        reservaFutura.id,
        'Cambio de planes'
      );
    });

    it('debe eliminar espacios del motivo antes de enviarlo', () => {
      crearComponente();
      seleccionarCancelacion();
      component.cancelReason = '  Cambio de planes  ';

      component.confirmCancel();

      expect(cancelar).toHaveBeenCalledWith(
        reservaFutura.id,
        'Cambio de planes'
      );
    });

    it('debe limpiar la reserva seleccionada después de cancelar', () => {
      crearComponente();
      seleccionarCancelacion();

      component.confirmCancel();

      expect(component.cancelTarget()).toBeNull();
    });

    it('debe limpiar el motivo después de cancelar', () => {
      crearComponente();
      seleccionarCancelacion();

      component.confirmCancel();

      expect(component.cancelReason).toBe('');
    });

    it('debe mostrar una notificación de cancelación', () => {
      crearComponente();
      seleccionarCancelacion();

      component.confirmCancel();

      expect(showToast).toHaveBeenCalledWith(
        expect.stringContaining('La reserva fue cancelada'),
        'warning'
      );
    });

    it('debe incluir la devolución en la notificación', () => {
      crearComponente();
      seleccionarCancelacion();

      component.confirmCancel();

      expect(showToast).toHaveBeenCalledWith(
        expect.stringContaining('Devolución:'),
        'warning'
      );
    });

    it('debe volver a cargar las reservas después de cancelar', () => {
      crearComponente();
      seleccionarCancelacion();

      component.confirmCancel();

      expect(misReservas).toHaveBeenCalledTimes(2);
    });

    it('debe finalizar el procesamiento después de cancelar', () => {
      crearComponente();
      seleccionarCancelacion();

      component.confirmCancel();

      expect(component.procesando()).toBe(false);
    });

    it('debe impedir cancelaciones duplicadas durante el procesamiento', () => {
      const pendiente = new Subject<any>();
      cancelar.mockReturnValue(pendiente.asObservable());

      crearComponente();
      seleccionarCancelacion();

      component.confirmCancel();
      component.confirmCancel();

      expect(cancelar).toHaveBeenCalledTimes(1);
      expect(component.procesando()).toBe(true);

      pendiente.next({ valorDevolucion: 450000 });
      pendiente.complete();

      expect(component.procesando()).toBe(false);
    });

    it('debe mostrar el error del backend al cancelar', () => {
      cancelar.mockReturnValue(
        throwError(() => crearError(400, 'Cancelación no permitida'))
      );

      crearComponente();
      seleccionarCancelacion();

      component.confirmCancel();

      expect(showToast).toHaveBeenCalledWith(
        'Cancelación no permitida',
        'warning'
      );
    });

    it('debe finalizar el procesamiento si falla la cancelación', () => {
      cancelar.mockReturnValue(
        throwError(() => crearError(500))
      );

      crearComponente();
      seleccionarCancelacion();

      component.confirmCancel();

      expect(component.procesando()).toBe(false);
    });
  });
});
