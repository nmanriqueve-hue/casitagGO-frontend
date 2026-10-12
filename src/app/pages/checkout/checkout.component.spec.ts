
// @vitest-environment jsdom
import '@angular/compiler';

import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting
} from '@angular/platform-browser-dynamic/testing';
import {
  ActivatedRoute,
  Router,
  convertToParamMap
} from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CheckoutComponent } from './checkout.component';
import { CatalogService } from '../../core/services/catalog.service';
import { ReservasBackService } from '../../core/services/reservas-back.service';
import { SessionService } from '../../core/services/session.service';

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

describe('CheckoutComponent', () => {
  const UUID = '123e4567-e89b-42d3-a456-426614174000';
  const OTRO_UUID = '123e4567-e89b-42d3-a456-426614174001';

  let component: CheckoutComponent;
  let obtenerDetalle: ReturnType<typeof vi.fn>;
  let cotizar: ReturnType<typeof vi.fn>;
  let crearReserva: ReturnType<typeof vi.fn>;
  let pagar: ReturnType<typeof vi.fn>;
  let currentUser: ReturnType<typeof vi.fn>;
  let role: ReturnType<typeof vi.fn>;
  let navigate: ReturnType<typeof vi.fn>;

  let routeId: string;
  let queryParams: Record<string, string>;
  let detalle: any;
  let cotizacionRespuesta: any;
  let reservaRespuesta: any;

  const crearError = (
    status: number,
    error: unknown = null
  ) => new HttpErrorResponse({ status, error });

  const configurarComponente = () => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({ id: routeId }),
              queryParamMap: convertToParamMap(queryParams)
            }
          }
        },
        {
          provide: Router,
          useValue: { navigate }
        },
        {
          provide: CatalogService,
          useValue: { obtenerDetalle }
        },
        {
          provide: SessionService,
          useValue: { currentUser, role }
        },
        {
          provide: ReservasBackService,
          useValue: { cotizar, crearReserva, pagar }
        }
      ]
    });

    component = TestBed.runInInjectionContext(
      () => new CheckoutComponent()
    );
  };

  const aceptarPago = () => {
    component.paymentForm.patchValue({
      tarjeta: 'pm_card_visa',
      accept: true
    });
  };

  beforeEach(() => {
    TestBed.resetTestingModule();

    routeId = UUID;
    queryParams = {
      checkIn: '2026-11-10',
      checkOut: '2026-11-13',
      guests: '2',
      extras: 'false'
    };

    detalle = {
      uuid: UUID,
      title: 'Apartamento de prueba',
      status: 'ACTIVA',
      hostUuid: OTRO_UUID,
      capacity: 4
    };

    cotizacionRespuesta = {
      id: 'cotizacion-001',
      creadoEn: null,
      publicacionId: UUID,
      noches: 3,
      precioBase: 450000,
      tarifaLimpieza: 30000,
      tarifaServicio: 20000,
      serviciosAdicionales: 0,
      total: 500000
    };

    reservaRespuesta = {
      id: 'reserva-123456789',
      creadoEn: null,
      publicacionId: UUID,
      fechaLlegada: '2026-11-10',
      fechaSalida: '2026-11-13',
      estado: 'PENDIENTE',
      total: 500000
    };

    obtenerDetalle = vi.fn().mockImplementation(() => of(detalle));
    cotizar = vi.fn().mockImplementation(() => of(cotizacionRespuesta));
    crearReserva = vi.fn().mockImplementation(() => of(reservaRespuesta));
    pagar = vi.fn().mockReturnValue(of({ estado: 'APROBADO' }));
    currentUser = vi.fn().mockReturnValue({ uuid: 'usuario-001' });
    role = vi.fn().mockReturnValue('guest');
    navigate = vi.fn().mockResolvedValue(true);
  });

  describe('Inicialización', () => {
    it('debe crear el componente correctamente', () => {
      configurarComponente();

      expect(component).toBeTruthy();
    });

    it('debe consultar el detalle de la publicación', () => {
      configurarComponente();

      expect(obtenerDetalle).toHaveBeenCalledWith(UUID);
    });

    it('debe cargar una publicación activa', () => {
      configurarComponente();

      expect(component.listing()).toEqual(detalle);
    });

    it('debe solicitar una cotización inicial', () => {
      configurarComponente();

      expect(cotizar).toHaveBeenCalledTimes(1);
    });

    it('debe almacenar la cotización recibida', () => {
      configurarComponente();

      expect(component.cotizacion()).toEqual(cotizacionRespuesta);
    });

    it('debe iniciar sin una reserva confirmada', () => {
      configurarComponente();

      expect(component.confirmed()).toBeNull();
    });

    it('debe iniciar sin estar procesando un pago', () => {
      configurarComponente();

      expect(component.procesando()).toBe(false);
    });

    it('debe iniciar sin mensajes de error', () => {
      configurarComponente();

      expect(component.error()).toBe('');
    });
  });

  describe('Validación de publicación y permisos', () => {
    it('debe rechazar un identificador inválido', () => {
      routeId = 'identificador-invalido';
      configurarComponente();

      expect(navigate).toHaveBeenCalledWith(['/buscar']);
      expect(obtenerDetalle).not.toHaveBeenCalled();
    });

    it('debe rechazar una publicación inactiva', () => {
      detalle.status = 'PAUSADA';
      configurarComponente();

      expect(navigate).toHaveBeenCalledWith(['/buscar']);
      expect(cotizar).not.toHaveBeenCalled();
    });

    it('debe impedir reservar una publicación propia', () => {
      currentUser.mockReturnValue({ uuid: OTRO_UUID });
      configurarComponente();

      expect(navigate).toHaveBeenCalledWith(['/buscar']);
    });

    it('debe impedir reservar a un administrador', () => {
      role.mockReturnValue('admin');
      configurarComponente();

      expect(navigate).toHaveBeenCalledWith(['/buscar']);
    });

    it('debe permitir reservar a un anfitrión distinto del propietario', () => {
      role.mockReturnValue('host');
      configurarComponente();

      expect(component.listing()).toEqual(detalle);
      expect(cotizar).toHaveBeenCalledTimes(1);
    });

    it('debe redirigir cuando falla la consulta del detalle', () => {
      obtenerDetalle.mockReturnValue(
        throwError(() => crearError(404))
      );

      configurarComponente();

      expect(navigate).toHaveBeenCalledWith(['/buscar']);
    });
  });

  describe('Cotización y validaciones', () => {
    it('debe enviar los datos correctos para cotizar', () => {
      configurarComponente();

      expect(cotizar).toHaveBeenCalledWith(
        UUID,
        '2026-11-10',
        '2026-11-13',
        0
      );
    });

    it('debe incluir los servicios adicionales cuando se solicitan', () => {
      queryParams.extras = 'true';
      configurarComponente();

      expect(cotizar).toHaveBeenCalledWith(
        UUID,
        '2026-11-10',
        '2026-11-13',
        45000
      );
    });

    it('debe rechazar cero huéspedes', () => {
      queryParams.guests = '0';
      configurarComponente();

      expect(cotizar).not.toHaveBeenCalled();
      expect(component.error()).toContain('huéspedes');
    });

    it('debe rechazar huéspedes que superan la capacidad', () => {
      queryParams.guests = '5';
      configurarComponente();

      expect(cotizar).not.toHaveBeenCalled();
      expect(component.error()).toContain('capacidad');
    });

    it('debe rechazar un número de huéspedes no válido', () => {
      queryParams.guests = 'abc';
      configurarComponente();

      expect(cotizar).not.toHaveBeenCalled();
      expect(component.error()).not.toBe('');
    });

    it('debe rechazar un rango de fechas invertido', () => {
      queryParams.checkIn = '2026-11-13';
      queryParams.checkOut = '2026-11-10';
      configurarComponente();

      expect(cotizar).not.toHaveBeenCalled();
      expect(component.error()).not.toBe('');
    });

    it('debe mostrar el mensaje de error del backend al cotizar', () => {
      cotizar.mockReturnValue(
        throwError(() => crearError(400, 'Fechas no disponibles'))
      );

      configurarComponente();

      expect(component.error()).toBe('Fechas no disponibles');
    });
  });

  describe('Formulario de pago', () => {
    it('debe exigir aceptar las condiciones', () => {
      configurarComponente();

      expect(component.paymentForm.invalid).toBe(true);
    });

    it('debe impedir confirmar sin aceptar las condiciones', () => {
      configurarComponente();

      component.confirm();

      expect(crearReserva).not.toHaveBeenCalled();
    });

    it('debe permitir continuar con el formulario válido', () => {
      configurarComponente();
      aceptarPago();

      expect(component.paymentForm.valid).toBe(true);
    });

    it('debe crear la reserva con la cotización seleccionada', () => {
      configurarComponente();
      aceptarPago();

      component.confirm();

      expect(crearReserva).toHaveBeenCalledWith(
        'cotizacion-001',
        '2026-11-10',
        '2026-11-13'
      );
    });

    it('debe pagar la reserva creada', () => {
      configurarComponente();
      aceptarPago();

      component.confirm();

      expect(pagar).toHaveBeenCalledWith(
        'reserva-123456789',
        'pm_card_visa'
      );
    });

    it('debe confirmar la reserva cuando el pago es exitoso', () => {
      configurarComponente();
      aceptarPago();

      component.confirm();

      expect(component.confirmed()).toEqual({
        codigo: 'LR-RESERVA-'
      });
      expect(component.procesando()).toBe(false);
    });

    it('no debe crear otra reserva después de confirmar', () => {
      configurarComponente();
      aceptarPago();

      component.confirm();
      component.confirm();

      expect(crearReserva).toHaveBeenCalledTimes(1);
    });

    it('debe reutilizar la reserva cuando falla el pago', () => {
      pagar
        .mockReturnValueOnce(
          throwError(() => crearError(400, 'Pago rechazado'))
        )
        .mockReturnValueOnce(of({ estado: 'APROBADO' }));

      configurarComponente();
      aceptarPago();

      component.confirm();

      expect(component.error()).toContain('Pago rechazado');
      expect(component.procesando()).toBe(false);

      component.confirm();

      expect(crearReserva).toHaveBeenCalledTimes(1);
      expect(pagar).toHaveBeenCalledTimes(2);
      expect(component.confirmed()).not.toBeNull();
    });

    it('debe permitir finalizar y navegar a mis reservas', () => {
      configurarComponente();

      component.finish();

      expect(navigate).toHaveBeenCalledWith(['/mis-reservas']);
    });
  });
});
