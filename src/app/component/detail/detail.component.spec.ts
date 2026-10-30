
 // @vitest-environment jsdom
import '@angular/compiler';

import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting
} from '@angular/platform-browser-dynamic/testing';
import { convertToParamMap, ActivatedRoute, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DetailComponent } from './detail.component';
import { CatalogService } from '../../core/services/catalog.service';
import { BookingService } from '../../core/services/booking.service';
import { DisponibilidadBackService } from '../../core/services/disponibilidad-back.service';
import { SessionService } from '../../core/services/session.service';
import { ToastService } from '../../core/services/toast.service';
import { Listing } from '../../core/models/marketplace.models';
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

describe('DetailComponent', () => {
  let component: DetailComponent;

  let getById: ReturnType<typeof vi.fn>;
  let obtenerDetalle: ReturnType<typeof vi.fn>;
  let obtenerResenas: ReturnType<typeof vi.fn>;
  let reviewsFor: ReturnType<typeof vi.fn>;
  let quote: ReturnType<typeof vi.fn>;
  let validation: ReturnType<typeof vi.fn>;
  let consultar: ReturnType<typeof vi.fn>;
  let currentUser: ReturnType<typeof vi.fn>;
  let role: ReturnType<typeof vi.fn>;
  let isAuthenticated: ReturnType<typeof vi.fn>;
  let users: ReturnType<typeof vi.fn>;
  let navigate: ReturnType<typeof vi.fn>;
  let show: ReturnType<typeof vi.fn>;

  const UUID = '123e4567-e89b-42d3-a456-426614174000';

  const alojamiento = (
    cambios: Record<string, unknown> = {}
  ): Listing => ({
    id: 1,
    uuid: undefined,
    hostId: 10,
    hostUuid: undefined,
    status: 'ACTIVA',
    capacity: 4,
    title: 'Casa campestre',
    ...cambios
  } as Listing);

  let item: Listing;
  let idRuta: string;

  const crearError = (
    status: number,
    error: unknown = null
  ) => new HttpErrorResponse({ status, error });

  const crearComponente = () => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({ id: idRuta })
            }
          }
        },
        {
          provide: CatalogService,
          useValue: {
            getById,
            obtenerDetalle,
            obtenerResenas,
            reviewsFor
          }
        },
        {
          provide: BookingService,
          useValue: { quote, validation }
        },
        {
          provide: DisponibilidadBackService,
          useValue: { consultar }
        },
        {
          provide: SessionService,
          useValue: {
            currentUser,
            role,
            isAuthenticated,
            users
          }
        },
        {
          provide: Router,
          useValue: { navigate }
        },
        {
          provide: ToastService,
          useValue: { show }
        }
      ]
    });

    component = TestBed.runInInjectionContext(
      () => new DetailComponent(
        TestBed.inject(ActivatedRoute),
        TestBed.inject(CatalogService),
        TestBed.inject(BookingService),
        TestBed.inject(SessionService),
        TestBed.inject(Router),
        TestBed.inject(ToastService)
      )
    );
  };

  beforeEach(() => {
    TestBed.resetTestingModule();

    idRuta = '1';
    item = alojamiento();

    getById = vi.fn().mockImplementation(() => item);
    obtenerDetalle = vi.fn().mockImplementation(() => of(item));
    obtenerResenas = vi.fn().mockReturnValue(
      of({ resenas: [], promedio: 0, total: 0 })
    );
    reviewsFor = vi.fn().mockReturnValue([]);
    quote = vi.fn().mockReturnValue({ total: 200000 });
    validation = vi.fn().mockReturnValue('');
    consultar = vi.fn().mockReturnValue(
      of({ disponible: true })
    );

    currentUser = vi.fn().mockReturnValue({
      id: 20,
      uuid: 'usuario-uuid'
    });
    role = vi.fn().mockReturnValue('guest');
    isAuthenticated = vi.fn().mockReturnValue(true);
    users = vi.fn().mockReturnValue([
      { id: 10, name: 'Anfitrión de prueba' }
    ]);
    navigate = vi.fn().mockResolvedValue(true);
    show = vi.fn();
  });

  describe('Inicialización', () => {
    it('debe crear el componente', () => {
      crearComponente();
      expect(component).toBeTruthy();
    });

    it('debe iniciar sin errores de fecha', () => {
      crearComponente();
      expect(component.dateError).toBe('');
    });

    it('debe iniciar con la primera imagen activa', () => {
      crearComponente();
      expect(component.activeImage()).toBe(0);
    });

    it('debe iniciar sin errores de carga', () => {
      crearComponente();
      expect(component.errorCarga()).toBe('');
    });

    it('debe iniciar sin disponibilidad consultada', () => {
      crearComponente();
      expect(component.disponibilidad()).toBeNull();
    });

    it('debe establecer mañana como un día después de hoy', () => {
      crearComponente();
      expect(component.tomorrow).toBe(addDays(component.today, 1));
    });

    it('debe iniciar con dos huéspedes', () => {
      crearComponente();
      expect(component.quoteForm.get('guests')?.value).toBe(2);
    });

    it('debe iniciar sin extras', () => {
      crearComponente();
      expect(component.quoteForm.get('extras')?.value).toBe(false);
    });
  });

  describe('Carga del alojamiento', () => {
    it('debe buscar por ID numérico', () => {
      crearComponente();
      expect(getById).toHaveBeenCalledWith(1);
    });

    it('debe mostrar un alojamiento activo', () => {
      crearComponente();
      expect(component.listing()?.id).toBe(1);
    });

    it('no debe mostrar un alojamiento inactivo a otro usuario', () => {
      item = alojamiento({ status: 'INACTIVA' });
      crearComponente();

      expect(component.listing()).toBeUndefined();
    });

    it('debe mostrar un alojamiento inactivo a su dueño', () => {
      item = alojamiento({ status: 'INACTIVA', hostId: 20 });
      crearComponente();

      expect(component.listing()?.id).toBe(1);
    });

    it('debe permitir que un administrador vea un alojamiento inactivo', () => {
      item = alojamiento({ status: 'INACTIVA' });
      role.mockReturnValue('admin');

      crearComponente();

      expect(component.listing()?.id).toBe(1);
    });

    it('debe consultar el backend cuando la ruta tiene UUID', () => {
      idRuta = UUID;
      item = alojamiento({ uuid: UUID });

      crearComponente();

      expect(obtenerDetalle).toHaveBeenCalledWith(UUID);
    });

    it('debe cargar las reseñas del backend para UUID', () => {
      idRuta = UUID;
      item = alojamiento({ uuid: UUID });

      crearComponente();

      expect(obtenerResenas).toHaveBeenCalledWith(UUID);
    });

    it('debe actualizar la valoración con datos del backend', () => {
      idRuta = UUID;
      item = alojamiento({ uuid: UUID });
      obtenerResenas.mockReturnValue(
        of({ resenas: [], promedio: 4.8, total: 12 })
      );

      crearComponente();

      expect(component.listing()?.rating).toBe(4.8);
      expect(component.listing()?.reviewsCount).toBe(12);
    });

    it('debe mostrar error cuando falla la carga del backend', () => {
      idRuta = UUID;
      obtenerDetalle.mockReturnValue(
        throwError(() => crearError(500))
      );

      crearComponente();

      expect(component.errorCarga()).toContain(
        'No se pudo cargar el alojamiento'
      );
    });

    it('debe finalizar la carga después de un error', () => {
      idRuta = UUID;
      obtenerDetalle.mockReturnValue(
        throwError(() => crearError(500))
      );

      crearComponente();

      expect(component.cargando()).toBe(false);
    });

    it('debe mostrar error de sesión vencida para estado 401', () => {
      idRuta = UUID;
      obtenerDetalle.mockReturnValue(
        throwError(() => crearError(401))
      );

      crearComponente();

      expect(component.errorCarga()).toContain('Tu sesión venció');
    });
  });

  describe('Reseñas', () => {
    it('debe obtener reseñas locales del catálogo', () => {
      reviewsFor.mockReturnValue([
        { id: 1, author: 'Usuario', rating: 5 }
      ]);

      crearComponente();

      expect(component.reviewList()).toHaveLength(1);
      expect(reviewsFor).toHaveBeenCalledWith(1);
    });

    it('debe devolver lista vacía sin alojamiento', () => {
      getById.mockReturnValue(undefined);

      crearComponente();

      expect(component.reviewList()).toEqual([]);
    });

    it('debe transformar las reseñas del backend', () => {
      idRuta = UUID;
      item = alojamiento({ uuid: UUID });
      obtenerResenas.mockReturnValue(
        of({
          resenas: [{
            id: 1,
            huespedNombre: 'Ana',
            calificacion: 5,
            creadoEn: '2026-01-15',
            comentario: 'Excelente'
          }],
          promedio: 5,
          total: 1
        })
      );

      crearComponente();

      expect(component.reviewList()[0].author).toBe('Ana');
      expect(component.reviewList()[0].content).toBe('Excelente');
    });

    it('debe limpiar las reseñas si falla su consulta', () => {
      idRuta = UUID;
      item = alojamiento({ uuid: UUID });
      obtenerResenas.mockReturnValue(
        throwError(() => crearError(500))
      );

      crearComponente();

      expect(component.reviewList()).toEqual([]);
    });

    it('debe mostrar el nombre del anfitrión', () => {
      crearComponente();

      expect(component.hostName()).toBe('Anfitrión de prueba');
    });

    it('debe usar Anfitrión cuando no encuentra al usuario', () => {
      users.mockReturnValue([]);
      crearComponente();

      expect(component.hostName()).toBe('Anfitrión');
    });
  });

  describe('Permisos de reserva', () => {
    it('debe permitir reservar a un huésped', () => {
      crearComponente();

      expect(component.canReserve()).toBe(true);
    });

    it('debe permitir reservar a otro anfitrión', () => {
      role.mockReturnValue('host');
      crearComponente();

      expect(component.canReserve()).toBe(true);
    });

    it('no debe permitir reservar al propietario', () => {
      currentUser.mockReturnValue({ id: 10 });
      crearComponente();

      expect(component.canReserve()).toBe(false);
    });

    it('no debe permitir reservar a administradores', () => {
      role.mockReturnValue('admin');
      crearComponente();

      expect(component.canReserve()).toBe(false);
    });

    it('no debe permitir reservar un alojamiento inactivo', () => {
      item = alojamiento({ status: 'INACTIVA', hostId: 20 });
      crearComponente();

      expect(component.canReserve()).toBe(false);
    });

    it('no debe permitir reservar sin alojamiento', () => {
      getById.mockReturnValue(undefined);
      crearComponente();

      expect(component.canReserve()).toBe(false);
    });
  });

  describe('Cotización', () => {
    it('debe generar una cotización para fechas válidas', () => {
      crearComponente();

      component.quote();

      expect(quote).toHaveBeenCalled();
    });

    it('debe enviar cero por extras desactivados', () => {
      crearComponente();

      component.quote();

      expect(quote).toHaveBeenCalledWith(
        item,
        component.today,
        component.tomorrow,
        0
      );
    });

    it('debe agregar 45000 cuando se seleccionan extras', () => {
      crearComponente();
      component.quoteForm.patchValue({ extras: true });

      component.quote();

      expect(quote).toHaveBeenCalledWith(
        item,
        component.today,
        component.tomorrow,
        45000
      );
    });

    it('debe rechazar una salida anterior a la entrada', () => {
      crearComponente();
      component.quoteForm.patchValue({
        checkIn: component.tomorrow,
        checkOut: component.today
      });

      expect(component.quote()).toBeNull();
    });

    it('no debe cotizar sin alojamiento', () => {
      getById.mockReturnValue(undefined);
      crearComponente();

      expect(component.quote()).toBeNull();
    });
  });

  describe('Continuar reserva', () => {
    it('debe navegar al checkout con datos válidos', () => {
      crearComponente();

      component.continueBooking();

      expect(navigate).toHaveBeenCalledWith(
        ['/reservar', 1],
        {
          queryParams: component.quoteForm.getRawValue()
        }
      );
    });

    it('debe marcar el formulario como tocado', () => {
      crearComponente();

      component.continueBooking();

      expect(component.quoteForm.get('checkIn')?.touched).toBe(true);
      expect(component.quoteForm.get('checkOut')?.touched).toBe(true);
      expect(component.quoteForm.get('guests')?.touched).toBe(true);
    });

    it('debe mostrar error cuando la validación falla', () => {
      validation.mockReturnValue('Fechas no disponibles');
      crearComponente();

      component.continueBooking();

      expect(component.dateError).toBe('Fechas no disponibles');
      expect(navigate).not.toHaveBeenCalled();
    });

    it('debe solicitar inicio de sesión a usuarios no autenticados', () => {
      isAuthenticated.mockReturnValue(false);
      crearComponente();

      component.continueBooking();

      expect(show).toHaveBeenCalledWith(
        'Inicia sesión como huésped para continuar.',
        'info'
      );
      expect(navigate).toHaveBeenCalledWith(
        ['/iniciar-sesion'],
        { queryParams: { returnUrl: '/alojamientos/1' } }
      );
    });

    it('debe bloquear reservas de administradores', () => {
      role.mockReturnValue('admin');
      crearComponente();

      component.continueBooking();

      expect(show).toHaveBeenCalledWith(
        'La reserva está disponible para cuentas de huésped.',
        'warning'
      );
      expect(navigate).not.toHaveBeenCalled();
    });

    it('debe rechazar formularios con cero huéspedes', () => {
      crearComponente();
      component.quoteForm.patchValue({ guests: 0 });

      component.continueBooking();

      expect(navigate).not.toHaveBeenCalled();
    });

    it('no debe navegar si no existe alojamiento', () => {
      getById.mockReturnValue(undefined);
      crearComponente();

      component.continueBooking();

      expect(navigate).not.toHaveBeenCalled();
    });
  });
});
